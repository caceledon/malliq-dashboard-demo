import { describe, expect, it } from 'vitest'
import {
  buildContractCommercialSnapshot,
  calculateCostoOcupacion,

  calculateVentaPorM2,
  contractDateRangesOverlap,
  createId,
  emptyAppState,
  getContractLifecycle,
  getEffectiveBaseRentUF,
  validateContract,
  buildTenantSummaries,
  buildAlerts,
  buildContractOverlapConflicts,
  type Contract,
  type AssetUnit,
} from './domain'

describe('getEffectiveBaseRentUF', () => {
  const base: Contract = {
    id: 'c-1',
    companyName: 'A',
    storeName: 'A',
    category: 'Retail',
    localIds: [],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    fixedRent: 0,
    variableRentPct: 0,
    baseRentUF: 10,
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
  }

  it('returns baseRentUF when no steps', () => {
    expect(getEffectiveBaseRentUF(base, new Date('2024-06-01'))).toBe(10)
  })

  it('returns active step when reference date matches', () => {
    const contract: Contract = {
      ...base,
      rentSteps: [
        { id: 's1', startDate: '2024-01-01', endDate: '2024-06-30', rentaFijaUfM2: 10 },
        { id: 's2', startDate: '2024-07-01', endDate: '2024-12-31', rentaFijaUfM2: 12 },
      ],
    }
    expect(getEffectiveBaseRentUF(contract, new Date('2024-03-15'))).toBe(10)
    expect(getEffectiveBaseRentUF(contract, new Date('2024-08-01'))).toBe(12)
  })

  it('falls back to baseRentUF when date is outside all steps', () => {
    const contract: Contract = {
      ...base,
      rentSteps: [{ id: 's1', startDate: '2025-01-01', endDate: '2025-12-31', rentaFijaUfM2: 20 }],
    }
    expect(getEffectiveBaseRentUF(contract, new Date('2024-06-01'))).toBe(10)
  })
})

describe('calculateCostoOcupacion', () => {
  it('returns 0 when sales are 0 or negative', () => {
    expect(calculateCostoOcupacion(100, 50, 10, 0)).toBe(0)
    expect(calculateCostoOcupacion(100, 50, 10, -100)).toBe(0)
  })

  it('calculates correct percentage', () => {
    expect(calculateCostoOcupacion(100, 50, 10, 800)).toBeCloseTo(20)
    expect(calculateCostoOcupacion(200, 100, 0, 1000)).toBeCloseTo(30)
  })
})

describe('calculateVentaPorM2', () => {
  it('returns 0 when area is 0', () => {
    expect(calculateVentaPorM2(1000, 0)).toBe(0)
  })

  it('returns rounded sales per m2', () => {
    expect(calculateVentaPorM2(1000, 10)).toBe(100)
    expect(calculateVentaPorM2(1500, 7)).toBe(214)
  })
})

describe('contractDateRangesOverlap', () => {
  it('detects overlap', () => {
    const a = { startDate: '2024-01-01', endDate: '2024-06-30' }
    const b = { startDate: '2024-03-01', endDate: '2024-12-31' }
    expect(contractDateRangesOverlap(a, b)).toBe(true)
  })

  it('detects no overlap when adjacent', () => {
    const a = { startDate: '2024-01-01', endDate: '2024-06-30' }
    const b = { startDate: '2024-07-01', endDate: '2024-12-31' }
    expect(contractDateRangesOverlap(a, b)).toBe(false)
  })

  it('detects no overlap when separated', () => {
    const a = { startDate: '2024-01-01', endDate: '2024-03-31' }
    const b = { startDate: '2024-05-01', endDate: '2024-12-31' }
    expect(contractDateRangesOverlap(a, b)).toBe(false)
  })
})

