import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchUfForDate, fetchUfLatest, fetchUfRange, resolveApiBase, type UfRate } from '@/lib/api';
import { chileIsoDay } from '@/lib/dateChile';

// CurrencyProvider sits above AppStateProvider in the tree, so it can't read
// state.asset.backendUrl directly. resolveApiBase() with no arg honors the
// VITE_API_BASE_URL env var and falls back to '/api' — that matches every
// other call site in src/lib/api.ts.
const API_BASE = resolveApiBase();

export type CurrencyCode = 'UF' | 'CLP';

interface CurrencyContextValue {
  currency: CurrencyCode;
  /** Latest known UF value. Falls back to the most recent cached entry if remote is down. */
  ufValue: number;
  /** ISO date (YYYY-MM-DD) of `ufValue`. */
  latestUfDate: string | null;
  /** Epoch ms when `ufValue` was last refreshed (server fetch or operator override). */
  ufUpdatedAt: number;
  /** Date-keyed cache: 'YYYY-MM-DD' -> UF value. */
  ufRates: Record<string, number>;
  setCurrency: (code: CurrencyCode) => void;
  /** Look up the UF for a date synchronously. Falls back to nearest earlier date, then the latest entry. Returns 0 only when nothing is known. */
  getUfFor: (dateLike: string | Date) => number;
  /** Async fetch + cache for a specific date. Deduplicates concurrent requests. */
  ensureUfFor: (dateLike: string | Date) => Promise<number>;
  /** Pull the latest UF from /api/uf/latest and merge into cache. */
  refreshLatestUf: () => Promise<void>;
  /** Operator override for a specific date (admin path when remote is wrong). */
  setUfOverride: (date: string, value: number) => void;
  formatCurrency: (
    amountClp: number,
    options?: { decimals?: number; unit?: CurrencyCode; atDate?: string | Date },
  ) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = 'malliq-currency-prefs';
const RATES_STORAGE_KEY = 'malliq-uf-rates-cache';
const FALLBACK_UF = 39000;

function isoFromInput(date: string | Date): string {
  if (date instanceof Date) {
    return chileIsoDay(date);
  }
  return String(date).slice(0, 10);
}

interface PersistedPrefs {
  currency: CurrencyCode;
  latestUfDate: string | null;
  ufUpdatedAt: number;
}

function loadPrefs(): PersistedPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currency: parsed.currency === 'UF' ? 'UF' : 'CLP',
        latestUfDate: typeof parsed.latestUfDate === 'string' ? parsed.latestUfDate : null,
        ufUpdatedAt: typeof parsed.ufUpdatedAt === 'number' ? parsed.ufUpdatedAt : 0,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { currency: 'CLP', latestUfDate: null, ufUpdatedAt: 0 };
}

function loadRates(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, number> = {};
        for (const [date, value] of Object.entries(parsed)) {
          if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof value === 'number' && value > 0) {
            out[date] = value;
          }
        }
        return out;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

function persistPrefs(prefs: PersistedPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage may be full or disabled
  }
}

function persistRates(rates: Record<string, number>) {
  try {
    // Keep at most ~5 years of daily rates to avoid bloating localStorage.
    const entries = Object.entries(rates).sort(([a], [b]) => a.localeCompare(b));
    const trimmed = entries.slice(-5 * 365);
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // ignore quota errors
  }
}

