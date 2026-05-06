import { describe, expect, it } from 'vitest';
import { buildRenewalScore, RENEWAL_FACTOR_WEIGHTS } from './renewal';
import type { Contract, SaleRecord } from './domain';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    companyName: 'A',
    storeName: 'A',
    category: 'Retail',
    localIds: ['u1'],
    startDate: '2023-01-01',
    endDate: '2026-12-31',
    fixedRent: 1_500_000,
    variableRentPct: 4,
    baseRentUF: 0,
    commonExpenses: 100_000,
    fondoPromocion: 0,
    salesParticipationPct: 4,
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
    healthNivelVenta: true,
    healthNivelRenta: true,
    healthPercepcionAdmin: true,
    createdAt: '2023-01-01T00:00:00Z',
    ...overrides,
  };
}

function monthSale(contractId: string, month: string, amount: number): SaleRecord {
  return {
    id: `${contractId}-${month}`,
    contractId,
    localIds: [],
    storeLabel: contractId,
    source: 'manual',
    occurredAt: `${month}-15`,
    grossAmount: amount,
    importedAt: `${month}-15T00:00:00Z`,
  };
}

describe('buildRenewalScore', () => {
  it('weights sum to 1', () => {
    const total = Object.values(RENEWAL_FACTOR_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0);
  });

  it('high-health, signed, recent-rising sales, sweet-spot expiry → high bucket', () => {
    const contract = makeContract({
      endDate: '2026-09-30', // 5 months out from 2026-04-15
    });
    const sales: SaleRecord[] = [
      monthSale('c-1', '2026-01', 5_000_000),
      monthSale('c-1', '2026-02', 5_500_000),
      monthSale('c-1', '2026-03', 6_000_000),
      monthSale('c-1', '2025-10', 3_500_000),
      monthSale('c-1', '2025-11', 3_700_000),
      monthSale('c-1', '2025-12', 4_000_000),
    ];
    const score = buildRenewalScore(
      contract,
      { sales },
      { referenceDate: new Date('2026-04-15') },
    );
    expect(score.probability).toBeGreaterThan(70);
    expect(score.bucket).toBe('alto');
    expect(score.factors).toHaveLength(7);
  });

  it('zero-health, dropping sales, > 25% occupancy → bajo bucket', () => {
    const contract = makeContract({
      endDate: '2026-08-30',
      healthPagoAlDia: false,
      healthEntregaVentas: false,
      healthNivelVenta: false,
      healthNivelRenta: false,
      healthPercepcionAdmin: false,
      // Force high occupancy with low sales
      fixedRent: 3_000_000,
      commonExpenses: 200_000,
    });
    const sales: SaleRecord[] = [
      monthSale('c-1', '2026-01', 1_500_000),
      monthSale('c-1', '2026-02', 1_400_000),
      monthSale('c-1', '2026-03', 1_300_000),
      monthSale('c-1', '2025-10', 4_000_000),
      monthSale('c-1', '2025-11', 4_200_000),
      monthSale('c-1', '2025-12', 4_500_000),
      monthSale('c-1', '2026-04', 1_300_000), // current month for occupancy
    ];
    const score = buildRenewalScore(
      contract,
      { sales },
      { referenceDate: new Date('2026-04-15') },
    );
    expect(score.bucket).toBe('bajo');
    expect(score.probability).toBeLessThan(40);
  });

  it('vencido contract returns na bucket and 0 probability', () => {
    const contract = makeContract({ endDate: '2024-01-01' });
    const score = buildRenewalScore(contract, { sales: [] }, { referenceDate: new Date('2026-04-15') });
    expect(score.bucket).toBe('na');
    expect(score.probability).toBe(0);
    expect(score.factors).toEqual([]);
  });

  it('exposes the breakdown for the operator audit expander', () => {
    const score = buildRenewalScore(
      makeContract({ endDate: '2026-09-30' }),
      { sales: [] },
      { referenceDate: new Date('2026-04-15') },
    );
    const keys = score.factors.map((f) => f.key);
    expect(keys).toEqual([
      'health5',
      'salesTrend',
      'occupancyCost',
      'timeToExpiryFavorable',
      'signed',
      'tenure',
      'garantiaCurrent',
    ]);
    for (const factor of score.factors) {
      expect(factor.value).toBeGreaterThanOrEqual(0);
      expect(factor.value).toBeLessThanOrEqual(1);
    }
  });

  it('penalizes contracts vencidos en menos de 30 días via timeToExpiry', () => {
    const tooClose = buildRenewalScore(
      makeContract({ endDate: '2026-04-25' }),
      { sales: [] },
      { referenceDate: new Date('2026-04-15') },
    );
    const sweet = buildRenewalScore(
      makeContract({ endDate: '2026-09-15' }),
      { sales: [] },
      { referenceDate: new Date('2026-04-15') },
    );
    expect(sweet.probability).toBeGreaterThan(tooClose.probability);
  });
});
