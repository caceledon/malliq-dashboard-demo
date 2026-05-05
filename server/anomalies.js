// Server-side mirror of src/lib/anomalies.ts. Kept in plain JS so the digest
// endpoint can run without bundling the client. If the detection rules change,
// update both files.

const MIN_MONTHS_FOR_ZSCORE = 4;
const MODIFIED_Z_WARN = 3.5;
const MODIFIED_Z_CRITICAL = 5;
const MOM_DROP_THRESHOLD = 0.5;
const WINDOW_MONTHS = 6;

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function monthKey(dateIso) {
  return String(dateIso || '').slice(0, 7);
}

function groupSalesByContractMonth(sales) {
  const out = new Map();
  for (const sale of sales) {
    const key = sale.contractId ?? `__store:${String(sale.storeLabel ?? '').toLowerCase()}`;
    const month = monthKey(sale.occurredAt);
    if (!month) continue;
    if (!out.has(key)) out.set(key, new Map());
    const monthMap = out.get(key);
    monthMap.set(month, (monthMap.get(month) ?? 0) + Number(sale.grossAmount || 0));
  }
  return out;
}

function recentMonths(referenceDate, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function detectSalesAnomalies(state, referenceDate = new Date()) {
  if (!state || !Array.isArray(state.sales) || state.sales.length === 0) return [];

  const windowMonths = recentMonths(referenceDate, WINDOW_MONTHS);
  const windowSet = new Set(windowMonths);
  const byContract = groupSalesByContractMonth(state.sales);
  const contractLookup = new Map();
  for (const contract of state.contracts || []) {
    contractLookup.set(contract.id, contract);
  }

  const anomalies = [];

  for (const [key, monthMap] of byContract.entries()) {
    const contract = key.startsWith('__store:') ? undefined : contractLookup.get(key);
    const storeLabel =
      contract?.storeName ?? key.replace(/^__store:/, '').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

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

function formatMonthEs(month) {
  const [, mm] = String(month || '').split('-');
  const idx = Number(mm) - 1;
  return MONTH_LABELS_ES[idx] ?? month;
}

function formatAmountShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export function anomaliesToAlerts(anomalies, referenceDate = new Date()) {
  const now = referenceDate.toISOString();
  return anomalies.map((anomaly) => {
    const mesLabel = formatMonthEs(anomaly.month);
    const title =
      anomaly.reason === 'sudden_drop'
        ? `Caída de ventas: ${anomaly.storeLabel}`
        : anomaly.direction === 'high'
          ? `Pico inusual de ventas: ${anomaly.storeLabel}`
          : `Ventas bajo lo esperado: ${anomaly.storeLabel}`;
    const deltaPct = anomaly.median > 0 ? ((anomaly.value - anomaly.median) / anomaly.median) * 100 : 0;
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

export function buildRenewalAlerts(state, referenceDate = new Date(), windowDays = 30) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const out = [];
  for (const contract of state.contracts || []) {
    if (!contract?.endDate) continue;
    const endDate = new Date(contract.endDate);
    if (Number.isNaN(endDate.getTime())) continue;
    const days = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0 || days > windowDays) continue;
    const severity = days <= 7 ? 'critical' : days <= 15 ? 'warning' : 'info';
    out.push({
      id: `renewal:${contract.id}`,
      type: severity,
      title: `Renovación próxima: ${contract.storeName ?? contract.companyName ?? contract.id}`,
      description:
        days === 0
          ? `Vence hoy (${contract.endDate}).`
          : `Vence en ${days} día${days === 1 ? '' : 's'} (${contract.endDate}).`,
      createdAt: today.toISOString(),
      contractId: contract.id,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
