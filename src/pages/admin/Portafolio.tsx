import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CopyPlus, Layers3, MapPinned, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';

type TemplateMode = 'blank' | 'copy_units';

export function Portafolio() {
  const navigate = useNavigate();
  const { state, activeAssetId, assetSummaries, portfolioStats, actions } = useAppState();
  const { formatCurrency } = useCurrency();
  const [name, setName] = useState('');
  const [city, setCity] = useState('Santiago');
  const [region, setRegion] = useState('Metropolitana');
  const [notes, setNotes] = useState('');
  const [templateMode, setTemplateMode] = useState<TemplateMode>('blank');
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const canCopyUnits = state.units.length > 0;
  const sourceUnits =
    templateMode === 'copy_units' && canCopyUnits
      ? state.units.map((unit) => ({
          code: unit.code,
          label: unit.label,
          areaM2: unit.areaM2,
          level: unit.level,
          frontage: unit.frontage,
          depth: unit.depth,
          notes: unit.notes,
          manualDisplayName: unit.manualDisplayName,
          manualCategory: unit.manualCategory,
        }))
      : [];

  const createAsset = () => {
    if (!name.trim()) {
      setMessage('Debes ingresar un nombre para el nuevo activo.');
      return;
    }

    const assetId = actions.createAsset({
      makeActive: true,
      asset: {
        name: name.trim(),
        city: city.trim(),
        region: region.trim(),
        notes: notes.trim(),
        themePreference: state.asset?.themePreference ?? 'light',
        backendUrl: state.asset?.backendUrl ?? '/api',
        syncEnabled: false,
      },
      units: sourceUnits,
    });

    actions.switchAsset(assetId);
    setMessage(
      sourceUnits.length > 0
        ? `Activo ${name.trim()} creado con la base física del activo activo.`
        : `Activo ${name.trim()} creado. Completa su configuración inicial para operar.`,
    );
    setName('');
    setNotes('');
    setTemplateMode('blank');
    navigate('/admin/dashboard');
  };

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Portafolio de activos</h1>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            Administra varias operaciones desde una sola instalación, cambia el activo activo y crea nuevas bases con o sin plantilla física.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/admin/configuracion')}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            Configurar activo activo
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Abrir dashboard activo
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioMetric title="Activos" value={String(portfolioStats.assetCount)} meta="Espacios operativos cargados" icon={<Building2 className="h-4 w-4 text-blue-600" />} />
        <PortfolioMetric title="Locales" value={String(portfolioStats.totalUnits)} meta={`${portfolioStats.occupiedUnits} con contrato vigente`} icon={<Layers3 className="h-4 w-4 text-emerald-600" />} />
        <PortfolioMetric title="Ventas del mes" value={formatCurrency(portfolioStats.monthlySales)} meta="Suma del portafolio activo" icon={<MapPinned className="h-4 w-4 text-amber-600" />} />
        <PortfolioMetric title="Alertas" value={String(portfolioStats.alertCount)} meta="Pendientes operativos abiertos" icon={<ArrowRight className="h-4 w-4 text-rose-600" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Crear nuevo activo</h3>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Nombre del activo">
              <input value={name} onChange={(event) => setName(event.target.value)} className="input-field" />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Ciudad">
                <input value={city} onChange={(event) => setCity(event.target.value)} className="input-field" />
              </Field>
              <Field label="Región">
                <input value={region} onChange={(event) => setRegion(event.target.value)} className="input-field" />
              </Field>
            </div>
            <Field label="Notas">
              <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="input-field" />
            </Field>
            <div className="rounded-2xl border border-[var(--border-color)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Plantilla inicial</p>
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="template-mode"
                    checked={templateMode === 'blank'}
                    onChange={() => setTemplateMode('blank')}
                  />
                  Crear base vacía y cargar locales desde cero
                </label>
                <label className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${canCopyUnits ? 'border-[var(--border-color)]' : 'border-dashed border-[var(--border-color)] opacity-50'}`}>
                  <input
                    type="radio"
                    name="template-mode"
                    checked={templateMode === 'copy_units'}
                    onChange={() => setTemplateMode('copy_units')}
                    disabled={!canCopyUnits}
                  />
                  Copiar la base física del activo activo ({state.units.length} locales)
                </label>
              </div>
            </div>
            <button onClick={createAsset} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              {templateMode === 'copy_units' ? <CopyPlus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Crear y activar activo
            </button>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Activos cargados</h3>
          </div>
          <div className="mt-4 space-y-3">
            {assetSummaries.length === 0 ? (
              <p className="text-sm text-[var(--sidebar-fg)]">Aún no hay activos cargados en este portafolio.</p>
            ) : (
              assetSummaries.map((summary) => (
                <div key={summary.id} className="rounded-2xl border border-[var(--border-color)] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{summary.name}</p>
                        {summary.id === activeAssetId ? (
                          <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                            Activo
                          </span>
                        ) : null}
                        {summary.syncStatus ? (
                          <span className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1 text-xs text-[var(--sidebar-fg)]">
                            Sync {summary.syncStatus}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
                        {summary.city} · {summary.region}
                      </p>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                        <SmallStat label="Locales" value={`${summary.occupiedUnits}/${summary.totalUnits}`} />
                        <SmallStat label="Ventas mes" value={formatCurrency(summary.monthlySales)} />
                        <SmallStat label="Alertas" value={String(summary.alertCount)} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summary.id !== activeAssetId ? (
                        <button
                          onClick={() => actions.switchAsset(summary.id)}
                          className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                        >
                          Activar
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          actions.switchAsset(summary.id);
                          navigate('/admin/dashboard');
                        }}
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => {
                          actions.switchAsset(summary.id);
                          navigate('/admin/configuracion');
                        }}
                        className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
                      >
                        Configurar
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: summary.id, name: summary.name })}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-950/60 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="mr-1 inline h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--sidebar-fg)]">
          {message}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar activo"
        message={`Se eliminará ${deleteTarget?.name ?? 'este activo'} junto con sus contratos, ventas, documentos locales y configuración activa en este navegador.`}
        confirmLabel="Eliminar activo"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          await actions.deleteAsset(deleteTarget.id);
          setMessage(`Activo ${deleteTarget.name} eliminado del portafolio local.`);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PortfolioMetric({
  title,
  value,
  meta,
  icon,
}: {
  title: string;
  value: string;
  meta: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{meta}</p>
        </div>
        <div className="rounded-2xl bg-[var(--hover-bg)] p-3">{icon}</div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--hover-bg)] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
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
