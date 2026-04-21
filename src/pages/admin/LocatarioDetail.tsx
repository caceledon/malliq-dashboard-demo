import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronRight, FileBadge2, MapPinned, ReceiptText, Signature } from 'lucide-react';
import type { ReactNode } from 'react';
import { DocumentManager } from '@/components/app/DocumentManager';
import { RentStepGantt } from '@/components/app/RentStepGantt';
import { TenantHealthRating } from '@/components/app/TenantHealthRating';
import { buildRenewalContractTemplate, getContractDisplayValues, getContractLifecycle, monthKey } from '@/lib/domain';
import { formatDate, formatUF, formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { cn } from '@/lib/utils';

export function LocatarioDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state, insights } = useAppState();
  const { formatCurrency } = useCurrency();
  const contract = state.contracts.find((item) => item.id === id);
  const summary = insights.tenantSummaries.find((item) => item.id === id);

  if (!contract || !summary) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-[var(--sidebar-fg)]">Contrato no encontrado</p>
        <Link to="/admin/locatarios" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Volver a locatarios
        </Link>
      </div>
    );
  }

  const lifecycle = getContractLifecycle(contract);
  const display = getContractDisplayValues(contract);
  const linkedUnits = state.units.filter((unit) => contract.localIds.includes(unit.id));
  const salesByMonth = new Map<string, number>();

  state.sales
    .filter((sale) => sale.contractId === contract.id)
    .forEach((sale) => {
      const month = monthKey(sale.occurredAt);
      salesByMonth.set(month, (salesByMonth.get(month) ?? 0) + sale.grossAmount);
    });

  const monthlySales = Array.from(salesByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, amount]) => ({
      month,
      sales: amount,
    }));

  const contractDocuments = state.documents.filter((document) => document.entityType === 'contract' && document.entityId === contract.id);

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <nav className="flex items-center gap-1.5 text-sm">
        <Link to="/admin/dashboard" className="text-[var(--sidebar-fg)] hover:text-[var(--fg)]">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--sidebar-fg)]" />
        <Link to="/admin/locatarios" className="text-[var(--sidebar-fg)] hover:text-[var(--fg)]">
          Locatarios
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--sidebar-fg)]" />
        <span className="font-semibold">{contract.storeName}</span>
      </nav>

      <div className="glass-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg">
              {contract.storeName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{display.storeName}</h1>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    contract.signatureStatus === 'firmado' && 'badge-success',
                    contract.signatureStatus === 'pendiente' && 'badge-danger',
                    contract.signatureStatus === 'en_revision' && 'badge-warning',
                    contract.signatureStatus === 'parcial' && 'badge-info',
                  )}
                >
                  Firma {contract.signatureStatus.replace('_', ' ')}
                </span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    lifecycle === 'vigente' && 'badge-success',
                    lifecycle === 'por_vencer' && 'badge-warning',
                    lifecycle === 'vencido' && 'badge-danger',
                    (lifecycle === 'borrador' || lifecycle === 'en_firma') && 'badge-info',
                  )}
                >
                  {lifecycle.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
                {display.companyName} · {display.category} · {summary.localCodes.join(', ')} · {summary.areaM2} m2
              </p>
            </div>
          </div>

          <div className="space-y-3 lg:min-w-[360px]">
            {lifecycle === 'por_vencer' || lifecycle === 'vencido' ? (
              <button
                onClick={() =>
                  navigate('/admin/locatarios', {
                    state: {
                      contractTemplate: buildRenewalContractTemplate(contract),
                      flashMessage: `Borrador de renovación generado para ${display.storeName}.`,
                    },
                  })
                }
                className="w-full rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold"
              >
                Generar renovación
              </button>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniCard label="Ventas mes" value={formatCurrency(summary.salesCurrent)} />
              <MiniCard label="Renta total" value={formatCurrency(summary.rentTotal)} />
              <MiniCard label="Renta fija UF/m²" value={summary.baseRentUF > 0 ? `${formatUF(summary.baseRentUF)}/m²` : 'No definida'} />
              <MiniCard label="Anexos" value={String(contractDocuments.filter((doc) => doc.kind === 'anexo').length)} />
              <MiniCard
                label="Costo ocupación"
                value={formatPercent(summary.costoOcupacionPct)}
                className={summary.costoOcupacionPct > 20 ? 'text-red-600' : ''}
              />
              <MiniCard label="Venta/m²" value={formatCurrency(summary.ventaPorM2)} />
              <div className="rounded-2xl bg-[var(--hover-bg)] p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Health score</p>
                <div className="mt-2">
                  <TenantHealthRating score={summary.healthScore} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Evolución histórica de ventas</h3>
          <p className="mt-1 text-xs text-[var(--sidebar-fg)]">Serie armada desde ventas manuales, OCR, fiscal printer y conexión POS.</p>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="tenant-sales-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2.5} fill="url(#tenant-sales-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Condiciones del contrato</h3>
          <div className="mt-4 space-y-4">
            <DetailRow icon={<Signature className="h-4 w-4 text-blue-600" />} label="Estado firma" value={contract.signatureStatus.replace('_', ' ')} />
            <DetailRow icon={<FileBadge2 className="h-4 w-4 text-emerald-600" />} label="Vigencia" value={`${formatDate(contract.startDate)} a ${formatDate(contract.endDate)}`} />
            <DetailRow
              icon={<ReceiptText className="h-4 w-4 text-amber-600" />}
              label="Renta fija UF/m²"
              value={contract.baseRentUF > 0 ? `${formatUF(contract.baseRentUF)}/m²` : 'No definida'}
            />
            <DetailRow icon={<ReceiptText className="h-4 w-4 text-emerald-600" />} label="Renta fija estimada" value={formatCurrency(summary.rentFixed)} />
            <DetailRow icon={<ReceiptText className="h-4 w-4 text-indigo-600" />} label="Variable" value={`${contract.variableRentPct}% de venta`} />
            <DetailRow icon={<MapPinned className="h-4 w-4 text-rose-600" />} label="Locales" value={linkedUnits.map((unit) => unit.code).join(', ')} />
            {contract.garantiaMonto > 0 ? (
              <DetailRow
                icon={<ReceiptText className="h-4 w-4 text-purple-600" />}
                label="Garantía"
                value={`${formatCurrency(contract.garantiaMonto)} hasta ${formatDate(contract.garantiaVencimiento)}`}
              />
            ) : null}
            {contract.feeIngreso > 0 ? (
              <DetailRow icon={<ReceiptText className="h-4 w-4 text-orange-600" />} label="Fee ingreso" value={formatCurrency(contract.feeIngreso)} />
            ) : null}
            {contract.fondoPromocion > 0 ? (
              <DetailRow icon={<ReceiptText className="h-4 w-4 text-pink-600" />} label="Fondo promoción" value={formatCurrency(contract.fondoPromocion)} />
            ) : null}
            {contract.rentSteps.length > 0 ? (
              <div className="rounded-2xl border border-[var(--border-color)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Escalonado de renta</p>
                <div className="mt-3">
                  <RentStepGantt steps={contract.rentSteps} contractStart={contract.startDate} contractEnd={contract.endDate} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Condiciones</p>
            <p className="mt-2 text-sm leading-relaxed">{contract.conditions || 'Sin condiciones específicas registradas.'}</p>
            {!contract.autoFillUnits ? (
              <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Override manual aplicado</p>
                <p className="mt-2 text-sm font-semibold">{display.storeName}</p>
                <p className="text-xs text-[var(--sidebar-fg)]">
                  {display.companyName} · {display.category}
                </p>
                {contract.manualOverrideNotes ? (
                  <p className="mt-2 text-xs text-[var(--sidebar-fg)]">{contract.manualOverrideNotes}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2 xl:col-span-1">
          <h3 className="text-sm font-semibold">Línea de tiempo</h3>
          <div className="mt-6">
            <TimelineEvent
              title="Creación de contrato"
              date={formatDate(contract.createdAt)}
              status="completed"
            />
            <TimelineEvent
              title="Inicio de vigencia"
              date={formatDate(contract.startDate)}
              status={new Date(contract.startDate) <= new Date() ? 'completed' : 'pending'}
            />
            <TimelineEvent
              title={`Firma ${contract.signatureStatus.replace('_', ' ')}`}
              date={contract.signedAt ? formatDate(contract.signedAt) : undefined}
              status={
                contract.signatureStatus === 'firmado'
                  ? 'completed'
                  : contract.signatureStatus === 'parcial' || contract.signatureStatus === 'en_revision'
                    ? 'current'
                    : 'pending'
              }
            />
            <TimelineEvent
              title="Fin de contrato"
              date={formatDate(contract.endDate)}
              status={lifecycle === 'vencido' ? 'completed' : lifecycle === 'por_vencer' ? 'current' : 'pending'}
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Locales asociados a este contrato</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {linkedUnits.map((unit) => (
            <div key={unit.id} className="rounded-2xl border border-[var(--border-color)] p-4">
              <p className="text-sm font-semibold">{unit.code}</p>
              <p className="text-xs text-[var(--sidebar-fg)]">{unit.label}</p>
              <p className="mt-2 text-lg font-semibold">{unit.areaM2} m2</p>
              <p className="text-xs text-[var(--sidebar-fg)]">{unit.level}</p>
            </div>
          ))}
        </div>
      </div>

      {state.asset ? (
        <DocumentManager entityType="asset" entityId={state.asset.id} title="Documentos del activo" />
      ) : null}

      <DocumentManager entityType="contract" entityId={contract.id} title="Documentación contractual y anexos" />

      <div className="space-y-4">
        {linkedUnits.map((unit) => (
          <DocumentManager
            key={unit.id}
            entityType="unit"
            entityId={unit.id}
            title={`Documentos del local ${unit.code}`}
          />
        ))}
      </div>
    </div>
  );
}

function MiniCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--hover-bg)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${className ?? ''}`}>{value}</p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] p-3">
      <div className="rounded-xl bg-[var(--hover-bg)] p-2">{icon}</div>
      <div>
        <p className="text-xs text-[var(--sidebar-fg)]">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function TimelineEvent({
  title,
  date,
  status = 'completed',
}: {
  title: string;
  date?: string;
  status?: 'completed' | 'current' | 'pending';
}) {
  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      <div
        className={cn(
          'absolute left-0 top-1 h-3 w-3 rounded-full border-2',
          status === 'completed'
            ? 'border-blue-600 bg-blue-600'
            : status === 'current'
              ? 'border-blue-600 bg-white dark:bg-slate-900'
              : 'border-[var(--border-color)] bg-[var(--card-bg)]',
        )}
      />
      <div
        className={cn(
          'absolute left-1.5 top-4 bottom-0 w-px -translate-x-1/2',
          status === 'completed' ? 'bg-blue-600' : 'bg-[var(--border-color)]',
        )}
      />
      <div>
        <p className={cn('text-sm font-semibold', status === 'pending' && 'text-[var(--sidebar-fg)]')}>{title}</p>
        {date ? <p className="mt-0.5 text-xs text-[var(--sidebar-fg)]">{date}</p> : null}
      </div>
    </div>
  );
}
