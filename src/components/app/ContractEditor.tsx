import { useRef, useState, type ReactNode, type ChangeEvent } from 'react';
import { Building2, FileSignature, Sparkles, Loader2 } from 'lucide-react';
import {
  buildContractCommercialSnapshot,
  createId,
  getContractDisplayValues,
  type Contract,
  type SignatureStatus,
  type AssetUnit,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { TenantHealthRating } from '@/components/app/TenantHealthRating';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const signatureLabels: Record<SignatureStatus, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  parcial: 'Parcial',
  firmado: 'Firmado',
};

const autofillFieldLabels: Record<string, string> = {
  companyName: 'Razón social',
  storeName: 'Nombre tienda',
  category: 'Categoría',
  baseRentUF: 'Renta fija UF/m²',
  fixedRent: 'Renta fija CLP',
  variableRentPct: 'Renta variable',
  commonExpenses: 'Gastos comunes',
  fondoPromocion: 'Fondo de promoción',
  escalation: 'Reajuste / condiciones',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de término',
  garantiaMonto: 'Monto garantía',
  garantiaVencimiento: 'Vencimiento garantía',
  feeIngreso: 'Fee de ingreso',
};

interface ContractEditorProps {
  draft: Contract;
  onChange: (draft: Contract) => void;
  onSave: () => void;
  onDelete: () => void;
  onAutofill: (file: File) => void;
  onNew: () => void;
  isAutofilling: boolean;
  editorMessage: string;
  autofillPendingFields: string[];
  autofillEvidence: {
    fields: Record<string, string>;
    rentSteps: Array<Record<string, string>>;
  };
  saveBlocked: boolean;
  overlappingContracts: Contract[];
  validationIssues: ReturnType<typeof import('@/lib/domain').validateContract>;
  missingCoreFields: boolean;
  contracts: Contract[];
  units: AssetUnit[];
  currentMonthSales: number;
}

