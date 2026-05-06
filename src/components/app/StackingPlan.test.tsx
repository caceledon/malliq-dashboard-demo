import { describe, expect, it } from 'vitest';
import { buildUnitStates } from '@/lib/stackingPlan';
import type { AssetUnit, Contract } from '@/lib/domain';

const baseContract = (overrides: Partial<Contract>): Contract => ({
  id: 'c-1',
  companyName: 'A',
  storeName: 'A',
  category: 'Retail',
  localIds: [],
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
  ...overrides,
});

describe('StackingPlan buildUnitStates', () => {
  const unit: AssetUnit = { id: 'u1', code: 'L01', label: 'Local 1', areaM2: 50, level: 'P1' };

  it('marks units without active contracts as vacante', () => {
    const states = buildUnitStates([unit], [], new Date('2026-04-15'));
    expect(states[0].status).toBe('vacante');
    expect(states[0].contract).toBeNull();
  });

  it('classifies an active contract as vigente at the reference date', () => {
    const contract = baseContract({ id: 'c-1', localIds: ['u1'], endDate: '2027-12-31' });
    const states = buildUnitStates([unit], [contract], new Date('2026-04-15'));
    expect(states[0].status).toBe('vigente');
    expect(states[0].contract?.id).toBe('c-1');
  });

  it('flips the unit to por_vencer when the scrubber crosses the 180-day threshold', () => {
    const contract = baseContract({ id: 'c-2', localIds: ['u1'], endDate: '2026-08-31' });
    const earlier = buildUnitStates([unit], [contract], new Date('2026-01-01'));
    const later = buildUnitStates([unit], [contract], new Date('2026-04-15'));
    expect(earlier[0].status).toBe('vigente');
    expect(later[0].status).toBe('por_vencer');
  });

  it('treats a contract that already ended as vacante (vencido is excluded)', () => {
    const contract = baseContract({ id: 'c-3', localIds: ['u1'], endDate: '2025-01-01' });
    const states = buildUnitStates([unit], [contract], new Date('2026-04-15'));
    expect(states[0].status).toBe('vacante');
  });
});