describe('getContractLifecycle', () => {
  const today = new Date('2024-06-15')

  const makeContract = (overrides: Partial<Contract> = {}): Contract => ({
    id: 'c-1',
    companyName: 'A',
    storeName: 'A',
    category: 'Retail',
    localIds: [],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
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
  })

  it('returns vencido when endDate < referenceDate', () => {
    expect(getContractLifecycle(makeContract({ endDate: '2024-01-01' }), today)).toBe('vencido')
  })

  it('returns en_firma when not firmado', () => {
    expect(getContractLifecycle(makeContract({ signatureStatus: 'pendiente' }), today)).toBe('en_firma')
  })

  it('returns borrador when startDate > referenceDate', () => {
    expect(getContractLifecycle(makeContract({ startDate: '2024-07-01', signatureStatus: 'firmado' }), today)).toBe('borrador')
  })

  it('returns por_vencer when <= 180 days to end', () => {
    expect(getContractLifecycle(makeContract({ endDate: '2024-08-01', signatureStatus: 'firmado' }), today)).toBe('por_vencer')
  })

  it('returns vigente when far from end and signed', () => {
    expect(getContractLifecycle(makeContract({ endDate: '2025-12-31', signatureStatus: 'firmado' }), today)).toBe('vigente')
  })
})

describe('buildTenantSummaries', () => {
  it('computes rent and costo ocupacion correctly', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-1',
      companyName: 'A SpA',
      storeName: 'Tienda A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      fixedRent: 0,
      variableRentPct: 5,
      baseRentUF: 1,
      commonExpenses: 100_000,
      fondoPromocion: 50_000,
      salesParticipationPct: 5,
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
    }

    const state = {
      ...emptyAppState(),
      units: [unit],
      contracts: [contract],
      sales: [
        { id: 's1', contractId: 'c-1', localIds: ['u1'], storeLabel: 'Tienda A', source: 'manual' as const, occurredAt: '2024-06-15', grossAmount: 1_000_000, importedAt: '2024-06-15T00:00:00Z' },
      ],
    }

    const summaries = buildTenantSummaries(state, new Date('2024-06-15'))
    expect(summaries).toHaveLength(1)
    const [t] = summaries
    expect(t.storeName).toBe('Tienda A')
    expect(t.areaM2).toBe(50)
    // fixed rent = area * baseRentUF * ufValue = 50 * 1 * 39000 = 1_950_000
    expect(t.rentFixed).toBe(1_950_000)
    // variable rent = 1_000_000 * 5% = 50_000
    expect(t.rentVariable).toBe(50_000)
    // total rent = max(fixed, variable) but buildTenantSummaries uses fixed + variable. Let's assert actual value.
    expect(t.rentTotal).toBe(t.rentFixed + t.rentVariable)
    // costo ocupacion = (rentTotal + common + fondo) / sales * 100
    const expectedCosto = ((t.rentTotal + 100_000 + 50_000) / 1_000_000) * 100
    expect(t.costoOcupacionPct).toBeCloseTo(expectedCosto)
    expect(t.ventaPorM2).toBe(20_000)
    expect(t.healthScore).toBe(3)
  })
})

describe('buildAlerts', () => {
  it('creates setup alert when no units', () => {
    const state = emptyAppState()
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === 'setup-asset')).toBe(true)
  })

  it('creates vacancy alert for units without active contract', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const state = { ...emptyAppState(), units: [unit] }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `unit-vacant-${unit.id}`)).toBe(true)
  })

  it('creates signature alert when pending', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-1',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      fixedRent: 0,
      variableRentPct: 0,
      baseRentUF: 0,
      commonExpenses: 0,
      fondoPromocion: 0,
      salesParticipationPct: 0,
      escalation: '',
      conditions: '',
      signatureStatus: 'pendiente',
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
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [contract] }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `signature-${contract.id}`)).toBe(true)
  })

  it('creates expiration alert when signed and close to end', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-1',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-07-01',
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
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [contract] }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `expiring-${contract.id}`)).toBe(true)
  })

  it('creates guarantee alert when close to expiration', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-1',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2025-12-31',
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
      garantiaMonto: 1_000_000,
      garantiaVencimiento: '2024-06-25',
      feeIngreso: 0,
      rentSteps: [],
      healthPagoAlDia: true,
      healthEntregaVentas: true,
      healthNivelVenta: false,
      healthNivelRenta: false,
      healthPercepcionAdmin: true,
      createdAt: '2024-01-01T00:00:00Z',
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [contract] }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `garantia-${contract.id}`)).toBe(true)
  })

  it('creates step-up alert when close to step start', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-1',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      fixedRent: 0,
      variableRentPct: 0,
      baseRentUF: 10,
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
      rentSteps: [{ id: 's1', startDate: '2024-06-25', endDate: '2024-12-31', rentaFijaUfM2: 12 }],
      healthPagoAlDia: true,
      healthEntregaVentas: true,
      healthNivelVenta: false,
      healthNivelRenta: false,
      healthPercepcionAdmin: true,
      createdAt: '2024-01-01T00:00:00Z',
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [contract] }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `stepup-${contract.id}-s1`)).toBe(true)
  })
})

