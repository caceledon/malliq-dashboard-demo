import { useState } from 'react';
import { FileUp, Pencil, Trash2, WandSparkles } from 'lucide-react';
import { DocumentManager } from '@/components/app/DocumentManager';
import { createId, monthKey, type PlanningEntry, type PlanType } from '@/lib/domain';
import { formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function parsePlanningRows(raw: string, type: PlanType): PlanningEntry[] {
  return raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes(';') ? ';' : ',';
      const [month, sales, rent] = line.split(separator).map((value) => value.trim());
      return {
        id: createId(type),
        type,
        month,
        salesAmount: Number(sales),
        rentAmount: Number(rent),
        generated: false,
      };
    })
    .filter((entry) => entry.month && entry.salesAmount >= 0);
}

export function Planeacion() {
  const { state, actions, insights } = useAppState();
  const { formatCurrency } = useCurrency();
  const [type, setType] = useState<PlanType>('budget');
  const [entryId, setEntryId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salesAmount, setSalesAmount] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [budgetMonths, setBudgetMonths] = useState(6);
  const [budgetUplift, setBudgetUplift] = useState(6);
  const [forecastMonths, setForecastMonths] = useState(6);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    entryId: string;
  }>({ open: false, entryId: '' });

  const planningByType = {
    budget: state.planning.filter((entry) => entry.type === 'budget').sort((left, right) => left.month.localeCompare(right.month)),
    forecast: state.planning.filter((entry) => entry.type === 'forecast').sort((left, right) => left.month.localeCompare(right.month)),
  };
  const currentMonth = monthKey(new Date());
  const currentBudget = planningByType.budget.find((entry) => entry.month === currentMonth);
  const currentForecast = planningByType.forecast.find((entry) => entry.month === currentMonth);
  const budgetGapPct = currentBudget?.salesAmount
    ? ((insights.monthlySales - currentBudget.salesAmount) / currentBudget.salesAmount) * 100
    : undefined;
  const forecastGapPct = currentForecast?.salesAmount
    ? ((insights.monthlySales - currentForecast.salesAmount) / currentForecast.salesAmount) * 100
    : undefined;

  const resetForm = () => {
    setEntryId('');
    setType('budget');
    setMonth(new Date().toISOString().slice(0, 7));
    setSalesAmount('');
    setRentAmount('');
  };

  const saveEntry = () => {
    if (!month || Number(salesAmount) < 0 || Number(rentAmount) < 0) {
      return;
    }

    actions.upsertPlanningEntry({
      id: entryId || createId(type),
      type,
      month,
      salesAmount: Number(salesAmount),
      rentAmount: Number(rentAmount),
      generated: false,
    });
    resetForm();
  };

  const importBulk = () => {
    const entries = parsePlanningRows(bulkText, type);
    actions.replacePlanningEntries(entries, type);
    setBulkText('');
  };

  const loadPlanningFile = async (file: File) => {
    setBulkText(await file.text());
  };

  const editEntry = (entry: PlanningEntry) => {
    setEntryId(entry.id);
    setType(entry.type);
    setMonth(entry.month);
    setSalesAmount(String(entry.salesAmount));
    setRentAmount(String(entry.rentAmount));
  };

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Presupuesto y forecast</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          Planeación comercial editable con carga manual o masiva, respaldo documental y generación automática.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PlanningMetric
          label="Ventas reales mes"
          value={formatCurrency(insights.monthlySales)}
          subtitle={currentBudget ? `Vs presupuesto ${budgetGapPct ? formatPercent(budgetGapPct) : '0.0%'}` : 'Sin presupuesto del mes'}
        />
        <PlanningMetric
          label="Presupuesto vigente"
          value={currentBudget ? formatCurrency(currentBudget.salesAmount) : 'No cargado'}
          subtitle={currentBudget ? `Renta objetivo ${formatCurrency(currentBudget.rentAmount)}` : 'Puedes generarlo automáticamente'}
        />
        <PlanningMetric
          label="Forecast vigente"
          value={currentForecast ? formatCurrency(currentForecast.salesAmount) : 'No cargado'}
          subtitle={currentForecast ? `Vs real ${forecastGapPct ? formatPercent(forecastGapPct) : '0.0%'}` : 'Puedes generarlo automáticamente'}
        />
        <PlanningMetric
          label="Cobertura"
          value={`${planningByType.budget.length}/${planningByType.forecast.length}`}
          subtitle="Meses con budget / forecast cargados"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Ingreso manual</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Tipo</span>
              <select value={type} onChange={(event) => setType(event.target.value as PlanType)} className="input-field">
                <option value="budget">Presupuesto</option>
                <option value="forecast">Forecast</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Mes</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Ventas</span>
              <input type="number" value={salesAmount} onChange={(event) => setSalesAmount(event.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Renta</span>
              <input type="number" value={rentAmount} onChange={(event) => setRentAmount(event.target.value)} className="input-field" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={saveEntry} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              {entryId ? 'Actualizar entrada' : 'Guardar entrada'}
            </button>
            {entryId ? (
              <button onClick={resetForm} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
                Cancelar edición
              </button>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Automatización</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-[var(--border-color)] p-4">
              <p className="text-sm font-semibold">Generar presupuesto</p>
              <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                Usa ventas históricas recientes y un uplift configurado para proyectar metas y rentas.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Meses</span>
                  <input type="number" min={1} max={24} value={budgetMonths} onChange={(event) => setBudgetMonths(Number(event.target.value) || 1)} className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Uplift %</span>
                  <input type="number" min={0} max={100} value={budgetUplift} onChange={(event) => setBudgetUplift(Number(event.target.value) || 0)} className="input-field" />
                </label>
              </div>
              <button
                onClick={() => actions.generateBudget(budgetMonths, budgetUplift)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold"
              >
                <WandSparkles className="h-4 w-4" />
                Generar presupuesto automático
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] p-4">
              <p className="text-sm font-semibold">Generar forecast</p>
              <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                Prioriza presupuesto disponible y, si falta, usa tendencia histórica reciente para construir forecast.
              </p>
              <div className="mt-3 max-w-[220px]">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Meses</span>
                  <input type="number" min={1} max={24} value={forecastMonths} onChange={(event) => setForecastMonths(Number(event.target.value) || 1)} className="input-field" />
                </label>
              </div>
              <button
                onClick={() => actions.generateForecast(forecastMonths)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold"
              >
                <WandSparkles className="h-4 w-4" />
                Generar forecast automático
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Carga masiva</h3>
          <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
            Usa una línea por mes: <code>YYYY-MM,ventas,renta</code> o <code>YYYY-MM;ventas;renta</code>.
          </p>
          <textarea
            rows={10}
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            className="input-field mt-4 w-full"
            placeholder="2026-04,180000000,72000000"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={importBulk} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              Reemplazar {type}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
              <FileUp className="h-4 w-4" />
              Cargar archivo
              <input type="file" accept=".txt,.csv" className="hidden" onChange={(event) => event.target.files?.[0] && loadPlanningFile(event.target.files[0])} />
            </label>
          </div>
        </div>

        <DocumentManager entityType="asset" entityId={state.asset?.id ?? 'asset'} title="Respaldos de presupuesto y forecast" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PlanningTable
          title="Presupuesto"
          entries={planningByType.budget}
          onEdit={editEntry}
          onDelete={(id) => setConfirmDialog({ open: true, entryId: id })}
        />
        <PlanningTable
          title="Forecast"
          entries={planningByType.forecast}
          onEdit={editEntry}
          onDelete={(id) => setConfirmDialog({ open: true, entryId: id })}
        />
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Eliminar entrada"
        message="¿Estás seguro de eliminar esta entrada de planeación? Esta acción no se puede deshacer."
        variant="danger"
        onConfirm={() => {
          actions.deletePlanningEntry(confirmDialog.entryId);
          setConfirmDialog({ open: false, entryId: '' });
        }}
        onCancel={() => setConfirmDialog({ open: false, entryId: '' })}
      />
    </div>
  );
}

function PlanningMetric({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{subtitle}</p>
    </div>
  );
}

function PlanningTable({
  title,
  entries,
  onEdit,
  onDelete,
}: {
  title: string;
  entries: PlanningEntry[];
  onEdit: (entry: PlanningEntry) => void;
  onDelete: (entryId: string) => void;
}) {
  const { formatCurrency } = useCurrency();
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--sidebar-fg)]">No hay datos cargados.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-[var(--border-color)] p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{entry.month}</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">
                    {entry.generated ? 'Generado automáticamente' : 'Carga manual / masiva'}
                  </p>
                  {entry.note ? <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{entry.note}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(entry.salesAmount)}</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">Renta {formatCurrency(entry.rentAmount)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => onEdit(entry)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button onClick={() => onDelete(entry.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600">
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
