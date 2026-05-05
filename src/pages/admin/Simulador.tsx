import { useMemo, useState } from 'react';
import { Calculator, RefreshCcw } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useCurrency } from '@/lib/currency';
import { buildContractCommercialSnapshot, getUnitArea } from '@/lib/domain';
import type { Contract, CurrencyTag } from '@/lib/domain';

type ScenarioContract = Pick<
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

interface Scenario {
  id: string;
  label: string;
  fixedRent: number;
  fixedRentCurrency: CurrencyTag;
  variableRentPct: number;
  commonExpenses: number;
  commonExpensesCurrency: CurrencyTag;
  fondoPromocion: number;
  fondoPromocionCurrency: CurrencyTag;
  areaM2: number;
  monthlySales: number;
}

function emptyScenario(label: string): Scenario {
  return {
    id: `scn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    fixedRent: 1_500_000,
    fixedRentCurrency: 'CLP',
    variableRentPct: 7,
    commonExpenses: 250_000,
    commonExpensesCurrency: 'CLP',
    fondoPromocion: 50_000,
    fondoPromocionCurrency: 'CLP',
    areaM2: 60,
    monthlySales: 18_000_000,
  };
}

export function Simulador() {
  const { state } = useAppState();
  const { formatCurrency, getUfFor } = useCurrency();
  const [selectedContractId, setSelectedContractId] = useState<string>('__custom');
  const [scenarioA, setScenarioA] = useState<Scenario>(() => emptyScenario('Escenario A'));
  const [scenarioB, setScenarioB] = useState<Scenario>(() => ({
    ...emptyScenario('Escenario B'),
    variableRentPct: 9,
    monthlySales: 22_000_000,
  }));

  const seedFromContract = (contractId: string) => {
    setSelectedContractId(contractId);
    if (contractId === '__custom') return;
    const contract = state.contracts.find((c) => c.id === contractId);
    if (!contract) return;
    const area = getUnitArea(contract.localIds, state.units) || scenarioA.areaM2;
    const baseline: Scenario = {
      ...scenarioA,
      fixedRent: contract.fixedRent,
      fixedRentCurrency: contract.fixedRentCurrency ?? 'CLP',
      variableRentPct: contract.variableRentPct,
      commonExpenses: contract.commonExpenses,
      commonExpensesCurrency: contract.commonExpensesCurrency ?? 'CLP',
      fondoPromocion: contract.fondoPromocion,
      fondoPromocionCurrency: contract.fondoPromocionCurrency ?? 'CLP',
      areaM2: area,
    };
    setScenarioA(baseline);
    setScenarioB({ ...baseline, label: 'Escenario B', variableRentPct: contract.variableRentPct + 2 });
  };

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const buildSnapshot = (s: Scenario) => {
    const fakeContract: ScenarioContract = {
      baseRentUF: 0,
      rentSteps: [],
      fixedRent: s.fixedRent,
      variableRentPct: s.variableRentPct,
      commonExpenses: s.commonExpenses,
      fondoPromocion: s.fondoPromocion,
      fixedRentCurrency: s.fixedRentCurrency,
      commonExpensesCurrency: s.commonExpensesCurrency,
      fondoPromocionCurrency: s.fondoPromocionCurrency,
    };
    return buildContractCommercialSnapshot(fakeContract, s.areaM2, s.monthlySales, todayIso, getUfFor);
  };

  const snapA = useMemo(() => buildSnapshot(scenarioA), [scenarioA, getUfFor, todayIso]);
  const snapB = useMemo(() => buildSnapshot(scenarioB), [scenarioB, getUfFor, todayIso]);

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-bold md:text-2xl">Simulador de renta</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          Compara dos escenarios de contrato comercial. Los importes en UF usan la conversión de hoy ({todayIso}).
        </p>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Cargar desde contrato</span>
            <select
              value={selectedContractId}
              onChange={(event) => seedFromContract(event.target.value)}
              className="input-field"
            >
              <option value="__custom">Personalizado (sin pre-llenar)</option>
              {state.contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.storeName} · {contract.companyName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSelectedContractId('__custom');
              setScenarioA(emptyScenario('Escenario A'));
              setScenarioB({ ...emptyScenario('Escenario B'), variableRentPct: 9, monthlySales: 22_000_000 });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCcw className="h-4 w-4" />
            Reiniciar
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ScenarioCard
          scenario={scenarioA}
          onChange={setScenarioA}
          accent="orange"
          snapshot={snapA}
          formatCurrency={formatCurrency}
        />
        <ScenarioCard
          scenario={scenarioB}
          onChange={setScenarioB}
          accent="blue"
          snapshot={snapB}
          formatCurrency={formatCurrency}
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Comparación</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CompareRow label="Renta fija (CLP)" a={snapA.fixedRent} b={snapB.fixedRent} formatCurrency={formatCurrency} />
          <CompareRow label="Renta variable (CLP)" a={snapA.variableRent} b={snapB.variableRent} formatCurrency={formatCurrency} />
          <CompareRow label="Renta total (CLP)" a={snapA.rentTotal} b={snapB.rentTotal} formatCurrency={formatCurrency} />
          <CompareRow label="Costo ocupación (CLP)" a={snapA.totalOccupancyCost} b={snapB.totalOccupancyCost} formatCurrency={formatCurrency} />
          <CompareRow
            label="Costo ocupación %"
            a={snapA.costoOcupacionPct}
            b={snapB.costoOcupacionPct}
            formatPct
          />
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  onChange,
  accent,
  snapshot,
  formatCurrency,
}: {
  scenario: Scenario;
  onChange: (next: Scenario) => void;
  accent: 'orange' | 'blue';
  snapshot: ReturnType<typeof buildContractCommercialSnapshot>;
  formatCurrency: (amountClp: number, options?: { decimals?: number; unit?: CurrencyTag; atDate?: string | Date }) => string;
}) {
  const accentClass = accent === 'orange' ? 'text-orange-600' : 'text-blue-600';
  const update = <K extends keyof Scenario>(key: K, value: Scenario[K]) => onChange({ ...scenario, [key]: value });
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${accentClass}`}>{scenario.label}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <NumberField
          label="Renta fija mensual"
          value={scenario.fixedRent}
          onChange={(v) => update('fixedRent', v)}
          unit={scenario.fixedRentCurrency}
          onUnitChange={(unit) => update('fixedRentCurrency', unit)}
        />
        <NumberField
          label="% sobre ventas"
          value={scenario.variableRentPct}
          onChange={(v) => update('variableRentPct', v)}
          step={0.1}
          suffix="%"
        />
        <NumberField
          label="Gastos comunes"
          value={scenario.commonExpenses}
          onChange={(v) => update('commonExpenses', v)}
          unit={scenario.commonExpensesCurrency}
          onUnitChange={(unit) => update('commonExpensesCurrency', unit)}
        />
        <NumberField
          label="Fondo promoción"
          value={scenario.fondoPromocion}
          onChange={(v) => update('fondoPromocion', v)}
          unit={scenario.fondoPromocionCurrency}
          onUnitChange={(unit) => update('fondoPromocionCurrency', unit)}
        />
        <NumberField label="Área (m²)" value={scenario.areaM2} onChange={(v) => update('areaM2', v)} />
        <NumberField
          label="Ventas mensuales proyectadas (CLP)"
          value={scenario.monthlySales}
          onChange={(v) => update('monthlySales', v)}
        />
      </div>

      <div className="mt-5 grid gap-2 rounded-2xl bg-[var(--hover-bg)] p-4 text-sm">
        <Result label="Renta fija (CLP)" value={formatCurrency(snapshot.fixedRent, { unit: 'CLP' })} />
        <Result label="Renta variable" value={formatCurrency(snapshot.variableRent, { unit: 'CLP' })} />
        <Result label="Renta total" value={formatCurrency(snapshot.rentTotal, { unit: 'CLP' })} highlight />
        <Result label="Costo ocupación" value={formatCurrency(snapshot.totalOccupancyCost, { unit: 'CLP' })} />
        <Result label="Costo ocupación %" value={`${snapshot.costoOcupacionPct.toFixed(1)}%`} />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  suffix,
  unit,
  onUnitChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  suffix?: string;
  unit?: CurrencyTag;
  onUnitChange?: (next: CurrencyTag) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step ?? 1}
          onChange={(event) => onChange(Number(event.target.value))}
          className="input-field flex-1"
        />
        {onUnitChange && unit ? (
          <select
            value={unit}
            onChange={(event) => onUnitChange(event.target.value as CurrencyTag)}
            className="input-field w-20"
          >
            <option value="CLP">CLP</option>
            <option value="UF">UF</option>
          </select>
        ) : suffix ? (
          <span className="flex items-center px-2 text-xs text-[var(--sidebar-fg)]">{suffix}</span>
        ) : null}
      </div>
    </label>
  );
}

