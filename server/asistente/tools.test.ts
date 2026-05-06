// @vitest-environment node
import { describe, expect, it } from 'vitest';
// @ts-expect-error JS module without .d.ts
import { executeAsistenteTool, ASISTENTE_TOOL_DEFINITIONS } from './tools.js';

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

const u1 = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' };
const u2 = { id: 'u2', code: 'L2', label: 'Local 2', areaM2: 80, level: 'P1' };

const c1 = {
  id: 'c-1',
  storeName: 'Aurora',
  companyName: 'Aurora SpA',
  category: 'Café',
  localIds: ['u1'],
  startDate: '2024-01-01',
  endDate: '2026-08-31',
  fixedRent: 1_500_000,
  fixedRentCurrency: 'CLP',
  variableRentPct: 5,
  commonExpenses: 100_000,
  commonExpensesCurrency: 'CLP',
  fondoPromocion: 0,
  signatureStatus: 'firmado',
};

const c2 = {
  id: 'c-2',
  storeName: 'Boreal',
  companyName: 'Boreal Ltda',
  category: 'Ropa',
  localIds: ['u2'],
  startDate: '2024-01-01',
  endDate: '2030-12-31',
  fixedRent: 2_500_000,
  fixedRentCurrency: 'CLP',
  variableRentPct: 6,
  commonExpenses: 150_000,
  commonExpensesCurrency: 'CLP',
  fondoPromocion: 0,
  signatureStatus: 'firmado',
};

describe('Asistente tools', () => {
  it('getContractsExpiringIn returns only contracts inside the horizon', () => {
    const state = { ...emptyState(), units: [u1, u2], contracts: [c1, c2] };
    const ref = new Date('2026-04-15');
    const out = executeAsistenteTool('getContractsExpiringIn', { months: 6 }, state, ref);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('c-1');
    expect(out[0].daysToEnd).toBeGreaterThan(0);
  });

  it('getTenantsWithSalesDropAbove flags only tenants whose drop crosses the threshold', () => {
    const state = {
      ...emptyState(),
      units: [u1, u2],
      contracts: [c1, c2],
      sales: [
        { id: 's1', contractId: 'c-1', localIds: ['u1'], storeLabel: 'Aurora', source: 'manual', occurredAt: '2026-04-10', grossAmount: 4_000_000, importedAt: 'x' },
        { id: 's2', contractId: 'c-1', localIds: ['u1'], storeLabel: 'Aurora', source: 'manual', occurredAt: '2026-03-10', grossAmount: 8_000_000, importedAt: 'x' },
        { id: 's3', contractId: 'c-2', localIds: ['u2'], storeLabel: 'Boreal', source: 'manual', occurredAt: '2026-04-10', grossAmount: 6_000_000, importedAt: 'x' },
        { id: 's4', contractId: 'c-2', localIds: ['u2'], storeLabel: 'Boreal', source: 'manual', occurredAt: '2026-03-10', grossAmount: 6_000_000, importedAt: 'x' },
      ],
    };
    const ref = new Date('2026-04-15');
    const out = executeAsistenteTool('getTenantsWithSalesDropAbove', { percent: 30 }, state, ref);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('c-1');
    expect(out[0].dropPct).toBeLessThanOrEqual(-30);
  });

  it('getContractByStore matches by case-insensitive substring', () => {
    const state = { ...emptyState(), units: [u1, u2], contracts: [c1, c2] };
    expect(executeAsistenteTool('getContractByStore', { storeName: 'aurora' }, state).id).toBe('c-1');
    expect(executeAsistenteTool('getContractByStore', { storeName: 'BOR' }, state).id).toBe('c-2');
    expect(executeAsistenteTool('getContractByStore', { storeName: 'nada' }, state)).toBeNull();
  });

  it('getOccupationCostOver returns tenants over the threshold for the current month', () => {
    const state = {
      ...emptyState(),
      units: [u1, u2],
      contracts: [c1, c2],
      sales: [
        { id: 's1', contractId: 'c-1', localIds: ['u1'], storeLabel: 'Aurora', source: 'manual', occurredAt: '2026-04-10', grossAmount: 5_000_000, importedAt: 'x' },
        { id: 's2', contractId: 'c-2', localIds: ['u2'], storeLabel: 'Boreal', source: 'manual', occurredAt: '2026-04-10', grossAmount: 30_000_000, importedAt: 'x' },
      ],
    };
    const out = executeAsistenteTool('getOccupationCostOver', { percent: 20 }, state, new Date('2026-04-15'));
    expect(out.map((row: { id: string; occupancyCostPct: number }) => row.id)).toEqual(['c-1']);
    expect(out[0].occupancyCostPct).toBeGreaterThanOrEqual(20);
  });

  it('getRankingByCategory ranks tenants by sales per m² descending', () => {
    const state = {
      ...emptyState(),
      units: [u1, u2],
      contracts: [c1, c2],
      sales: [
        { id: 's1', contractId: 'c-1', localIds: ['u1'], storeLabel: 'Aurora', source: 'manual', occurredAt: '2026-04-10', grossAmount: 8_000_000, importedAt: 'x' },
        { id: 's2', contractId: 'c-2', localIds: ['u2'], storeLabel: 'Boreal', source: 'manual', occurredAt: '2026-04-10', grossAmount: 4_000_000, importedAt: 'x' },
      ],
    };
    const out = executeAsistenteTool('getRankingByCategory', { month: '2026-04' }, state);
    expect(out[0].id).toBe('c-1'); // 8M / 50 = 160k > 4M / 80 = 50k
  });

  it('exposes a tool definition for every implemented tool', () => {
    const defNames = ASISTENTE_TOOL_DEFINITIONS.map(
      (d: { function: { name: string } }) => d.function.name,
    ).sort();
    const expected = [
      'getContractByStore',
      'getContractsExpiringIn',
      'getDailyDigest',
      'getOccupationCostOver',
      'getRankingByCategory',
      'getTenantsWithSalesDropAbove',
    ];
    expect(defNames).toEqual(expected);
  });
});
