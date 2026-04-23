import { describe, expect, it } from 'vitest';
import { detectSalesAnomalies, anomaliesToAlerts } from './anomalies';
import { emptyAppState, type AppState, type Contract, type SaleRecord } from './domain';

const REFERENCE_DATE = new Date('2026-04-15T12:00:00');

function contract(id: string, storeName: string): Contract {
  return {
    id,
    companyName: storeName,
    storeName,
    category: 'otros',
    localIds: ['u1'],
    areaM2: 100,
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    baseRentUF: 1,
    variableRentPct: 0,
    commonExpenses: 0,
    fondoPromocion: 0,
    garantiaMonto: 0,
    feeIngreso: 0,
    escalation: 'Anual IPC',
    signatureStatus: 'firmado',
    annexCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    autoFillUnits: true,
    manualStoreName: '',
  } as unknown as Contract;
}

function sale(id: string, contractId: string | undefined, month: string, amount: number, storeLabel = 'Acme'): SaleRecord {
  return {
    id,
    contractId,
    localIds: ['u1'],
    storeLabel,
    source: 'manual',
    occurredAt: `${month}-15T12:00:00`,
    grossAmount: amount,
    importedAt: '2026-04-15T00:00:00Z',
  };
}

function stateWithSales(contracts: Contract[], sales: SaleRecord[]): AppState {
  return { ...emptyAppState(), contracts, sales };
}

describe('detectSalesAnomalies', () => {
  it('returns no anomalies for empty state', () => {
    expect(detectSalesAnomalies(emptyAppState(), REFERENCE_DATE)).toEqual([]);
  });

  it('returns no anomalies when variance is low', () => {
    const c = contract('c1', 'Acme');
    const sales = [
      sale('s1', 'c1', '2025-11', 1_000_000),
      sale('s2', 'c1', '2025-12', 1_050_000),
      sale('s3', 'c1', '2026-01', 970_000),
      sale('s4', 'c1', '2026-02', 1_010_000),
      sale('s5', 'c1', '2026-03', 980_000),
      sale('s6', 'c1', '2026-04', 1_020_000),
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([c], sales), REFERENCE_DATE);
    expect(anomalies).toEqual([]);
  });

  it('flags a high-spike outlier via modified z-score', () => {
    const c = contract('c1', 'Acme');
    const sales = [
      sale('s1', 'c1', '2025-11', 1_000_000),
      sale('s2', 'c1', '2025-12', 1_020_000),
      sale('s3', 'c1', '2026-01', 980_000),
      sale('s4', 'c1', '2026-02', 1_010_000),
      sale('s5', 'c1', '2026-03', 990_000),
      sale('s6', 'c1', '2026-04', 5_000_000), // spike
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([c], sales), REFERENCE_DATE);
    const spike = anomalies.find((a) => a.month === '2026-04' && a.reason === 'statistical_outlier');
    expect(spike).toBeDefined();
    expect(spike?.direction).toBe('high');
    expect(spike?.contractId).toBe('c1');
    expect(Math.abs(spike!.modifiedZ)).toBeGreaterThan(3.5);
  });

  it('flags a low-dip outlier and promotes to critical at z>=5', () => {
    const c = contract('c1', 'Acme');
    const sales = [
      sale('s1', 'c1', '2025-11', 1_000_000),
      sale('s2', 'c1', '2025-12', 1_020_000),
      sale('s3', 'c1', '2026-01', 980_000),
      sale('s4', 'c1', '2026-02', 1_010_000),
      sale('s5', 'c1', '2026-03', 990_000),
      sale('s6', 'c1', '2026-04', 20_000), // near-zero crash
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([c], sales), REFERENCE_DATE);
    const dip = anomalies.find((a) => a.month === '2026-04' && a.reason === 'statistical_outlier');
    expect(dip).toBeDefined();
    expect(dip?.direction).toBe('low');
    expect(dip?.severity).toBe('critical');
  });

  it('flags a sudden drop even with short history (<4 months)', () => {
    const c = contract('c1', 'Acme');
    const sales = [
      sale('s1', 'c1', '2026-02', 1_000_000),
      sale('s2', 'c1', '2026-03', 1_000_000),
      sale('s3', 'c1', '2026-04', 200_000), // 80% drop
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([c], sales), REFERENCE_DATE);
    const drop = anomalies.find((a) => a.reason === 'sudden_drop');
    expect(drop).toBeDefined();
    expect(drop?.direction).toBe('low');
  });

  it('falls back to storeLabel when sales have no contractId', () => {
    const sales = [
      sale('s1', undefined, '2025-11', 1_000_000, 'Ghost Store'),
      sale('s2', undefined, '2025-12', 1_020_000, 'Ghost Store'),
      sale('s3', undefined, '2026-01', 980_000, 'Ghost Store'),
      sale('s4', undefined, '2026-02', 1_010_000, 'Ghost Store'),
      sale('s5', undefined, '2026-03', 990_000, 'Ghost Store'),
      sale('s6', undefined, '2026-04', 6_000_000, 'Ghost Store'),
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([], sales), REFERENCE_DATE);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].contractId).toBeUndefined();
    expect(anomalies[0].storeLabel.toLowerCase()).toContain('ghost');
  });

  it('sorts results by severity then magnitude', () => {
    const c1 = contract('c1', 'Store1');
    const c2 = contract('c2', 'Store2');
    const warnings = [
      sale('a1', 'c1', '2025-11', 1_000_000),
      sale('a2', 'c1', '2025-12', 1_020_000),
      sale('a3', 'c1', '2026-01', 980_000),
      sale('a4', 'c1', '2026-02', 1_010_000),
      sale('a5', 'c1', '2026-03', 990_000),
      sale('a6', 'c1', '2026-04', 2_500_000),
    ];
    const criticals = [
      sale('b1', 'c2', '2025-11', 500_000),
      sale('b2', 'c2', '2025-12', 520_000),
      sale('b3', 'c2', '2026-01', 490_000),
      sale('b4', 'c2', '2026-02', 505_000),
      sale('b5', 'c2', '2026-03', 495_000),
      sale('b6', 'c2', '2026-04', 10_000_000),
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([c1, c2], [...warnings, ...criticals]), REFERENCE_DATE);
    expect(anomalies[0].severity).toBe('critical');
  });
});

describe('anomaliesToAlerts', () => {
  it('maps anomalies to AlertItem shape with stable ids', () => {
    const c = contract('c1', 'Acme');
    const sales = [
      sale('s1', 'c1', '2025-11', 1_000_000),
      sale('s2', 'c1', '2025-12', 1_020_000),
      sale('s3', 'c1', '2026-01', 980_000),
      sale('s4', 'c1', '2026-02', 1_010_000),
      sale('s5', 'c1', '2026-03', 990_000),
      sale('s6', 'c1', '2026-04', 5_000_000),
    ];
    const anomalies = detectSalesAnomalies(stateWithSales([c], sales), REFERENCE_DATE);
    const alerts = anomaliesToAlerts(anomalies, REFERENCE_DATE);
    expect(alerts.length).toBe(anomalies.length);
    expect(alerts[0].id).toMatch(/^anomaly:/);
    expect(alerts[0].title.toLowerCase()).toMatch(/pico|ventas/);
    expect(alerts[0].contractId).toBe('c1');
  });
});