/* eslint-disable react-refresh/only-export-components */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const prefs = loadPrefs();
  const [currency, setCurrencyState] = useState<CurrencyCode>(prefs.currency);
  const [ufRates, setUfRates] = useState<Record<string, number>>(() => loadRates());
  const [latestUfDate, setLatestUfDate] = useState<string | null>(prefs.latestUfDate);
  const [ufUpdatedAt, setUfUpdatedAt] = useState<number>(prefs.ufUpdatedAt);
  const inflightRef = useRef<Map<string, Promise<number>>>(new Map());

  // Persist rates cache whenever it grows.
  useEffect(() => {
    persistRates(ufRates);
  }, [ufRates]);

  const ufValue = useMemo(() => {
    if (latestUfDate && ufRates[latestUfDate]) return ufRates[latestUfDate];
    const dates = Object.keys(ufRates).sort();
    if (dates.length === 0) return FALLBACK_UF;
    return ufRates[dates[dates.length - 1]] ?? FALLBACK_UF;
  }, [latestUfDate, ufRates]);

  const getUfFor = useCallback(
    (dateLike: string | Date): number => {
      const target = isoFromInput(dateLike);
      if (!target) return ufValue;
      if (ufRates[target]) return ufRates[target];
      // Walk backwards to the nearest earlier rate (UF only publishes business days).
      const dates = Object.keys(ufRates);
      let bestDate: string | null = null;
      for (const date of dates) {
        if (date <= target && (bestDate === null || date > bestDate)) {
          bestDate = date;
        }
      }
      if (bestDate) return ufRates[bestDate];
      return ufValue;
    },
    [ufRates, ufValue],
  );

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    persistPrefs({ currency: code, latestUfDate, ufUpdatedAt });
  }, [latestUfDate, ufUpdatedAt]);

  const refreshLatestUf = useCallback(async () => {
    try {
      const result = await fetchUfLatest(API_BASE);
      setUfRates((current) => ({ ...current, [result.date]: result.value }));
      setLatestUfDate(result.date);
      const stamp = Date.now();
      setUfUpdatedAt(stamp);
      persistPrefs({ currency, latestUfDate: result.date, ufUpdatedAt: stamp });
    } catch {
      // Network errors are silently ignored — getUfFor falls back to cached or default UF.
    }
  }, [currency]);

  const ensureUfFor = useCallback(
    async (dateLike: string | Date): Promise<number> => {
      const target = isoFromInput(dateLike);
      if (!target) return ufValue;
      if (ufRates[target]) return ufRates[target];
      // De-dup concurrent requests.
      const existing = inflightRef.current.get(target);
      if (existing) return existing;
      const promise = (async () => {
        try {
          const result = await fetchUfForDate(API_BASE, target);
          setUfRates((current) => ({ ...current, [result.date]: result.value }));
          return result.value;
        } catch {
          return getUfFor(target);
        } finally {
          inflightRef.current.delete(target);
        }
      })();
      inflightRef.current.set(target, promise);
      return promise;
    },
    [ufRates, ufValue, getUfFor],
  );

  const setUfOverride = useCallback(
    (date: string, value: number) => {
      const iso = isoFromInput(date);
      if (!iso || !Number.isFinite(value) || value <= 0) return;
      setUfRates((current) => ({ ...current, [iso]: value }));
      if (iso >= (latestUfDate ?? '0000-00-00')) {
        setLatestUfDate(iso);
        const stamp = Date.now();
        setUfUpdatedAt(stamp);
        persistPrefs({ currency, latestUfDate: iso, ufUpdatedAt: stamp });
      }
    },
    [currency, latestUfDate],
  );

  const formatCurrency = useCallback(
    (amountClp: number, options?: { decimals?: number; unit?: CurrencyCode; atDate?: string | Date }): string => {
      const unit = options?.unit ?? currency;
      const decimals = options?.decimals ?? (unit === 'UF' ? 2 : 0);
      const uf = options?.atDate ? getUfFor(options.atDate) : ufValue;
      const value = unit === 'UF' && uf > 0 ? amountClp / uf : amountClp;

      if (unit === 'UF') {
        return `${value.toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} UF`;
      }

      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },
    [currency, getUfFor, ufValue],
  );

  // On mount: pull the latest UF and backfill the current + previous calendar
  // year so chart series render with per-month rates without per-cell waterfalls.
  useEffect(() => {
    void refreshLatestUf();
    const today = new Date();
    const todayIso = chileIsoDay(today);
    const year = Number(todayIso.slice(0, 4));
    const from = `${year - 1}-01-01`;
    const to = todayIso;
    fetchUfRange(API_BASE, from, to)
      .then(({ rates }) => {
        if (rates.length === 0) return;
        setUfRates((current) => {
          const next = { ...current };
          for (const row of rates as UfRate[]) {
            if (!next[row.date]) next[row.date] = row.value;
          }
          return next;
        });
      })
      .catch(() => {
        // ignore — getUfFor still resolves with whatever is cached
      });
  }, [refreshLatestUf]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        ufValue,
        latestUfDate,
        ufUpdatedAt,
        ufRates,
        setCurrency,
        getUfFor,
        ensureUfFor,
        refreshLatestUf,
        setUfOverride,
        formatCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}
