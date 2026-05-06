// Track 5 — transparent renewal scoring.
//
// Per-contract renewal-probability badge from a weighted score over inputs the
// operator can audit. Returned shape includes every contributing factor with
// its weight and value, so the LocatarioDetail expander can show *why* the
// score is what it is. Calibrated to a 0–100 percent.
//
// Inputs (each maps to [0..1] before being weighted):
//   - health5 (5-bucket score / 5)            — weight 0.30
//   - salesTrend (3-month slope vs trailing)  — weight 0.20
//   - occupancyCost (lower = better)          — weight 0.15
//   - timeToExpiryFavorable (sweet spot)      — weight 0.10
//   - signed (firmado vs not)                 — weight 0.10
//   - tenure (longer relationship)            — weight 0.10
//   - garantiaCurrent                         — weight 0.05
//
// The weights sum to 1.00. They're exposed as a const so tests can assert
// weight invariants and the UI can render the breakdown.
import {
  buildContractCommercialSnapshot,
  diffInDays,
  getContractHealthScore,
  getContractLifecycle,
  monthKey,
  startOfToday,
  type AppState,
  type Contract,
  type SaleRecord,
  type UfLookup,
} from '@/lib/domain';

export interface RenewalFactor {
  key:
    | 'health5'
    | 'salesTrend'
    | 'occupancyCost'
    | 'timeToExpiryFavorable'
    | 'signed'
    | 'tenure'
    | 'garantiaCurrent';
  label: string;
  weight: number;
  // Normalized contribution in [0, 1]; the displayed multiplier is value*weight.
  value: number;
  detail: string;
}

export interface RenewalScore {
  contractId: string;
  // Probability percentage in [0, 100].
  probability: number;
  bucket: 'alto' | 'medio' | 'bajo' | 'na';
  factors: RenewalFactor[];
  computedAt: string;
}

