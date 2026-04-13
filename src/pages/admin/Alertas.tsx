import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, BellRing, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppState } from '@/store/appState';
import { formatDate } from '@/lib/format';
import { buildRenewalContractTemplate, getContractLifecycle } from '@/lib/domain';

export function Alertas() {
  const navigate = useNavigate();
  const { insights, state } = useAppState();
  const critical = insights.alerts.filter((alert) => alert.type === 'critical');
  const warning = insights.alerts.filter((alert) => alert.type === 'warning');
  const info = insights.alerts.filter((alert) => alert.type === 'info');

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Alertas operativas</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          Motor de alertas para firmas, vencimientos, vacancias y tiendas sin ventas cargadas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Críticas" count={critical.length} color="text-red-600" icon={<AlertCircle className="h-5 w-5" />} />
        <SummaryCard label="Advertencias" count={warning.length} color="text-amber-600" icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard label="Informativas" count={info.length} color="text-blue-600" icon={<Info className="h-5 w-5" />} />
      </div>

      <div className="space-y-4">
        <AlertGroup title="Críticas" alerts={critical} onOpen={(alert) => {
          if (alert.contractId) {
            navigate(`/admin/locatarios/${alert.contractId}`);
            return;
          }
          if (alert.unitId) {
            navigate('/admin/ecosistema', { state: { focusUnitId: alert.unitId } });
          }
        }} onRenew={(alert) => {
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
        }} contracts={state.contracts} />
        <AlertGroup title="Advertencias" alerts={warning} onOpen={(alert) => {
          if (alert.contractId) {
            navigate(`/admin/locatarios/${alert.contractId}`);
            return;
          }
          if (alert.unitId) {
            navigate('/admin/ecosistema', { state: { focusUnitId: alert.unitId } });
          }
        }} onRenew={(alert) => {
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
        }} contracts={state.contracts} />
        <AlertGroup title="Informativas" alerts={info} onOpen={(alert) => {
          if (alert.contractId) {
            navigate(`/admin/locatarios/${alert.contractId}`);
            return;
          }
          if (alert.unitId) {
            navigate('/admin/ecosistema', { state: { focusUnitId: alert.unitId } });
          }
        }} onRenew={(alert) => {
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
        }} contracts={state.contracts} />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  color,
  icon,
}: {
  label: string;
  count: number;
  color: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl bg-[var(--hover-bg)] p-3 ${color}`}>{icon}</div>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-2xl font-bold">{count}</p>
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
