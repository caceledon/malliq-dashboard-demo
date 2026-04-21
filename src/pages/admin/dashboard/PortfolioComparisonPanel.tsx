import { useNavigate } from 'react-router-dom';
import { Building2, ReceiptText, AlertTriangle } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import type { PortfolioAssetSummary, PortfolioStats } from '@/lib/portfolio';

interface PortfolioComparisonPanelProps {
  assetSummaries: PortfolioAssetSummary[];
  portfolioStats: PortfolioStats;
}

function MetricBox({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--hover-bg)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
        {icon ? <div className="rounded-lg bg-[var(--card-bg)] p-1.5">{icon}</div> : null}
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function PortfolioComparisonPanel({ assetSummaries, portfolioStats }: PortfolioComparisonPanelProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { actions } = useAppState();

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Comparativo del portafolio</h3>
          <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
            Vista rápida de desempeño entre activos para cambiar el foco operativo sin salir del dashboard.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricBox label="Activos" value={formatNumber(portfolioStats.assetCount)} icon={<Building2 className="h-4 w-4 text-blue-500" />} />
          <MetricBox label="Ventas consolidadas" value={formatCurrency(portfolioStats.monthlySales)} icon={<ReceiptText className="h-4 w-4 text-emerald-500" />} />
          <MetricBox label="Alertas abiertas" value={formatNumber(portfolioStats.alertCount)} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        </div>
      </div>
      <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border-color)]">
        <table className="w-full min-w-[760px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Activo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ocupación</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ventas mes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Alertas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {assetSummaries.map((asset) => (
              <tr key={asset.id} className="border-t border-[var(--border-color)]">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold">{asset.name}</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">{asset.city} · {asset.region}</p>
                </td>
                <td className="px-4 py-3 text-sm">{formatPercent(asset.occupancyPct)}</td>
                <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(asset.monthlySales)}</td>
                <td className="px-4 py-3 text-sm">{asset.alertCount}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      actions.switchAsset(asset.id);
                      navigate('/admin/dashboard');
                    }}
                    className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
