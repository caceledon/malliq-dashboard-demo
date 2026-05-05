// @vitest-environment node
import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : JSON.stringify(payload));
  }
  return payload;
}

const realFetch = globalThis.fetch;

describe('UF cache + endpoints', () => {
  let tempDir = '';
  let baseUrl = '';
  let server: Server;
  let closeDb: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'malliq-uf-'));
    process.env.MALLIQ_SKIP_ENV_FILE = '1';
    process.env.MALLIQ_DATA_DIR = tempDir;
    process.env.MALLIQ_DB_PATH = path.join(tempDir, 'malliq.sqlite');

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
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    // The mindicador fetcher is the only mockable seam; restore between tests.
    globalThis.fetch = realFetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function mockMindicador({
    forDate,
    valor,
  }: {
    forDate: string; // YYYY-MM-DD that mindicador returns
    valor: number;
  }) {
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      calls.push(url);
      if (!url.includes('mindicador.cl/api/uf')) {
        return realFetch(input as RequestInfo);
      }
      return new Response(
        JSON.stringify({
          version: '1.7.0',
          autor: 'mindicador.cl',
          codigo: 'uf',
          nombre: 'Unidad de fomento (UF)',
          unidad_medida: 'Pesos',
          serie: [{ fecha: `${forDate}T03:00:00.000Z`, valor }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;
    return calls;
  }

  it('GET /api/uf?date hits remote on first call and caches afterwards', async () => {
    const calls = mockMindicador({ forDate: '2024-02-15', valor: 36800 });
    const first = await readJson(await fetch(`${baseUrl}/api/uf?date=2024-02-15`));
    expect(first.value).toBe(36800);
    expect(first.source).toBe('remote');
    expect(calls.filter((url) => url.includes('mindicador.cl')).length).toBe(1);

    const second = await readJson(await fetch(`${baseUrl}/api/uf?date=2024-02-15`));
    expect(second.value).toBe(36800);
    expect(second.source).toBe('cache');
    // Cache hit must not call mindicador again.
    expect(calls.filter((url) => url.includes('mindicador.cl')).length).toBe(1);
  });

  it('GET /api/uf rejects malformed dates', async () => {
    const response = await fetch(`${baseUrl}/api/uf?date=15-feb-2024`);
    expect(response.status).toBe(400);
  });

  it('GET /api/uf/latest serves the freshly fetched value', async () => {
    mockMindicador({ forDate: '2026-04-29', valor: 39555 });
    const payload = await readJson(await fetch(`${baseUrl}/api/uf/latest`));
    expect(payload.value).toBe(39555);
    expect(payload.date).toBe('2026-04-29');
  });

  it('GET /api/uf/range validates ordering', async () => {
    const response = await fetch(`${baseUrl}/api/uf/range?from=2024-12-01&to=2024-01-01`);
    expect(response.status).toBe(400);
  });
});
