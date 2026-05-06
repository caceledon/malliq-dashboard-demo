// Track 10 — pending broadcast acknowledgements for the locatario.
//
// Lists broadcasts addressed to tenants that the current contract hasn't
// confirmed yet. Confirming locally records the contractId in
// broadcast.acknowledgements via actions.acknowledgeBroadcast — picked up by
// the next archive sync.
import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAppState } from '@/store/appState';

const SEVERITY_BG: Record<string, string> = {
  evacuacion: 'color-mix(in oklab, var(--danger) 14%, transparent)',
  incidente: 'color-mix(in oklab, var(--warn) 16%, transparent)',
  aviso: 'color-mix(in oklab, var(--info) 14%, transparent)',
};

export function TenantBroadcastAcks({ contractId }: { contractId: string }) {
  const { state, actions, isFeatureEnabled } = useAppState();
  const enabled = isFeatureEnabled('crisisBroadcast');

  const pending = useMemo(() => {
    if (!enabled) return [];
    const all = state.broadcasts ?? [];
    return all
      .filter((entry) => entry.audience === 'all' || entry.audience === 'tenants')
      .filter((entry) => !entry.acknowledgements.includes(contractId));
  }, [enabled, state.broadcasts, contractId]);

  if (!enabled || pending.length === 0) return null;

  return (
    <section className="space-y-2 mb-3">
      {pending.map((entry) => (
        <div
          key={entry.id}
          className="rounded-2xl border border-[var(--border-color)] p-4"
          style={{ background: SEVERITY_BG[entry.severity] || 'var(--surface)' }}
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5" style={{ color: 'var(--danger)' }} />
              <div>
                <p className="text-sm font-semibold">{entry.title}</p>
                <p className="text-xs text-[var(--sidebar-fg)]">
                  {new Date(entry.triggeredAt).toLocaleString('es-CL')} · {entry.severity}
                </p>
                <p className="mt-1 text-sm">{entry.body}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => actions.acknowledgeBroadcast(entry.id, contractId)}
              className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Confirmar recepción
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
