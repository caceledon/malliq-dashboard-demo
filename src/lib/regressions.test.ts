// Regression tests for the audit fixes (Phase 5):
// - H2 chileIsoDay handles Santiago timezone boundaries
// - C1 buildForecastBands widens with horizon and respects σ floor/cap
// - C5 buildContractDiff emits per-field deltas for changed commercial fields
import { describe, expect, it } from 'vitest';
import { chileIsoDay } from '@/lib/dateChile';
import {
  buildContractDiff,
  buildForecastBands,
  type AppState,
  type Contract,
  type SaleRecord,
} from '@/lib/domain';

function emptyState(): AppState {
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

function makeSale(month: string, amount: number, contractId = 'c-1'): SaleRecord {
  return {
    id: `s-${month}`,
    contractId,
    localIds: ['u-1'],
    storeLabel: undefined,
    occurredAt: new Date(`${month}-15T15:00:00Z`).toISOString(),
    grossAmount: amount,
    currency: 'CLP',
    source: 'manual',
    ticketNumber: undefined,
    importReference: undefined,
    rawText: undefined,
    assetId: undefined,
  } as unknown as SaleRecord;
}

describe('H2 — chileIsoDay timezone boundary', () => {
  it('returns the Chile-local date even when UTC has crossed midnight', () => {
    // 23:30 Chile (UTC-3 standard) on 2026-05-04 = 02:30 UTC on 2026-05-05.
    // toISOString().slice(0, 10) would return "2026-05-05" (UTC tomorrow);
    // chileIsoDay must return "2026-05-04" (Chile today).
    const lateChile = new Date('2026-05-05T02:30:00.000Z');
    expect(chileIsoDay(lateChile)).toBe('2026-05-04');
  });

  it('returns the same Chile-local date all day at 09:00 UTC', () => {
    // 06:00 Chile (UTC-3) → still the same day in both timezones.
    const sameDay = new Date('2026-05-05T09:00:00.000Z');
    expect(chileIsoDay(sameDay)).toBe('2026-05-05');
  });

  it('handles invalid Date instances without throwing', () => {
    expect(chileIsoDay(new Date('not-a-date'))).toBe('');
  });
});

describe('C1 — forecast bands', () => {
  it('always satisfies p10 ≤ p50 ≤ p90 across the horizon', () => {
    const state = emptyState();
    const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'];
    state.sales = months.map((m, i) => makeSale(m, 100_000 + i * 10_000));
    const bands = buildForecastBands(state, 6, new Date('2026-05-15T12:00:00Z'));
    expect(bands.p50.length).toBe(6);
    for (let i = 0; i < bands.p50.length; i += 1) {
      expect(bands.p10[i]).toBeLessThanOrEqual(bands.p50[i]);
      expect(bands.p50[i]).toBeLessThanOrEqual(bands.p90[i]);
    }
  });

  it('widens the band as the horizon grows (sqrt scaling)', () => {
    const state = emptyState();
    state.sales = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'].map(
      (m, i) => makeSale(m, 100_000 + (i % 2 === 0 ? 30_000 : -30_000)),
    );
    const bands = buildForecastBands(state, 6, new Date('2026-05-15T12:00:00Z'));
    const firstWidth = bands.p90[0] - bands.p10[0];
    const lastWidth = bands.p90[bands.p90.length - 1] - bands.p10[bands.p10.length - 1];
    expect(lastWidth).toBeGreaterThan(firstWidth);
  });

  it('floors the band at 5% of the trailing mean even when history is flat', () => {
    const state = emptyState();
    state.sales = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'].map(
      (m) => makeSale(m, 100_000),
    );
    const bands = buildForecastBands(state, 6, new Date('2026-05-15T12:00:00Z'));
    const firstWidth = bands.p90[0] - bands.p10[0];
    expect(firstWidth).toBeGreaterThan(0);
  });
});

describe('C5 — contract diff', () => {
  function makeContract(overrides: Partial<Contract> = {}): Contract {
    return {
      id: 'c-1',
      companyName: 'Empresa SpA',
      storeName: 'Tienda Demo',
      category: 'Moda',
      localIds: ['u-1'],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      fixedRent: 1_200_000,
      variableRentPct: 4,
      baseRentUF: 0,
      commonExpenses: 150_000,
      fondoPromocion: 50_000,
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
      fixedRentCurrency: 'CLP',
      commonExpensesCurrency: 'CLP',
      fondoPromocionCurrency: 'CLP',
      garantiaMontoCurrency: 'CLP',
      feeIngresoCurrency: 'CLP',
      ...overrides,
    } as Contract;
  }

  it('returns no diffs when contracts are identical', () => {
    const a = makeContract();
    const b = makeContract();
    expect(buildContractDiff(a, b)).toEqual([]);
  });

  it('emits before/after for each changed commercial field', () => {
    const before = makeContract();
    const after = makeContract({ fixedRent: 1_500_000, variableRentPct: 5 });
    const diffs = buildContractDiff(before, after);
    expect(diffs.length).toBe(2);
    const fixedRent = diffs.find((d) => d.key === 'fixedRent');
    expect(fixedRent?.before).toBe(1_200_000);
    expect(fixedRent?.after).toBe(1_500_000);
    expect(fixedRent?.kind).toBe('currency-clp');
  });

  it('detects rentSteps changes via composite signature', () => {
    const before = makeContract({ rentSteps: [] });
    const after = makeContract({
      rentSteps: [{ id: 'step-1', startDate: '2026-01-01', endDate: '2026-12-31', rentaFijaUfM2: 0.62 }],
    });
    const diffs = buildContractDiff(before, after);
    expect(diffs.find((d) => d.key === 'rentSteps')).toBeDefined();
  });

  it('returns empty when either side is missing', () => {
    expect(buildContractDiff(null, makeContract())).toEqual([]);
    expect(buildContractDiff(makeContract(), null)).toEqual([]);
  });
});