export function ContractEditor({
  draft,
  onChange,
  onSave,
  onDelete,
  onAutofill,
  onNew,
  isAutofilling,
  editorMessage,
  autofillPendingFields,
  autofillEvidence,
  saveBlocked,
  overlappingContracts,
  validationIssues,
  missingCoreFields,
  contracts,
  units,
  currentMonthSales,
}: ContractEditorProps) {
  const { formatCurrency } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const previewDraft = sanitizeDraftForPreview(draft);

  const selectedArea = draft.localIds.reduce((sum, unitId) => {
    const unit = units.find((item) => item.id === unitId);
    return sum + (unit?.areaM2 ?? 0);
  }, 0);

  const commercialPreview = buildContractCommercialSnapshot(previewDraft, selectedArea, currentMonthSales);
  const effectivePreview = getContractDisplayValues(previewDraft);

  const handleAutofill = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onAutofill(file);
    event.target.value = '';
  };

  return (
    <div className="glass-card relative min-w-0 self-start overflow-x-hidden overflow-y-auto p-6 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[clamp(560px,38vw,720px)] xl:min-w-[560px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Editor de contrato</h2>
          <p className="hidden text-xs text-[var(--sidebar-fg)] sm:block">Sube un contrato PDF y autocompleta con Inteligencia Artificial.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            onChange={handleAutofill}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAutofilling}
            title="Autocompletar Contrato Subiendo PDF"
            className="flex items-center gap-2 rounded-xl bg-purple-600/10 px-3 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-600/20 disabled:opacity-50 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
          >
            {isAutofilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="hidden sm:inline">Autocompletar IA</span>
          </button>
          <button
            onClick={onNew}
            className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover-bg)]"
          >
            Nuevo
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {editorMessage ? (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--sidebar-fg)]">
            {editorMessage}
          </div>
        ) : null}
        {autofillPendingFields.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Campos pendientes de revisión manual</p>
            <p className="mt-1 text-xs opacity-80">La extracción literal no encontró evidencia suficiente para estos datos.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {autofillPendingFields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-amber-300/80 bg-white/70 px-2.5 py-1 text-xs font-medium dark:border-amber-800 dark:bg-slate-950/40"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {Object.keys(autofillEvidence.fields).length > 0 || autofillEvidence.rentSteps.some((step) => Object.keys(step).length > 0) ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-100">
            <p className="font-semibold">Evidencia del último autofill IA</p>
            <p className="mt-1 text-xs opacity-80">Fragmentos literales del PDF usados para respaldar los campos extraídos.</p>
            {Object.keys(autofillEvidence.fields).length > 0 ? (
              <div className="mt-3 space-y-2">
                {Object.entries(autofillEvidence.fields).map(([field, snippet]) => (
                  <EvidenceRow
                    key={field}
                    label={autofillFieldLabels[field] ?? field}
                    snippet={snippet}
                  />
                ))}
              </div>
            ) : null}
            {autofillEvidence.rentSteps.some((step) => Object.keys(step).length > 0) ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Escalonados</p>
                {autofillEvidence.rentSteps.map((stepEvidence, index) => (
                  <div
                    key={`step-evidence-${index + 1}`}
                    className="rounded-xl border border-sky-200/80 bg-white/75 p-3 dark:border-sky-900/60 dark:bg-slate-950/40"
                  >
                    <p className="text-xs font-semibold">Escalonado {index + 1}</p>
                    <div className="mt-2 space-y-2">
                      {Object.entries(stepEvidence).map(([field, snippet]) => (
                        <EvidenceRow
                          key={`${index + 1}-${field}`}
                          label={
                            field === 'rentaFijaUfM2'
                              ? 'Renta fija UF/m²'
                              : field === 'startDate'
                                ? 'Inicio'
                                : field === 'endDate'
                                  ? 'Término'
                                  : field
                          }
                          snippet={snippet}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Razón social">
            <input
              value={draft.companyName}
              onChange={(event) => onChange({ ...draft, companyName: event.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Nombre tienda">
            <input
              value={draft.storeName}
              onChange={(event) => onChange({ ...draft, storeName: event.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Categoría">
            <input
              value={draft.category}
              onChange={(event) => onChange({ ...draft, category: event.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Estado firma">
            <select
              value={draft.signatureStatus}
              onChange={(event) => onChange({ ...draft, signatureStatus: event.target.value as SignatureStatus })}
              className="input-field"
            >
              {Object.entries(signatureLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs text-[var(--sidebar-fg)]">Locales asociados</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {units.map((unit) => (
              <label key={unit.id} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.localIds.includes(unit.id)}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      localIds: event.target.checked
                        ? [...draft.localIds, unit.id]
                        : draft.localIds.filter((item) => item !== unit.id),
                    })
                  }
                />
                <span className="font-medium">{unit.code}</span>
                <span className="text-[var(--sidebar-fg)]">{unit.areaM2} m2</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--sidebar-fg)]">Superficie calculada automáticamente: {selectedArea} m2</p>
        </div>

        {overlappingContracts.length > 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <p className="font-semibold">Conflicto de cobertura detectado</p>
            <p className="mt-1">Este contrato se superpone en fecha y local con {overlappingContracts.length} contrato(s) existente(s).</p>
            <div className="mt-3 space-y-2 text-xs">
              {overlappingContracts.map((contract) => (
                <div key={contract.id} className="rounded-xl border border-red-200/70 bg-white/70 px-3 py-2 dark:border-red-900/60 dark:bg-slate-950/40">
                  <p className="font-semibold">{getContractDisplayValues(contract).storeName}</p>
                  <p>
                    {contract.localIds
                      .map((unitId) => units.find((unit) => unit.id === unitId)?.code ?? unitId)
                      .join(', ')}{' '}
                    · {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {validationIssues.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
            <p className="text-sm font-semibold">Validaciones del contrato</p>
            <div className="mt-3 space-y-2">
              {validationIssues.map((issue, index) => (
                <div
                  key={`${issue.code}-${issue.stepId ?? index}`}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs',
                    issue.severity === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
                  )}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryBox
            label="Renta fija estimada"
            value={formatCurrency(commercialPreview.fixedRent)}
            icon={<Building2 className="h-4 w-4 text-blue-600" />}
          />
          <SummaryBox
            label="Variable con ventas mes"
            value={formatCurrency(commercialPreview.variableRent)}
            icon={<FileSignature className="h-4 w-4 text-emerald-600" />}
          />
          <SummaryBox
            label="Costo ocupación"
            value={currentMonthSales > 0 ? `${commercialPreview.costoOcupacionPct.toFixed(1)}%` : 'Sin ventas'}
            icon={<Sparkles className="h-4 w-4 text-amber-600" />}
          />
        </div>
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 text-xs text-[var(--sidebar-fg)]">
          Ventas del mes para locales seleccionados: {formatCurrency(currentMonthSales)}. UF activa:{' '}
          {commercialPreview.effectiveBaseRentUF.toLocaleString('es-CL', { maximumFractionDigits: 2 })}. Costo total de ocupación estimado:{' '}
          {formatCurrency(commercialPreview.totalOccupancyCost)}.
        </div>

        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
          MallIQ usa UF/m² como estándar para la renta fija. Ingresa CLP solo si el contrato está pactado íntegramente en pesos.
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Inicio">
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => onChange({ ...draft, startDate: event.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Término">
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) => onChange({ ...draft, endDate: event.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Renta fija UF/m²">
            <input
              type="number"
              value={formatNumericInputValue(draft.baseRentUF)}
              onChange={(event) => onChange({ ...draft, baseRentUF: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
          <Field label="Renta fija CLP (solo si aplica)">
            <input
              type="number"
              value={formatNumericInputValue(draft.fixedRent)}
              onChange={(event) => onChange({ ...draft, fixedRent: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
          <Field label="% venta / renta variable">
            <input
              type="number"
              value={formatNumericInputValue(draft.variableRentPct)}
              onChange={(event) => onChange({ ...draft, variableRentPct: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
          <Field label="Gastos comunes">
            <input
              type="number"
              value={formatNumericInputValue(draft.commonExpenses)}
              onChange={(event) => onChange({ ...draft, commonExpenses: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
          <Field label="Fondo de promoción">
            <input
              type="number"
              value={formatNumericInputValue(draft.fondoPromocion)}
              onChange={(event) => onChange({ ...draft, fondoPromocion: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--sidebar-fg)]">Garantía y fee</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Garantía monto">
              <input
                type="number"
                value={formatNumericInputValue(draft.garantiaMonto)}
                onChange={(event) => onChange({ ...draft, garantiaMonto: parseNumericInputValue(event.target.value) })}
                className="input-field"
              />
            </Field>
            <Field label="Garantía vencimiento">
              <input
                type="date"
                value={draft.garantiaVencimiento}
                onChange={(event) => onChange({ ...draft, garantiaVencimiento: event.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Fee ingreso">
              <input
                type="number"
                value={formatNumericInputValue(draft.feeIngreso)}
                onChange={(event) => onChange({ ...draft, feeIngreso: parseNumericInputValue(event.target.value) })}
                className="input-field"
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--sidebar-fg)]">Escalonado de renta (step-up)</p>
          <div className="space-y-2">
            {draft.rentSteps.map((step, index) => (
              <div key={step.id} className="grid gap-2 rounded-xl border border-[var(--border-color)] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label="Inicio">
                  <input
                    type="date"
                    value={step.startDate}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        rentSteps: draft.rentSteps.map((s, i) =>
                          i === index ? { ...s, startDate: event.target.value } : s
                        ),
                      })
                    }
                    className="input-field"
                  />
                </Field>
                <Field label="Término">
                  <input
                    type="date"
                    value={step.endDate}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        rentSteps: draft.rentSteps.map((s, i) =>
                          i === index ? { ...s, endDate: event.target.value } : s
                        ),
                      })
                    }
                    className="input-field"
                  />
                </Field>
                <Field label="Renta fija UF/m²">
                  <input
                    type="number"
                    value={formatNumericInputValue(step.rentaFijaUfM2)}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        rentSteps: draft.rentSteps.map((s, i) =>
                          i === index ? { ...s, rentaFijaUfM2: parseNumericInputValue(event.target.value) } : s
                        ),
                      })
                    }
                    className="input-field"
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    onClick={() =>
                      onChange({
                        ...draft,
                        rentSteps: draft.rentSteps.filter((_, i) => i !== index),
                      })
                    }
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                onChange({
                  ...draft,
                  rentSteps: [
                    ...draft.rentSteps,
                    { id: createId('step'), startDate: '', endDate: '', rentaFijaUfM2: 0 },
                  ],
                })
              }
              className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
            >
              Agregar escalonado
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--sidebar-fg)]">Salud del locatario</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.healthPagoAlDia}
                onChange={(event) => onChange({ ...draft, healthPagoAlDia: event.target.checked })}
              />
              Paga al día
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.healthEntregaVentas}
                onChange={(event) => onChange({ ...draft, healthEntregaVentas: event.target.checked })}
              />
              Entrega ventas al día
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.healthNivelVenta}
                onChange={(event) => onChange({ ...draft, healthNivelVenta: event.target.checked })}
              />
              Nivel de venta aceptable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.healthNivelRenta}
                onChange={(event) => onChange({ ...draft, healthNivelRenta: event.target.checked })}
              />
              Nivel de renta aceptable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.healthPercepcionAdmin}
                onChange={(event) => onChange({ ...draft, healthPercepcionAdmin: event.target.checked })}
              />
              Percepción personal admin
            </label>
          </div>
          <TenantHealthRating
            score={
              [
                draft.healthPagoAlDia,
                draft.healthEntregaVentas,
                draft.healthNivelVenta,
                draft.healthNivelRenta,
                draft.healthPercepcionAdmin,
              ].filter(Boolean).length
            }
          />
        </div>

        <Field label="Reajuste / condiciones">
          <input
            value={draft.escalation}
            onChange={(event) => onChange({ ...draft, escalation: event.target.value })}
            className="input-field"
          />
        </Field>

        <Field label="Cláusulas / notas operativas">
          <textarea
            rows={4}
            value={draft.conditions}
            onChange={(event) => onChange({ ...draft, conditions: event.target.value })}
            className="input-field"
          />
        </Field>

        <div className="rounded-2xl border border-[var(--border-color)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Autorrelleno de ficha comercial</p>
              <p className="text-xs text-[var(--sidebar-fg)]">Usa automáticamente los datos del contrato para mapa, listado, alertas y dashboard.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.autoFillUnits}
                onChange={(event) => onChange({ ...draft, autoFillUnits: event.target.checked })}
              />
              Automático
            </label>
          </div>

          {!draft.autoFillUnits ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Razón social visible">
                <input
                  value={draft.manualCompanyName ?? ''}
                  onChange={(event) => onChange({ ...draft, manualCompanyName: event.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Tienda visible">
                <input
                  value={draft.manualStoreName ?? ''}
                  onChange={(event) => onChange({ ...draft, manualStoreName: event.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Categoría visible">
                <input
                  value={draft.manualCategory ?? ''}
                  onChange={(event) => onChange({ ...draft, manualCategory: event.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Motivo del override">
                <input
                  value={draft.manualOverrideNotes ?? ''}
                  onChange={(event) => onChange({ ...draft, manualOverrideNotes: event.target.value })}
                  className="input-field"
                />
              </Field>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Vista que se mostrará en la app</p>
            <p className="mt-2 text-sm font-semibold">{effectivePreview.storeName}</p>
            <p className="text-xs text-[var(--sidebar-fg)]">
              {effectivePreview.companyName} · {effectivePreview.category} · {selectedArea} m2
            </p>
            {draft.manualOverrideNotes ? <p className="mt-2 text-xs text-[var(--sidebar-fg)]">{draft.manualOverrideNotes}</p> : null}
          </div>
        </div>

        {draft.createdAt ? (
          <div className="space-y-1 text-xs text-[var(--sidebar-fg)]">
            <p>Creado el {formatDate(draft.createdAt)}</p>
            {draft.signedAt ? <p>Firmado el {formatDate(draft.signedAt)}</p> : null}
          </div>
        ) : null}

        {missingCoreFields ? (
          <p className="text-xs text-[var(--sidebar-fg)]">Completa razón social, nombre tienda, categoría y al menos un local antes de guardar.</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSave}
            disabled={saveBlocked}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Guardar contrato
          </button>
          {contracts.some((contract) => contract.id === draft.id) ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar contrato"
        message={`¿Estás seguro de eliminar el contrato de ${draft.storeName || 'este locatario'}? Esta acción no se puede deshacer.`}
        variant="danger"
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function SummaryBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-4">
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      {children}
    </label>
  );
}

function EvidenceRow({ label, snippet }: { label: string; snippet: string }) {
  return (
    <div className="rounded-xl border border-sky-200/80 bg-white/75 p-3 dark:border-sky-900/60 dark:bg-slate-950/40">
      <p className="text-xs font-semibold text-sky-900 dark:text-sky-100">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--sidebar-fg)]">"{snippet}"</p>
    </div>
  );
}

function formatNumericInputValue(value: number): number | '' {
  return Number.isFinite(value) ? value : '';
}

function parseNumericInputValue(value: string): number {
  if (!value.trim()) {
    return Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function sanitizeDraftForPreview(draft: Contract): Contract {
  return {
    ...draft,
    fixedRent: Number.isFinite(draft.fixedRent) ? draft.fixedRent : 0,
    variableRentPct: Number.isFinite(draft.variableRentPct) ? draft.variableRentPct : 0,
    baseRentUF: Number.isFinite(draft.baseRentUF) ? draft.baseRentUF : 0,
    commonExpenses: Number.isFinite(draft.commonExpenses) ? draft.commonExpenses : 0,
    fondoPromocion: Number.isFinite(draft.fondoPromocion) ? draft.fondoPromocion : 0,
    garantiaMonto: Number.isFinite(draft.garantiaMonto) ? draft.garantiaMonto : 0,
    feeIngreso: Number.isFinite(draft.feeIngreso) ? draft.feeIngreso : 0,
    rentSteps: draft.rentSteps.map((step) => ({
      ...step,
      rentaFijaUfM2: Number.isFinite(step.rentaFijaUfM2) ? step.rentaFijaUfM2 : 0,
    })),
  };
}
