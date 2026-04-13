import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, FileSignature, Plus, Search, Sparkles, Loader2 } from 'lucide-react';
import { contractDateRangesOverlap, createId, getContractDisplayValues, type Contract, type SignatureStatus } from '@/lib/domain';
import { formatDate, formatPeso } from '@/lib/format';
import { useAppState } from '@/store/appState';
import { cn } from '@/lib/utils';

function createDraftContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: createId('contract'),
    companyName: '',
    storeName: '',
    category: '',
    localIds: [],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    fixedRent: 0,
    variableRentPct: 0,
    baseRentUF: 0,
    commonExpenses: 0,
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
    createdAt: new Date().toISOString(),
    ...overrides,
  };
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

export function Locatarios() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, insights, actions } = useAppState();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Contract>(createDraftContract());
  const [editorMessage, setEditorMessage] = useState('');
  const [isAutofilling, setIsAutofilling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = insights.tenantSummaries.filter((tenant) => {
    const target = `${tenant.storeName} ${tenant.companyName} ${tenant.category} ${tenant.localCodes.join(' ')}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  const selectedArea = draft.localIds.reduce((sum, unitId) => {
    const unit = state.units.find((item) => item.id === unitId);
    return sum + (unit?.areaM2 ?? 0);
  }, 0);
  const effectivePreview = getContractDisplayValues(draft);
  const overlappingContracts = state.contracts.filter(
    (contract) =>
      contract.id !== draft.id &&
      contract.localIds.some((unitId) => draft.localIds.includes(unitId)) &&
      contractDateRangesOverlap(contract, draft),
  );
  const missingCoreFields =
    !draft.companyName.trim() || !draft.storeName.trim() || !draft.category.trim() || draft.localIds.length === 0;
  const saveBlocked = missingCoreFields || overlappingContracts.length > 0;

  useEffect(() => {
    const routeState = location.state as LocatariosRouteState | null;
    if (!routeState?.contractTemplate) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setDraft(createDraftContract(routeState.contractTemplate));
      setEditorMessage(routeState.flashMessage ?? 'Se cargó un borrador prellenado en el editor.');
      navigate(location.pathname, { replace: true, state: null });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.state, navigate]);

  const handleAutofillPDF = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAutofilling(true);
    setEditorMessage('Procesando PDF con IA...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:4000/api/contracts/autofill', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Fallo al extraer datos del PDF');

      const extracted = await response.json();
      
      setDraft(current => ({
        ...current,
        companyName: extracted.companyName || current.companyName,
        storeName: extracted.storeName || current.storeName,
        category: extracted.category || current.category,
        baseRentUF: extracted.baseRentUF ?? current.baseRentUF,
        fixedRent: extracted.fixedRent ?? current.fixedRent,
        variableRentPct: extracted.variableRentPct ?? current.variableRentPct,
        commonExpenses: extracted.commonExpenses ?? current.commonExpenses,
        escalation: extracted.escalation || current.escalation,
        startDate: extracted.startDate || current.startDate,
        endDate: extracted.endDate || current.endDate,
      }));

      setEditorMessage('Campos pre-llenados con IA. Por favor verifica los datos antes de guardar.');
    } catch {
      setEditorMessage('Error al procesar el PDF.');
    } finally {
      setIsAutofilling(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveDraft = () => {
    if (saveBlocked) {
      return;
    }
    actions.upsertContract({
      ...draft,
      salesParticipationPct: draft.variableRentPct,
    });
    setEditorMessage('Contrato guardado correctamente.');
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryBox label="Contratos" value={String(state.contracts.length)} icon={<FileSignature className="h-4 w-4 text-blue-600" />} />
            <SummaryBox label="Locales cubiertos" value={String(insights.occupiedUnits)} icon={<Building2 className="h-4 w-4 text-emerald-600" />} />
            <SummaryBox label="Superficie contratada" value={`${selectedArea.toLocaleString('es-CL')} m2`} icon={<Plus className="h-4 w-4 text-amber-600" />} />
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
                    <td className="px-4 py-3 text-sm font-semibold">{formatPeso(tenant.salesCurrent)}</td>
                    <td className="px-4 py-3 text-sm">{formatPeso(tenant.rentTotal)}</td>
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

        <div className="glass-card p-5 relative self-start xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] overflow-y-auto">
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
                onChange={handleAutofillPDF}
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
                onClick={() => {
                  setDraft(createDraftContract());
                  setEditorMessage('');
                }}
                className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover-bg)]"
              >
                Nuevo
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {editorMessage ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--sidebar-fg)]">
                {editorMessage}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Razón social">
                <input
                  value={draft.companyName}
                  onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))}
                  className="input-field"
                />
              </Field>
              <Field label="Nombre tienda">
                <input
                  value={draft.storeName}
                  onChange={(event) => setDraft((current) => ({ ...current, storeName: event.target.value }))}
                  className="input-field"
                />
              </Field>
              <Field label="Categoría">
                <input
                  value={draft.category}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                  className="input-field"
                />
              </Field>
              <Field label="Estado firma">
                <select
                  value={draft.signatureStatus}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, signatureStatus: event.target.value as SignatureStatus }))
                  }
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
                {state.units.map((unit) => (
                  <label key={unit.id} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.localIds.includes(unit.id)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          localIds: event.target.checked
                            ? [...current.localIds, unit.id]
                            : current.localIds.filter((item) => item !== unit.id),
                        }))
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
                <p className="mt-1">
                  Este contrato se superpone en fecha y local con {overlappingContracts.length} contrato(s) existente(s).
                </p>
                <div className="mt-3 space-y-2 text-xs">
                  {overlappingContracts.map((contract) => (
                    <div key={contract.id} className="rounded-xl border border-red-200/70 bg-white/70 px-3 py-2 dark:border-red-900/60 dark:bg-slate-950/40">
                      <p className="font-semibold">{getContractDisplayValues(contract).storeName}</p>
                      <p>
                        {contract.localIds
                          .map((unitId) => state.units.find((unit) => unit.id === unitId)?.code ?? unitId)
                          .join(', ')}{' '}
                        · {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Inicio">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                  className="input-field"
                />
              </Field>
              <Field label="Término">
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
                  className="input-field"
                />
              </Field>
              <Field label="Renta fija CLP">
                <input
                  type="number"
                  value={draft.fixedRent}
                  onChange={(event) => setDraft((current) => ({ ...current, fixedRent: Number(event.target.value) }))}
                  className="input-field"
                />
              </Field>
              <Field label="% venta / renta variable">
                <input
                  type="number"
                  value={draft.variableRentPct}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      variableRentPct: Number(event.target.value),
                    }))
                  }
                  className="input-field"
                />
              </Field>
              <Field label="Base UF">
                <input
                  type="number"
                  value={draft.baseRentUF}
                  onChange={(event) => setDraft((current) => ({ ...current, baseRentUF: Number(event.target.value) }))}
                  className="input-field"
                />
              </Field>
              <Field label="Gastos comunes">
                <input
                  type="number"
                  value={draft.commonExpenses}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, commonExpenses: Number(event.target.value) }))
                  }
                  className="input-field"
                />
              </Field>
            </div>

            <Field label="Reajuste / condiciones">
              <input
                value={draft.escalation}
                onChange={(event) => setDraft((current) => ({ ...current, escalation: event.target.value }))}
                className="input-field"
              />
            </Field>

            <Field label="Cláusulas / notas operativas">
              <textarea
                rows={4}
                value={draft.conditions}
                onChange={(event) => setDraft((current) => ({ ...current, conditions: event.target.value }))}
                className="input-field"
              />
            </Field>

            <div className="rounded-2xl border border-[var(--border-color)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Autorrelleno de ficha comercial</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">
                    Usa automáticamente los datos del contrato para mapa, listado, alertas y dashboard.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.autoFillUnits}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        autoFillUnits: event.target.checked,
                      }))
                    }
                  />
                  Automático
                </label>
              </div>

              {!draft.autoFillUnits ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Razón social visible">
                    <input
                      value={draft.manualCompanyName ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          manualCompanyName: event.target.value,
                        }))
                      }
                      className="input-field"
                    />
                  </Field>
                  <Field label="Tienda visible">
                    <input
                      value={draft.manualStoreName ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          manualStoreName: event.target.value,
                        }))
                      }
                      className="input-field"
                    />
                  </Field>
                  <Field label="Categoría visible">
                    <input
                      value={draft.manualCategory ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          manualCategory: event.target.value,
                        }))
                      }
                      className="input-field"
                    />
                  </Field>
                  <Field label="Motivo del override">
                    <input
                      value={draft.manualOverrideNotes ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          manualOverrideNotes: event.target.value,
                        }))
                      }
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
                {draft.manualOverrideNotes ? (
                  <p className="mt-2 text-xs text-[var(--sidebar-fg)]">{draft.manualOverrideNotes}</p>
                ) : null}
              </div>
            </div>

            {draft.createdAt ? (
              <div className="space-y-1 text-xs text-[var(--sidebar-fg)]">
                <p>Creado el {formatDate(draft.createdAt)}</p>
                {draft.signedAt ? <p>Firmado el {formatDate(draft.signedAt)}</p> : null}
              </div>
            ) : null}

            {missingCoreFields ? (
              <p className="text-xs text-[var(--sidebar-fg)]">
                Completa razón social, nombre tienda, categoría y al menos un local antes de guardar.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={saveDraft}
                disabled={saveBlocked}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar contrato
              </button>
              {state.contracts.some((contract) => contract.id === draft.id) ? (
                <button
                  onClick={() => actions.deleteContract(draft.id)}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600"
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </div>
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
