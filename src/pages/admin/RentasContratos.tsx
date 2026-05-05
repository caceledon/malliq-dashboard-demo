import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Download, FileText, ShieldCheck, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildContractOverlapConflicts,
  buildRenewalContractTemplate,
  getContractDisplayValues,
  getContractLifecycle,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

export function RentasContratos() {
  const navigate = useNavigate();
  const { state, insights, actions } = useAppState();
  const { formatCurrency, ufValue } = useCurrency();
  const { toast } = useToast();
  const signed = state.contracts.filter((contract) => contract.signatureStatus === 'firmado').length;
  const underReview = state.contracts.filter((contract) => contract.signatureStatus === 'en_revision').length;
  const pending = state.contracts.filter((contract) => contract.signatureStatus === 'pendiente').length;

  const totals = useMemo(() => {
    const tenants = insights.tenantSummaries;
    const monthlySales = tenants.reduce((sum, t) => sum + t.salesCurrent, 0);
    const rentFixed = tenants.reduce((sum, t) => sum + t.rentFixed, 0);
    const rentTotal = tenants.reduce((sum, t) => sum + t.rentTotal, 0);
    const totalCost = tenants.reduce(
      (sum, t) => sum + t.rentTotal + t.commonExpensesClp + t.fondoPromocionClp,
      0,
    );
    const costoOcupacionPct = monthlySales > 0 ? (totalCost / monthlySales) * 100 : 0;
    const ufRate = ufValue > 0 ? ufValue : 1;
    const today = new Date();
    const expiringSoon = state.contracts.filter((c) => getContractLifecycle(c, today) === 'por_vencer').length;
    const expired = state.contracts.filter((c) => getContractLifecycle(c, today) === 'vencido').length;
    return {
      monthlySales,
      rentFixed,
      rentTotal,
      totalCost,
      costoOcupacionPct,
      rentFixedUF: rentFixed / ufRate,
      rentTotalUF: rentTotal / ufRate,
      salesUF: monthlySales / ufRate,
      expiringSoon,
      expired,
    };
  }, [insights.tenantSummaries, state.contracts, ufValue]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; sales: number; rent: number }>();
    for (const tenant of insights.tenantSummaries) {
      const key = tenant.category || 'Sin categoría';
      const entry = map.get(key) ?? { count: 0, sales: 0, rent: 0 };
      entry.count += 1;
      entry.sales += tenant.salesCurrent;
      entry.rent += tenant.rentTotal;
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [insights.tenantSummaries]);

  const conflictsByContract = useMemo(() => {
    const map = new Map<string, { units: string[]; otherStores: Set<string> }>();
    for (const conflict of buildContractOverlapConflicts(state)) {
      for (let i = 0; i < conflict.contractIds.length; i++) {
        const id = conflict.contractIds[i];
        const entry = map.get(id) ?? { units: [], otherStores: new Set<string>() };
        entry.units.push(conflict.unitCode);
        conflict.storeNames.forEach((name, idx) => {
          if (idx !== i) entry.otherStores.add(name);
        });
        map.set(id, entry);
      }
    }
    return map;
  }, [state]);

  const chartData = insights.tenantSummaries.map((tenant) => ({
    name: tenant.storeName,
    fija: tenant.rentFixed,
    variable: tenant.rentVariable,
    total: tenant.rentTotal,
  }));

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Rentas, firmas y contratos</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          Seguimiento consolidado de vigencias, renta fija/variable y respaldo documental por contrato.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Firmados" value={String(signed)} icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} />
        <StatCard label="En revisión" value={String(underReview)} icon={<FileText className="h-4 w-4 text-amber-600" />} />
        <StatCard label="Pendientes" value={String(pending)} icon={<Wallet className="h-4 w-4 text-red-600" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Costo de ocupación promedio"
          value={`${totals.costoOcupacionPct.toFixed(1)}%`}
          meta={formatCurrency(totals.totalCost)}
          chip="CLP"
        />
        <KpiCard
          label="Venta total mes"
          value={formatCurrency(totals.monthlySales)}
          meta={`${totals.salesUF.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`}
          chip="CLP"
        />
        <KpiCard
          label="UF / Renta fija"
          value={`${totals.rentFixedUF.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`}
          meta={formatCurrency(totals.rentFixed)}
          chip="UF"
        />
        <KpiCard
          label="UF / Renta total"
          value={`${totals.rentTotalUF.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`}
          meta={formatCurrency(totals.rentTotal)}
          chip="UF"
        />
        <KpiCard
          label="UF / Venta"
          value={`${totals.salesUF.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`}
          meta={formatCurrency(totals.monthlySales)}
          chip="UF"
        />
        <KpiCard
          label="Contratos por vencer"
          value={String(totals.expiringSoon)}
          meta="≤ 180 días"
          chip="—"
        />
        <KpiCard
          label="Contratos vencidos"
          value={String(totals.expired)}
          meta="Acción requerida"
          chip="—"
        />
        <KpiCard
          label="Categorías"
          value={String(categoryBreakdown.length)}
          meta={categoryBreakdown.slice(0, 3).map(([k]) => k).join(' · ') || '—'}
          chip="—"
        />
      </div>

      {categoryBreakdown.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-[var(--border-color)] px-4 py-3">
            <h3 className="text-sm font-semibold">Categorías</h3>
            <p className="mt-1 text-xs text-[var(--sidebar-fg)]">Ventas y renta total por rubro del activo.</p>
          </div>
          <table className="w-full">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Categoría</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Locatarios</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ventas mes</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Renta total</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map(([category, data]) => (
                <tr key={category} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-2 text-sm">{category}</td>
                  <td className="px-4 py-2 text-right text-sm">{data.count}</td>
                  <td className="px-4 py-2 text-right text-sm">{formatCurrency(data.sales)}</td>
                  <td className="px-4 py-2 text-right text-sm">{formatCurrency(data.rent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Composición de renta por contrato</h3>
        <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
          La renta facturada se calcula como <strong>monto fijo mensual + % sobre ventas</strong>, más los gastos comunes.
        </p>
        <div className="mt-4 h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, fontSize: 12 }}
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
              />
              <Bar dataKey="fija" name="Renta fija" fill="#94A3B8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="variable" name="% sobre ventas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="total" name="Renta total" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full min-w-[1080px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Contrato</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Locales</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Vigencia</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Firma</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Anexos</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Renta total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Condiciones</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Contrato</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {insights.tenantSummaries.map((tenant) => {
              const contract = state.contracts.find((item) => item.id === tenant.id);
              if (!contract) {
                return null;
              }

              const lifecycle = getContractLifecycle(contract);
              const conflict = conflictsByContract.get(contract.id);
              const contractDoc = state.documents.find(
                (document) =>
                  document.entityType === 'contract' && document.entityId === contract.id && document.kind === 'contrato',
              );
              const downloadContract = () => {
                if (!contractDoc) {
                  toast('warning', 'Sin PDF de contrato', 'Carga primero el archivo en "Documentación contractual".');
                  return;
                }
                actions.downloadDocument(contractDoc.id).catch((error) => {
                  toast('error', 'No se pudo descargar', error instanceof Error ? error.message : 'desconocido');
                });
              };
              return (
                <tr key={tenant.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold">{tenant.storeName}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{tenant.companyName}</p>
                    {conflict ? (
                      <span
                        className="chip warn mt-2 inline-flex"
                        title={`Superposición en ${conflict.units.join(', ')} con ${Array.from(conflict.otherStores).join(', ')}`}
                        style={{ fontSize: 10.5, padding: '2px 7px', gap: 4 }}
                      >
                        <AlertTriangle size={11} />
                        Conflicto en {conflict.units.length === 1 ? 'local' : 'locales'} {conflict.units.join(', ')}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm">{tenant.localCodes.join(', ')}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{formatDate(tenant.startDate)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{formatDate(tenant.endDate)}</p>
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                        lifecycle === 'vigente' && 'badge-success',
                        lifecycle === 'por_vencer' && 'badge-warning',
                        lifecycle === 'vencido' && 'badge-danger',
                        (lifecycle === 'borrador' || lifecycle === 'en_firma') && 'badge-info',
                      )}
                    >
                      {lifecycle.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        contract.signatureStatus === 'firmado' && 'badge-success',
                        contract.signatureStatus === 'pendiente' && 'badge-danger',
                        contract.signatureStatus === 'en_revision' && 'badge-warning',
                        contract.signatureStatus === 'parcial' && 'badge-info',
                      )}
                    >
                      {contract.signatureStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{contract.annexCount}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(tenant.rentTotal)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--sidebar-fg)]">{contract.escalation}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={downloadContract}
                      disabled={!contractDoc}
                      title={contractDoc ? `Descargar ${contractDoc.name}` : 'Sin PDF de contrato'}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {lifecycle === 'por_vencer' || lifecycle === 'vencido' ? (
                      <button
                        onClick={() =>
                          navigate('/admin/locatarios', {
                            state: {
                              contractTemplate: buildRenewalContractTemplate(contract),
                              flashMessage: `Borrador de renovación generado para ${getContractDisplayValues(contract).storeName}.`,
                            },
                          })
                        }
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold"
                      >
                        Renovar
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/admin/locatarios/${contract.id}`)}
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold"
                      >
                        Abrir
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  meta,
  chip,
}: {
  label: string;
  value: string;
  meta: string;
  chip: 'UF' | 'CLP' | '—';
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
        <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sidebar-fg)]">
          {chip}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{meta}</p>
    </div>
  );
}

function StatCard({
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-[var(--hover-bg)] p-3">{icon}</div>
      </div>
    </div>
  );
}
