import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

/**
 * Secret resolution:
 * 1. MALLIQ_JWT_SECRET env var (recommended for production).
 * 2. Random token persisted in the `auth_config` table on first boot.
 * Keeps existing deployments working without forcing an env var.
 */
async function getJwtSecret() {
  if (process.env.MALLIQ_JWT_SECRET) return process.env.MALLIQ_JWT_SECRET;

  const db = await getDb();
  const row = await db.get("SELECT value FROM auth_config WHERE key = 'jwt_secret'");
  if (row?.value) return row.value;

  const generated = randomHex(48);
  await db.run(
    'INSERT OR REPLACE INTO auth_config (key, value) VALUES (?, ?)',
    ['jwt_secret', generated],
  );
  return generated;
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i += 1) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function ensureAuthSchema() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export async function hasAnyUser() {
  const db = await getDb();
  const row = await db.get('SELECT COUNT(*) as n FROM users');
  return (row?.n ?? 0) > 0;
}

export async function findUserByEmail(email) {
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
}

export async function findUserById(id) {
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

export async function createUser({ email, password, displayName, role = 'member' }) {
  if (!email || !password) throw new Error('email and password are required');
  if (password.length < 8) throw new Error('Contraseña debe tener al menos 8 caracteres.');

  const existing = await findUserByEmail(email);
  if (existing) throw new Error('Ya existe un usuario con ese correo.');

  const id = `u_${randomHex(8)}`;
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  const db = await getDb();
  await db.run(
    'INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, email.trim().toLowerCase(), hash, displayName ?? null, role, now],
  );

  return { id, email: email.trim().toLowerCase(), displayName: displayName ?? null, role, createdAt: now };
}

export async function verifyPassword(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const db = await getDb();
  const now = new Date().toISOString();
  await db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [now, user.id]);
  return { ...user, last_login_at: now };
}

export async function issueToken(user) {
  const secret = await getJwtSecret();
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export async function verifyToken(token) {
  const secret = await getJwtSecret();
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    role: row.role,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? null,
  };
}

/**
 * When MALLIQ_REQUIRE_AUTH=1 OR at least one user exists, every /api route
 * except /api/health, /api/auth/login, /api/auth/register requires a valid
 * Bearer token. On success, attaches req.user. Keeps pre-existing
 * zero-user deployments working unchanged.
 */
const UNPROTECTED_PATHS = new Set(['/health', '/auth/login', '/auth/register']);

export function buildAuthMiddleware() {
  return async function authMiddleware(req, res, next) {
    if (UNPROTECTED_PATHS.has(req.path)) return next();

    const envForce = process.env.MALLIQ_REQUIRE_AUTH === '1';
    const anyUser = await hasAnyUser();
    const authRequired = envForce || anyUser;

    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!authRequired && !match) return next();

    if (!match) {
      return res.status(401).json({ error: 'No autorizado. Presenta un token con Bearer.' });
    }

    const payload = await verifyToken(match[1]);
    if (!payload) {
      if (!authRequired) return next();
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    const user = await findUserById(payload.sub);
    if (!user) {
      if (!authRequired) return next();
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    req.user = publicUser(user);
    return next();
  };
}
