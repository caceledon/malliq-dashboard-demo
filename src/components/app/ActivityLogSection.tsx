import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth';

interface ActivityRow {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor: string | null;
  details: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function shortDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('es-CL', {
      year: '2-digit',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ActivityLogSection() {
  const { state } = useAppState();
  const { toast } = useToast();
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const apiBase = state.asset?.backendUrl ?? '/api';

  const load = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${apiBase.replace(/\/+$/, '')}/activities?limit=${PAGE_SIZE}`);
      if (response.status === 403) {
        setForbidden(true);
        setRows([]);
        return;
      }
      if (!response.ok) {
        toast('error', 'No se pudo cargar la actividad', `HTTP ${response.status}`);
        setRows([]);
        return;
      }
      const body = (await response.json()) as { activities: ActivityRow[] };
      setRows(body.activities);
      setForbidden(false);
    } catch (error) {
      toast('error', 'No se pudo cargar la actividad', error instanceof Error ? error.message : 'desconocido');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold">Bitácora de actividad</h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>
      <p className="text-xs text-[var(--sidebar-fg)]">
        Eventos auditables: login/registro, sincronización, subidas y borrado de documentos, cambios de vínculo de
        usuarios. Últimos {PAGE_SIZE} eventos.
      </p>
      {forbidden ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          Esta sección requiere rol admin.
        </div>
      ) : null}
      {!forbidden && rows ? (
        rows.length === 0 ? (
          <p className="text-xs text-[var(--sidebar-fg)]">Aún no hay actividad registrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
            <table className="w-full min-w-[720px]">
              <thead className="bg-[var(--hover-bg)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Cuándo</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Acción</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Entidad</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Actor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border-color)]">
                    <td className="px-3 py-2 text-[11px] font-mono">{shortDate(row.created_at)}</td>
                    <td className="px-3 py-2 text-xs font-semibold">{row.action}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.entity_type ? (
                        <span>
                          {row.entity_type}
                          {row.entity_id ? <span className="text-[var(--sidebar-fg)]"> · {row.entity_id}</span> : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{row.actor ?? '—'}</td>
                    <td className="px-3 py-2 text-[11px] text-[var(--sidebar-fg)]">
                      {row.details ? <code>{row.details}</code> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
