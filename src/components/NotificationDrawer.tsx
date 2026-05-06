import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, Bell, Check, ChevronRight, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/store/appState';
import type { AlertItem } from '@/lib/domain';

const SYNC_ALERT_IDS = new Set(['sync-conflict', 'sync-offline', 'sync-running']);
const SEEN_STORAGE_KEY = 'malliq:notif:seen-v1';

// Categories drive the grouped layout. Order matters — first match wins.
type Category = {
  key: string;
  label: string;
  match: (id: string) => boolean;
};
const CATEGORIES: Category[] = [
  { key: 'sync', label: 'Sincronización', match: (id) => id.startsWith('sync-') },
  { key: 'ingesta', label: 'Ingesta', match: (id) => id.startsWith('sales-missing-') || id === 'budget-missing-current' || id === 'forecast-missing-current' },
  { key: 'vencimientos', label: 'Vencimientos', match: (id) => id.startsWith('expiring-') || id.startsWith('expired-') || id.startsWith('garantia-') || id.startsWith('signature-') || id.startsWith('stepup-') },
  { key: 'caida', label: 'Caída de ventas', match: (id) => id.startsWith('anomaly:') },
  { key: 'riesgo', label: 'Riesgo de pago', match: (id) => id.startsWith('overlap-') || id.startsWith('unit-vacant-') },
  { key: 'configuracion', label: 'Configuración', match: (id) => id === 'setup-asset' },
];

