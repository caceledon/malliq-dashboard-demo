import { useState } from 'react';
import { Building2, MapPinned, Ruler, Save } from 'lucide-react';
import { useAppState } from '@/store/appState';

interface DraftUnit {
  code: string;
  label: string;
  areaM2: number;
  level: string;
}

function defaultUnit(index: number): DraftUnit {
  const suffix = 101 + index;
  return {
    code: `L-${suffix}`,
    label: `Local ${suffix}`,
    areaM2: 0,
    level: 'Planta 1',
  };
}

function resizeUnits(current: DraftUnit[], count: number): DraftUnit[] {
  return Array.from({ length: count }, (_, index) => current[index] ?? defaultUnit(index));
}

export function SetupWizard() {
  const { state, actions } = useAppState();

  return <SetupWizardForm key={state.mall?.id ?? 'new-mall'} state={state} actions={actions} />;
}

function SetupWizardForm({
  state,
  actions,
}: {
  state: ReturnType<typeof useAppState>['state'];
  actions: ReturnType<typeof useAppState>['actions'];
}) {
  const [mallName, setMallName] = useState(state.mall?.name ?? 'Mall operativo');
  const [city, setCity] = useState(state.mall?.city ?? 'Santiago');
  const [region, setRegion] = useState(state.mall?.region ?? 'Metropolitana');
  const [notes, setNotes] = useState(state.mall?.notes ?? '');
  const [unitCount, setUnitCount] = useState(Math.max(state.units.length, 6));
  const [units, setUnits] = useState<DraftUnit[]>(
    state.units.length > 0
      ? state.units.map((unit) => ({
          code: unit.code,
          label: unit.label,
          areaM2: unit.areaM2,
          level: unit.level,
        }))
      : resizeUnits([], 6),
  );

  const totalArea = units.reduce((sum, unit) => sum + Number(unit.areaM2 || 0), 0);

  const handleSave = () => {
    actions.initializeMall({
      mall: {
        name: mallName,
        city,
        region,
        notes,
        themePreference: state.mall?.themePreference ?? 'light',
        backendUrl: state.mall?.backendUrl ?? 'http://localhost:4000/api',
        syncEnabled: state.mall?.syncEnabled ?? false,
        lastSyncedAt: state.mall?.lastSyncedAt,
      },
      units: units.map((unit) => ({
        ...unit,
        areaM2: Number(unit.areaM2),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-white/95 px-4 py-8 backdrop-blur-sm dark:bg-slate-950/90">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Configuración inicial</p>
              <h1 className="mt-2 text-2xl font-bold">Carga la base física del mall antes de operar</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--sidebar-fg)]">
                Define la cantidad de locales y los m2 de cada uno. El plano, la ocupación, los contratos multi-local y los
                KPIs se calculan desde esta estructura base.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--hover-bg)] p-4 text-sm lg:min-w-[320px]">
              <div>
                <p className="text-xs text-[var(--sidebar-fg)]">Locales</p>
                <p className="text-lg font-semibold">{units.length}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--sidebar-fg)]">Superficie</p>
                <p className="text-lg font-semibold">{totalArea.toLocaleString('es-CL')} m2</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold">Datos generales</h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Nombre del mall</span>
                <input
                  value={mallName}
                  onChange={(event) => setMallName(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Ciudad</span>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Región</span>
                  <input
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Notas operativas</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Cantidad de locales</span>
                <input
                  type="number"
                  min={1}
                  value={unitCount}
                  onChange={(event) => {
                    const nextCount = Math.max(1, Number(event.target.value));
                    setUnitCount(nextCount);
                    setUnits((current) => resizeUnits(current, nextCount));
                  }}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold">Locales y superficies</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1 text-xs text-[var(--sidebar-fg)]">
                <MapPinned className="h-3.5 w-3.5" />
                El plano se genera en base a estos m2
              </div>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-auto rounded-2xl border border-[var(--border-color)]">
              <table className="w-full min-w-[640px]">
                <thead className="bg-[var(--hover-bg)]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Código</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Etiqueta</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">m2</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit, index) => (
                    <tr key={index} className="border-t border-[var(--border-color)]">
                      <td className="px-3 py-2">
                        <input
                          value={unit.code}
                          onChange={(event) =>
                            setUnits((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, code: event.target.value } : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={unit.label}
                          onChange={(event) =>
                            setUnits((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, label: event.target.value } : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={unit.areaM2}
                          onChange={(event) =>
                            setUnits((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, areaM2: Number(event.target.value) } : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={unit.level}
                          onChange={(event) =>
                            setUnits((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, level: event.target.value } : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
              >
                <Save className="h-4 w-4" />
                Guardar base física
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
