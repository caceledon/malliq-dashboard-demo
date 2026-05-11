import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type ChangeEvent } from 'react';
import { Building2, FileSignature, Sparkles, Loader2, FileSearch } from 'lucide-react';
import {
  buildContractCommercialSnapshot,
  buildContractDiff,
  createId,
  getContractDisplayValues,
  type Contract,
  type ContractFieldDiff,
  type CurrencyTag,
  type SignatureStatus,
  type AssetUnit,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { TenantHealthRating } from '@/components/app/TenantHealthRating';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ContractEvidenceModal } from '@/components/app/ContractEvidenceModal';
import { ScenarioPanel } from '@/components/app/ScenarioPanel';
import { useAppState } from '@/store/appState';

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
  // Snapshot of the contract before the most recent autofill landed, so we can
  // show a per-field "qué cambió" diff before save (C5).
  priorContract?: Contract | null;
  onClearPriorContract?: () => void;
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
  priorContract = null,
  onClearPriorContract,
}: ContractEditorProps) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Anchor for scroll preservation: the first stable element below the
  // dynamic autofill panels. When those panels mount/grow asynchronously
  // (autofillEvidence, autofillPendingFields, priorContract diff), this
  // anchor's offset within the scroll container shifts; we restore the
  // user's relative scroll position to keep the form fields where they were
  // before the panels expanded. This fixes K8 (page reflow / jump after AI
  // analysis lands).
  const formAnchorRef = useRef<HTMLDivElement>(null);
  const lastAnchorOffsetRef = useRef<number | null>(null);
  // Track the previous value of `isAutofilling` so we can detect the
  // true→false transition (autofill returned) and surface the freshly
  // mounted diff/evidence panels by scrolling the editor's internal
  // scroll back to the top. The K8 useLayoutEffect would otherwise pin
  // the form anchor in place, leaving the new panels offscreen above.
  const wasAutofillingRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{
    fieldLabel: string;
    snippet: string;
    page?: number;
  } | null>(null);
  const { isFeatureEnabled } = useAppState();
  // Track 1 v1 — open the source PDF only when the operator opted into the
  // flag, the contract carries a persisted source document, and the field
  // has a citation we can deep-link to.
  const sourceLinksOn =
    isFeatureEnabled('sourceLinkedAbstracts') && Boolean(draft.sourceDocumentId);
  const fieldEvidence = draft.evidence?.fields ?? {};
  const stepFieldEvidence = draft.evidence?.rentSteps ?? [];
  const previewDraft = sanitizeDraftForPreview(draft);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const anchor = formAnchorRef.current;
    if (!container || !anchor) return;
    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const anchorOffset = anchorRect.top - containerRect.top + container.scrollTop;
    const previous = lastAnchorOffsetRef.current;
    if (previous !== null && previous !== anchorOffset) {
      container.scrollTop += anchorOffset - previous;
    }
    lastAnchorOffsetRef.current = anchorOffset;
  });

  useEffect(() => {
    if (wasAutofillingRef.current && !isAutofilling) {
      const container = containerRef.current;
      if (container) {
        const supportsSmooth = typeof window !== 'undefined' && 'scrollBehavior' in document.documentElement.style;
        if (supportsSmooth && typeof container.scrollTo === 'function') {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          container.scrollTop = 0;
        }
      }
    }
    wasAutofillingRef.current = isAutofilling;
  }, [isAutofilling]);

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
    <div
      ref={containerRef}
      style={{ overflowAnchor: 'auto', scrollbarGutter: 'stable' }}
      className="glass-card relative min-w-0 self-start max-w-3xl overflow-x-hidden overflow-y-auto p-6 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-2rem)] 2xl:max-w-none 2xl:w-[clamp(520px,34vw,680px)] 2xl:min-w-[520px]"
    >
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
        <ContractDiffPanel prior={priorContract} next={draft} onDismiss={onClearPriorContract} />

        {(draft.baseRentUF || 0) > 0 && (draft.fixedRent || 0) === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Revisa la renta fija mensual</p>
            <p className="mt-1 text-xs opacity-80">
              El modelo cambió: la renta fija ya no se calcula como UF/m² × superficie. Ingresa el monto pactado en
              "Renta fija mensual" (UF o CLP) y deja UF/m² solo como referencia.
            </p>
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
                {Object.entries(autofillEvidence.fields).map(([field, snippet]) => {
                  const page = fieldEvidence[field]?.page;
                  const label = autofillFieldLabels[field] ?? field;
                  return (
                    <EvidenceRow
                      key={field}
                      label={label}
                      snippet={snippet}
                      page={page}
                      onOpenSource={
                        sourceLinksOn
                          ? () => setEvidenceModal({ fieldLabel: label, snippet, page })
                          : undefined
                      }
                    />
                  );
                })}
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
                      {Object.entries(stepEvidence).map(([field, snippet]) => {
                        const label =
                          field === 'rentaFijaUfM2'
                            ? 'Renta fija UF/m²'
                            : field === 'startDate'
                              ? 'Inicio'
                              : field === 'endDate'
                                ? 'Término'
                                : field;
                        const stepLabel = `Escalonado ${index + 1} · ${label}`;
                        const page = stepFieldEvidence[index]?.[field]?.page;
                        return (
                          <EvidenceRow
                            key={`${index + 1}-${field}`}
                            label={label}
                            snippet={snippet}
                            page={page}
                            onOpenSource={
                              sourceLinksOn
                                ? () => setEvidenceModal({ fieldLabel: stepLabel, snippet, page })
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div ref={formAnchorRef} aria-hidden="true" data-form-anchor="contract-editor" />
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
          La renta total se calcula como <strong>monto fijo mensual + % de ventas</strong>. La referencia UF/m² es un dato comercial informativo y no se multiplica por superficie. Cada monto puede expresarse en UF o CLP con el selector al costado.
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
          <Field label="Referencia UF/m² (informativo)">
            <input
              type="number"
              value={formatNumericInputValue(draft.baseRentUF)}
              onChange={(event) => onChange({ ...draft, baseRentUF: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
          <MoneyField
            label="Renta fija mensual"
            value={draft.fixedRent}
            currency={draft.fixedRentCurrency ?? 'CLP'}
            onChange={(value, currency) =>
              onChange({ ...draft, fixedRent: value, fixedRentCurrency: currency })
            }
          />
          <Field label="% venta / renta variable">
            <input
              type="number"
              value={formatNumericInputValue(draft.variableRentPct)}
              onChange={(event) => onChange({ ...draft, variableRentPct: parseNumericInputValue(event.target.value) })}
              className="input-field"
            />
          </Field>
          <MoneyField
            label="Gastos comunes"
            value={draft.commonExpenses}
            currency={draft.commonExpensesCurrency ?? 'CLP'}
            onChange={(value, currency) =>
              onChange({ ...draft, commonExpenses: value, commonExpensesCurrency: currency })
            }
          />
          <MoneyField
            label="Fondo de promoción"
            value={draft.fondoPromocion}
            currency={draft.fondoPromocionCurrency ?? 'CLP'}
            onChange={(value, currency) =>
              onChange({ ...draft, fondoPromocion: value, fondoPromocionCurrency: currency })
            }
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--sidebar-fg)]">Garantía y fee</p>
          <div className="grid gap-3 md:grid-cols-3">
            <MoneyField
              label="Garantía monto"
              value={draft.garantiaMonto}
              currency={draft.garantiaMontoCurrency ?? 'CLP'}
              onChange={(value, currency) =>
                onChange({ ...draft, garantiaMonto: value, garantiaMontoCurrency: currency })
              }
            />
            <Field label="Garantía vencimiento">
              <input
                type="date"
                value={draft.garantiaVencimiento}
                onChange={(event) => onChange({ ...draft, garantiaVencimiento: event.target.value })}
                className="input-field"
              />
            </Field>
            <MoneyField
              label="Fee ingreso"
              value={draft.feeIngreso}
              currency={draft.feeIngresoCurrency ?? 'CLP'}
              onChange={(value, currency) =>
                onChange({ ...draft, feeIngreso: value, feeIngresoCurrency: currency })
              }
            />
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

        {isFeatureEnabled('scenarioModeling') ? (
          <ScenarioPanel contract={previewDraft} monthlySales={currentMonthSales} />
        ) : null}

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
            onClick={() => {
              if (saveBlocked) return;
              onSave();
              toast('success', 'Contrato guardado exitosamente', draft.storeName || draft.companyName || undefined);
            }}
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
      <ContractEvidenceModal
        open={Boolean(evidenceModal)}
        onClose={() => setEvidenceModal(null)}
        fieldLabel={evidenceModal?.fieldLabel ?? ''}
        snippet={evidenceModal?.snippet ?? ''}
        page={evidenceModal?.page}
        sourceDocumentId={draft.sourceDocumentId ?? null}
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

function MoneyField({
  label,
  value,
  currency,
  onChange,
}: {
  label: string;
  value: number;
  currency: CurrencyTag;
  onChange: (value: number, currency: CurrencyTag) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          value={formatNumericInputValue(value)}
          onChange={(event) => onChange(parseNumericInputValue(event.target.value), currency)}
          className="input-field flex-1"
        />
        <select
          value={currency}
          onChange={(event) => onChange(value, event.target.value as CurrencyTag)}
          className="input-field w-[90px] shrink-0"
          aria-label={`Moneda de ${label}`}
        >
          <option value="CLP">CLP</option>
          <option value="UF">UF</option>
        </select>
      </div>
    </label>
  );
}

function EvidenceRow({
  label,
  snippet,
  page,
  onOpenSource,
}: {
  label: string;
  snippet: string;
  page?: number;
  onOpenSource?: () => void;
}) {
  return (
    <div className="rounded-xl border border-sky-200/80 bg-white/75 p-3 dark:border-sky-900/60 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-sky-900 dark:text-sky-100">{label}</p>
        {onOpenSource ? (
          <button
            type="button"
            onClick={onOpenSource}
            title={page ? `Abrir el PDF en la página ${page}` : 'Abrir el PDF fuente'}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-slate-950/40 dark:text-sky-100 dark:hover:bg-slate-900"
          >
            <FileSearch className="h-3 w-3" />
            Ver fuente{page ? ` · p. ${page}` : ''}
          </button>
        ) : null}
      </div>
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
    fixedRentCurrency: draft.fixedRentCurrency ?? 'CLP',
    commonExpensesCurrency: draft.commonExpensesCurrency ?? 'CLP',
    fondoPromocionCurrency: draft.fondoPromocionCurrency ?? 'CLP',
    garantiaMontoCurrency: draft.garantiaMontoCurrency ?? 'CLP',
    feeIngresoCurrency: draft.feeIngresoCurrency ?? 'CLP',
    rentSteps: draft.rentSteps.map((step) => ({
      ...step,
      rentaFijaUfM2: Number.isFinite(step.rentaFijaUfM2) ? step.rentaFijaUfM2 : 0,
    })),
  };
}

function formatDiffValue(value: unknown, kind: ContractFieldDiff['kind']): string {
  if (value === null || value === undefined || value === '') return '—';
  if (kind === 'percent' && typeof value === 'number') return `${value.toFixed(2)}%`;
  if (kind === 'currency-clp' && typeof value === 'number') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  }
  if (kind === 'currency-uf' && typeof value === 'number') return `${value.toFixed(4)} UF/m²`;
  if (kind === 'date' && typeof value === 'string') {
    const trimmed = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : String(value);
  }
  return String(value);
}

function ContractDiffPanel({
  prior,
  next,
  onDismiss,
}: {
  prior: Contract | null | undefined;
  next: Contract;
  onDismiss?: () => void;
}) {
  if (!prior) return null;
  const diffs = buildContractDiff(prior, next);
  if (diffs.length === 0) return null;
  return (
    <div
      className="rounded-2xl border"
      style={{
        borderColor: 'color-mix(in oklab, var(--violet-soft) 70%, var(--hairline))',
        background: 'color-mix(in oklab, var(--violet-soft) 35%, var(--surface))',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="t-eyebrow">Qué cambió en este autofill</div>
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-2)' }}>
            Revisa los {diffs.length} {diffs.length === 1 ? 'campo' : 'campos'} antes de guardar.
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs"
            style={{ color: 'var(--ink-3)', background: 'none', border: 0, cursor: 'pointer' }}
          >
            Cerrar
          </button>
        ) : null}
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {diffs.map((diff) => (
          <div
            key={diff.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px minmax(0, 1fr) 18px minmax(0, 1fr)',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: 'var(--surface)',
              border: '1px solid var(--hairline)',
              borderRadius: 10,
              fontSize: 12.5,
            }}
          >
            <span style={{ color: 'var(--ink-3)' }}>{diff.label}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink-3)',
                textDecoration: 'line-through',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDiffValue(diff.before, diff.kind)}
            </span>
            <span style={{ color: 'var(--violet-deep)', textAlign: 'center' }}>→</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink-1)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDiffValue(diff.after, diff.kind)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
