import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, FileSignature, Plus, Search } from 'lucide-react';
import { autofillContractFromPdf, resolveApiBase, type ContractAutofillResult } from '@/lib/api';
import {
  contractDateRangesOverlap,
  createId,
  monthKey,
  validateContract,
  type Contract,
  type SignatureStatus,
} from '@/lib/domain';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { cn } from '@/lib/utils';
import { ContractEditor } from '@/components/app/ContractEditor';
import { AutofillChat } from '@/components/AutofillChat';

function createDraftContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: createId('contract'),
    companyName: '',
    storeName: '',
    category: '',
    localIds: [],
    startDate: '',
    endDate: '',
    fixedRent: 0,
    variableRentPct: 0,
    baseRentUF: 0,
    commonExpenses: 0,
    fondoPromocion: 0,
    salesParticipationPct: 0,
    escalation: 'IPC anual',
    conditions: '',
    signatureStatus: 'pendiente',
    annexCount: 0,
    autoFillUnits: true,
    manualCompanyName: '',
    manualStoreName: '',
    manualCategory: '',
    manualOverrideNotes: '',
    garantiaMonto: 0,
    garantiaVencimiento: '',
    feeIngreso: 0,
    rentSteps: [],
    healthPagoAlDia: true,
    healthEntregaVentas: true,
    healthNivelVenta: false,
    healthNivelRenta: false,
    healthPercepcionAdmin: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function toDraftNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function sanitizeDraftNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function normalizeDraftContract(draft: Contract): Contract {
  return {
    ...draft,
    fixedRent: sanitizeDraftNumber(draft.fixedRent),
    variableRentPct: sanitizeDraftNumber(draft.variableRentPct),
    baseRentUF: sanitizeDraftNumber(draft.baseRentUF),
    commonExpenses: sanitizeDraftNumber(draft.commonExpenses),
    fondoPromocion: sanitizeDraftNumber(draft.fondoPromocion),
    garantiaMonto: sanitizeDraftNumber(draft.garantiaMonto),
    feeIngreso: sanitizeDraftNumber(draft.feeIngreso),
    rentSteps: draft.rentSteps.map((step) => ({
      ...step,
      rentaFijaUfM2: sanitizeDraftNumber(step.rentaFijaUfM2),
    })),
  };
}

