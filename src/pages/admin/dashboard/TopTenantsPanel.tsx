import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useCurrency } from '@/lib/currency';
import type { TenantSummary } from '@/lib/domain';

interface TopTenantsPanelProps {
  topTenants: TenantSummary[];
  maxSalesPerM2: number;
}

export function TopTenantsPanel({ topTenants, maxSalesPerM2 }: TopTenantsPanelProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  return (
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
                    <p className="ml-3 shrink-0 text-sm font-bold">{formatCurrency(tenant.salesPerM2)}<span className="text-xs font-normal text-[var(--sidebar-fg)]">/m²</span></p>
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
  );
}
