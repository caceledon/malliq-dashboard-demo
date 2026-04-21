import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Layers } from 'lucide-react';
import type { AlertItem } from '@/lib/domain';

interface AlertsPanelProps {
  alerts: AlertItem[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Alertas activas</h3>
        {alerts.length > 0 ? (
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {alerts.length}
          </span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-[var(--border-color)] p-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  alert.type === 'critical' ? 'bg-red-600' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}
              />
              <p className="text-sm font-semibold">{alert.title}</p>
            </div>
            <p className="mt-1 pl-4 text-xs text-[var(--sidebar-fg)]">{alert.description}</p>
          </div>
        ))}
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Layers className="h-8 w-8 text-[var(--border-color)]" />
            <p className="text-sm text-[var(--sidebar-fg)]">Sin alertas por ahora. ¡Todo marcha bien!</p>
          </div>
        ) : null}
        {alerts.length > 5 ? (
          <button
            onClick={() => navigate('/admin/alertas')}
            className="w-full rounded-xl border border-[var(--border-color)] py-2 text-center text-xs font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            Ver las {alerts.length} alertas
          </button>
        ) : null}
      </div>
    </div>
  );
}
