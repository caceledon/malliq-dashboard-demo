import { Building2, Layers, TrendingUp, FileCheck2, Users } from 'lucide-react';
import { useCurrency } from '@/lib/currency';
import { formatNumber } from '@/lib/format';
import type { DashboardInsights, Prospect, Supplier } from '@/lib/domain';

interface AssetSummaryPanelProps {
  insights: DashboardInsights;
  prospects: Prospect[];
  suppliers: Supplier[];
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

export function AssetSummaryPanel({ insights, prospects, suppliers }: AssetSummaryPanelProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold">Resumen del activo</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MetricBox label="Locales totales" value={formatNumber(insights.totalUnits)} icon={<Building2 className="h-4 w-4 text-blue-500" />} />
        <MetricBox label="Superficie total" value={`${formatNumber(insights.totalAreaM2)} m²`} icon={<Layers className="h-4 w-4 text-emerald-500" />} />
        <MetricBox
          label="Ventas / m²"
          value={formatCurrency(insights.averageSalesPerM2)}
          icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
        />
        <MetricBox
          label="Contratos activos"
          value={formatNumber(insights.tenantSummaries.length)}
          icon={<FileCheck2 className="h-4 w-4 text-indigo-500" />}
        />
      </div>
      {prospects.length > 0 || suppliers.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetricBox label="Prospectos" value={formatNumber(prospects.filter((p) => p.stage !== 'descartado' && p.stage !== 'cerrado').length)} icon={<Users className="h-4 w-4 text-purple-500" />} />
          <MetricBox label="Proveedores" value={formatNumber(suppliers.filter((s) => s.status === 'activo').length)} icon={<Users className="h-4 w-4 text-rose-500" />} />
        </div>
      ) : null}
    </div>
  );
}
