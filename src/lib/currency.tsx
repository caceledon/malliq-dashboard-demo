import { createContext, useContext, useState, type ReactNode } from 'react';

export type CurrencyCode = 'UF' | 'CLP';

interface CurrencyContextValue {
  currency: CurrencyCode;
  ufValue: number;
  ufUpdatedAt: number; // epoch ms; tracks the last operator edit of ufValue
  setCurrency: (code: CurrencyCode) => void;
  setUfValue: (value: number) => void;
  formatCurrency: (amountClp: number, options?: { decimals?: number; unit?: CurrencyCode }) => string;
  convertToDisplay: (amountClp: number) => number;
  convertFromDisplay: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = 'malliq-currency-prefs';

function loadPrefs(): { currency: CurrencyCode; ufValue: number; ufUpdatedAt: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currency: parsed.currency === 'UF' ? 'UF' : 'CLP',
        ufValue: typeof parsed.ufValue === 'number' ? parsed.ufValue : 39000,
        ufUpdatedAt: typeof parsed.ufUpdatedAt === 'number' ? parsed.ufUpdatedAt : 0,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { currency: 'CLP', ufValue: 39000, ufUpdatedAt: 0 };
}

/* eslint-disable react-refresh/only-export-components */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const prefs = loadPrefs();
  const [currency, setCurrencyState] = useState<CurrencyCode>(prefs.currency);
  const [ufValue, setUfValueState] = useState<number>(prefs.ufValue);
  const [ufUpdatedAt, setUfUpdatedAt] = useState<number>(prefs.ufUpdatedAt);

  const persist = (nextCurrency: CurrencyCode, nextUf: number, nextUpdatedAt: number) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ currency: nextCurrency, ufValue: nextUf, ufUpdatedAt: nextUpdatedAt }),
    );
  };

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    persist(code, ufValue, ufUpdatedAt);
  };

  const setUfValue = (value: number) => {
    const stamp = Date.now();
    setUfValueState(value);
    setUfUpdatedAt(stamp);
    persist(currency, value, stamp);
  };

  const convertToDisplay = (amountClp: number): number => {
    if (currency === 'UF' && ufValue > 0) {
      return amountClp / ufValue;
    }
    return amountClp;
  };

  const convertFromDisplay = (amount: number): number => {
    if (currency === 'UF' && ufValue > 0) {
      return amount * ufValue;
    }
    return amount;
  };

  const formatCurrency = (amountClp: number, options?: { decimals?: number; unit?: CurrencyCode }): string => {
    const unit = options?.unit ?? currency;
    const decimals = options?.decimals ?? (unit === 'UF' ? 2 : 0);
    const value = unit === 'UF' && ufValue > 0 ? amountClp / ufValue : amountClp;

    if (unit === 'UF') {
      return `${value.toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} UF`;
    }

    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        ufValue,
        ufUpdatedAt,
        setCurrency,
        setUfValue,
        formatCurrency,
        convertToDisplay,
        convertFromDisplay,
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
