// @vitest-environment node
import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

function emptyState() {
  return {
    asset: null,
    units: [],
    contracts: [],
    sales: [],
    planning: [],
    documents: [],
    suppliers: [],
    prospects: [],
    posConnections: [],
    importLogs: [],
  };
}

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : JSON.stringify(payload));
  }
  return payload;
}

describe('MallIQ API integration', () => {
  let tempDir = '';
  let baseUrl = '';
  let server: Server;
  let closeDb: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'malliq-api-'));
    process.env.MALLIQ_SKIP_ENV_FILE = '1';
    process.env.MALLIQ_DATA_DIR = tempDir;
    process.env.MALLIQ_DB_PATH = path.join(tempDir, 'malliq.sqlite');
    delete process.env.OPENAI_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.MOONSHOT_BASE_URL;
    delete process.env.CONTRACT_AUTOFILL_MODEL;

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

  beforeEach(async () => {
    const response = await fetch(`${baseUrl}/api/archive?force=1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 1,
        state: emptyState(),
        documents: [],
      }),
    });

    expect(response.ok).toBe(true);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    await closeDb?.();
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.MALLIQ_SKIP_ENV_FILE;
    delete process.env.MALLIQ_DATA_DIR;
    delete process.env.MALLIQ_DB_PATH;
  });

  it('reports health summary and mock IA mode', async () => {
    const health = await readJson(await fetch(`${baseUrl}/api/health`));

    expect(health.ok).toBe(true);
    expect(health.archiveExists).toBe(false);
    expect(health.aiMode).toBe('mock_local');
    expect(health.summary.contracts).toBe(0);
    expect(health.summary.sales).toBe(0);
  });

  it('persists archives and exposes remote counts', async () => {
    const archive = {
      version: 1,
      state: {
        asset: {
          id: 'asset-1',
          name: 'Activo Test',
          city: 'Santiago',
          region: 'RM',
          notes: 'demo',
          themePreference: 'light',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        units: [{ id: 'unit-1', code: 'L-101', label: 'Local 101', areaM2: 45, level: 'P1' }],
        contracts: [{
          id: 'contract-1',
          companyName: 'Marca Test SpA',
          storeName: 'Marca Test',
          category: 'Retail',
          localIds: ['unit-1'],
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          fixedRent: 1200000,
          variableRentPct: 4,
          baseRentUF: 0,
          commonExpenses: 150000,
          fondoPromocion: 50000,
          salesParticipationPct: 4,
          escalation: 'IPC anual',
          conditions: '',
          signatureStatus: 'firmado',
          annexCount: 0,
          autoFillUnits: true,
          garantiaMonto: 0,
          garantiaVencimiento: '',
          feeIngreso: 0,
          rentSteps: [],
          healthPagoAlDia: true,
          healthEntregaVentas: true,
          healthNivelVenta: true,
          healthNivelRenta: true,
          healthPercepcionAdmin: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        }],
        sales: [{
          id: 'sale-1',
          contractId: 'contract-1',
          localIds: ['unit-1'],
          storeLabel: 'Marca Test',
          source: 'manual',
          occurredAt: '2026-04-01T12:00:00',
          grossAmount: 45000000,
          importedAt: '2026-04-01T12:05:00',
        }],
        planning: [],
        documents: [],
        suppliers: [],
        prospects: [],
        posConnections: [],
        importLogs: [],
      },
      documents: [],
    };

    const putResponse = await fetch(`${baseUrl}/api/archive?force=1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(archive),
    });
    expect(putResponse.ok).toBe(true);

    const health = await readJson(await fetch(`${baseUrl}/api/health`));
    expect(health.archiveExists).toBe(true);
    expect(health.summary.units).toBe(1);
    expect(health.summary.contracts).toBe(1);
    expect(health.summary.sales).toBe(1);

    const exported = await readJson(await fetch(`${baseUrl}/api/archive`));
    expect(exported.state.asset.name).toBe('Activo Test');
    expect(exported.state.contracts[0].storeName).toBe('Marca Test');
    expect(exported.serverRevision).toBeGreaterThan(0);
  });

  it('uploads, downloads and deletes remote documents', async () => {
    const form = new FormData();
    form.set('id', 'doc-1');
    form.set('entityType', 'asset');
    form.set('entityId', 'asset-1');
    form.set('kind', 'otro');
    form.set('note', 'Documento de prueba');
    form.set('file', new File(['hola malliq'], 'demo.txt', { type: 'text/plain' }));

    const uploadResponse = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      body: form,
    });
    const uploadPayload = await readJson(uploadResponse);

    expect(uploadPayload.record.id).toBe('doc-1');
    expect(uploadPayload.record.remotePath).toContain('/api/documents/doc-1/download?rev=');

    const downloadResponse = await fetch(`${baseUrl}/api/documents/doc-1/download`);
    expect(downloadResponse.ok).toBe(true);
    expect(await downloadResponse.text()).toBe('hola malliq');

    const deleteResponse = await fetch(`${baseUrl}/api/documents/doc-1`, {
      method: 'DELETE',
    });
    expect(deleteResponse.ok).toBe(true);

    const health = await readJson(await fetch(`${baseUrl}/api/health`));
    expect(health.summary.documents).toBe(0);
  });

  it('rejects localhost targets in POS proxy', async () => {
    const response = await fetch(`${baseUrl}/api/connectors/pos/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'http://127.0.0.1:9999/private',
        method: 'GET',
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Endpoint no permitido');
  });

  it('ingests uploaded fiscal text files', async () => {
    const form = new FormData();
    form.set('file', new File(['TOTAL 12.345'], 'fiscal.txt', { type: 'text/plain' }));

    const response = await fetch(`${baseUrl}/api/connectors/fiscal/ingest`, {
      method: 'POST',
      body: form,
    });
    const payload = await readJson(response);

    expect(payload.text).toContain('TOTAL 12.345');
  });

  it('returns normalized mock autofill when IA is not configured', async () => {
    const form = new FormData();
    form.set('file', new File(['%PDF-1.4 fake'], 'Contrato Plaza Norte.pdf', { type: 'application/pdf' }));

    const response = await fetch(`${baseUrl}/api/contracts/autofill`, {
      method: 'POST',
      body: form,
    });
    const payload = await readJson(response);

    expect(payload.mocked).toBe(true);
    expect(payload.source).toBe('mock_local');
    expect(payload.storeName).toBeNull();
    expect(payload.startDate).toBeNull();
    expect(payload.variableRentPct).toBeNull();
    expect(payload.missingFields).toEqual(expect.arrayContaining(['storeName', 'startDate', 'variableRentPct']));
  });
});
