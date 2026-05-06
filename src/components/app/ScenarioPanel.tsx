// Track 12 v1 — local what-if calculator on the contract editor.
// No persistence, no roundtrip — just lets the operator probe sensitivity to
// a rent shift, a renta-variable change, or a sales projection.
import { useEffect, useState } from 'react';
import { Sliders } from 'lucide-react';
import { useCurrency } from '@/lib/currency';
import {
  buildScenarioInputFromContract,
  evaluateScenario,
  type ScenarioInput,
} from '@/lib/scenarios';
import type { Contract, CurrencyTag } from '@/lib/domain';

export interface ScenarioPanelProps {
  contract: Pick<
    Contract,
    | 'baseRentUF'
    | 'rentSteps'
    | 'fixedRent'
    | 'variableRentPct'
    | 'commonExpenses'
    | 'fondoPromocion'
    | 'fixedRentCurrency'
    | 'commonExpensesCurrency'
    | 'fondoPromocionCurrency'
  >;
  monthlySales: number;
}

export function ScenarioPanel({ contract, monthlySales }: ScenarioPanelProps) {
  const { formatCurrency, getUfFor } = useCurrency();
  const baseline = buildScenarioInputFromContract(contract, monthlySales);
  const [scenario, setScenario] = useState<ScenarioInput>(baseline);

  // Reset the scenario when the underlying baseline changes (currency toggle,
  // contract switch). Keeps the panel honest after the operator picks a
  // different contract.
  useEffect(() => {
    setScenario(buildScenarioInputFromContract(contract, monthlySales));
  }, [contract, monthlySales]);

  const result = evaluateScenario(contract, baseline, scenario, { getUfFor });

  const update = <K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) =>
    setScenario((current) => ({ ...current, [key]: value }));

  return (
    <section
      className="rounded-2xl border border-[var(--border-color)] p-4"
      aria-label="Simulador de escenarios"
    >
      <header className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-[var(--violet-deep)]" />
        <h3 className="text-sm font-semibold">Simular escenario</h3>
      </header>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
        Cambios locales: no se guardan en el contrato. Útil para anticipar el impacto de una
        renegociación antes de comprometerla.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Renta fija mensual">
          <div className="flex gap-2">
            <input
              type="number"
              value={Number.isFinite(scenario.fixedRent) ? scenario.fixedRent : ''}
              onChange={(event) => update('fixedRent', Number(event.target.value))}
              className="input-field flex-1"
            />
            <select
              value={scenario.fixedRentCurrency}
              onChange={(event) => update('fixedRentCurrency', event.target.value as CurrencyTag)}
              className="input-field w-[90px] shrink-0"
              aria-label="Moneda renta fija escenario"
            >
              <option value="CLP">CLP</option>
              <option value="UF">UF</option>
            </select>
          </div>
        </Field>
        <Field label="% renta variable">
          <input
            type="number"
            step="0.1"
            value={Number.isFinite(scenario.variableRentPct) ? scenario.variableRentPct : ''}
            onChange={(event) => update('variableRentPct', Number(event.target.value))}
            className="input-field"
          />
        </Field>
        <Field label="Ventas proyectadas mensuales">
          <input
            type="number"
            value={Number.isFinite(scenario.monthlySales) ? scenario.monthlySales : ''}
            onChange={(event) => update('monthlySales', Number(event.target.value))}
            className="input-field"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Tile
          label="Δ renta total"
          value={formatCurrency(result.delta.rentTotal)}
          sub={`${result.rentTotalChangePct.toFixed(1)}% vs. base`}
        />
        <Tile
          label="Δ costo total ocupación"
          value={formatCurrency(result.delta.totalOccupancyCost)}
          sub="Renta + GC + fondo"
        />
        <Tile
          label="Δ costo ocupación %"
          value={`${result.occupancyChangePoints.toFixed(1)} pp`}
          sub={`Escenario: ${result.scenario.costoOcupacionPct.toFixed(1)}%`}
        />
      </div>

      {Math.abs(result.delta.costoOcupacionPct) > 5 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          Cambio de ocupación &gt; 5 pp. Verifica que el escenario sea viable para el locatario antes
          de proponerlo.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setScenario(baseline)}
        className="mt-3 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold"
      >
        Restablecer al actual
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      {children}
    </label>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {sub ? <p className="text-[11px] text-[var(--sidebar-fg)]">{sub}</p> : null}
    </div>
  );
}