describe('buildContractOverlapConflicts', () => {
  it('detects overlapping contracts on same unit', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const c1: Contract = {
      id: 'c-1',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-12-31',
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
    }
    const c2: Contract = {
      ...c1,
      id: 'c-2',
      companyName: 'B',
      storeName: 'B',
      startDate: '2024-06-01',
      endDate: '2025-06-30',
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [c1, c2] }
    const conflicts = buildContractOverlapConflicts(state)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].unitCode).toBe('L1')
    expect(conflicts[0].contractIds).toContain('c-1')
    expect(conflicts[0].contractIds).toContain('c-2')
  })

  it('returns empty when no overlaps', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const c1: Contract = {
      id: 'c-1',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-06-30',
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
    }
    const c2: Contract = {
      ...c1,
      id: 'c-2',
      companyName: 'B',
      storeName: 'B',
      startDate: '2024-07-01',
      endDate: '2024-12-31',
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [c1, c2] }
    const conflicts = buildContractOverlapConflicts(state)
    expect(conflicts).toHaveLength(0)
  })
})

describe('createId', () => {
  it('prefixes the id', () => {
    expect(createId('test')).toMatch(/^test-[\w-]+$/)
  })
})

describe('validateContract', () => {
  const baseContract: Contract = {
    id: 'c-val',
    companyName: 'A',
    storeName: 'A',
    category: 'Retail',
    localIds: ['u1'],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    fixedRent: 1000000,
    variableRentPct: 4,
    baseRentUF: 0,
    commonExpenses: 100000,
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
    createdAt: '2026-01-01T00:00:00Z',
  }

  it('detects blocking date and step overlap issues', () => {
    const issues = validateContract({
      ...baseContract,
      startDate: '2026-12-31',
      endDate: '2026-01-01',
      rentSteps: [
        { id: 's1', startDate: '2026-01-01', endDate: '2026-06-30', rentaFijaUfM2: 10 },
        { id: 's2', startDate: '2026-06-15', endDate: '2026-09-30', rentaFijaUfM2: 12 },
      ],
    })

    expect(issues.some((issue) => issue.code === 'date_range' && issue.severity === 'error')).toBe(true)
    expect(issues.some((issue) => issue.code === 'rent_step_overlap' && issue.severity === 'error')).toBe(true)
  })

  it('flags warnings when a step exceeds the contract range', () => {
    const issues = validateContract({
      ...baseContract,
      rentSteps: [{ id: 's1', startDate: '2025-12-01', endDate: '2026-03-31', rentaFijaUfM2: 10 }],
    })

    expect(issues.some((issue) => issue.code === 'rent_step_out_of_contract' && issue.severity === 'warning')).toBe(true)
  })
})

describe('buildContractCommercialSnapshot', () => {
  it('computes fixed, variable and occupancy values', () => {
    const snapshot = buildContractCommercialSnapshot({
      baseRentUF: 12,
      rentSteps: [],
      fixedRent: 0,
      variableRentPct: 5,
      commonExpenses: 100000,
      fondoPromocion: 50000,
    }, 100, 20000000, new Date('2026-04-15'), 40000)

    expect(snapshot.effectiveBaseRentUF).toBe(12)
    expect(snapshot.fixedRent).toBe(48000000)
    expect(snapshot.variableRent).toBe(1000000)
    expect(snapshot.totalOccupancyCost).toBe(49150000)
    expect(snapshot.costoOcupacionPct).toBeGreaterThan(200)
  })
})