export const RENEWAL_FACTOR_WEIGHTS: Record<RenewalFactor['key'], number> = {
  health5: 0.3,
  salesTrend: 0.2,
  occupancyCost: 0.15,
  timeToExpiryFavorable: 0.1,
  signed: 0.1,
  tenure: 0.1,
  garantiaCurrent: 0.05,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function buildSalesTrendValue(contract: Contract, sales: SaleRecord[], referenceDate: Date): number {
  // Score = how the trailing 3 months compare to the 3 months before that.
  // 1.0 means the recent quarter is ≥ 1.5x prior; 0.0 means ≤ 0.5x.
  const recent = monthBucket(contract.id, sales, referenceDate, 0, 3);
  const prior = monthBucket(contract.id, sales, referenceDate, 3, 6);
  if (recent === 0 && prior === 0) return 0.5; // unknown — neutral
  if (prior === 0) return recent > 0 ? 0.7 : 0.5;
  const ratio = recent / prior;
  // Map 0.5 → 0.0, 1.0 → 0.5, 1.5+ → 1.0
  return clamp01((ratio - 0.5) / 1.0);
}

function monthBucket(
  contractId: string,
  sales: SaleRecord[],
  referenceDate: Date,
  startOffset: number,
  endOffset: number,
): number {
  let total = 0;
  for (const sale of sales) {
    if (sale.contractId !== contractId) continue;
    const saleDate = new Date(sale.occurredAt);
    if (Number.isNaN(saleDate.getTime())) continue;
    const monthsBack =
      (referenceDate.getFullYear() - saleDate.getFullYear()) * 12 +
      (referenceDate.getMonth() - saleDate.getMonth());
    if (monthsBack >= startOffset && monthsBack < endOffset) {
      total += sale.grossAmount;
    }
  }
  return total;
}

function buildTimeToExpiryValue(contract: Contract, referenceDate: Date): number {
  const end = new Date(contract.endDate);
  if (Number.isNaN(end.getTime())) return 0.5;
  const days = diffInDays(referenceDate, end);
  // Sweet spot for a renewable conversation: 60–365 days out.
  // < 30 days: too late for a clean renewal → 0.2
  // 30–60: 0.5
  // 60–365: 1.0
  // 365–720: 0.6 (too early, low signal)
  // > 720: 0.4
  if (days < 0) return 0;
  if (days < 30) return 0.2;
  if (days < 60) return 0.5;
  if (days <= 365) return 1.0;
  if (days <= 720) return 0.6;
  return 0.4;
}

function buildTenureValue(contract: Contract, referenceDate: Date): number {
  const start = new Date(contract.startDate);
  if (Number.isNaN(start.getTime())) return 0.3;
  const months = Math.max(0, diffInDays(start, referenceDate) / 30);
  // < 6m: 0.2, 6–18: 0.5, 18–48: 0.8, 48+: 1.0
  if (months < 6) return 0.2;
  if (months < 18) return 0.5;
  if (months < 48) return 0.8;
  return 1.0;
}

function buildOccupancyCostValue(
  contract: Contract,
  sales: SaleRecord[],
  referenceDate: Date,
  getUfFor: UfLookup | number,
): number {
  const month = monthKey(referenceDate);
  const monthSales = sales
    .filter((s) => s.contractId === contract.id && monthKey(s.occurredAt) === month)
    .reduce((sum, s) => sum + s.grossAmount, 0);
  if (monthSales <= 0) return 0.5; // no data — neutral
  const snapshot = buildContractCommercialSnapshot(
    contract,
    0,
    monthSales,
    referenceDate,
    getUfFor,
  );
  // < 10% → 1.0, 10–15 → 0.8, 15–20 → 0.5, 20–25 → 0.25, > 25 → 0.05.
  const pct = snapshot.costoOcupacionPct;
  if (pct < 10) return 1.0;
  if (pct < 15) return 0.8;
  if (pct < 20) return 0.5;
  if (pct < 25) return 0.25;
  return 0.05;
}

function buildGarantiaCurrentValue(contract: Contract, referenceDate: Date): number {
  if (!contract.garantiaVencimiento) return 0.5; // unknown — neutral
  const date = new Date(contract.garantiaVencimiento);
  if (Number.isNaN(date.getTime())) return 0.5;
  if (date < referenceDate) return 0.0; // expired
  const days = diffInDays(referenceDate, date);
  if (days < 30) return 0.5;
  return 1.0;
}

function bucketFromProbability(probability: number): RenewalScore['bucket'] {
  if (probability >= 70) return 'alto';
  if (probability >= 40) return 'medio';
  return 'bajo';
}

export function buildRenewalScore(
  contract: Contract,
  state: Pick<AppState, 'sales'>,
  options: { referenceDate?: Date; getUfFor?: UfLookup | number } = {},
): RenewalScore {
  const referenceDate = options.referenceDate ?? startOfToday();
  const getUfFor = options.getUfFor ?? 39000;
  const lifecycle = getContractLifecycle(contract, referenceDate);

  // Vencido contracts can't be renewed in-place — bail to bucket "na" so the UI
  // can show "no aplica".
  if (lifecycle === 'vencido') {
    return {
      contractId: contract.id,
      probability: 0,
      bucket: 'na',
      factors: [],
      computedAt: referenceDate.toISOString(),
    };
  }

  const factors: RenewalFactor[] = [];
  const health5 = getContractHealthScore(contract) / 5;
  factors.push({
    key: 'health5',
    label: 'Salud 5-buckets',
    weight: RENEWAL_FACTOR_WEIGHTS.health5,
    value: clamp01(health5),
    detail: `${getContractHealthScore(contract)} / 5 checks aprobados`,
  });

  const salesTrend = buildSalesTrendValue(contract, state.sales, referenceDate);
  factors.push({
    key: 'salesTrend',
    label: 'Tendencia de ventas',
    weight: RENEWAL_FACTOR_WEIGHTS.salesTrend,
    value: salesTrend,
    detail: 'Trimestre reciente vs. trimestre previo',
  });

  const occupancyCost = buildOccupancyCostValue(contract, state.sales, referenceDate, getUfFor);
  factors.push({
    key: 'occupancyCost',
    label: 'Costo de ocupación',
    weight: RENEWAL_FACTOR_WEIGHTS.occupancyCost,
    value: occupancyCost,
    detail: 'Menor es mejor; >20% castiga la probabilidad',
  });

  const timeToExpiry = buildTimeToExpiryValue(contract, referenceDate);
  factors.push({
    key: 'timeToExpiryFavorable',
    label: 'Ventana al vencimiento',
    weight: RENEWAL_FACTOR_WEIGHTS.timeToExpiryFavorable,
    value: timeToExpiry,
    detail: 'Sweet spot: 60–365 días al vencimiento',
  });

  const signed = contract.signatureStatus === 'firmado' ? 1 : 0.3;
  factors.push({
    key: 'signed',
    label: 'Firma',
    weight: RENEWAL_FACTOR_WEIGHTS.signed,
    value: signed,
    detail: contract.signatureStatus === 'firmado' ? 'Firmado' : `Estado: ${contract.signatureStatus}`,
  });

  const tenure = buildTenureValue(contract, referenceDate);
  factors.push({
    key: 'tenure',
    label: 'Antigüedad',
    weight: RENEWAL_FACTOR_WEIGHTS.tenure,
    value: tenure,
    detail: 'Vínculos largos correlacionan con renovación',
  });

  const garantia = buildGarantiaCurrentValue(contract, referenceDate);
  factors.push({
    key: 'garantiaCurrent',
    label: 'Garantía vigente',
    weight: RENEWAL_FACTOR_WEIGHTS.garantiaCurrent,
    value: garantia,
    detail: contract.garantiaVencimiento
      ? `Vence ${contract.garantiaVencimiento}`
      : 'Sin fecha registrada',
  });

  const score = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
  const probability = Math.round(clamp01(score) * 100);
  return {
    contractId: contract.id,
    probability,
    bucket: bucketFromProbability(probability),
    factors,
    computedAt: referenceDate.toISOString(),
  };
}
