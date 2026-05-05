import {
  getLatestUfRate,
  getUfRate,
  getUfRateOnOrBefore,
  listUfRates,
  upsertUfRate,
} from './db.js';

const MINDICADOR_BASE = 'https://mindicador.cl/api/uf';
const FETCH_TIMEOUT_MS = 5000;

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

// UF rates are published per Chilean calendar day; use America/Santiago so
// "today" doesn't roll forward during the ~21:00–24:00 Chile window when the
// server's UTC clock has already crossed midnight.
const CL_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function chileIsoDay(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return CL_DAY_FORMATTER.format(date);
}

function isoToday() {
  return chileIsoDay();
}

function isoFromYmd(date) {
  // Accepts a Date or 'YYYY-MM-DD' string and returns 'YYYY-MM-DD'.
  if (date instanceof Date) return chileIsoDay(date);
  return String(date).slice(0, 10);
}

function ymdToDmy(date) {
  // mindicador.cl expects 'dd-mm-yyyy'.
  const [y, m, d] = String(date).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}

function parseMindicadorDate(value) {
  // mindicador returns ISO strings with a Chilean offset, e.g.
  // "2026-04-29T03:00:00.000Z". Reduce to YYYY-MM-DD in UTC, which lines up
  // with the date the indicator was published for.
  if (typeof value !== 'string') return null;
  const direct = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  return null;
}

async function fetchJson(url) {
  const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal, headers: { 'User-Agent': 'malliq-uf-cache/1.0' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    cancel();
  }
}

/**
 * Fetch the UF for a single date from mindicador.cl. The endpoint returns the
 * latest *vigente* value if the requested date has no publication (weekends,
 * future dates), so we trust whatever value comes back and key the cache by
 * the response's own date — not the request date.
 */
export async function fetchUfFromMindicador(isoDate) {
  const url = `${MINDICADOR_BASE}/${ymdToDmy(isoDate)}`;
  const payload = await fetchJson(url);
  const series = Array.isArray(payload?.serie) ? payload.serie : [];
  if (series.length === 0) {
    throw new Error('Respuesta sin serie UF');
  }
  const head = series[0];
  const date = parseMindicadorDate(head.fecha);
  const value = Number(head.valor);
  if (!date || !Number.isFinite(value) || value <= 0) {
    throw new Error('Respuesta UF inválida');
  }
  await upsertUfRate(date, value);
  return { date, value };
}

/**
 * Fetch the entire year's UF series. Used for backfill so a new install or
 * a chart with a wide range only round-trips once per year touched.
 */
export async function fetchUfYear(year) {
  const url = `${MINDICADOR_BASE}/${year}`;
  const payload = await fetchJson(url);
  const series = Array.isArray(payload?.serie) ? payload.serie : [];
  const inserted = [];
  for (const item of series) {
    const date = parseMindicadorDate(item?.fecha);
    const value = Number(item?.valor);
    if (date && Number.isFinite(value) && value > 0) {
      await upsertUfRate(date, value);
      inserted.push({ date, value });
    }
  }
  return inserted;
}

/**
 * Make sure every business day in [from, to] has a row in uf_rates. Cheap when
 * already cached: a single SELECT range and a fetchUfYear per missing year.
 */
export async function ensureUfRange(from, to) {
  const fromIso = isoFromYmd(from);
  const toIso = isoFromYmd(to);
  if (fromIso > toIso) return [];

  const cached = await listUfRates({ from: fromIso, to: toIso });
  // Heuristic: fewer than ~5 rows per month covered means the range was never
  // backfilled. UF publishes ~21 business days/month, so the threshold is
  // generous enough to skip refetching after a one-time backfill.
  const monthsSpanned = (() => {
    const fromYM = fromIso.slice(0, 7);
    const toYM = toIso.slice(0, 7);
    const [fy, fm] = fromYM.split('-').map(Number);
    const [ty, tm] = toYM.split('-').map(Number);
    return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
  })();
  const expectedAtLeast = Math.max(1, Math.floor(monthsSpanned * 5));
  if (cached.length >= expectedAtLeast) {
    return cached;
  }

  const fromYear = Number(fromIso.slice(0, 4));
  const toYear = Number(toIso.slice(0, 4));
  for (let year = fromYear; year <= toYear; year += 1) {
    try {
      await fetchUfYear(year);
    } catch {
      // Tolerate the occasional remote failure; we still return whatever is
      // cached so the caller can degrade gracefully.
    }
  }
  return listUfRates({ from: fromIso, to: toIso });
}

/**
 * Resolve the UF for `date`:
 *   1. exact cache hit (preferred);
 *   2. nearest earlier cache row;
 *   3. fetch from mindicador, cache, and return whatever it gave us;
 *   4. fall back to the latest row in the cache, even if older.
 *
 * Always returns `{date, value, source}` or null when nothing is known
 * (fresh install, mindicador down).
 */
export async function resolveUfForDate(isoDate) {
  const target = isoFromYmd(isoDate);
  const exact = await getUfRate(target);
  if (exact) return { ...exact, source: 'cache' };

  try {
    const fetched = await fetchUfFromMindicador(target);
    return { ...fetched, fetchedAt: new Date().toISOString(), source: 'remote' };
  } catch {
    // ignore
  }

  const previous = await getUfRateOnOrBefore(target);
  if (previous) return { ...previous, source: 'cache_prior' };

  const latest = await getLatestUfRate();
  if (latest) return { ...latest, source: 'cache_latest' };

  return null;
}

export async function resolveLatestUf({ maxAgeMs = 24 * 60 * 60 * 1000 } = {}) {
  const today = isoToday();
  const exact = await getUfRate(today);
  const stale = exact && Date.now() - new Date(exact.fetchedAt).getTime() > maxAgeMs;
  if (exact && !stale) return { ...exact, source: 'cache' };

  try {
    const fetched = await fetchUfFromMindicador(today);
    return { ...fetched, fetchedAt: new Date().toISOString(), source: 'remote' };
  } catch {
    const latest = await getLatestUfRate();
    if (latest) return { ...latest, source: 'cache_latest', stale: true };
    return null;
  }
}
