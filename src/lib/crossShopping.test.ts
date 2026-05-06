import { describe, expect, it } from 'vitest';
import { buildCrossShoppingReport, MIN_OVERLAP_MONTHS } from './crossShopping';
import { emptyAppState, type AppState, type Contract, type SaleRecord } from './domain';

function makeContract(id: string, storeName = id): Contract {
  return {
    id,
    companyName: storeName,
    storeName,
    category: 'Retail',
    localIds: [`u-${id}`],
    startDate: '2024-01-01',
    endDate: '2026-12-31',
    fixedRent: 0,
    variableRentPct: 0,
    baseRentUF: 0,
    commonExpenses: 0,
    fondoPromocion: 0,
    salesParticipationPct: 0,
    escalation: '',
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
    healthNivelVenta: false,
    healthNivelRenta: false,
    healthPercepcionAdmin: true,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

function monthSale(contractId: string, month: string, amount: number, idx: number): SaleRecord {
  return {
    id: `${contractId}-${month}-${idx}`,
    contractId,
    localIds: [`u-${contractId}`],
    storeLabel: contractId,
    source: 'manual',
    occurredAt: `${month}-15`,
    grossAmount: amount,
    importedAt: `${month}-15T00:00:00Z`,
  };
}

function buildMonths(refYear: number, refMonth: number, count: number): string[] {
  const months: string[] = [];
  for (let offset = -(count - 1); offset <= 0; offset += 1) {
    const d = new Date(refYear, refMonth + offset, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

describe('buildCrossShoppingReport', () => {
  it('detects two contracts whose monthly sales move together', () => {
    const months = buildMonths(2026, 4, 12);
    const a = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
    const b = a.map((v) => v * 1.1 + 5); // tightly correlated
    const sales = [
      ...months.map((m, i) => monthSale('c-a', m, a[i], i)),
      ...months.map((m, i) => monthSale('c-b', m, b[i], i)),
    ];
    const state: AppState = {
      ...emptyAppState(),
      contracts: [makeContract('c-a', 'Tienda A'), makeContract('c-b', 'Tienda B')],
      sales,
    };
    const report = buildCrossShoppingReport(state, { referenceDate: new Date(2026, 4, 15) });
    expect(report.pairs.length).toBeGreaterThan(0);
    const top = report.pairs[0];
    expect(top.pearson).toBeGreaterThan(0.95);
    expect([top.storeA, top.storeB].sort()).toEqual(['Tienda A', 'Tienda B']);
  });

  it('reports anti-correlation as a negative pearson', () => {
    const months = buildMonths(2026, 4, 12);
    const a = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
    const b = a.slice().reverse();
    const sales = [
      ...months.map((m, i) => monthSale('c-a', m, a[i], i)),
      ...months.map((m, i) => monthSale('c-b', m, b[i], i)),
    ];
    const state: AppState = {
      ...emptyAppState(),
      contracts: [makeContract('c-a'), makeContract('c-b')],
      sales,
    };
    const report = buildCrossShoppingReport(state, { referenceDate: new Date(2026, 4, 15) });
    expect(report.pairs[0].pearson).toBeLessThan(-0.95);
  });

  it('skips pairs without enough overlapping months', () => {
    const sales: SaleRecord[] = [];
    // c-a has many months; c-c has only 2 months → not enough overlap.
    const months = buildMonths(2026, 4, 12);
    months.forEach((m, i) => sales.push(monthSale('c-a', m, (i + 1) * 1000, i)));
    sales.push(monthSale('c-c', months[10], 1000, 0));
    sales.push(monthSale('c-c', months[11], 1100, 1));
    const state: AppState = {
      ...emptyAppState(),
      contracts: [makeContract('c-a'), makeContract('c-c')],
      sales,
    };
    const report = buildCrossShoppingReport(state, { referenceDate: new Date(2026, 4, 15) });
    expect(report.pairs).toEqual([]);
  });

  it('returns insufficient=true when no pair has viable series', () => {
    const state: AppState = {
      ...emptyAppState(),
      contracts: [makeContract('c-a')],
      sales: [],
    };
    const report = buildCrossShoppingReport(state, { referenceDate: new Date(2026, 4, 15) });
    expect(report.insufficient).toBe(true);
    expect(report.pairs).toEqual([]);
  });

  it('lead/lag identifies a contract that consistently moves a month before another', () => {
    const months = buildMonths(2026, 4, 12);
    // a leads b: b's value at month i mirrors a's at month i-1.
    const aSeries = [40, 60, 80, 100, 70, 50, 90, 110, 130, 80, 60, 100];
    const bSeries = aSeries.map((_, i) => (i === 0 ? 0 : aSeries[i - 1]));
    const sales = [
      ...months.map((m, i) => monthSale('c-a', m, aSeries[i], i)),
      ...months.map((m, i) => monthSale('c-b', m, bSeries[i], i)),
    ];
    const state: AppState = {
      ...emptyAppState(),
      contracts: [makeContract('c-a', 'Lead'), makeContract('c-b', 'Follower')],
      sales,
    };
    const report = buildCrossShoppingReport(state, { referenceDate: new Date(2026, 4, 15) });
    const followerEntry = report.leadLag.find((entry) => entry.contractId === 'c-b');
    expect(followerEntry?.leadIndicators.length ?? 0).toBeGreaterThan(0);
    expect(followerEntry?.leadIndicators[0].storeA).toBe('Lead');
  });

  it('exposes MIN_OVERLAP_MONTHS as a stable constant for callers', () => {
    expect(MIN_OVERLAP_MONTHS).toBe(4);
  });
});
