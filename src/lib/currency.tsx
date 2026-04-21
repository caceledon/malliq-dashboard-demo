import { createContext, useContext, useState, type ReactNode } from 'react';

export type CurrencyCode = 'UF' | 'CLP';

interface CurrencyContextValue {
  currency: CurrencyCode;
  ufValue: number;
  setCurrency: (code: CurrencyCode) => void;
  setUfValue: (value: number) => void;
  formatCurrency: (amountClp: number, options?: { decimals?: number; unit?: CurrencyCode }) => string;
  convertToDisplay: (amountClp: number) => number;
  convertFromDisplay: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = 'malliq-currency-prefs';

function loadPrefs(): { currency: CurrencyCode; ufValue: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currency: parsed.currency === 'UF' ? 'UF' : 'CLP',
        ufValue: typeof parsed.ufValue === 'number' ? parsed.ufValue : 39000,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { currency: 'CLP', ufValue: 39000 };
}

/* eslint-disable react-refresh/only-export-components */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const prefs = loadPrefs();
  const [currency, setCurrencyState] = useState<CurrencyCode>(prefs.currency);
  const [ufValue, setUfValueState] = useState<number>(prefs.ufValue);

  const persist = (nextCurrency: CurrencyCode, nextUf: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currency: nextCurrency, ufValue: nextUf }));
  };

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    persist(code, ufValue);
  };

  const setUfValue = (value: number) => {
    setUfValueState(value);
    persist(currency, value);
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