function hasAutofillContent(result: ContractAutofillResult): boolean {
  return Boolean(
    result.companyName?.trim() ||
      result.storeName?.trim() ||
      result.category?.trim() ||
      result.escalation?.trim() ||
      result.startDate?.trim() ||
      result.endDate?.trim() ||
      result.garantiaVencimiento?.trim() ||
      (Array.isArray(result.rentSteps) && result.rentSteps.length > 0) ||
      [
        result.baseRentUF,
        result.fixedRent,
        result.variableRentPct,
        result.commonExpenses,
        result.fondoPromocion,
        result.garantiaMonto,
        result.feeIngreso,
      ].some((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

interface LocatariosRouteState {
  contractTemplate?: Partial<Contract>;
  flashMessage?: string;
}

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

interface AutofillEvidenceState {
  fields: Record<string, string>;
  rentSteps: Array<Record<string, string>>;
}

const emptyAutofillEvidence: AutofillEvidenceState = {
  fields: {},
  rentSteps: [],
};

function toEvidenceRecord(entries: Array<[string, string | null | undefined]>): Record<string, string> {
  return Object.fromEntries(
    entries.flatMap(([key, value]) => (typeof value === 'string' && value.trim() ? [[key, value]] : [])),
  );
}

export function Locatarios() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, insights, actions } = useAppState();
  const { formatCurrency } = useCurrency();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Contract>(createDraftContract());
  const [editorMessage, setEditorMessage] = useState('');
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillPendingFields, setAutofillPendingFields] = useState<string[]>([]);
  const [autofillEvidence, setAutofillEvidence] = useState<AutofillEvidenceState>(emptyAutofillEvidence);
  const [autofillTextSnippet, setAutofillTextSnippet] = useState<string | null>(null);
  const normalizedDraft = normalizeDraftContract(draft);

  const filtered = insights.tenantSummaries.filter((tenant) => {
    const target = `${tenant.storeName} ${tenant.companyName} ${tenant.category} ${tenant.localCodes.join(' ')}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  const currentMonth = monthKey(new Date());
  const currentMonthSales = state.sales
    .filter(
      (sale) =>
        monthKey(sale.occurredAt) === currentMonth &&
        (sale.contractId === draft.id || sale.localIds.some((unitId) => draft.localIds.includes(unitId))),
    )
    .reduce((sum, sale) => sum + sale.grossAmount, 0);

  const overlappingContracts = state.contracts.filter(
    (contract) =>
      contract.id !== normalizedDraft.id &&
      contract.localIds.some((unitId) => normalizedDraft.localIds.includes(unitId)) &&
      contractDateRangesOverlap(contract, normalizedDraft),
  );
  const validationIssues = validateContract(normalizedDraft);
  const blockingIssues = validationIssues.filter((issue) => issue.severity === 'error');
  const missingCoreFields =
    !normalizedDraft.companyName.trim() || !normalizedDraft.storeName.trim() || !normalizedDraft.category.trim() || normalizedDraft.localIds.length === 0;
  const saveBlocked = missingCoreFields || overlappingContracts.length > 0 || blockingIssues.length > 0;

  useEffect(() => {
    const routeState = location.state as LocatariosRouteState | null;
    if (!routeState?.contractTemplate) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setDraft(createDraftContract(routeState.contractTemplate));
      setEditorMessage(routeState.flashMessage ?? 'Se cargó un borrador prellenado en el editor.');
      setAutofillPendingFields([]);
      setAutofillEvidence(emptyAutofillEvidence);
      navigate(location.pathname, { replace: true, state: null });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.state, navigate]);

  const handleAutofillPDF = async (file: File) => {
    setIsAutofilling(true);
    setEditorMessage('Procesando PDF con IA...');

    try {
      const extracted = await autofillContractFromPdf(resolveApiBase(state.asset?.backendUrl), file);
      const extractedSteps = Array.isArray(extracted.rentSteps)
        ? extracted.rentSteps
            .filter(
              (step) =>
                typeof step?.startDate === 'string' &&
                step.startDate.trim() &&
                typeof step?.endDate === 'string' &&
                step.endDate.trim() &&
                typeof step?.rentaFijaUfM2 === 'number' &&
                Number.isFinite(step.rentaFijaUfM2),
            )
            .map((step) => ({
              id: createId('step'),
              startDate: step.startDate!,
              endDate: step.endDate!,
              rentaFijaUfM2: step.rentaFijaUfM2!,
            }))
        : [];
      const extractedEvidenceFields = toEvidenceRecord(Object.entries(extracted.evidence ?? {}));
      const extractedEvidenceSteps = Array.isArray(extracted.rentSteps)
        ? extracted.rentSteps
            .filter(
              (step) =>
                typeof step?.startDate === 'string' &&
                step.startDate.trim() &&
                typeof step?.endDate === 'string' &&
                step.endDate.trim() &&
                typeof step?.rentaFijaUfM2 === 'number' &&
                Number.isFinite(step.rentaFijaUfM2),
            )
            .map((step) => toEvidenceRecord(Object.entries(step.evidence ?? {})))
        : [];

      setDraft((current) => ({
        ...current,
        companyName: extracted.companyName ?? '',
        storeName: extracted.storeName ?? '',
        category: extracted.category ?? '',
        baseRentUF: toDraftNumber(extracted.baseRentUF),
        fixedRent: toDraftNumber(extracted.fixedRent),
        variableRentPct: toDraftNumber(extracted.variableRentPct),
        commonExpenses: toDraftNumber(extracted.commonExpenses),
        escalation: extracted.escalation ?? '',
        startDate: extracted.startDate ?? '',
        endDate: extracted.endDate ?? '',
        fondoPromocion: toDraftNumber(extracted.fondoPromocion),
        garantiaMonto: toDraftNumber(extracted.garantiaMonto),
        garantiaVencimiento: extracted.garantiaVencimiento ?? '',
        feeIngreso: toDraftNumber(extracted.feeIngreso),
        rentSteps: extractedSteps,
      }));
      setAutofillPendingFields(
        (extracted.missingFields ?? []).map((field) => autofillFieldLabels[field] ?? field),
      );
      setAutofillEvidence({
        fields: extractedEvidenceFields,
        rentSteps: extractedEvidenceSteps,
      });
      setAutofillTextSnippet(typeof extracted.textSnippet === 'string' ? extracted.textSnippet : null);

      setEditorMessage(
        !hasAutofillContent(extracted)
          ? extracted.source === 'mock_local'
            ? 'No hay un proveedor IA configurado. El formulario quedó en modo literal: solo se rellenan campos explícitos y los faltantes quedan vacíos para revisión manual.'
            : 'No se encontraron datos contractuales explícitos para estos campos. El formulario dejó vacíos los faltantes para revisión manual.'
          : extracted.source === 'mock_local'
            ? 'Se aplicó el modo local estricto. Solo se mantienen campos explícitos y el resto queda vacío para revisión manual.'
            : `Se cargaron solo los valores explícitos detectados con ${extracted.source === 'moonshot' ? 'Moonshot' : 'OpenAI'}. Revisa los campos vacíos antes de guardar.`,
      );
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : 'Error al procesar el PDF.');
    } finally {
      setIsAutofilling(false);
    }
  };

  const saveDraft = () => {
    if (saveBlocked) return;
    actions.upsertContract({
      ...normalizedDraft,
      salesParticipationPct: normalizedDraft.variableRentPct,
    });
    setEditorMessage('Contrato guardado correctamente.');
    setAutofillPendingFields([]);
    setAutofillEvidence(emptyAutofillEvidence);
    setAutofillTextSnippet(null);
  };

  const applyChatSuggestion = (updates: Record<string, string | number | null>) => {
    setDraft((current) => {
      const next = { ...current } as typeof current & Record<string, unknown>;
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined) continue;
        const numeric = typeof value === 'number' ? value : Number(value);
        if (
          ['baseRentUF', 'fixedRent', 'variableRentPct', 'commonExpenses', 'fondoPromocion', 'garantiaMonto', 'feeIngreso'].includes(key)
        ) {
          next[key] = Number.isFinite(numeric) ? toDraftNumber(numeric) : next[key];
        } else {
          next[key] = String(value);
        }
      }
      return next as typeof current;
    });
    setEditorMessage('Sugerencia del asistente aplicada. Revisa y guarda cuando corresponda.');
  };

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Locatarios y contratos</h1>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            La ficha de tienda se completa automáticamente desde el contrato y permite corrección manual antes de guardar.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--sidebar-fg)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar tienda, empresa, rubro o local"
            className="w-[260px] bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryBox label="Contratos" value={String(state.contracts.length)} icon={<FileSignature className="h-4 w-4 text-blue-600" />} />
            <SummaryBox label="Locales cubiertos" value={String(insights.occupiedUnits)} icon={<Building2 className="h-4 w-4 text-emerald-600" />} />
            <SummaryBox
              label="Superficie contratada"
              value={`${draft.localIds.reduce((sum, unitId) => sum + (state.units.find((u) => u.id === unitId)?.areaM2 ?? 0), 0).toLocaleString('es-CL')} m2`}
              icon={<Plus className="h-4 w-4 text-amber-600" />}
            />
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full min-w-[840px]">
              <thead className="bg-[var(--hover-bg)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Tienda</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Locales</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">m2</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ventas mes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Renta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Firma</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="cursor-pointer border-t border-[var(--border-color)]"
                    onClick={() => {
                      const selectedContract = state.contracts.find((contract) => contract.id === tenant.id);
                      if (selectedContract) {
                        setDraft(selectedContract);
                        setEditorMessage('');
                        setAutofillPendingFields([]);
                        setAutofillEvidence(emptyAutofillEvidence);
                      }
                    }}
                    onDoubleClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{tenant.storeName}</p>
                        <p className="text-xs text-[var(--sidebar-fg)]">{tenant.companyName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{tenant.localCodes.join(', ')}</td>
                    <td className="px-4 py-3 text-sm">{tenant.areaM2} m2</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(tenant.salesCurrent)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(tenant.rentTotal)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          tenant.signatureStatus === 'firmado' && 'badge-success',
                          tenant.signatureStatus === 'pendiente' && 'badge-danger',
                          tenant.signatureStatus === 'en_revision' && 'badge-warning',
                          tenant.signatureStatus === 'parcial' && 'badge-info',
                        )}
                      >
                        {signatureLabels[tenant.signatureStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--sidebar-fg)]">
                      No hay contratos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ContractEditor
            draft={draft}
            onChange={setDraft}
            onSave={saveDraft}
            onDelete={() => {
              actions.deleteContract(draft.id);
              setDraft(createDraftContract());
              setEditorMessage('Contrato eliminado del activo actual.');
              setAutofillPendingFields([]);
              setAutofillEvidence(emptyAutofillEvidence);
              setAutofillTextSnippet(null);
            }}
            onAutofill={handleAutofillPDF}
            onNew={() => {
              setDraft(createDraftContract());
              setEditorMessage('');
              setAutofillPendingFields([]);
              setAutofillEvidence(emptyAutofillEvidence);
              setAutofillTextSnippet(null);
            }}
            isAutofilling={isAutofilling}
            editorMessage={editorMessage}
            autofillPendingFields={autofillPendingFields}
            autofillEvidence={autofillEvidence}
            saveBlocked={saveBlocked}
            overlappingContracts={overlappingContracts}
            validationIssues={validationIssues}
            missingCoreFields={missingCoreFields}
            contracts={state.contracts}
            units={state.units}
            currentMonthSales={currentMonthSales}
          />
          <AutofillChat
            textSnippet={autofillTextSnippet}
            currentFields={{
              companyName: draft.companyName,
              storeName: draft.storeName,
              category: draft.category,
              baseRentUF: draft.baseRentUF,
              fixedRent: draft.fixedRent,
              variableRentPct: draft.variableRentPct,
              commonExpenses: draft.commonExpenses,
              escalation: draft.escalation,
              startDate: draft.startDate,
              endDate: draft.endDate,
              fondoPromocion: draft.fondoPromocion,
              garantiaMonto: draft.garantiaMonto,
              garantiaVencimiento: draft.garantiaVencimiento,
              feeIngreso: draft.feeIngreso,
            }}
            onApplySuggestion={applyChatSuggestion}
          />
        </div>
      </div>
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
  icon: React.ReactNode;
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
