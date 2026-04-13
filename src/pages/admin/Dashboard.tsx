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
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CircleArrowRight,
  FileCheck2,
  Layers,
  ReceiptText,
  Target,
  TrendingUp,
  Users,
  Printer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { InteractiveMap } from '@/components/InteractiveMap';
import { buildProspectContractTemplate, buildRenewalContractTemplate, getContractLifecycle } from '@/lib/domain';
import { formatNumber, formatPercent, formatPeso } from '@/lib/format';
import { useAppState } from '@/store/appState';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { insights, state, mallSummaries, portfolioStats, actions } = useAppState();
  const recentImports = state.importLogs.slice(0, 4);
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
            {state.mall?.name ?? 'Mall sin configurar'} · ventas, contratos, firmas y planificación en un solo tablero.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/admin/malls')}
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
          value={formatPercent(insights.occupancyPct)}
          subtitle={`${insights.occupiedUnits}/${insights.totalUnits} locales con contrato`}
          icon={<Building2 className="h-4 w-4 text-blue-600" />}
        />
        <KpiCard
          title="Ventas del mes"
          value={formatPeso(insights.monthlySales)}
          subtitle={
            momChange !== 0
              ? `${momChange > 0 ? '+' : ''}${momChange.toFixed(1)}% vs mes anterior`
              : `${formatPeso(insights.averageSalesPerM2)}/m2`
          }
          icon={<ReceiptText className="h-4 w-4 text-emerald-600" />}
          trend={momChange}
        />
        <KpiCard
          title="Renta proyectada"
          value={formatPeso(insights.monthlyRent)}
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
          subtitle={insights.activeForecast > 0 ? `Forecast: ${formatPeso(insights.activeForecast)}` : 'Forecast no generado'}
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
            <ResponsiveContainer width="100%" height="100%">
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
                  formatter={(value) => [formatPeso(Number(value ?? 0)), '']}
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
                <ResponsiveContainer width="100%" height="100%">
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
                <ResponsiveContainer width="100%" height="100%">
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
                      formatter={(value) => [formatPeso(Number(value ?? 0)), 'Ventas']}
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Alertas activas</h3>
            {insights.alerts.length > 0 ? (
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {insights.alerts.length}
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {insights.alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-[var(--border-color)] p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      alert.type === 'critical' ? 'bg-red-600' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                  <p className="text-sm font-semibold">{alert.title}</p>
                </div>
                <p className="mt-1 pl-4 text-xs text-[var(--sidebar-fg)]">{alert.description}</p>
              </div>
            ))}
            {insights.alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Layers className="h-8 w-8 text-[var(--border-color)]" />
                <p className="text-sm text-[var(--sidebar-fg)]">Sin alertas por ahora. ¡Todo marcha bien!</p>
              </div>
            ) : null}
            {insights.alerts.length > 5 ? (
              <button
                onClick={() => navigate('/admin/alertas')}
                className="w-full rounded-xl border border-[var(--border-color)] py-2 text-center text-xs font-semibold transition-colors hover:bg-[var(--hover-bg)]"
              >
                Ver las {insights.alerts.length} alertas
              </button>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Últimas importaciones</h3>
          <div className="mt-4 space-y-3">
            {recentImports.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <ReceiptText className="h-8 w-8 text-[var(--border-color)]" />
                <p className="text-sm text-[var(--sidebar-fg)]">Aún no hay movimientos de carga.</p>
                <button
                  onClick={() => navigate('/admin/cargas')}
                  className="mt-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Cargar datos
                </button>
              </div>
            ) : (
              recentImports.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--hover-bg)] p-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-1.5 ${item.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                      <ReceiptText className={`h-3.5 w-3.5 ${item.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize">{item.source.replace('_', ' ')}</p>
                      <p className="text-xs text-[var(--sidebar-fg)]">{item.note}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{item.importedCount}</p>
                    <p className="text-[10px] text-[var(--sidebar-fg)]">{new Date(item.createdAt).toLocaleDateString('es-CL')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <CircleArrowRight className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Cola de renovaciones</h3>
          </div>
          <div className="mt-4 space-y-3">
            {renewalQueue.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <FileCheck2 className="h-8 w-8 text-[var(--border-color)]" />
                <p className="text-sm text-[var(--sidebar-fg)]">No hay renovaciones urgentes por ahora.</p>
              </div>
            ) : (
              renewalQueue.map((tenant) => (
                <div key={tenant.id} className="rounded-2xl border border-[var(--border-color)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{tenant.storeName}</p>
                      <p className="text-xs text-[var(--sidebar-fg)]">
                        {tenant.localCodes.join(', ')} · vence {tenant.endDate}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => {
                          const contract = state.contracts.find((item) => item.id === tenant.id);
                          if (!contract) {
                            return;
                          }
                          navigate('/admin/locatarios', {
                            state: {
                              contractTemplate: buildRenewalContractTemplate(contract),
                              flashMessage: `Borrador de renovación generado para ${tenant.storeName}.`,
                            },
                          });
                        }}
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                      >
                        Crear renovación
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <CircleArrowRight className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Vacancias con match comercial</h3>
          </div>
          <div className="mt-4 space-y-3">
            {vacancyMatches.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Building2 className="h-8 w-8 text-[var(--border-color)]" />
                <p className="text-sm text-[var(--sidebar-fg)]">No hay vacancias activas visibles.</p>
              </div>
            ) : (
              vacancyMatches.map(({ unit, prospect }) => (
                <div key={unit.id} className="rounded-2xl border border-[var(--border-color)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{unit.code}</p>
                      <p className="text-xs text-[var(--sidebar-fg)]">{unit.label} · {unit.areaM2} m2</p>
                      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                        {prospect ? `Mejor match: ${prospect.brandName} (${prospect.targetAreaM2} m2)` : 'Sin prospecto sugerido'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate('/admin/ecosistema', { state: { focusUnitId: unit.id } })}
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                      >
                        Ver prospectos
                      </button>
                      {prospect ? (
                        <button
                          onClick={() =>
                            navigate('/admin/locatarios', {
                              state: {
                                contractTemplate: buildProspectContractTemplate(prospect, [unit.id]),
                                flashMessage: `Borrador generado para ocupar ${unit.code} con ${prospect.brandName}.`,
                              },
                            })
                          }
                          className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                        >
                          Crear borrador
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Top tiendas por ventas / m²</h3>
          </div>
          <div className="mt-4 space-y-3">
            {topTenants.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <TrendingUp className="h-8 w-8 text-[var(--border-color)]" />
                <p className="text-sm text-[var(--sidebar-fg)]">Sin datos de ranking disponible.</p>
              </div>
            ) : (
              topTenants.map((tenant, index) => (
                <div
                  key={tenant.id}
                  className="cursor-pointer rounded-2xl border border-[var(--border-color)] p-3 transition-colors hover:bg-[var(--hover-bg)]"
                  onClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                        index === 0
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                          : index === 1
                            ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                            : index === 2
                              ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                              : 'bg-[var(--hover-bg)] !text-[var(--fg)]'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold">{tenant.storeName}</p>
                        <p className="ml-3 shrink-0 text-sm font-bold">{formatPeso(tenant.salesPerM2)}<span className="text-xs font-normal text-[var(--sidebar-fg)]">/m²</span></p>
                      </div>
                      <p className="text-xs text-[var(--sidebar-fg)]">
                        {tenant.localCodes.join(', ')} · {tenant.areaM2} m²
                      </p>
                      <div className="progress-bar mt-2">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${Math.min(100, (tenant.salesPerM2 / maxSalesPerM2) * 100)}%`,
                            background: index === 0 ? '#2563EB' : index === 1 ? '#10B981' : '#7C3AED',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Resumen del mall</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MetricBox label="Locales totales" value={formatNumber(insights.totalUnits)} icon={<Building2 className="h-4 w-4 text-blue-500" />} />
            <MetricBox label="Superficie total" value={`${formatNumber(insights.totalAreaM2)} m²`} icon={<Layers className="h-4 w-4 text-emerald-500" />} />
            <MetricBox
              label="Ventas / m²"
              value={formatPeso(insights.averageSalesPerM2)}
              icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
            />
            <MetricBox
              label="Contratos activos"
              value={formatNumber(insights.tenantSummaries.length)}
              icon={<FileCheck2 className="h-4 w-4 text-indigo-500" />}
            />
          </div>
          {state.prospects.length > 0 || state.suppliers.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricBox label="Prospectos" value={formatNumber(state.prospects.filter((p) => p.stage !== 'descartado' && p.stage !== 'cerrado').length)} icon={<Users className="h-4 w-4 text-purple-500" />} />
              <MetricBox label="Proveedores" value={formatNumber(state.suppliers.filter((s) => s.status === 'activo').length)} icon={<Users className="h-4 w-4 text-rose-500" />} />
            </div>
          ) : null}
        </div>
      </div>

      {mallSummaries.length > 1 ? (
        <div className="glass-card p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Comparativo del portafolio</h3>
              <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                Vista rápida de desempeño entre malls para cambiar el foco operativo sin salir del dashboard.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricBox label="Malls" value={formatNumber(portfolioStats.mallCount)} icon={<Building2 className="h-4 w-4 text-blue-500" />} />
              <MetricBox label="Ventas consolidadas" value={formatPeso(portfolioStats.monthlySales)} icon={<ReceiptText className="h-4 w-4 text-emerald-500" />} />
              <MetricBox label="Alertas abiertas" value={formatNumber(portfolioStats.alertCount)} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
            </div>
          </div>
          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border-color)]">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[var(--hover-bg)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Mall</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ocupación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ventas mes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Alertas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Acción</th>
                </tr>
              </thead>
              <tbody>
                {mallSummaries.map((mall) => (
                  <tr key={mall.id} className="border-t border-[var(--border-color)]">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{mall.name}</p>
                      <p className="text-xs text-[var(--sidebar-fg)]">{mall.city} · {mall.region}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatPercent(mall.occupancyPct)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatPeso(mall.monthlySales)}</td>
                    <td className="px-4 py-3 text-sm">{mall.alertCount}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          actions.switchMall(mall.id);
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

function MetricBox({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
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
