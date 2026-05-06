import { describe, expect, it } from 'vitest';
import { computeCamReconciliation, summarizeCam } from './cam';
import { emptyAppState, type AppState, type AssetUnit, type Contract } from './domain';

function unit(id: string, areaM2: number): AssetUnit {
  return { id, code: id.toUpperCase(), label: id, areaM2, level: 'P1' };
}

function contract(id: string, localIds: string[], commonExpenses: number, storeName = id): Contract {
  return {
    id,
    companyName: storeName,
    storeName,
    category: 'Retail',
    localIds,
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    fixedRent: 0,
    variableRentPct: 0,
    baseRentUF: 0,
    commonExpenses,
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

describe('computeCamReconciliation', () => {
  it('distributes line-item total by GLA proportionally', () => {
    const state: AppState = {
      ...emptyAppState(),
      units: [unit('u1', 100), unit('u2', 50)],
      contracts: [contract('c-1', ['u1'], 200_000), contract('c-2', ['u2'], 80_000)],
    };
    const recon = computeCamReconciliation(
      state,
      [
        { id: 'l-1', description: 'Aseo', amountClp: 600_000 },
        { id: 'l-2', description: 'Seguridad', amountClp: 400_000 },
      ],
      { basis: 'gla', periodLabel: '2026-Q1', asOf: new Date('2026-04-15') },
    );

    // c-1: 100/150 of 1_000_000 → 666_667 expected, collected 200_000 → -466_667 delta
    const c1 = recon.tenants.find((t) => t.contractId === 'c-1');
    expect(c1?.expectedClp).toBe(Math.round(1_000_000 * (100 / 150)));
    expect(c1?.collectedClp).toBe(200_000);
    expect(c1?.deltaClp).toBe(c1!.collectedClp - c1!.expectedClp);
  });

  it('flat basis splits the cost equally across active contracts', () => {
    const state: AppState = {
      ...emptyAppState(),
      units: [unit('u1', 100), unit('u2', 50)],
      contracts: [contract('c-1', ['u1'], 100_000), contract('c-2', ['u2'], 100_000)],
    };
    const recon = computeCamReconciliation(state, [{ id: 'l-1', description: 'Total', amountClp: 800_000 }], {
      basis: 'flat',
      periodLabel: '2026',
      asOf: new Date('2026-04-15'),
    });
    expect(recon.tenants).toHaveLength(2);
    expect(recon.tenants[0].expectedClp).toBe(400_000);
    expect(recon.tenants[1].expectedClp).toBe(400_000);
  });

  it('summary tallies surplus and shortfall tenants', () => {
    const state: AppState = {
      ...emptyAppState(),
      units: [unit('u1', 100), unit('u2', 100)],
      contracts: [contract('c-1', ['u1'], 600_000), contract('c-2', ['u2'], 100_000)],
    };
    const recon = computeCamReconciliation(state, [{ id: 'l-1', description: 'Total', amountClp: 800_000 }], {
      basis: 'flat',
      periodLabel: '2026',
      asOf: new Date('2026-04-15'),
    });
    const summary = summarizeCam(recon);
    expect(summary.totalActualClp).toBe(800_000);
    expect(summary.totalCollectedClp).toBe(700_000);
    expect(summary.totalDeltaClp).toBe(-100_000);
    expect(summary.surplusTenants).toBe(1); // c-1 paid more than its share
    expect(summary.shortfallTenants).toBe(1); // c-2 paid less
  });

  it('handles zero totals and zero contracts gracefully', () => {
    const recon = computeCamReconciliation(emptyAppState(), [], {
      basis: 'gla',
      periodLabel: 'empty',
      asOf: new Date('2026-04-15'),
    });
    expect(recon.tenants).toEqual([]);
    expect(summarizeCam(recon).totalActualClp).toBe(0);
  });

  it('excludes vencido contracts from the share denominator', () => {
    const expired = contract('c-old', ['u1'], 50_000);
    expired.endDate = '2024-12-31';
    const active = contract('c-2', ['u2'], 100_000);
    const state: AppState = {
      ...emptyAppState(),
      units: [unit('u1', 100), unit('u2', 100)],
      contracts: [expired, active],
    };
    const recon = computeCamReconciliation(state, [{ id: 'l-1', description: 'Total', amountClp: 200_000 }], {
      basis: 'gla',
      periodLabel: '2026',
      asOf: new Date('2026-04-15'),
    });
    expect(recon.tenants.map((t) => t.contractId)).toEqual(['c-2']);
    expect(recon.tenants[0].expectedClp).toBe(200_000);
  });
});
