import { useState } from 'react';
import { AlertCircle, AlertTriangle, Bell, Info, X } from 'lucide-react';
import { useAppState } from '@/store/appState';

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const { insights, state } = useAppState();
  const systemAlerts =
    state.mall?.syncStatus === 'conflict'
      ? [
          {
            id: 'sync-conflict',
            type: 'critical',
            title: 'Conflicto de sincronización',
            description:
              state.mall.syncMessage || 'El backend cambió mientras existían cambios locales pendientes.',
          },
        ]
      : state.mall?.syncStatus === 'offline'
        ? [
            {
              id: 'sync-offline',
              type: 'warning',
              title: 'Backend sin conexión',
              description:
                state.mall.syncMessage || 'La sincronización remota está caída; los cambios siguen guardándose en este navegador.',
            },
          ]
        : state.mall?.syncStatus === 'syncing'
          ? [
              {
                id: 'sync-running',
                type: 'info',
                title: 'Sincronización en curso',
                description: state.mall.syncMessage || 'Se están publicando o descargando cambios desde el backend.',
              },
            ]
          : [];
  const alerts = [...systemAlerts, ...insights.alerts].slice(0, 12);

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative rounded-lg p-2 transition-colors hover:bg-[var(--hover-bg)]">
        <Bell className="h-5 w-5" />
        {alerts.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {Math.min(alerts.length, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
          <div className="overlay-backdrop absolute inset-0" />
          <div
            className="slide-in-right absolute right-0 top-0 h-full w-full max-w-md border-l border-[var(--border-color)] bg-[var(--card-bg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Notificaciones</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 transition-colors hover:bg-[var(--hover-bg)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-76px)] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-5 text-sm text-[var(--sidebar-fg)]">Sin alertas activas.</div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="border-b border-[var(--border-color)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getIcon(alert.type)}</div>
                      <div>
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--sidebar-fg)]">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
