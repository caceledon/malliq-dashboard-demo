import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, BellRing, ChevronDown, ChevronRight, Info, Sparkles } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { formatDate } from '@/lib/format';
import { buildRenewalContractTemplate, getContractLifecycle, monthKey } from '@/lib/domain';
import { detectSalesAnomalies, type SalesAnomaly } from '@/lib/anomalies';
import { explainAnomaly, resolveApiBase } from '@/lib/api';
import { TopBar } from '@/components/mallq/ui';

export function Alertas() {
  const navigate = useNavigate();
  const { insights, state } = useAppState();
  const critical = insights.alerts.filter((alert) => alert.type === 'critical');
  const warning = insights.alerts.filter((alert) => alert.type === 'warning');
  const info = insights.alerts.filter((alert) => alert.type === 'info');

  const anomalyIndex = useMemo(() => {
    const list = detectSalesAnomalies(state);
    const map = new Map<string, SalesAnomaly>();
    for (const a of list) {
      map.set(`anomaly:${a.contractId ?? a.storeLabel}:${a.month}:${a.reason}`, a);
    }
    return map;
  }, [state]);

  const recentSalesByContract = useMemo(() => {
    const grouped = new Map<string, Map<string, number>>();
    for (const sale of state.sales) {
      const month = monthKey(sale.occurredAt);
      const key = sale.contractId ?? '';
      if (!grouped.has(key)) grouped.set(key, new Map());
      const inner = grouped.get(key)!;
      inner.set(month, (inner.get(month) ?? 0) + sale.grossAmount);
    }
    return grouped;
  }, [state.sales]);

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
        <AlertGroup title="Críticas" alerts={critical} onOpen={handleOpenAlert} onRenew={handleRenewAlert} contracts={state.contracts} anomalyIndex={anomalyIndex} recentSalesByContract={recentSalesByContract} />
        <AlertGroup title="Advertencias" alerts={warning} onOpen={handleOpenAlert} onRenew={handleRenewAlert} contracts={state.contracts} anomalyIndex={anomalyIndex} recentSalesByContract={recentSalesByContract} />
        <AlertGroup title="Informativas" alerts={info} onOpen={handleOpenAlert} onRenew={handleRenewAlert} contracts={state.contracts} anomalyIndex={anomalyIndex} recentSalesByContract={recentSalesByContract} />
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
  anomalyIndex,
  recentSalesByContract,
}: {
  title: string;
  alerts: ReturnType<typeof useAppState>['insights']['alerts'];
  onOpen: (alert: ReturnType<typeof useAppState>['insights']['alerts'][number]) => void;
  onRenew: (alert: ReturnType<typeof useAppState>['insights']['alerts'][number]) => void;
  contracts: ReturnType<typeof useAppState>['state']['contracts'];
  anomalyIndex: Map<string, SalesAnomaly>;
  recentSalesByContract: Map<string, Map<string, number>>;
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
          alerts.map((alert) => {
            const matchedAnomaly = anomalyIndex.get(alert.id);
            const contract = alert.contractId ? contracts.find((item) => item.id === alert.contractId) : undefined;
            const lifecycle = contract ? getContractLifecycle(contract) : null;
            const recentSales = matchedAnomaly && contract
              ? Array.from(recentSalesByContract.get(contract.id ?? '') ?? new Map())
                  .map(([month, value]) => ({ month, value }))
                  .sort((l, r) => l.month.localeCompare(r.month))
                  .slice(-12)
              : undefined;
            return (
              <div key={alert.id} className="rounded-2xl border border-[var(--border-color)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--sidebar-fg)]">{alert.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {alert.contractId || alert.unitId ? (
                        <button onClick={() => onOpen(alert)} className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold">
                          Abrir
                        </button>
                      ) : null}
                      {contract && (lifecycle === 'por_vencer' || lifecycle === 'vencido') ? (
                        <button onClick={() => onRenew(alert)} className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold">
                          Renovar
                        </button>
                      ) : null}
                    </div>
                    {matchedAnomaly ? (
                      <AnomalyExplainer
                        anomaly={matchedAnomaly}
                        category={contract?.category}
                        recentSales={recentSales}
                      />
                    ) : null}
                  </div>
                  <span className="text-xs text-[var(--sidebar-fg)]">{formatDate(alert.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AnomalyExplainer({
  anomaly,
  category,
  recentSales,
}: {
  anomaly: SalesAnomaly;
  category?: string;
  recentSales?: { month: string; value: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && explanation === null && !loading) {
      setLoading(true);
      setError(null);
      try {
        const result = await explainAnomaly(resolveApiBase(), {
          anomaly: {
            contractId: anomaly.contractId ?? null,
            storeLabel: anomaly.storeLabel,
            month: anomaly.month,
            value: anomaly.value,
            median: anomaly.median,
            modifiedZ: anomaly.modifiedZ,
            direction: anomaly.direction,
            severity: anomaly.severity,
            reason: anomaly.reason,
          },
          category,
          recentSales,
        });
        setExplanation(result.explanation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo generar la explicación.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          color: 'var(--violet-deep)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Sparkles size={12} />
        Explicar con IA
      </button>
      {open ? (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            background: 'color-mix(in oklab, var(--violet-soft) 35%, var(--surface))',
            border: '1px solid var(--hairline)',
            borderRadius: 10,
            fontSize: 12.5,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
          }}
        >
          {loading ? 'Generando explicación…' : null}
          {error ? <span style={{ color: 'var(--coral)' }}>{error}</span> : null}
          {!loading && !error && explanation ? explanation : null}
        </div>
      ) : null}
    </div>
  );
}
