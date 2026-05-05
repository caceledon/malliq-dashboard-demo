// @vitest-environment node
import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : JSON.stringify(payload));
  }
  return payload;
}

describe('Auth + AI ask integration', () => {
  let tempDir = '';
  let baseUrl = '';
  let server: Server;
  let closeDb: (() => Promise<void>) | undefined;
  let adminToken = '';

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'malliq-auth-'));
    process.env.MALLIQ_SKIP_ENV_FILE = '1';
    process.env.MALLIQ_DATA_DIR = tempDir;
    process.env.MALLIQ_DB_PATH = path.join(tempDir, 'malliq.sqlite');
    process.env.MALLIQ_JWT_SECRET = 'test-secret-do-not-reuse';
    delete process.env.OPENAI_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.MOONSHOT_BASE_URL;
    delete process.env.CONTRACT_AUTOFILL_MODEL;
    delete process.env.MALLIQ_REQUIRE_AUTH;

    const serverModule = await import(pathToFileURL(path.join(process.cwd(), 'server', 'index.js')).href);
    const dbModule = await import(pathToFileURL(path.join(process.cwd(), 'server', 'db.js')).href);
    closeDb = dbModule.closeDb;
    server = await serverModule.startServer(0);

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('No se pudo resolver el puerto del servidor de prueba.');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await closeDb?.();
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.MALLIQ_SKIP_ENV_FILE;
    delete process.env.MALLIQ_DATA_DIR;
    delete process.env.MALLIQ_DB_PATH;
    delete process.env.MALLIQ_JWT_SECRET;
  });

  it('reports authRequired=false before any user exists', async () => {
    const health = await readJson(await fetch(`${baseUrl}/api/health`));
    expect(health.authRequired).toBe(false);
    expect(health.authBootstrapped).toBe(false);
  });

  it('lets the first registration bootstrap an admin without a token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.cl', password: 'super-secret', displayName: 'Admin' }),
    });
    const payload = await readJson(response);
    expect(payload.token).toBeTruthy();
    expect(payload.user.role).toBe('admin');
    expect(payload.user.email).toBe('admin@test.cl');
    adminToken = payload.token;
  });

  it('reports authRequired=true and authBootstrapped=true after the admin exists', async () => {
    const health = await readJson(await fetch(`${baseUrl}/api/health`));
    expect(health.authRequired).toBe(true);
    expect(health.authBootstrapped).toBe(true);
  });

  it('rejects protected requests without a Bearer token (401)', async () => {
    const response = await fetch(`${baseUrl}/api/archive`);
    expect(response.status).toBe(401);
  });

  it('accepts protected requests with a valid Bearer token (200)', async () => {
    const response = await fetch(`${baseUrl}/api/archive`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.status).toBe(200);
  });

  it('returns the signed-in user via /api/auth/me', async () => {
    const payload = await readJson(
      await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(payload.user.email).toBe('admin@test.cl');
    expect(payload.user.role).toBe('admin');
  });

  it('blocks registration from an unauthenticated client once bootstrapped', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noauth@test.cl', password: 'another-pw' }),
    });
    expect(response.status).toBe(401);
  });

  it('admin can register additional members', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: 'member@test.cl', password: 'member-pw-123', role: 'member' }),
    });
    const payload = await readJson(response);
    expect(payload.user.role).toBe('member');
    expect(payload.user.email).toBe('member@test.cl');
  });

  it('rejects login with the wrong password', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.cl', password: 'nope' }),
    });
    expect(response.status).toBe(401);
  });

  it('accepts login with the right password and updates lastLoginAt', async () => {
    const payload = await readJson(
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@test.cl', password: 'super-secret' }),
      }),
    );
    expect(payload.token).toBeTruthy();
    expect(payload.user.lastLoginAt).toBeTruthy();
  });

  it('autofill/ask returns 400 when question is missing', async () => {
    const response = await fetch(`${baseUrl}/api/contracts/autofill/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ textSnippet: 'some text' }),
    });
    expect(response.status).toBe(400);
  });

  it('autofill/ask returns 400 when textSnippet is missing', async () => {
    const response = await fetch(`${baseUrl}/api/contracts/autofill/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ question: '¿Cuál es la renta?' }),
    });
    expect(response.status).toBe(400);
  });

  it('autofill/ask falls back to mock_local when no AI key is configured', async () => {
    const payload = await readJson(
      await fetch(`${baseUrl}/api/contracts/autofill/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          question: '¿Cuál es la duración?',
          textSnippet: 'Arriendo por 24 meses...',
          currentFields: {},
        }),
      }),
    );
    expect(payload.source).toBe('mock_local');
    expect(payload.suggestedUpdates).toBeNull();
    expect(payload.answer).toContain('modo local');
  });

  it('blocks creating a locatario user without a tenantContractId', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: 'orphan@test.cl',
        password: 'orphan-pw-123',
        role: 'locatario',
      }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(String(body.error)).toMatch(/contrato/i);
  });

  it('admin can create a bound locatario user and read it via /api/auth/users', async () => {
    const created = await readJson(
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: 'tenant-a@test.cl',
          password: 'tenant-pw-123',
          role: 'locatario',
          tenantContractId: 'contract-1',
          assetId: 'asset-1',
        }),
      }),
    );
    expect(created.user.role).toBe('locatario');
    expect(created.user.tenantContractId).toBe('contract-1');

    const list = await readJson(
      await fetch(`${baseUrl}/api/auth/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const found = list.users.find((u: { email: string }) => u.email === 'tenant-a@test.cl');
    expect(found?.tenantContractId).toBe('contract-1');
    expect(found?.assetId).toBe('asset-1');
  });

  it('non-admin tokens get 403 from /api/auth/users', async () => {
    const memberLogin = await readJson(
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'member@test.cl', password: 'member-pw-123' }),
      }),
    );
    const memberToken = memberLogin.token as string;

    const response = await fetch(`${baseUrl}/api/auth/users`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(response.status).toBe(403);
  });

  it('locatario tokens get 403 on writer endpoints', async () => {
    const tenantLogin = await readJson(
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'tenant-a@test.cl', password: 'tenant-pw-123' }),
      }),
    );
    const tenantToken = tenantLogin.token as string;

    const archivePut = await fetch(`${baseUrl}/api/archive?force=1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({ version: 1, state: {}, documents: [] }),
    });
    expect(archivePut.status).toBe(403);

    const proxy = await fetch(`${baseUrl}/api/connectors/pos/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({ endpoint: 'https://example.com/api', method: 'GET' }),
    });
    expect(proxy.status).toBe(403);
  });

  it('PATCH /api/auth/users/:id/tenant updates the binding', async () => {
    const list = await readJson(
      await fetch(`${baseUrl}/api/auth/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const tenantUser = list.users.find((u: { email: string }) => u.email === 'tenant-a@test.cl');
    expect(tenantUser).toBeTruthy();

    const patched = await readJson(
      await fetch(`${baseUrl}/api/auth/users/${tenantUser.id}/tenant`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ tenantContractId: 'contract-2', assetId: 'asset-1' }),
      }),
    );
    expect(patched.user.tenantContractId).toBe('contract-2');
    expect(patched.user.assetId).toBe('asset-1');
  });

  it('ensureAuthSchema is idempotent across reruns', async () => {
    const authModule = await import(
      pathToFileURL(path.join(process.cwd(), 'server', 'auth.js')).href
    );
    // The migration block adds tenant_contract_id / asset_id once. Calling it
    // again must not throw on the duplicate-column error.
    await expect(authModule.ensureAuthSchema()).resolves.toBeUndefined();
    await expect(authModule.ensureAuthSchema()).resolves.toBeUndefined();
  });
});
