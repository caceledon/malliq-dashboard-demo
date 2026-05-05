import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarRange,
  FileCheck2,
  Percent,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  SquareChartGantt,
  Stamp,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { diffInDays, getContractLifecycle, monthKey } from '@/lib/domain';
import { formatDate, formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { LocatarioPendingBinding } from '@/pages/locatario/PendingBinding';
import { ComponentBar, HealthRing, InsightCard, TopBar } from '@/components/mallq/ui';

export function LocatarioDashboard() {
  const { currentTenantId, insights, state, authUser } = useAppState();
  const { formatCurrency } = useCurrency();
  const summary = insights.tenantSummaries.find((item) => item.id === currentTenantId);
  const contract = state.contracts.find((item) => item.id === currentTenantId);

  if (authUser?.role === 'locatario' && !authUser.tenantContractId) {
    return <LocatarioPendingBinding />;
  }

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
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <TopBar
        eyebrow={`Hola, ${authUser?.displayName?.split(' ')[0] ?? 'Locatario'}`}
        title={
          <>
            {summary.storeName}.{' '}
            <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>Tu cockpit personal.</span>
          </>
        }
        sub={`${summary.localCodes.join(', ')} · ${summary.areaM2} m² · contrato ${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}`}
      />

      {/* Health + insight strip — always visible at top */}
      <div className="mq-card" style={{ padding: 22, marginBottom: 18, display: 'flex', gap: 22, alignItems: 'center' }}>
        <HealthRing value={summary.healthScorePct} size={96} stroke={9} />
        <div style={{ flex: 1 }}>
          <div className="mq-h-eyebrow">Tu salud como locatario</div>
          <div className="mq-num-l" style={{ marginTop: 6 }}>
            {summary.healthScorePct}/100
          </div>
          <div style={{ marginTop: 8 }}>
            <ComponentBar label="Paga al día" ok={contract.healthPagoAlDia} />
            <ComponentBar label="Entrega ventas al día" ok={contract.healthEntregaVentas} />
            <ComponentBar label="Nivel de venta aceptable" ok={contract.healthNivelVenta} />
            <ComponentBar label="Nivel de renta aceptable" ok={contract.healthNivelRenta} />
          </div>
        </div>
        <InsightCard
          tone="violet"
          title="Tip MallIQ"
          body="Tu venta/m² está sobre el promedio del rubro este mes. Ajusta horarios pico para mantener el ritmo."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Ventas del mes"
          value={formatCurrency(summary.salesCurrent)}
          meta="CLP"
          icon={<ShoppingBag className="h-4 w-4 text-emerald-600" />}
        />
        <Kpi
          label="Ventas / m²"
          value={formatCurrency(summary.salesPerM2)}
          meta={`${summary.areaM2} m²`}
          icon={<SquareChartGantt className="h-4 w-4 text-blue-600" />}
        />
        <Kpi
          label="Renta fija"
          value={formatCurrency(summary.rentFixed)}
          meta={contract.fixedRentCurrency ?? 'CLP'}
          icon={<Wallet className="h-4 w-4 text-amber-600" />}
        />
        <Kpi
          label="Renta variable"
          value={formatCurrency(summary.rentVariable)}
          meta={`${contract.variableRentPct}% s/ ventas`}
          icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
        />
        <Kpi
          label="Renta total"
          value={formatCurrency(summary.rentTotal)}
          meta="Fija + variable"
          icon={<Receipt className="h-4 w-4 text-rose-600" />}
        />
        <Kpi
          label="Costo ocupación"
          value={summary.salesCurrent > 0 ? `${summary.costoOcupacionPct.toFixed(1)}%` : '—'}
          meta={summary.salesCurrent > 0 ? 'Renta total + GC + fondo / ventas' : 'Sin ventas mes'}
          icon={<Percent className="h-4 w-4 text-orange-600" />}
        />
        <Kpi
          label="Gasto común"
          value={formatCurrency(summary.commonExpensesClp)}
          meta={contract.commonExpensesCurrency ?? 'CLP'}
          icon={<Wallet className="h-4 w-4 text-cyan-600" />}
        />
        <Kpi
          label="Fondo promoción"
          value={formatCurrency(summary.fondoPromocionClp)}
          meta={contract.fondoPromocionCurrency ?? 'CLP'}
          icon={<Stamp className="h-4 w-4 text-pink-600" />}
        />
        <Kpi
          label="Garantía"
          value={summary.garantiaMontoClp > 0 ? formatCurrency(summary.garantiaMontoClp) : 'Sin garantía'}
          meta={contract.garantiaVencimiento ? `Vence ${formatDate(contract.garantiaVencimiento)}` : '—'}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-700" />}
        />
        <Kpi
          label="Fee ingreso"
          value={summary.feeIngresoClp > 0 ? formatCurrency(summary.feeIngresoClp) : 'Sin fee'}
          meta={contract.feeIngresoCurrency ?? 'CLP'}
          icon={<Receipt className="h-4 w-4 text-yellow-600" />}
        />
        <Kpi
          label="Días para vencer"
          value={daysRemaining > 0 ? String(daysRemaining) : 'Vencido'}
          meta={`Fin ${formatDate(summary.endDate)}`}
          icon={<CalendarRange className="h-4 w-4 text-rose-600" />}
        />
        <Kpi
          label="Firma"
          value={contract.signatureStatus.replace('_', ' ')}
          meta={lifecycle.replace('_', ' ')}
          icon={<FileCheck2 className="h-4 w-4 text-indigo-600" />}
        />
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
  meta,
  icon,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
          <p className="mt-2 text-xl font-semibold">{value}</p>
          {meta ? <p className="mt-1 text-[11px] text-[var(--sidebar-fg)]">{meta}</p> : null}
        </div>
        <div className="rounded-2xl bg-[var(--hover-bg)] p-3 shrink-0">{icon}</div>
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
