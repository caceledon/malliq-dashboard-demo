/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const icon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const borderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-l-emerald-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col-reverse gap-3" style={{ minWidth: 340, maxWidth: 480 }}>
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`toast-enter flex items-start gap-3 rounded-2xl border border-[var(--border-color)] ${borderColor(item.type)} border-l-4 bg-[var(--card-bg)] p-4 shadow-xl`}
          >
            <div className="mt-0.5 shrink-0">{icon(item.type)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.message ? <p className="mt-1 text-xs leading-relaxed text-[var(--sidebar-fg)]">{item.message}</p> : null}
            </div>
            <button onClick={() => removeToast(item.id)} className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--hover-bg)]">
              <X className="h-4 w-4 text-[var(--sidebar-fg)]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