function Result({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-[var(--sidebar-fg)]">{label}</span>
      <span className={`tabular-nums ${highlight ? 'text-base font-bold' : 'text-sm font-semibold'}`}>{value}</span>
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
  formatCurrency,
  formatPct,
}: {
  label: string;
  a: number;
  b: number;
  formatCurrency?: (amountClp: number, options?: { decimals?: number; unit?: CurrencyTag; atDate?: string | Date }) => string;
  formatPct?: boolean;
}) {
  const fmt = (n: number) => (formatPct ? `${n.toFixed(1)}%` : formatCurrency ? formatCurrency(n, { unit: 'CLP' }) : String(n));
  const delta = b - a;
  const deltaPct = a !== 0 ? (delta / Math.abs(a)) * 100 : 0;
  const deltaTone = delta > 0 ? 'text-rose-600' : delta < 0 ? 'text-emerald-600' : 'text-[var(--sidebar-fg)]';
  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-3">
      <p className="text-xs text-[var(--sidebar-fg)]">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
        <span>
          <span className="text-orange-600">A</span> {fmt(a)}
        </span>
        <span>
          <span className="text-blue-600">B</span> {fmt(b)}
        </span>
      </div>
      <p className={`mt-1 text-xs font-semibold ${deltaTone}`}>
        Δ {fmt(delta)} ({deltaPct >= 0 ? '+' : ''}
        {deltaPct.toFixed(1)}%)
      </p>
    </div>
  );
}
