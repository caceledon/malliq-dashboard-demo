import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarRange, FileCheck2, ShoppingBag, SquareChartGantt, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { diffInDays, getContractLifecycle, monthKey } from '@/lib/domain';
import { formatDate, formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';

export function LocatarioDashboard() {
  const { currentTenantId, insights, state } = useAppState();
  const { formatCurrency } = useCurrency();
  const summary = insights.tenantSummaries.find((item) => item.id === currentTenantId);
  const contract = state.contracts.find((item) => item.id === currentTenantId);

  if (!summary || !contract) {
    return (
      <div className="p-6">
        <div className="glass-card p-6 text-sm text-[var(--sidebar-fg)]">
          Aún no existe un contrato activo visible para el panel de locatario.
        </div>
      </div>
    );
  }

  const salesHistory = state.sales
    .filter((sale) => sale.contractId === contract.id)
    .reduce<Record<string, number>>((accumulator, sale) => {
      const month = monthKey(sale.occurredAt);
      accumulator[month] = (accumulator[month] ?? 0) + sale.grossAmount;
      return accumulator;
    }, {});

  const chartData = Object.entries(salesHistory)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, sales]) => ({ month, sales }));
  const currentMonth = monthKey(new Date());
  const currentBudget = state.planning.find((entry) => entry.type === 'budget' && entry.month === currentMonth);
  const currentForecast = state.planning.find((entry) => entry.type === 'forecast' && entry.month === currentMonth);
  const daysRemaining = diffInDays(new Date(), new Date(contract.endDate));
  const lifecycle = getContractLifecycle(contract);
  const contractDocuments = state.documents.filter((document) => document.entityType === 'contract' && document.entityId === contract.id);
  const varianceVsBudget = currentBudget?.salesAmount
    ? ((summary.salesCurrent - currentBudget.salesAmount) / currentBudget.salesAmount) * 100
    : undefined;
  const varianceVsForecast = currentForecast?.salesAmount
    ? ((summary.salesCurrent - currentForecast.salesAmount) / currentForecast.salesAmount) * 100
    : undefined;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Mi dashboard</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          {summary.storeName} · {summary.localCodes.join(', ')} · {summary.areaM2} m2
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Ventas del mes" value={formatCurrency(summary.salesCurrent)} icon={<ShoppingBag className="h-4 w-4 text-emerald-600" />} />
        <Kpi label="Ventas / m2" value={formatCurrency(summary.salesPerM2)} icon={<SquareChartGantt className="h-4 w-4 text-blue-600" />} />
        <Kpi label="Renta estimada" value={formatCurrency(summary.rentTotal)} icon={<Wallet className="h-4 w-4 text-amber-600" />} />
        <Kpi label="Firma" value={contract.signatureStatus.replace('_', ' ')} icon={<FileCheck2 className="h-4 w-4 text-indigo-600" />} />
        <Kpi label="Fin contrato" value={formatDate(summary.endDate)} icon={<CalendarRange className="h-4 w-4 text-rose-600" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Evolución de ventas</h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tenant-panel-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, fontSize: 12 }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Ventas']}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#tenant-panel-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold">Seguimiento del mes</h3>
            <div className="mt-4 space-y-3">
              <StatusRow
                label="Presupuesto"
                value={currentBudget ? formatCurrency(currentBudget.salesAmount) : 'Sin presupuesto'}
                meta={typeof varianceVsBudget === 'number' ? `Desvío ${formatPercent(varianceVsBudget)}` : 'No hay referencia cargada'}
              />
              <StatusRow
                label="Forecast"
                value={currentForecast ? formatCurrency(currentForecast.salesAmount) : 'Sin forecast'}
                meta={typeof varianceVsForecast === 'number' ? `Desvío ${formatPercent(varianceVsForecast)}` : 'No hay referencia cargada'}
              />
              <StatusRow
                label="Documentos"
                value={String(contractDocuments.length)}
                meta={`${contract.annexCount} anexo(s) registrados`}
              />
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold">Estado contractual</h3>
            <div className="mt-4 space-y-3">
              <StatusRow label="Ciclo" value={lifecycle.replace('_', ' ')} meta={`Firma ${contract.signatureStatus.replace('_', ' ')}`} />
              <StatusRow label="Días restantes" value={String(daysRemaining)} meta={`Vence el ${formatDate(contract.endDate)}`} />
              <StatusRow label="Locales" value={summary.localCodes.join(', ')} meta={`${summary.areaM2} m2 totales`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-[var(--hover-bg)] p-3">{icon}</div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{meta}</p>
    </div>
  );
}
