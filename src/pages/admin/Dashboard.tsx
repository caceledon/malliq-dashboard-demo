
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  FileCheck2,
  ReceiptText,
  Target,
  Users,
  Printer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { InteractiveMap } from '@/components/InteractiveMap';
import { getContractLifecycle } from '@/lib/domain';
import { formatNumber, formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { RenewalsPanel } from './dashboard/RenewalsPanel';
import { VacanciesPanel } from './dashboard/VacanciesPanel';
import { TopTenantsPanel } from './dashboard/TopTenantsPanel';
import { AssetSummaryPanel } from './dashboard/AssetSummaryPanel';
import { PortfolioComparisonPanel } from './dashboard/PortfolioComparisonPanel';
import { ActivityFeedPanel } from './dashboard/ActivityFeedPanel';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { insights, state, assetSummaries, portfolioStats } = useAppState();
  const { formatCurrency } = useCurrency();
  const topTenants = [...insights.tenantSummaries]
    .sort((left, right) => right.salesPerM2 - left.salesPerM2)
    .slice(0, 5);
  const activeUnitIds = new Set(
    state.contracts
      .filter((contract) => getContractLifecycle(contract) !== 'vencido')
      .flatMap((contract) => contract.localIds),
  );
  const renewalQueue = insights.tenantSummaries
    .filter((tenant) => tenant.lifecycle === 'por_vencer' || tenant.lifecycle === 'vencido')
    .slice(0, 4);
  const vacancyMatches = state.units
    .filter((unit) => !activeUnitIds.has(unit.id))
    .map((unit) => ({
      unit,
      prospect: [...state.prospects]
        .filter((prospect) => prospect.stage !== 'cerrado' && prospect.stage !== 'descartado')
        .sort((left, right) => Math.abs(left.targetAreaM2 - unit.areaM2) - Math.abs(right.targetAreaM2 - unit.areaM2))[0],
    }))
    .slice(0, 4);

  /* Occupancy donut data */
  const occupiedM2 = state.units
    .filter((unit) => activeUnitIds.has(unit.id))
    .reduce((sum, unit) => sum + unit.areaM2, 0);
  const totalM2 = insights.totalAreaM2 || 1;
  const vacantM2 = totalM2 - occupiedM2;
  const donutData = [
    { name: 'Ocupado', value: occupiedM2 },
    { name: 'Vacante', value: vacantM2 },
  ];
  const DONUT_COLORS = ['#2563EB', 'rgba(148,163,184,0.25)'];

  /* Sales by source */
  const salesBySource = {
    manual: state.sales.filter((sale) => sale.source === 'manual').reduce((sum, sale) => sum + sale.grossAmount, 0),
    ocr: state.sales.filter((sale) => sale.source === 'ocr').reduce((sum, sale) => sum + sale.grossAmount, 0),
    fiscal_printer: state.sales.filter((sale) => sale.source === 'fiscal_printer').reduce((sum, sale) => sum + sale.grossAmount, 0),
    pos_connection: state.sales.filter((sale) => sale.source === 'pos_connection').reduce((sum, sale) => sum + sale.grossAmount, 0),
  };
  const sourceChartData = [
    { source: 'Manual', amount: salesBySource.manual, fill: '#2563EB' },
    { source: 'OCR', amount: salesBySource.ocr, fill: '#10B981' },
    { source: 'Fiscal', amount: salesBySource.fiscal_printer, fill: '#F59E0B' },
    { source: 'POS', amount: salesBySource.pos_connection, fill: '#8B5CF6' },
  ].filter((item) => item.amount > 0);

  /* MoM change */
  const totalSalesCurrent = insights.monthlySales;
  const totalSalesPrevious = insights.tenantSummaries.reduce((sum, tenant) => sum + tenant.salesPrevious, 0);
  const momChange = totalSalesPrevious > 0 ? ((totalSalesCurrent - totalSalesPrevious) / totalSalesPrevious) * 100 : 0;

  /* Top tenant max for progress bars */
  const maxSalesPerM2 = topTenants.length > 0 ? topTenants[0].salesPerM2 : 1;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Dashboard operativo</h1>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            {state.asset?.name ?? 'Activo sin configurar'} · ventas, contratos, firmas y planificación en un solo tablero.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/admin/activos')}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            <Building2 className="h-4 w-4" />
            Portafolio
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            <Printer className="h-4 w-4" />
            PDF Ejecutivo
          </button>
          <button
            onClick={() => navigate('/admin/cargas')}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            <ReceiptText className="h-4 w-4" />
            Cargar ventas
          </button>
          <button
            onClick={() => navigate('/admin/locatarios')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            <Users className="h-4 w-4" />
            Gestionar contratos
          </button>
        </div>
      </div>

      <InteractiveMap />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Ocupación"
          value={`${insights.occupiedUnits}/${insights.totalUnits}`}
          subtitle={`${insights.vacantUnits} vacantes`}
          icon={<Building2 className="h-4 w-4 text-blue-600" />}
        />
        <KpiCard
          title="Ventas del mes"
          value={formatCurrency(insights.monthlySales)}
          subtitle={
            momChange !== 0
              ? `${momChange > 0 ? '+' : ''}${momChange.toFixed(1)}% vs mes anterior`
              : `${formatCurrency(insights.averageSalesPerM2)}/m²`
          }
          icon={<ReceiptText className="h-4 w-4 text-emerald-600" />}
          trend={momChange}
        />
        <KpiCard
          title="Renta proyectada"
          value={formatCurrency(insights.monthlyRent)}
          subtitle="Fija + variable + gastos comunes"
          icon={<Activity className="h-4 w-4 text-amber-600" />}
        />
        <KpiCard
          title="Firmas"
          value={String(insights.signedContracts)}
          subtitle={`${insights.pendingSignatureContracts} pendientes o en revisión`}
          icon={<FileCheck2 className="h-4 w-4 text-indigo-600" />}
        />
        <KpiCard
          title="Presupuesto"
          value={insights.budgetCompletionPct > 0 ? formatPercent(insights.budgetCompletionPct) : 'Sin carga'}
          subtitle={insights.activeForecast > 0 ? `Forecast: ${formatCurrency(insights.activeForecast)}` : 'Forecast no generado'}
          icon={<Target className="h-4 w-4 text-rose-600" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="glass-card p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">Ventas vs presupuesto / forecast</h3>
            <p className="text-xs text-[var(--sidebar-fg)]">Serie de los últimos 6 meses a partir de cargas reales.</p>
          </div>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <AreaChart data={insights.chartSeries}>
                <defs>
                  <linearGradient id="sales-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="budget-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.55} />
                <XAxis dataKey="month" tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 16,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), '']}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#sales-gradient)" name="Ventas" />
                <Area type="monotone" dataKey="budget" stroke="#10B981" strokeWidth={2} fill="url(#budget-gradient)" name="Presupuesto" />
                <Area type="monotone" dataKey="forecast" stroke="#7C3AED" strokeWidth={2} fill="none" strokeDasharray="6 4" name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold">Ocupación por superficie</h3>
            <div className="mt-2 flex items-center gap-6">
              <div className="h-[140px] w-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((_entry, index) => (
                        <Cell key={index} fill={DONUT_COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600" />
                  <span className="text-[var(--sidebar-fg)]">Ocupado</span>
                  <span className="ml-auto font-semibold">{formatNumber(occupiedM2)} m²</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: 'rgba(148,163,184,0.5)' }} />
                  <span className="text-[var(--sidebar-fg)]">Vacante</span>
                  <span className="ml-auto font-semibold">{formatNumber(vacantM2)} m²</span>
                </div>
                <div className="mt-2 text-xs text-[var(--sidebar-fg)]">
                  {formatPercent(insights.occupancyPct)} del total de {formatNumber(totalM2)} m²
                </div>
              </div>
            </div>
          </div>

          {sourceChartData.length > 0 ? (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold">Ventas por fuente de datos</h3>
              <div className="mt-3 h-[140px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                  <BarChart data={sourceChartData} layout="vertical" barCategoryGap={6}>
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--sidebar-fg)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
                    />
                    <YAxis
                      type="category"
                      dataKey="source"
                      tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 14,
                        fontSize: 12,
                      }}
                      formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Ventas']}
                    />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                      {sourceChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AlertsPanel alerts={insights.alerts} />
        <ActivityFeedPanel key={state.asset?.backendUrl ?? 'no-api'} apiBase={state.asset?.backendUrl} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RenewalsPanel renewalQueue={renewalQueue} contracts={state.contracts} />
        <VacanciesPanel vacancyMatches={vacancyMatches} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopTenantsPanel topTenants={topTenants} maxSalesPerM2={maxSalesPerM2} />
        <AssetSummaryPanel insights={insights} prospects={state.prospects} suppliers={state.suppliers} />
      </div>

      {assetSummaries.length > 1 ? (
        <PortfolioComparisonPanel assetSummaries={assetSummaries} portfolioStats={portfolioStats} />
      ) : null}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend?: number;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <div className="mt-1 flex items-center gap-1">
            {trend !== undefined && trend !== 0 ? (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              </span>
            ) : null}
            <p className="text-xs text-[var(--sidebar-fg)]">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--hover-bg)] p-3">{icon}</div>
      </div>
    </div>
  );
}


