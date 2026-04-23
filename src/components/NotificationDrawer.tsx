import { useState } from 'react';
import { AlertCircle, AlertTriangle, Bell, Info, X } from 'lucide-react';
import { useAppState } from '@/store/appState';

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const { insights, state } = useAppState();
  const systemAlerts =
    state.asset?.syncStatus === 'conflict'
      ? [
          {
            id: 'sync-conflict',
            type: 'critical',
            title: 'Conflicto de sincronización',
            description:
              state.asset.syncMessage || 'El backend cambió mientras existían cambios locales pendientes.',
          },
        ]
      : state.asset?.syncStatus === 'offline'
        ? [
            {
              id: 'sync-offline',
              type: 'warning',
              title: 'Backend sin conexión',
              description:
                state.asset.syncMessage || 'La sincronización remota está caída; los cambios siguen guardándose en este navegador.',
            },
          ]
        : state.asset?.syncStatus === 'syncing'
          ? [
              {
                id: 'sync-running',
                type: 'info',
                title: 'Sincronización en curso',
                description: state.asset.syncMessage || 'Se están publicando o descargando cambios desde el backend.',
              },
            ]
          : [];
  const alerts = [...systemAlerts, ...insights.alerts].slice(0, 12);

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle size={16} style={{ color: 'var(--danger)' }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: 'var(--warn)' }} />;
      default:
        return <Info size={16} style={{ color: 'var(--info)' }} />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Notificaciones"
        className="iconbtn"
        style={{ position: 'relative' }}
      >
        <Bell size={16} />
        {alerts.length > 0 ? (
          <span
            aria-label={`${alerts.length} alertas`}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 15,
              height: 15,
              padding: '0 4px',
              borderRadius: 999,
              background: 'var(--umber)',
              color: '#fff',
              fontSize: 9.5,
              fontFamily: 'var(--mono)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {Math.min(alerts.length, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
          <div className="overlay-backdrop absolute inset-0" />
          <aside
            className="slide-in-right absolute right-0 top-0 h-full w-full max-w-md mq-card"
            style={{
              borderRadius: 0,
              borderLeft: '1px solid var(--line)',
              background: 'var(--card)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mq-card-hd" style={{ padding: '16px 20px' }}>
              <div className="row" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--umber-soft)',
                    color: 'var(--umber-ink)',
                  }}
                >
                  <Bell size={14} />
                </div>
                <div>
                  <div className="t-eyebrow">Actividad</div>
                  <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
                    Notificaciones
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="iconbtn"
                title="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ height: 'calc(100% - 64px)', overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div className="t-dim" style={{ padding: 20, fontSize: 12.5 }}>
                  Sin alertas activas.
                </div>
              ) : (
                alerts.map((alert, idx) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px 18px',
                      borderTop: idx === 0 ? 0 : '1px solid var(--line)',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ marginTop: 2 }}>{getIcon(alert.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{alert.title}</div>
                      <div className="t-muted" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>
                        {alert.description}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
