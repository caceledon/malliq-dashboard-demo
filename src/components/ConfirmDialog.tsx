import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : variant === 'warning'
        ? 'bg-amber-500 text-white hover:bg-amber-600'
        : 'bg-blue-600 text-white hover:bg-blue-700';

  const iconBgClass =
    variant === 'danger'
      ? 'bg-red-100 dark:bg-red-950/40'
      : variant === 'warning'
        ? 'bg-amber-100 dark:bg-amber-950/40'
        : 'bg-blue-100 dark:bg-blue-950/40';

  const iconColor =
    variant === 'danger'
      ? 'text-red-600'
      : variant === 'warning'
        ? 'text-amber-600'
        : 'text-blue-600';

  return (
    <div className="overlay-backdrop fixed inset-0 z-[150] flex items-center justify-center px-4" onClick={onCancel}>
      <div
        className="scale-in w-full max-w-md rounded-[24px] border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`rounded-2xl p-3 ${iconBgClass}`}>
            <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sidebar-fg)]">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
