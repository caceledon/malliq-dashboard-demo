import { useNavigate } from 'react-router-dom';
import { CircleArrowRight, Building2 } from 'lucide-react';
import { buildProspectContractTemplate } from '@/lib/domain';
import type { AssetUnit, Prospect } from '@/lib/domain';

interface VacanciesPanelProps {
  vacancyMatches: Array<{ unit: AssetUnit; prospect?: Prospect }>;
}

export function VacanciesPanel({ vacancyMatches }: VacanciesPanelProps) {
  const navigate = useNavigate();

  return (
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
  );
}
