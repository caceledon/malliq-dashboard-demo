import { useNavigate } from 'react-router-dom';
import { CircleArrowRight, FileCheck2 } from 'lucide-react';
import { buildRenewalContractTemplate } from '@/lib/domain';
import type { Contract, TenantSummary } from '@/lib/domain';

interface RenewalsPanelProps {
  renewalQueue: TenantSummary[];
  contracts: Contract[];
}

export function RenewalsPanel({ renewalQueue, contracts }: RenewalsPanelProps) {
  const navigate = useNavigate();

  return (
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
                      const contract = contracts.find((item) => item.id === tenant.id);
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
  );
}
