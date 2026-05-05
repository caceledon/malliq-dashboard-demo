import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface UfOverrideModalProps {
  open: boolean;
  defaultDate?: string;
  onConfirm: (date: string, value: number) => void;
  onCancel: () => void;
}

export function UfOverrideModal({ open, defaultDate, onConfirm, onCancel }: UfOverrideModalProps) {
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [valueRaw, setValueRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setValueRaw('');
      setError(null);
    }
  }, [open, defaultDate]);

  if (!open) {
    return null;
  }

  const submit = () => {
    const numeric = Number(valueRaw.replace(/\./g, '').replace(',', '.'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('La fecha debe estar en formato YYYY-MM-DD.');
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Ingresa un valor de UF positivo (por ejemplo, 39250,15).');
      return;
    }
    onConfirm(date, numeric);
  };

  return (
    <div className="overlay-backdrop fixed inset-0 z-[150] flex items-center justify-center px-4" onClick={onCancel}>
      <div
        className="scale-in w-full max-w-md rounded-[24px] border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-950/40">
            <Coins className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Override manual de UF</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sidebar-fg)]">
              Usa esta opción sólo cuando mindicador.cl no responde y necesitas fijar la UF a mano para una fecha.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input-field"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Valor UF (CLP)</span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={valueRaw}
              onChange={(event) => setValueRaw(event.target.value)}
              placeholder="39250,15"
              className="input-field"
            />
          </label>
          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Guardar override
          </button>
        </div>
      </div>
    </div>
  );
}