function categorize(id: string): Category {
  return CATEGORIES.find((cat) => cat.match(id)) ?? { key: 'otros', label: 'Otros', match: () => true };
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // Storage quotas / private mode — silent ignore.
  }
}

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const { insights, state, authUser } = useAppState();
  const navigate = useNavigate();
  const canSeeAdminPages = authUser?.role !== 'locatario';
  const isHydrating = state.asset == null;

  const [seen, setSeen] = useState<Set<string>>(loadSeen);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const targetForAlert = (id: string) => {
    if (SYNC_ALERT_IDS.has(id)) return '/admin/configuracion';
    return '/admin/alertas';
  };

  const systemAlerts: AlertItem[] = useMemo(() => {
    if (state.asset?.syncStatus === 'conflict') {
      return [
        {
          id: 'sync-conflict',
          type: 'critical',
          title: 'Conflicto de sincronización',
          description: state.asset.syncMessage || 'El backend cambió mientras existían cambios locales pendientes.',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    if (state.asset?.syncStatus === 'offline') {
      return [
        {
          id: 'sync-offline',
          type: 'warning',
          title: 'Backend sin conexión',
          description: state.asset.syncMessage || 'La sincronización remota está caída; los cambios siguen guardándose en este navegador.',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    if (state.asset?.syncStatus === 'syncing') {
      return [
        {
          id: 'sync-running',
          type: 'info',
          title: 'Sincronización en curso',
          description: state.asset.syncMessage || 'Se están publicando o descargando cambios desde el backend.',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [state.asset?.syncStatus, state.asset?.syncMessage]);

  // Surface the latest failed import as an explicit error state. importLogs is
  // newest-first; the most recent failure usually matches a "kind" of 'sales' /
  // 'contract' / 'asset' but for the panel we only need its message.
  const lastImportError = useMemo(() => {
    const failed = (state.importLogs ?? []).find((log) => log.status === 'error');
    return failed ?? null;
  }, [state.importLogs]);

  const allAlerts = useMemo(() => [...systemAlerts, ...insights.alerts].slice(0, 24), [systemAlerts, insights.alerts]);
  const unreadCount = useMemo(() => allAlerts.filter((a) => !seen.has(a.id)).length, [allAlerts, seen]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: AlertItem[] }>();
    for (const alert of allAlerts) {
      const cat = categorize(alert.id);
      const bucket = map.get(cat.key) ?? { label: cat.label, items: [] };
      bucket.items.push(alert);
      map.set(cat.key, bucket);
    }
    // Preserve CATEGORIES order, then any leftover at the end.
    const ordered: { key: string; label: string; items: AlertItem[] }[] = [];
    for (const cat of CATEGORIES) {
      const bucket = map.get(cat.key);
      if (bucket && bucket.items.length > 0) {
        ordered.push({ key: cat.key, label: bucket.label, items: bucket.items });
        map.delete(cat.key);
      }
    }
    for (const [key, bucket] of map) {
      ordered.push({ key, label: bucket.label, items: bucket.items });
    }
    return ordered;
  }, [allAlerts]);

  // Drop "seen" entries that no longer correspond to a live alert so the set
  // doesn't grow unbounded across sessions.
  useEffect(() => {
    if (seen.size === 0) return;
    const liveIds = new Set(allAlerts.map((a) => a.id));
    let stale = false;
    const trimmed = new Set<string>();
    for (const id of seen) {
      if (liveIds.has(id)) trimmed.add(id);
      else stale = true;
    }
    if (stale) {
      setSeen(trimmed);
      persistSeen(trimmed);
    }
  }, [allAlerts, seen]);

  const markAllRead = () => {
    const next = new Set(allAlerts.map((a) => a.id));
    setSeen(next);
    persistSeen(next);
  };

  const markOneRead = (id: string) => {
    if (seen.has(id)) return;
    const next = new Set(seen);
    next.add(id);
    setSeen(next);
    persistSeen(next);
  };

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
        aria-label={unreadCount > 0 ? `Notificaciones · ${unreadCount} sin leer` : 'Notificaciones'}
        className="iconbtn"
        style={{ position: 'relative' }}
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
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
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
          <div className="overlay-backdrop absolute inset-0" />
          <aside
            role="dialog"
            aria-label="Notificaciones"
            aria-modal="true"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    title="Marcar todas como leídas"
                    aria-label="Marcar todas las notificaciones como leídas"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                  >
                    <Check size={12} />
                    Marcar leídas
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="iconbtn"
                  title="Cerrar"
                  aria-label="Cerrar notificaciones"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div
              aria-live="polite"
              aria-busy={isHydrating ? 'true' : 'false'}
              style={{ height: 'calc(100% - 64px)', overflowY: 'auto' }}
            >
              {isHydrating ? (
                <NotificationSkeleton />
              ) : (
                <>
                  {lastImportError ? (
                    <div
                      role="alert"
                      style={{
                        padding: '12px 18px',
                        borderBottom: '1px solid var(--line)',
                        background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <AlertCircle size={16} style={{ color: 'var(--danger)', marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
                            Última ingesta falló
                          </div>
                          <div className="t-muted" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>
                            {lastImportError.note || 'Revisa el detalle de la última carga en Cargas de datos.'}
                          </div>
                          {canSeeAdminPages ? (
                            <button
                              type="button"
                              onClick={() => goTo('/admin/cargas')}
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                color: 'var(--umber)',
                                background: 'transparent',
                                border: 0,
                                cursor: 'pointer',
                                padding: 0,
                                fontWeight: 600,
                              }}
                            >
                              Abrir Cargas →
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {allAlerts.length === 0 ? (
                    <div className="t-dim" style={{ padding: 20, fontSize: 12.5 }}>
                      Sin alertas activas.
                    </div>
                  ) : (
                    <>
                      {grouped.map((group) => (
                        <section key={group.key}>
                          <div
                            className="t-eyebrow"
                            style={{
                              padding: '14px 18px 6px',
                              fontSize: 10,
                              color: 'var(--ink-4)',
                            }}
                          >
                            {group.label} · {group.items.length}
                          </div>
                          {group.items.map((alert, idx) => {
                            const target = targetForAlert(alert.id);
                            const clickable = canSeeAdminPages;
                            const isUnread = !seen.has(alert.id);
                            const Tag: 'button' | 'div' = clickable ? 'button' : 'div';
                            return (
                              <Tag
                                key={alert.id}
                                type={clickable ? 'button' : undefined}
                                onClick={
                                  clickable
                                    ? () => {
                                        markOneRead(alert.id);
                                        goTo(target);
                                      }
                                    : undefined
                                }
                                title={clickable ? 'Abrir detalle' : undefined}
                                style={{
                                  padding: '12px 18px',
                                  borderTop: idx === 0 ? 0 : '1px solid var(--line)',
                                  display: 'flex',
                                  gap: 10,
                                  alignItems: 'flex-start',
                                  width: '100%',
                                  textAlign: 'left',
                                  background: isUnread
                                    ? 'color-mix(in oklab, var(--umber-soft) 35%, transparent)'
                                    : 'transparent',
                                  border: 0,
                                  cursor: clickable ? 'pointer' : 'default',
                                  position: 'relative',
                                }}
                              >
                                {isUnread ? (
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      position: 'absolute',
                                      left: 8,
                                      top: '50%',
                                      width: 4,
                                      height: 4,
                                      borderRadius: 999,
                                      background: 'var(--umber)',
                                      transform: 'translateY(-50%)',
                                    }}
                                  />
                                ) : null}
                                <div style={{ marginTop: 2 }}>{getIcon(alert.type)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>
                                    {alert.title}
                                  </div>
                                  <div className="t-muted" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>
                                    {alert.description}
                                  </div>
                                </div>
                                {clickable ? (
                                  <ChevronRight size={14} style={{ color: 'var(--ink-4)', flex: 'none', marginTop: 4 }} />
                                ) : null}
                              </Tag>
                            );
                          })}
                        </section>
                      ))}
                      {canSeeAdminPages ? (
                        <button
                          type="button"
                          onClick={() => goTo('/admin/alertas')}
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            borderTop: '1px solid var(--line)',
                            background: 'transparent',
                            border: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: 'var(--umber)',
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          <span>Ver historial completo</span>
                          <ArrowRight size={14} />
                        </button>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function NotificationSkeleton() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Cargando notificaciones">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '8px 4px',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: 'var(--paper-2)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 10, width: '60%', borderRadius: 4, background: 'var(--paper-2)' }} />
            <div style={{ height: 8, width: '90%', borderRadius: 4, background: 'var(--paper-2)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
