import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface UndoToastState {
  id: number;
  message: string;
  onUndo: () => void;
  expiresAt: number;
}

interface UndoToastContextValue {
  showUndo: (message: string, onUndo: () => void, ttlMs?: number) => void;
  dismiss: () => void;
}

const UndoToastContext = createContext<UndoToastContextValue | undefined>(undefined);

const DEFAULT_TTL = 8000;

/* eslint-disable react-refresh/only-export-components */
export function UndoToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const showUndo = useCallback((message: string, onUndo: () => void, ttlMs = DEFAULT_TTL) => {
    clearTimer();
    const id = Date.now();
    setToast({ id, message, onUndo, expiresAt: Date.now() + ttlMs });
    timerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      timerRef.current = null;
    }, ttlMs);
  }, []);

  useEffect(() => () => clearTimer(), []);

  return (
    <UndoToastContext.Provider value={{ showUndo, dismiss }}>
      {children}
      {toast ? (
        <div
          className="mq-card"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 220,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 320,
            maxWidth: '92vw',
            boxShadow: 'var(--shadow-pop)',
            animation: 'toastEnter 180ms ease-out',
          }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--ok)', flex: 'none' }} />
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-1)' }}>{toast.message}</div>
          <button
            type="button"
            className="mq-btn sm"
            onClick={() => {
              toast.onUndo();
              dismiss();
            }}
            style={{ fontWeight: 600 }}
          >
            Deshacer
          </button>
          <button type="button" className="iconbtn" onClick={dismiss} title="Cerrar">
            <X size={14} />
          </button>
        </div>
      ) : null}
    </UndoToastContext.Provider>
  );
}

export function useUndoToast(): UndoToastContextValue {
  const ctx = useContext(UndoToastContext);
  if (!ctx) {
    throw new Error('useUndoToast must be used within UndoToastProvider');
  }
  return ctx;
}
