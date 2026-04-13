import { useState } from 'react';
import { Cable, Signal, X } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { cn } from '@/lib/utils';

export function GatewayStatus() {
  const [open, setOpen] = useState(false);
  const { state } = useAppState();
  const active = state.posConnections.filter((connection) => connection.lastStatus === 'success').length;
  const total = state.posConnections.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2.5 shadow-lg"
      >
        <span className={cn('h-2.5 w-2.5 rounded-full', active > 0 ? 'bg-emerald-500 pulse-dot' : 'bg-slate-400')} />
        <span className="text-sm font-medium">{active}/{total} conectores listos</span>
      </button>

      {open ? (
        <div className="overlay-backdrop fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setOpen(false)}>
          <div className="glass-card w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
              <div className="flex items-center gap-2">
                <Cable className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Estado de conectores</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 transition-colors hover:bg-[var(--hover-bg)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {state.posConnections.length === 0 ? (
                <p className="text-sm text-[var(--sidebar-fg)]">Aún no hay conectores POS configurados.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-xs uppercase text-[var(--sidebar-fg)]">
                      <th className="py-2 text-left font-medium">Conector</th>
                      <th className="py-2 text-left font-medium">Formato</th>
                      <th className="py-2 text-left font-medium">Estado</th>
                      <th className="py-2 text-right font-medium">Última sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.posConnections.map((connection) => (
                      <tr key={connection.id} className="border-b border-[var(--border-color)] last:border-0">
                        <td className="py-3 text-sm font-semibold">{connection.name}</td>
                        <td className="py-3 text-sm text-[var(--sidebar-fg)]">{connection.dataFormat.toUpperCase()}</td>
                        <td className="py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              connection.lastStatus === 'success' && 'badge-success',
                              connection.lastStatus === 'error' && 'badge-danger',
                              (!connection.lastStatus || connection.lastStatus === 'idle') && 'badge-info',
                            )}
                          >
                            <Signal className="h-3.5 w-3.5" />
                            {connection.lastStatus ?? 'idle'}
                          </span>
                        </td>
                        <td className="py-3 text-right text-xs text-[var(--sidebar-fg)]">
                          {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString('es-CL') : 'Sin sync'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
