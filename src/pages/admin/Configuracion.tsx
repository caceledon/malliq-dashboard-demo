import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Download, MapPinned, MoonStar, Plus, SlidersHorizontal, SunMedium, Trash2, Upload, Wifi } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useTheme } from '@/lib/theme';
import { createId } from '@/lib/domain';
import { useCurrency } from '@/lib/currency';
import type { ServerHealth } from '@/lib/api';
import {
  downloadTextFile,
  exportContractsCsv,
  exportPlanningCsv,
  exportProspectsCsv,
  exportSalesCsv,
  exportSuppliersCsv,
} from '@/lib/exporters';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function Configuracion() {
  const navigate = useNavigate();
  const { state, actions, assetSummaries, portfolioStats, activeAssetId } = useAppState();
  const { formatCurrency } = useCurrency();
  const { theme, setTheme } = useTheme();
  const [assetName, setAssetName] = useState(state.asset?.name ?? '');
  const [city, setCity] = useState(state.asset?.city ?? '');
  const [region, setRegion] = useState(state.asset?.region ?? '');
  const [notes, setNotes] = useState(state.asset?.notes ?? '');
  const [backendUrl, setBackendUrl] = useState(state.asset?.backendUrl ?? '/api');
  const [syncEnabled, setSyncEnabled] = useState(Boolean(state.asset?.syncEnabled));
  const [units, setUnits] = useState(state.units);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [deleteUnitConfirm, setDeleteUnitConfirm] = useState<{ open: boolean; unitId: string }>({ open: false, unitId: '' });

  useEffect(() => {
    setAssetName(state.asset?.name ?? '');
    setCity(state.asset?.city ?? '');
    setRegion(state.asset?.region ?? '');
    setNotes(state.asset?.notes ?? '');
    setBackendUrl(state.asset?.backendUrl ?? '/api');
    setSyncEnabled(Boolean(state.asset?.syncEnabled));
    setUnits(state.units);
    if (state.asset?.themePreference) {
      setTheme(state.asset.themePreference);
    }
  }, [activeAssetId, setTheme, state.asset?.backendUrl, state.asset?.city, state.asset?.name, state.asset?.notes, state.asset?.region, state.asset?.syncEnabled, state.asset?.themePreference, state.units]);

  const saveAsset = () => {
    actions.updateAssetSettings({
      name: assetName,
      city,
      region,
      notes,
      themePreference: theme,
      backendUrl,
      syncEnabled,
    });
    actions.replaceUnits(units);
    setBackupMessage('Configuración del activo actualizada.');
  };

  const exportReport = (filename: string, content: string) => {
    downloadTextFile(filename, content);
    setBackupMessage(`Reporte ${filename} exportado correctamente.`);
  };

  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const archive = await actions.exportBackup();
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `malliq-${(state.asset?.name ?? 'activo').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(href);
      setBackupMessage('Respaldo del activo activo exportado correctamente.');
    } finally {
      setBackupBusy(false);
    }
  };

  const exportPortfolioBackup = async () => {
    setBackupBusy(true);
    try {
      const archive = await actions.exportPortfolioBackup();
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `malliq-portafolio-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(href);
      setBackupMessage('Respaldo del portafolio exportado correctamente.');
    } finally {
      setBackupBusy(false);
    }
  };

  const importMallBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBackupBusy(true);
    try {
      const raw = await file.text();
      const archive = JSON.parse(raw);
      await actions.importBackup(archive);
      setBackupMessage(`Respaldo del activo activo importado desde ${file.name}.`);
    } catch (error) {
      setBackupMessage(`No se pudo importar el respaldo: ${error instanceof Error ? error.message : 'archivo inválido'}`);
    } finally {
      setBackupBusy(false);
      event.target.value = '';
    }
  };

  const importPortfolioBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBackupBusy(true);
    try {
      const raw = await file.text();
      const archive = JSON.parse(raw);
      await actions.importPortfolioBackup(archive);
      setBackupMessage(`Portafolio importado desde ${file.name}.`);
    } catch (error) {
      setBackupMessage(`No se pudo importar el portafolio: ${error instanceof Error ? error.message : 'archivo inválido'}`);
    } finally {
      setBackupBusy(false);
      event.target.value = '';
    }
  };

  const checkServer = async () => {
    setBackupBusy(true);
    try {
      const health = await actions.pingServer(backendUrl);
      setServerHealth(health);
      const summary = health.summary;
      setBackupMessage(
        health.ok
          ? `Servidor disponible. Archivo remoto ${health.archiveExists ? 'detectado' : 'aún no creado'}. Revisión ${health.revision}${health.updatedAt ? `, actualizado ${new Date(health.updatedAt).toLocaleString('es-CL')}` : ''}.${summary ? ` Contratos ${summary.contracts}, ventas ${summary.sales}, documentos ${summary.documents}.` : ''}`
          : 'El servidor no respondió correctamente.',
      );
    } catch (error) {
      setServerHealth(null);
      setBackupMessage(`No se pudo contactar el backend: ${error instanceof Error ? error.message : 'error desconocido'}`);
    } finally {
      setBackupBusy(false);
    }
  };

  const pushServer = async () => {
    setBackupBusy(true);
    try {
      await actions.pushToServer(backendUrl);
      setSyncEnabled(true);
      setBackupMessage('Estado local enviado al backend.');
    } catch (error) {
      setBackupMessage(`No se pudo publicar al backend: ${error instanceof Error ? error.message : 'error desconocido'}`);
    } finally {
      setBackupBusy(false);
    }
  };

  const forcePushServer = async () => {
    setBackupBusy(true);
    try {
      await actions.forcePushToServer(backendUrl);
      setSyncEnabled(true);
      setBackupMessage('La versión local reemplazó el estado remoto.');
    } catch (error) {
      setBackupMessage(`No se pudo forzar la publicación: ${error instanceof Error ? error.message : 'error desconocido'}`);
    } finally {
      setBackupBusy(false);
    }
  };

  const pullServer = async () => {
    setBackupBusy(true);
    try {
      await actions.pullFromServer(backendUrl);
      setBackupMessage('Estado remoto cargado desde el backend.');
    } catch (error) {
      setBackupMessage(`No se pudo descargar desde el backend: ${error instanceof Error ? error.message : 'error desconocido'}`);
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Configuración</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          Ajustes del activo, estructura física, personalización visual e integraciones configuradas.
        </p>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold">Portafolio operativo</h3>
            </div>
            <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
              {portfolioStats.assetCount} activo(s) cargados en esta instalación. Cambia el activo activo desde la barra superior o administra el portafolio completo en su módulo dedicado.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/activos')}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--hover-bg)]"
          >
            Administrar portafolio
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Activo activo</p>
            <p className="mt-2 text-lg font-semibold">{state.asset?.name ?? 'Sin selección'}</p>
          </div>
          <div className="rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Activos</p>
            <p className="mt-2 text-lg font-semibold">{portfolioStats.assetCount}</p>
          </div>
          <div className="rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Locales del portafolio</p>
            <p className="mt-2 text-lg font-semibold">{portfolioStats.totalUnits}</p>
          </div>
          <div className="rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Ventas consolidadas</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrency(portfolioStats.monthlySales)}</p>
          </div>
        </div>
        {assetSummaries.length > 1 ? (
          <p className="mt-4 text-xs text-[var(--sidebar-fg)]">
            Activo activo actual: {assetSummaries.find((a) => a.id === activeAssetId)?.name ?? 'Sin selección'}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Activo y apariencia</h3>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Nombre del activo">
              <input value={assetName} onChange={(event) => setAssetName(event.target.value)} className="input-field" />
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
              <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Backend compartido</p>
              <div className="mt-3 space-y-3">
                <Field label="URL API">
                  <input value={backendUrl} onChange={(event) => setBackendUrl(event.target.value)} className="input-field" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={syncEnabled} onChange={(event) => setSyncEnabled(event.target.checked)} />
                  Habilitar sincronización multiusuario y documentos remotos
                </label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={checkServer} disabled={backupBusy} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
                    Probar backend
                  </button>
                  <button onClick={pushServer} disabled={backupBusy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    Subir estado
                  </button>
                  <button onClick={pullServer} disabled={backupBusy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
                    Bajar estado
                  </button>
                  {state.asset?.syncStatus === 'conflict' ? (
                    <button onClick={forcePushServer} disabled={backupBusy} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                      Forzar subida local
                    </button>
                  ) : null}
                </div>
                {state.asset?.lastSyncedAt ? (
                  <p className="text-xs text-[var(--sidebar-fg)]">Última sincronización: {new Date(state.asset.lastSyncedAt).toLocaleString('es-CL')}</p>
                ) : null}
                <div className="rounded-2xl bg-[var(--hover-bg)] px-4 py-3 text-sm">
                  <p className="font-semibold">Estado: {state.asset?.syncStatus ?? 'idle'}</p>
                  <p className="mt-1 text-[var(--sidebar-fg)]">{state.asset?.syncMessage || 'Sin eventos de sincronización todavía.'}</p>
                  {typeof state.asset?.serverRevision === 'number' ? (
                    <p className="mt-1 text-xs text-[var(--sidebar-fg)]">Revisión remota conocida: {state.asset.serverRevision}</p>
                  ) : null}
                  {syncEnabled ? (
                    <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                      Auto-sync activo: publica cambios locales tras 1.5 s de inactividad y revisa cambios remotos cada 15 s.
                    </p>
                  ) : null}
                </div>
                {serverHealth ? (
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm">
                    <p className="font-semibold">Diagnóstico del backend</p>
                    <p className="mt-1 text-[var(--sidebar-fg)]">
                      IA contratos: {serverHealth.aiMode === 'openai' ? 'OpenAI' : serverHealth.aiMode === 'moonshot' ? 'Moonshot' : 'Mock local'}.
                    </p>
                    {serverHealth.summary ? (
                      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                        {serverHealth.summary.units} locales, {serverHealth.summary.contracts} contratos, {serverHealth.summary.sales} ventas, {serverHealth.summary.documents} documentos remotos.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Tema</p>
              <button
                onClick={() => {
                  const nextTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(nextTheme);
                  actions.updateAssetSettings({ themePreference: nextTheme });
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm"
              >
                {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Conectores POS y sincronización</h3>
          </div>
          <div className="mt-4 space-y-3">
            {state.posConnections.length === 0 ? (
              <p className="text-sm text-[var(--sidebar-fg)]">Los conectores se crean desde el módulo de carga de datos.</p>
            ) : (
              state.posConnections.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-[var(--border-color)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{profile.name}</p>
                      <p className="text-xs text-[var(--sidebar-fg)]">{profile.endpoint}</p>
                    </div>
                    <span
                      className={
                        profile.lastStatus === 'success'
                          ? 'badge-success rounded-full px-2.5 py-1 text-xs font-medium'
                          : profile.lastStatus === 'error'
                            ? 'badge-danger rounded-full px-2.5 py-1 text-xs font-medium'
                            : 'badge-info rounded-full px-2.5 py-1 text-xs font-medium'
                      }
                    >
                      {profile.lastStatus ?? 'idle'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--sidebar-fg)]">
                    {profile.lastSyncAt ? `Última sync ${new Date(profile.lastSyncAt).toLocaleString('es-CL')}` : 'Sin sincronización aún'}
                  </p>
                  {profile.lastMessage ? <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{profile.lastMessage}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold">Respaldo y restauración</h3>
        </div>
        <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
          Exporta o restaura el activo activo o todo el portafolio, incluyendo documentos adjuntos guardados en el navegador.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={exportBackup}
            disabled={backupBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Exportar activo activo
          </button>
          <button
            onClick={exportPortfolioBackup}
            disabled={backupBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Exportar portafolio
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            <Upload className="h-4 w-4" />
            Importar activo activo
            <input type="file" accept=".json" className="hidden" onChange={importMallBackup} disabled={backupBusy} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            <Upload className="h-4 w-4" />
            Importar portafolio
            <input type="file" accept=".json" className="hidden" onChange={importPortfolioBackup} disabled={backupBusy} />
          </label>
        </div>
        {backupMessage ? (
          <div className="mt-4 rounded-2xl bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--sidebar-fg)]">
            {backupMessage}
          </div>
        ) : null}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Centro de reportes</h3>
        </div>
        <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
          Exporta CSV operativos para ventas, contratos, planeación, proveedores y prospectos.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => exportReport('malliq-contratos.csv', exportContractsCsv(state))} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            Exportar contratos
          </button>
          <button onClick={() => exportReport('malliq-ventas.csv', exportSalesCsv(state))} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            Exportar ventas
          </button>
          <button onClick={() => exportReport('malliq-planeacion.csv', exportPlanningCsv(state))} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            Exportar planeación
          </button>
          <button onClick={() => exportReport('malliq-proveedores.csv', exportSuppliersCsv(state))} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            Exportar proveedores
          </button>
          <button onClick={() => exportReport('malliq-prospectos.csv', exportProspectsCsv(state))} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
            Exportar prospectos
          </button>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">Base física del activo</h3>
        </div>
        <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
          Edita manualmente los locales y sus m2. Estos valores controlan el plano, la superficie ocupada y los contratos multi-local.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() =>
              setUnits((current) => [
                ...current,
                {
                  id: createId('unit'),
                  code: `L-${100 + current.length + 1}`,
                  label: `Local ${100 + current.length + 1}`,
                  areaM2: 0,
                  level: 'Planta 1',
                },
              ])
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Agregar local
          </button>
        </div>
        <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full min-w-[760px]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Código</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Etiqueta</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">m2</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Nivel</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Override manual</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Rubro manual</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Acción</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, index) => (
                <tr key={unit.id} className="border-t border-[var(--border-color)]">
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
                      className="input-field"
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
                      className="input-field"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={unit.areaM2}
                      onChange={(event) =>
                        setUnits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, areaM2: Number(event.target.value) } : item,
                          ),
                        )
                      }
                      className="input-field"
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
                      className="input-field"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={unit.manualDisplayName ?? ''}
                      onChange={(event) =>
                        setUnits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, manualDisplayName: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Nombre manual opcional"
                      className="input-field"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={unit.manualCategory ?? ''}
                      onChange={(event) =>
                        setUnits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, manualCategory: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Rubro comercial opcional"
                      className="input-field"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setDeleteUnitConfirm({ open: true, unitId: unit.id })}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveAsset} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
            Guardar configuración
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteUnitConfirm.open}
        title="Quitar local"
        message="¿Estás seguro de quitar este local? Se desvinculará de contratos y ventas asociadas."
        variant="danger"
        onConfirm={() => {
          setUnits((current) => current.filter((item) => item.id !== deleteUnitConfirm.unitId));
          setDeleteUnitConfirm({ open: false, unitId: '' });
        }}
        onCancel={() => setDeleteUnitConfirm({ open: false, unitId: '' })}
      />
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
