import { describe, expect, it } from 'vitest'
import {
  buildContractCommercialSnapshot,
  calculateCostoOcupacion,

  calculateVentaPorM2,
  contractDateRangesOverlap,
  convertAmountToClp,
  convertAmountToClpAt,
  createId,
  emptyAppState,
  getContractHealthScorePct,
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
  it('computes rent from fixedRent + currency, ignoring UF/m²', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-1',
      companyName: 'A SpA',
      storeName: 'Tienda A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      fixedRent: 2_500_000,
      variableRentPct: 5,
      // baseRentUF informativo, NO debe entrar al cálculo de rentFixed.
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
      fixedRentCurrency: 'CLP',
      commonExpensesCurrency: 'CLP',
      fondoPromocionCurrency: 'CLP',
      garantiaMontoCurrency: 'CLP',
      feeIngresoCurrency: 'CLP',
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
    // fixed rent = pacted monthly amount in CLP — NOT area * UF/m² * UF rate
    expect(t.rentFixed).toBe(2_500_000)
    // variable rent = 1_000_000 * 5% = 50_000
    expect(t.rentVariable).toBe(50_000)
    expect(t.rentTotal).toBe(t.rentFixed + t.rentVariable)
    const expectedCosto = ((t.rentTotal + 100_000 + 50_000) / 1_000_000) * 100
    expect(t.costoOcupacionPct).toBeCloseTo(expectedCosto)
    expect(t.ventaPorM2).toBe(20_000)
    expect(t.healthScore).toBe(3)
    expect(t.healthScorePct).toBe(60)
  })

  it('flags needsFixedRentReview when baseRentUF is set but fixedRent is 0', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-legacy',
      companyName: 'Legacy',
      storeName: 'Legacy',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      fixedRent: 0,
      variableRentPct: 0,
      baseRentUF: 0.5, // legacy UF/m² reference, no monthly amount yet
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
    const [t] = buildTenantSummaries(state, new Date('2024-06-15'))
    expect(t.needsFixedRentReview).toBe(true)
    // And rentFixed must NOT be auto-multiplied — it's 0 until the operator fills it.
    expect(t.rentFixed).toBe(0)
  })

  it('interprets fixedRent in UF when fixedRentCurrency is UF', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-2',
      companyName: 'B',
      storeName: 'B',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      fixedRent: 60,
      fixedRentCurrency: 'UF',
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
    const [t] = buildTenantSummaries(state, new Date('2024-06-15'))
    // 60 UF * 39000 = 2_340_000 — must NOT be multiplied by area
    expect(t.rentFixed).toBe(60 * 39000)
  })
})

describe('convertAmountToClpAt', () => {
  // Each fact has its own UF; the lookup is the seam.
  const ufByDate: Record<string, number> = {
    '2024-02-15': 36800,
    '2024-04-30': 37200,
    '2026-04-15': 39000,
  }
  const lookup = (date: string | Date) => {
    const iso = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
    return ufByDate[iso] ?? 0
  }

  it('uses the UF of the requested date, not today', () => {
    expect(convertAmountToClpAt(100, 'UF', '2024-02-15', lookup)).toBe(100 * 36800)
    expect(convertAmountToClpAt(100, 'UF', '2024-04-30', lookup)).toBe(100 * 37200)
  })

  it('returns CLP unchanged regardless of date', () => {
    expect(convertAmountToClpAt(2_500_000, 'CLP', '2024-02-15', lookup)).toBe(2_500_000)
  })

  it('falls back to "treat as CLP" when the lookup returns 0', () => {
    expect(convertAmountToClpAt(60, 'UF', '1999-01-01', lookup)).toBe(60)
  })

  it('returns 0 for non-finite input', () => {
    expect(convertAmountToClpAt(Number.NaN, 'UF', '2024-02-15', lookup)).toBe(0)
  })
})

describe('buildTenantSummaries with dated UF lookup', () => {
  it('uses the contract.startDate UF for garantía and the reference-month UF for renta fija', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-dated',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-15',
      endDate: '2026-12-31',
      // Renta y garantía pactadas en UF — el motor las convierte con su propia
      // fecha. fixedRentCurrency=UF se valoriza con la UF de referenceDate;
      // garantiaMontoCurrency=UF se valoriza con la UF de contract.startDate.
      fixedRent: 60,
      fixedRentCurrency: 'UF',
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
      garantiaMonto: 100,
      garantiaMontoCurrency: 'UF',
      garantiaVencimiento: '',
      feeIngreso: 0,
      rentSteps: [],
      healthPagoAlDia: true,
      healthEntregaVentas: true,
      healthNivelVenta: false,
      healthNivelRenta: false,
      healthPercepcionAdmin: true,
      createdAt: '2024-01-15T00:00:00Z',
    }
    const state = { ...emptyAppState(), units: [unit], contracts: [contract] }
    const lookup = (date: string | Date) => {
      const iso = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
      if (iso.startsWith('2024-01')) return 36800
      if (iso.startsWith('2024-04')) return 37200
      return 39000
    }
    const [t] = buildTenantSummaries(state, new Date('2024-04-15'), lookup)
    // rentFixed con UF de abril 2024 → 60 * 37200
    expect(t.rentFixed).toBe(60 * 37200)
    // garantiaMontoClp con UF de la fecha de inicio (enero 2024) → 100 * 36800
    expect(t.garantiaMontoClp).toBe(100 * 36800)
  })
})

