import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;

let pool = null;
let listener = null;

async function resolveDbConfig() {
  if (process.env.DB_SECRET_JSON) {
    const parsed = JSON.parse(process.env.DB_SECRET_JSON);
    return {
      host: process.env.DB_PROXY_ENDPOINT || parsed.host,
      port: parsed.port ?? 5432,
      database: parsed.dbname ?? 'malliq',
      user: parsed.username,
      password: parsed.password,
      ssl: { rejectUnauthorized: false },
    };
  }

  if (process.env.DB_SECRET_ARN) {
    const sm = new SecretsManagerClient({});
    const out = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
    const parsed = JSON.parse(out.SecretString);
    return {
      host: process.env.DB_PROXY_ENDPOINT || parsed.host,
      port: parsed.port ?? 5432,
      database: parsed.dbname ?? 'malliq',
      user: parsed.username,
      password: parsed.password,
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME || 'malliq',
    user: process.env.DB_USER || 'malliq_admin',
    password: process.env.DB_PASSWORD || 'malliq_local',
  };
}

export async function getPool() {
  if (pool) return pool;
  const config = await resolveDbConfig();
  pool = new Pool({
    ...config,
    max: Number(process.env.DB_POOL_MAX || 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'malliq-api',
  });
  pool.on('error', (err) => {
    console.error('[pg] idle client error', err);
  });
  return pool;
}

/**
 * Ejecuta `fn` dentro de una transacción con `app.activo_id` seteado.
 * RLS filtrará todas las queries automáticamente por ese tenant.
 */
export async function withActivo(activoId, fn) {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    if (activoId) {
      await client.query(`SELECT set_config('app.activo_id', $1, true)`, [activoId]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cliente persistente para LISTEN/NOTIFY (conexión dedicada fuera del pool).
 */
export async function getEventListener() {
  if (listener) return listener;
  const config = await resolveDbConfig();
  const client = new pg.Client(config);
  await client.connect();
  await client.query('LISTEN malliq_events');
  listener = client;
  return listener;
}

export async function closePool() {
  if (pool) await pool.end();
  if (listener) await listener.end();
  pool = null;
  listener = null;
}
