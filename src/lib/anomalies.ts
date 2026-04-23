import type { AppState, AlertItem, Contract, SaleRecord } from '@/lib/domain';

const MIN_MONTHS_FOR_ZSCORE = 4;
const MODIFIED_Z_WARN = 3.5;
const MODIFIED_Z_CRITICAL = 5;
const MOM_DROP_THRESHOLD = 0.5;
const WINDOW_MONTHS = 6;

export type AnomalyDirection = 'high' | 'low';

export interface SalesAnomaly {
  contractId?: string;
  storeLabel: string;
  month: string;
  value: number;
  median: number;
  modifiedZ: number;
  direction: AnomalyDirection;
  severity: 'warning' | 'critical';
  reason: 'statistical_outlier' | 'sudden_drop';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function groupSalesByContractMonth(sales: SaleRecord[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const sale of sales) {
    const key = sale.contractId ?? `__store:${sale.storeLabel.toLowerCase()}`;
    const month = monthKey(sale.occurredAt);
    if (!out.has(key)) out.set(key, new Map());
    const monthMap = out.get(key)!;
    monthMap.set(month, (monthMap.get(month) ?? 0) + sale.grossAmount);
  }
  return out;
}

function recentMonths(referenceDate: Date, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Modified z-score anomaly detection per tenant/month, plus a month-over-month
 * sudden-drop guard that fires even when history is too short for z-score.
 *
 * The modified z-score (Iglewicz & Hoaglin) uses MAD instead of standard
 * deviation so a single extreme point doesn't mask its own anomaly.
 *
 * Returns anomalies sorted by severity then magnitude.
 */
export function detectSalesAnomalies(
  state: AppState,
  referenceDate: Date = new Date(),
): SalesAnomaly[] {
  if (state.sales.length === 0) return [];

  const windowMonths = recentMonths(referenceDate, WINDOW_MONTHS);
  const windowSet = new Set(windowMonths);
  const byContract = groupSalesByContractMonth(state.sales);
  const contractLookup = new Map<string, Contract>();
  for (const contract of state.contracts) {
    contractLookup.set(contract.id, contract);
  }

  const anomalies: SalesAnomaly[] = [];

  for (const [key, monthMap] of byContract.entries()) {
    const contract = key.startsWith('__store:') ? undefined : contractLookup.get(key);
    const storeLabel =
      contract?.storeName ?? key.replace(/^__store:/, '').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

    // Series in window order; missing months become 0 so drops are visible.
    const series = windowMonths.map((m) => ({ month: m, value: monthMap.get(m) ?? 0 }));
    const observed = series.filter((p) => monthMap.has(p.month));

    if (observed.length >= MIN_MONTHS_FOR_ZSCORE) {
      const values = observed.map((p) => p.value);
      const med = median(values);
      const absoluteDeviations = values.map((v) => Math.abs(v - med));
      const mad = median(absoluteDeviations);
      const denominator = mad === 0 ? 0 : 1.4826 * mad;

      if (denominator > 0) {
        for (const point of observed) {
          const z = (point.value - med) / denominator;
          const absZ = Math.abs(z);
          if (absZ >= MODIFIED_Z_WARN && windowSet.has(point.month)) {
            anomalies.push({
              contractId: contract?.id,
              storeLabel,
              month: point.month,
              value: point.value,
              median: med,
              modifiedZ: z,
              direction: z > 0 ? 'high' : 'low',
              severity: absZ >= MODIFIED_Z_CRITICAL ? 'critical' : 'warning',
              reason: 'statistical_outlier',
            });
          }
        }
      }
    }

    // Month-over-month sudden drop (even with short history): compare the
    // latest observed month to the trailing 3-month average excluding itself.
    if (observed.length >= 2) {
      const lastIndex = series.findIndex((p) => p.month === observed[observed.length - 1].month);
      const latest = series[lastIndex];
      if (latest && latest.value > 0) {
        const priorThree = series.slice(Math.max(0, lastIndex - 3), lastIndex).filter((p) => p.value > 0);
        if (priorThree.length >= 2) {
          const avg = priorThree.reduce((sum, p) => sum + p.value, 0) / priorThree.length;
          if (avg > 0 && latest.value <= avg * (1 - MOM_DROP_THRESHOLD)) {
            const alreadyFlagged = anomalies.some(
              (a) => a.contractId === contract?.id && a.month === latest.month && a.storeLabel === storeLabel,
            );
            if (!alreadyFlagged) {
              anomalies.push({
                contractId: contract?.id,
                storeLabel,
                month: latest.month,
                value: latest.value,
                median: avg,
                modifiedZ: 0,
                direction: 'low',
                severity: 'warning',
                reason: 'sudden_drop',
              });
            }
          }
        }
      }
    }
  }

  return anomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return Math.abs(b.modifiedZ) - Math.abs(a.modifiedZ);
  });
}

const MONTH_LABELS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatMonthEs(month: string): string {
  const [, mm] = month.split('-');
  const idx = Number(mm) - 1;
  return MONTH_LABELS_ES[idx] ?? month;
}

function formatAmountShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export function anomaliesToAlerts(anomalies: SalesAnomaly[], referenceDate: Date = new Date()): AlertItem[] {
  const now = referenceDate.toISOString();
  return anomalies.map((anomaly) => {
    const mesLabel = formatMonthEs(anomaly.month);
    const title =
      anomaly.reason === 'sudden_drop'
        ? `Caída de ventas: ${anomaly.storeLabel}`
        : anomaly.direction === 'high'
          ? `Pico inusual de ventas: ${anomaly.storeLabel}`
          : `Ventas bajo lo esperado: ${anomaly.storeLabel}`;
    const deltaPct =
      anomaly.median > 0 ? ((anomaly.value - anomaly.median) / anomaly.median) * 100 : 0;
    const signo = deltaPct >= 0 ? '+' : '';
    const description =
      anomaly.reason === 'sudden_drop'
        ? `${mesLabel}: ${formatAmountShort(anomaly.value)} vs promedio reciente ${formatAmountShort(anomaly.median)} (${signo}${deltaPct.toFixed(0)}%).`
        : `${mesLabel}: ${formatAmountShort(anomaly.value)} vs mediana histórica ${formatAmountShort(anomaly.median)} (z ${anomaly.modifiedZ.toFixed(1)}).`;
    return {
      id: `anomaly:${anomaly.contractId ?? anomaly.storeLabel}:${anomaly.month}:${anomaly.reason}`,
      type: anomaly.severity,
      title,
      description,
      createdAt: now,
      contractId: anomaly.contractId,
    };
  });
}
