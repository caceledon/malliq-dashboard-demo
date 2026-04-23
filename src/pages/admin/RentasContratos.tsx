import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, FileText, ShieldCheck, Wallet } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export function RentasContratos() {
  const navigate = useNavigate();
  const { state, insights } = useAppState();
  const { formatCurrency } = useCurrency();
  const signed = state.contracts.filter((contract) => contract.signatureStatus === 'firmado').length;
  const underReview = state.contracts.filter((contract) => contract.signatureStatus === 'en_revision').length;
  const pending = state.contracts.filter((contract) => contract.signatureStatus === 'pendiente').length;

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

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Composición de renta por contrato</h3>
        <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
          La renta facturada toma el mayor entre mínimo garantizado y porcentaje sobre ventas, más los gastos comunes.
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
              <Bar dataKey="fija" name="Mínimo garantizado" fill="#94A3B8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="variable" name="% sobre ventas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="total" name="Renta facturada" fill="#2563EB" radius={[6, 6, 0, 0]} />
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
