// Track 9 — cross-shopping signals.
//
// Pure-analytics module: derives correlation between tenants from their
// monthly sales-time series alone (no device-panel data needed). Imperfect
// but free signal that helps tenant-mix decisions and surfaces anchor
// effects.
//
// Methodology:
// - Build a (contractId → monthYYYYMM → grossAmount) matrix from sales.
// - Restrict to a window (default last 12 months including current).
// - Compute Pearson correlation between every pair of contracts for which
//   both have ≥4 non-zero months of overlap. Below that overlap, correlation
//   is unstable on monthly data — better to surface "insufficient data" than
//   a noisy ±1.
// - Returns ranked pairs, plus per-contract "leaders" and "laggards" derived
//   from one-month-shifted correlations (which contract reliably moves a
//   month before / after another).
import { addMonths, monthKey, type AppState, type Contract } from '@/lib/domain';

export interface ContractPairCorrelation {
  contractA: string;
  contractB: string;
  storeA: string;
  storeB: string;
  pearson: number;
  overlapMonths: number;
}

export interface TenantLeadLag {
  contractId: string;
  storeName: string;
  // contracts whose sales move a month *before* this one (this contract lags them).
  leadIndicators: ContractPairCorrelation[];
  // contracts whose sales move a month *after* this one (this contract leads them).
  laggingFollowers: ContractPairCorrelation[];
}

export interface CrossShoppingReport {
  windowMonths: number;
  generatedFor: string; // YYYY-MM month bucket of the reference date
  pairs: ContractPairCorrelation[]; // ordered by |pearson| desc
  leadLag: TenantLeadLag[];
  contractCount: number;
  insufficient: boolean; // true when fewer than 2 contracts have viable series
}

export const MIN_OVERLAP_MONTHS = 4;
export const STRONG_THRESHOLD = 0.6;

function buildMonthlySeries(
  state: AppState,
  windowMonths: number,
  referenceDate: Date,
): { contracts: Contract[]; months: string[]; series: Map<string, number[]> } {
  const months: string[] = [];
  for (let offset = -(windowMonths - 1); offset <= 0; offset += 1) {
    const date = addMonths(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), offset);
    months.push(monthKey(date));
  }
  const monthIndex = new Map(months.map((m, i) => [m, i]));

  const series = new Map<string, number[]>();
  const contracts = state.contracts;
  for (const contract of contracts) {
    series.set(contract.id, new Array(windowMonths).fill(0));
  }
  for (const sale of state.sales) {
    if (!sale.contractId) continue;
    const idx = monthIndex.get(monthKey(sale.occurredAt));
    if (idx === undefined) continue;
    const arr = series.get(sale.contractId);
    if (!arr) continue;
    arr[idx] += sale.grossAmount;
  }
  return { contracts, months, series };
}

function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  if (denomA === 0 || denomB === 0) return null;
  return num / Math.sqrt(denomA * denomB);
}

function overlapPositions(a: number[], b: number[]): number[] {
  const positions: number[] = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] > 0 && b[i] > 0) positions.push(i);
  }
  return positions;
}

export function buildCrossShoppingReport(
  state: AppState,
  options: { windowMonths?: number; referenceDate?: Date } = {},
): CrossShoppingReport {
  const windowMonths = options.windowMonths ?? 12;
  const referenceDate = options.referenceDate ?? new Date();
  const { contracts, series } = buildMonthlySeries(state, windowMonths, referenceDate);
  const storeName = new Map(contracts.map((c) => [c.id, c.storeName || c.companyName || c.id]));

  const ids = contracts.map((c) => c.id);
  const pairs: ContractPairCorrelation[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = series.get(ids[i])!;
      const b = series.get(ids[j])!;
      const overlap = overlapPositions(a, b);
      if (overlap.length < MIN_OVERLAP_MONTHS) continue;
      const aSlice = overlap.map((k) => a[k]);
      const bSlice = overlap.map((k) => b[k]);
      const r = pearson(aSlice, bSlice);
      if (r === null || !Number.isFinite(r)) continue;
      pairs.push({
        contractA: ids[i],
        contractB: ids[j],
        storeA: storeName.get(ids[i]) ?? ids[i],
        storeB: storeName.get(ids[j]) ?? ids[j],
        pearson: Number(r.toFixed(3)),
        overlapMonths: overlap.length,
      });
    }
  }

  pairs.sort((l, r) => Math.abs(r.pearson) - Math.abs(l.pearson));

  // Lead/lag: for each pair, compare correlation at lag=0 vs lag=+1 (B shifted forward by 1 month).
  // If lag=+1 correlation is materially stronger than lag=0, A leads B; vice versa with lag=-1.
  const leadLagByContract = new Map<string, TenantLeadLag>();
  for (const id of ids) {
    leadLagByContract.set(id, {
      contractId: id,
      storeName: storeName.get(id) ?? id,
      leadIndicators: [],
      laggingFollowers: [],
    });
  }

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = 0; j < ids.length; j += 1) {
      if (i === j) continue;
      const a = series.get(ids[i])!;
      const b = series.get(ids[j])!;
      // Compare a[0..n-2] with b[1..n-1] (a leads b by one month).
      const aShift = a.slice(0, -1);
      const bShift = b.slice(1);
      const overlap = overlapPositions(aShift, bShift);
      if (overlap.length < MIN_OVERLAP_MONTHS) continue;
      const aSlice = overlap.map((k) => aShift[k]);
      const bSlice = overlap.map((k) => bShift[k]);
      const r = pearson(aSlice, bSlice);
      if (r === null || r < STRONG_THRESHOLD) continue;
      const pair: ContractPairCorrelation = {
        contractA: ids[i],
        contractB: ids[j],
        storeA: storeName.get(ids[i]) ?? ids[i],
        storeB: storeName.get(ids[j]) ?? ids[j],
        pearson: Number(r.toFixed(3)),
        overlapMonths: overlap.length,
      };
      // ids[i] leads ids[j]
      leadLagByContract.get(ids[j])!.leadIndicators.push(pair);
      leadLagByContract.get(ids[i])!.laggingFollowers.push(pair);
    }
  }

  return {
    windowMonths,
    generatedFor: monthKey(referenceDate),
    pairs,
    leadLag: Array.from(leadLagByContract.values()),
    contractCount: contracts.length,
    insufficient: pairs.length === 0,
  };
}

export function summarizeCrossShoppingPair(pair: ContractPairCorrelation): string {
  const direction = pair.pearson >= 0 ? 'sube y baja con' : 'se mueve en contra de';
  const strength = Math.abs(pair.pearson) >= STRONG_THRESHOLD ? 'fuertemente' : 'moderadamente';
  return `${pair.storeA} ${strength} ${direction} ${pair.storeB} (${pair.pearson}).`;
}