describe('convertAmountToClp', () => {
  it('converts UF amounts using ufValue', () => {
    expect(convertAmountToClp(60, 'UF', 39000)).toBe(60 * 39000)
  })
  it('returns CLP value as-is', () => {
    expect(convertAmountToClp(2_500_000, 'CLP', 39000)).toBe(2_500_000)
  })
  it('handles missing currency as CLP', () => {
    expect(convertAmountToClp(1_000, undefined, 39000)).toBe(1_000)
  })
  it('falls back to CLP when ufValue is 0', () => {
    // Defensive: a stale or unset UF rate should not zero-out a UF amount.
    expect(convertAmountToClp(60, 'UF', 0)).toBe(60)
  })
  it('returns 0 for non-finite input', () => {
    expect(convertAmountToClp(Number.NaN, 'CLP', 39000)).toBe(0)
    expect(convertAmountToClp(Number.POSITIVE_INFINITY, 'UF', 39000)).toBe(0)
  })
})

describe('getContractHealthScorePct', () => {
  const make = (n: 0 | 1 | 2 | 3 | 4 | 5): Contract => ({
    id: 'c-h',
    companyName: 'A',
    storeName: 'A',
    category: 'X',
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
    healthPagoAlDia: n >= 1,
    healthEntregaVentas: n >= 2,
    healthNivelVenta: n >= 3,
    healthNivelRenta: n >= 4,
    healthPercepcionAdmin: n >= 5,
    createdAt: '2024-01-01T00:00:00Z',
  })

  it('returns 0/20/40/60/80/100', () => {
    expect(getContractHealthScorePct(make(0))).toBe(0)
    expect(getContractHealthScorePct(make(1))).toBe(20)
    expect(getContractHealthScorePct(make(2))).toBe(40)
    expect(getContractHealthScorePct(make(3))).toBe(60)
    expect(getContractHealthScorePct(make(4))).toBe(80)
    expect(getContractHealthScorePct(make(5))).toBe(100)
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

  it('creates occupation-cost alert when costoOcupacionPct > 20', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-occ',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      // 2.0M renta + 0.3M GC sobre 10M de ventas = 23% costo ocupación.
      fixedRent: 2_000_000,
      variableRentPct: 0,
      baseRentUF: 0,
      commonExpenses: 300_000,
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
    const state = {
      ...emptyAppState(),
      units: [unit],
      contracts: [contract],
      sales: [
        { id: 's1', contractId: 'c-occ', localIds: ['u1'], storeLabel: 'A', source: 'manual' as const, occurredAt: '2024-06-15', grossAmount: 10_000_000, importedAt: '2024-06-15T00:00:00Z' },
      ],
    }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `occupation-cost-${contract.id}` && a.type === 'warning')).toBe(true)
  })

  it('does not create occupation-cost alert when under threshold', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-occ-ok',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      // 2.0M renta + 0.3M GC sobre 20M de ventas = 11.5% — bajo umbral.
      fixedRent: 2_000_000,
      variableRentPct: 0,
      baseRentUF: 0,
      commonExpenses: 300_000,
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
    const state = {
      ...emptyAppState(),
      units: [unit],
      contracts: [contract],
      sales: [
        { id: 's1', contractId: 'c-occ-ok', localIds: ['u1'], storeLabel: 'A', source: 'manual' as const, occurredAt: '2024-06-15', grossAmount: 20_000_000, importedAt: '2024-06-15T00:00:00Z' },
      ],
    }
    const alerts = buildAlerts(state, new Date('2024-06-15'))
    expect(alerts.some((a) => a.id === `occupation-cost-${contract.id}`)).toBe(false)
  })

  it('does not create occupation-cost alert when there are no sales (denominator undefined)', () => {
    const unit: AssetUnit = { id: 'u1', code: 'L1', label: 'Local 1', areaM2: 50, level: 'P1' }
    const contract: Contract = {
      id: 'c-occ-zero',
      companyName: 'A',
      storeName: 'A',
      category: 'Retail',
      localIds: ['u1'],
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      fixedRent: 5_000_000,
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
    expect(alerts.some((a) => a.id.startsWith('occupation-cost-'))).toBe(false)
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
  it('computes fixed, variable and occupancy from monthly fixedRent + currency', () => {
    const snapshot = buildContractCommercialSnapshot({
      baseRentUF: 12, // informativo, no debe entrar al cálculo
      rentSteps: [],
      fixedRent: 60,
      fixedRentCurrency: 'UF',
      variableRentPct: 5,
      commonExpenses: 100000,
      commonExpensesCurrency: 'CLP',
      fondoPromocion: 50000,
      fondoPromocionCurrency: 'CLP',
    }, 100, 20000000, new Date('2026-04-15'), 40000)

    expect(snapshot.effectiveBaseRentUF).toBe(12)
    // 60 UF * 40000 = 2_400_000
    expect(snapshot.fixedRent).toBe(2_400_000)
    expect(snapshot.variableRent).toBe(1_000_000)
    // total = 2_400_000 + 1_000_000 + 100_000 + 50_000
    expect(snapshot.totalOccupancyCost).toBe(3_550_000)
  })

  it('treats CLP fixedRent as monthly and ignores baseRentUF', () => {
    const snapshot = buildContractCommercialSnapshot({
      baseRentUF: 0,
      rentSteps: [],
      fixedRent: 2_500_000,
      fixedRentCurrency: 'CLP',
      variableRentPct: 8,
      commonExpenses: 0,
      fondoPromocion: 0,
    }, 50, 1_000_000, new Date('2026-04-15'), 40000)

    expect(snapshot.fixedRent).toBe(2_500_000)
    expect(snapshot.variableRent).toBe(80_000)
    expect(snapshot.rentTotal).toBe(2_580_000)
  })
})
