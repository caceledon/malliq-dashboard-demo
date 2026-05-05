import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, BellRing, Info } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { formatDate } from '@/lib/format';
import { buildRenewalContractTemplate, getContractLifecycle } from '@/lib/domain';
import { TopBar } from '@/components/mallq/ui';

export function Alertas() {
  const navigate = useNavigate();
  const { insights, state } = useAppState();
  const critical = insights.alerts.filter((alert) => alert.type === 'critical');
  const warning = insights.alerts.filter((alert) => alert.type === 'warning');
  const info = insights.alerts.filter((alert) => alert.type === 'info');

  const handleOpenAlert = (alert: (typeof insights.alerts)[number]) => {
    if (alert.contractId) {
      navigate(`/admin/locatarios/${alert.contractId}`);
      return;
    }
    if (alert.unitId) {
      navigate('/admin/ecosistema', { state: { focusUnitId: alert.unitId } });
    }
  };

  const handleRenewAlert = (alert: (typeof insights.alerts)[number]) => {
    if (!alert.contractId) {
      return;
    }
    const contract = state.contracts.find((item) => item.id === alert.contractId);
    if (!contract) {
      return;
    }
    navigate('/admin/locatarios', {
      state: {
        contractTemplate: buildRenewalContractTemplate(contract),
        flashMessage: `Borrador de renovación generado para ${contract.storeName}.`,
      },
    });
  };

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <TopBar
        eyebrow="Alertas"
        title={
          <>
            Motor <i style={{ fontStyle: 'italic', color: 'var(--violet-deep)' }}>operativo</i>.
          </>
        }
        sub="Firmas, vencimientos, vacancias y tiendas sin ventas cargadas — todo en un solo feed."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SeverityTile label="Críticas" count={critical.length} tone="coral" Icon={AlertCircle} />
        <SeverityTile label="Advertencias" count={warning.length} tone="amber" Icon={AlertTriangle} />
        <SeverityTile label="Informativas" count={info.length} tone="sky" Icon={Info} />
      </div>

      <div className="space-y-4">
        <AlertGroup title="Críticas" alerts={critical} onOpen={handleOpenAlert} onRenew={handleRenewAlert} contracts={state.contracts} />
        <AlertGroup title="Advertencias" alerts={warning} onOpen={handleOpenAlert} onRenew={handleRenewAlert} contracts={state.contracts} />
        <AlertGroup title="Informativas" alerts={info} onOpen={handleOpenAlert} onRenew={handleRenewAlert} contracts={state.contracts} />
      </div>
    </div>
  );
}

function SeverityTile({
  label,
  count,
  tone,
  Icon,
}: {
  label: string;
  count: number;
  tone: 'coral' | 'amber' | 'sky';
  Icon: typeof AlertCircle;
}) {
  const accent: Record<string, string> = {
    coral: 'var(--coral)',
    amber: 'var(--amber)',
    sky: 'var(--sky)',
  };
  const soft: Record<string, string> = {
    coral: 'var(--coral-soft)',
    amber: 'var(--amber-soft)',
    sky: 'var(--sky-soft)',
  };
  return (
    <div className="mq-card" style={{ padding: 18, borderLeft: `3px solid ${accent[tone]}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: soft[tone],
            color: accent[tone],
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon size={22} />
        </span>
        <div>
          <div className="mq-h-eyebrow">{label}</div>
          <div className="mq-num-l" style={{ marginTop: 4 }}>
            {count}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertGroup({
  title,
  alerts,
  onOpen,
  onRenew,
  contracts,
}: {
  title: string;
  alerts: ReturnType<typeof useAppState>['insights']['alerts'];
  onOpen: (alert: ReturnType<typeof useAppState>['insights']['alerts'][number]) => void;
  onRenew: (alert: ReturnType<typeof useAppState>['insights']['alerts'][number]) => void;
  contracts: ReturnType<typeof useAppState>['state']['contracts'];
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-[var(--hover-bg)] px-2 py-1 text-xs">{alerts.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-[var(--sidebar-fg)]">Sin alertas en esta categoría.</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-[var(--border-color)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--sidebar-fg)]">{alert.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alert.contractId || alert.unitId ? (
                      <button onClick={() => onOpen(alert)} className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold">
                        Abrir
                      </button>
                    ) : null}
                    {alert.contractId && (() => {
                      const contract = contracts.find((item) => item.id === alert.contractId);
                      if (!contract) {
                        return null;
                      }
                      const lifecycle = getContractLifecycle(contract);
                      if (lifecycle !== 'por_vencer' && lifecycle !== 'vencido') {
                        return null;
                      }
                      return (
                        <button onClick={() => onRenew(alert)} className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold">
                          Renovar
                        </button>
                      );
                    })()}
                  </div>
                </div>
                <span className="text-xs text-[var(--sidebar-fg)]">{formatDate(alert.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
