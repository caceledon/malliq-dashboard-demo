import { useState } from 'react';
import {
  Bot,
  Cable,
  DatabaseZap,
  FileUp,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useUndoToast } from '@/components/UndoToast';
import { useToast } from '@/components/Toast';
import { createId, type CurrencyTag, type PosConnectionProfile, type SaleRecord } from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { materializeSales, parsePosPayload, parseReceiptText, type ParsedSaleDraft } from '@/lib/importers';
import { CsvBulkImporter } from './CsvBulkImporter';

type DraftSource = 'manual' | 'ocr' | 'fiscal_printer' | 'pos_connection';

interface DraftBucket {
  drafts: ParsedSaleDraft[];
  fallbackContractId: string;
}

const emptyBucket: DraftBucket = {
  drafts: [],
  fallbackContractId: '',
};

export function SalesIngestionCenter() {
  const { state, unitsByCode, actions } = useAppState();
  const { showUndo } = useUndoToast();
  const { toast } = useToast();
  const { getUfFor, ensureUfFor } = useCurrency();
  const serverSyncEnabled = Boolean(state.asset?.syncEnabled && state.asset?.backendUrl);
  const [manualContractId, setManualContractId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualAmount, setManualAmount] = useState('');
  const [manualAmountCurrency, setManualAmountCurrency] = useState<CurrencyTag>('CLP');
  const [manualTicket, setManualTicket] = useState('');

  const [ocrBucket, setOcrBucket] = useState<DraftBucket>(emptyBucket);
  const [ocrText, setOcrText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);

  const [printerText, setPrinterText] = useState('');
  const [printerBucket, setPrinterBucket] = useState<DraftBucket>(emptyBucket);

  const [connectionDraft, setConnectionDraft] = useState<PosConnectionProfile>({
    id: createId('pos'),
    name: 'Conector principal',
    endpoint: '',
    method: 'GET',
    dataFormat: 'json',
    token: '',
    amountField: 'amount',
    dateField: 'date',
    storeField: 'store',
    localField: 'local',
  });
  const [selectedConnectionId, setSelectedConnectionId] = useState(state.posConnections[0]?.id ?? '');
  const [posPreviewPayload, setPosPreviewPayload] = useState('');
  const [posBucket, setPosBucket] = useState<DraftBucket>(emptyBucket);
  const [posBusy, setPosBusy] = useState(false);
  // statusMessage state removed — toasts cover all completion signals; the
  // OCR spinner already indicates in-flight work.
  const [requestBody, setRequestBody] = useState('');

  const contracts = state.contracts;

  const readFileText = async (file: File) => file.text();

  const reparseOcrText = () => {
    if (!ocrText.trim()) {
      toast('warning', 'Sin texto OCR', 'No hay texto OCR para reprocesar.');
      return;
    }

    setOcrBucket((current) => ({
      ...current,
      drafts: parseReceiptText(ocrText, 'ocr'),
    }));
    toast('success', 'Texto OCR reprocesado', 'Revisa el preview antes de importar.');
  };

  const commitDrafts = (bucket: DraftBucket, source: DraftSource) => {
    const sales = materializeSales(bucket.drafts, contracts, unitsByCode).map((sale) => {
      if (sale.contractId || !bucket.fallbackContractId) {
        return sale;
      }

      const fallbackContract = contracts.find((contract) => contract.id === bucket.fallbackContractId);
      if (!fallbackContract) {
        return sale;
      }

      return {
        ...sale,
        contractId: fallbackContract.id,
        localIds: fallbackContract.localIds,
        storeLabel: fallbackContract.storeName,
      };
    });

    const result = actions.addSales(sales, {
      source,
      status: 'success',
      importedCount: sales.length,
      note: `Importación ${source} aplicada correctamente.`,
    });

    if (result.added > 0) {
      toast(
        'success',
        'Cargado exitosamente',
        `${result.added} venta(s) importada(s) desde ${source}${result.duplicates > 0 ? ` · ${result.duplicates} duplicado(s) omitido(s)` : ''}.`,
      );
      showUndo(
        `${result.added} ventas agregadas (${source})`,
        () => actions.undoImport({ addedIds: result.addedIds, importLogId: result.importLogId }),
      );
    } else {
      toast(
        'info',
        'Sin nuevos registros',
        result.duplicates > 0 ? `${result.duplicates} duplicado(s) detectado(s).` : 'No se encontraron registros nuevos.',
      );
    }

    return result;
  };

  const handleManualCreate = async () => {
    const selectedContract = contracts.find((contract) => contract.id === manualContractId);
    const rawAmount = Number(manualAmount);
    if (!selectedContract || !Number.isFinite(rawAmount) || rawAmount <= 0) {
      toast('warning', 'Datos incompletos', 'Selecciona un contrato y un monto mayor a cero.');
      return;
    }

    // Always persist sales in CLP. If the operator declared the amount in UF,
    // convert with the UF of the sale's date — not today's. If the rate is
    // missing from the cache, fetch it once before saving.
    let grossAmount = Math.round(rawAmount);
    if (manualAmountCurrency === 'UF') {
      const ufAtDate = await ensureUfFor(manualDate);
      if (ufAtDate > 0) {
        grossAmount = Math.round(rawAmount * ufAtDate);
      } else {
        toast('warning', 'UF no disponible', `No hay valor UF para ${manualDate}. Reintenta.`);
        return;
      }
    }

    const sale: SaleRecord = {
      id: createId('sale'),
      contractId: selectedContract.id,
      localIds: selectedContract.localIds,
      storeLabel: selectedContract.storeName,
      source: 'manual',
      occurredAt: `${manualDate}T12:00:00`,
      grossAmount,
      ticketNumber: manualTicket || undefined,
      importedAt: new Date().toISOString(),
    };

    const result = actions.addSales([sale], {
      source: 'manual',
      status: 'success',
      importedCount: 1,
      note: `Carga manual para ${selectedContract.storeName}.`,
    });
    if (result.added === 1) {
      toast('success', 'Cargado exitosamente', `Venta manual guardada para ${selectedContract.storeName}.`);
    } else {
      toast('info', 'Duplicado', 'La venta manual ya existía y se omitió.');
    }
    setManualAmount('');
    setManualTicket('');
  };

  const runOcr = async (file: File) => {
    setOcrBusy(true);
    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'spa+eng');
      setOcrText(result.data.text);
      setOcrBucket((current) => ({
        ...current,
        drafts: parseReceiptText(result.data.text, 'ocr'),
      }));
      toast('success', 'OCR completado', 'Revisa el preview antes de importar.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error desconocido';
      toast('error', 'OCR falló', message);
    } finally {
      setOcrBusy(false);
    }
  };

  const parsePrinterText = async () => {
    if (!printerText.trim()) {
      toast('warning', 'Sin texto', 'No hay texto fiscal para procesar.');
      return;
    }
    const raw =
      serverSyncEnabled
        ? (await actions.ingestFiscalThroughServer({ rawText: printerText })).text
        : printerText;
    const drafts = parseReceiptText(raw, 'fiscal_printer');
    setPrinterBucket((current) => ({
      ...current,
      drafts,
    }));
    toast(
      'success',
      'Texto fiscal procesado',
      `${drafts.length} registro(s) preparados${serverSyncEnabled ? ' vía backend' : ''}.`,
    );
  };

  const saveConnection = () => {
    actions.upsertPosConnection(connectionDraft);
    setSelectedConnectionId(connectionDraft.id);
    toast('success', 'Cargado exitosamente', `Conector "${connectionDraft.name}" guardado.`);
    setConnectionDraft({
      ...connectionDraft,
      id: createId('pos'),
      name: '',
      endpoint: '',
      token: '',
    });
  };

  const syncPos = async () => {
    const profile = state.posConnections.find((item) => item.id === selectedConnectionId);
    if (!profile) {
      return;
    }

    setPosBusy(true);
    try {
      let payload = posPreviewPayload.trim();
      if (!payload) {
        if (serverSyncEnabled) {
          const proxied = await actions.fetchViaServerPosProxy({
            endpoint: profile.endpoint,
            method: profile.method,
            token: profile.token,
            requestBody,
          });
          payload = proxied.body;
        } else {
          const response = await fetch(profile.endpoint, {
            method: profile.method,
            body: profile.method === 'POST' && requestBody.trim() ? requestBody : undefined,
            headers: profile.token
              ? {
                  Authorization: `Bearer ${profile.token}`,
                  'Content-Type': requestBody.trim() ? 'application/json' : 'text/plain',
                }
              : requestBody.trim()
                ? {
                    'Content-Type': 'application/json',
                  }
                : undefined,
          });
          payload = await response.text();
        }
      }

      const drafts = parsePosPayload(payload, profile);
      setPosBucket((current) => ({
        ...current,
        drafts,
      }));
      actions.recordPosSync(profile.id, 'success', `${drafts.length} registros leídos`);
      toast('success', 'POS sincronizado', `${drafts.length} registro(s) preparados.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar al POS';
      actions.recordPosSync(profile.id, 'error', message);
      toast('error', 'Sincronización POS falló', message);
    } finally {
      setPosBusy(false);
    }
  };

  const loadPrinterFile = async (file: File) => {
    const raw = serverSyncEnabled
      ? (await actions.ingestFiscalThroughServer({ file })).text
      : await readFileText(file);
    setPrinterText(raw);
    setPrinterBucket((current) => ({
      ...current,
      drafts: parseReceiptText(raw, 'fiscal_printer'),
    }));
    toast('success', 'Cargado exitosamente', `Archivo fiscal "${file.name}" procesado.`);
  };

  const loadPosFile = async (file: File) => {
    const raw = await readFileText(file);
    setPosPreviewPayload(raw);
    toast('success', 'Cargado exitosamente', `Payload POS leído desde ${file.name}.`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">1. Carga manual</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Contrato / tienda</span>
              <select
                value={manualContractId}
                onChange={(event) => setManualContractId(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              >
                <option value="">Selecciona un contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.storeName} · {contract.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Fecha</span>
              <input
                type="date"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Monto bruto</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={manualAmount}
                  onChange={(event) => setManualAmount(event.target.value)}
                  className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                />
                <select
                  value={manualAmountCurrency}
                  onChange={(event) => setManualAmountCurrency(event.target.value as CurrencyTag)}
                  className="w-[80px] shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-2 py-2 text-sm outline-none"
                  aria-label="Moneda del monto"
                >
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                </select>
              </div>
              <span className="mt-1 block text-[11px] text-[var(--sidebar-fg)]">
                Las ventas se almacenan en CLP. Si seleccionas UF, se convierte con la UF de la fecha de la venta
                {manualDate ? ` (${manualDate} → ${getUfFor(manualDate).toLocaleString('es-CL', { maximumFractionDigits: 2 })})` : ''}.
              </span>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Ticket / referencia</span>
              <input
                value={manualTicket}
                onChange={(event) => setManualTicket(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>
          <button onClick={handleManualCreate} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
            Guardar venta manual
          </button>
        </section>

        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">2. Lectura IA / OCR de boletas</h3>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-2.5 text-sm font-medium">
            <Upload className="h-4 w-4" />
            Subir boleta o imagen
            <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && runOcr(event.target.files[0])} />
          </label>
            <button
              onClick={reparseOcrText}
              className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--hover-bg)]"
            >
              Procesar texto editado
            </button>
            {ocrBusy ? <LoaderCircle className="mt-3 h-4 w-4 animate-spin text-blue-600" /> : null}
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Contrato de respaldo si el OCR no detecta local</span>
            <select
              value={ocrBucket.fallbackContractId}
              onChange={(event) => setOcrBucket((current) => ({ ...current, fallbackContractId: event.target.value }))}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="">Sin respaldo</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.storeName}
                </option>
              ))}
            </select>
          </label>
          <textarea
            rows={5}
            value={ocrText}
            onChange={(event) => setOcrText(event.target.value)}
            placeholder="El texto reconocido aparecerá aquí."
            className="mt-4 w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
          />
          <PreviewTable
            bucket={ocrBucket}
            onImport={() => {
              const result = commitDrafts(ocrBucket, 'ocr');
              if (result.added > 0) {
                setOcrBucket((current) => ({ ...current, drafts: [] }));
              }
            }}
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold">3. Lectura de impresora fiscal</h3>
            {serverSyncEnabled ? <span className="badge-info rounded-full px-2 py-0.5 text-[10px] font-medium">Backend</span> : null}
          </div>
          <textarea
            rows={8}
            value={printerText}
            onChange={(event) => setPrinterText(event.target.value)}
            placeholder="Pega el texto que se envía a la impresora fiscal."
            className="mt-4 w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={parsePrinterText} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white">
              Procesar texto fiscal
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-2.5 text-sm font-medium">
              <FileUp className="h-4 w-4" />
              Cargar archivo fiscal
              <input
                type="file"
                accept={serverSyncEnabled ? '.txt,.log,.csv,.json,.pdf,image/*' : '.txt,.log,.csv,.json'}
                className="hidden"
                onChange={(event) => event.target.files?.[0] && loadPrinterFile(event.target.files[0])}
              />
            </label>
            <select
              value={printerBucket.fallbackContractId}
              onChange={(event) =>
                setPrinterBucket((current) => ({
                  ...current,
                  fallbackContractId: event.target.value,
                }))
              }
              className="rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="">Contrato de respaldo</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.storeName}
                </option>
              ))}
            </select>
          </div>
          <PreviewTable
            bucket={printerBucket}
            onImport={() => {
              const result = commitDrafts(printerBucket, 'fiscal_printer');
              if (result.added > 0) {
                setPrinterBucket((current) => ({ ...current, drafts: [] }));
              }
            }}
          />
        </section>

        <section className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Cable className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold">4. Conexión directa al POS</h3>
            {serverSyncEnabled ? <span className="badge-success rounded-full px-2 py-0.5 text-[10px] font-medium">Proxy servidor</span> : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Nombre del conector</span>
              <input
                value={connectionDraft.name}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Método</span>
              <select
                value={connectionDraft.method}
                onChange={(event) =>
                  setConnectionDraft((current) => ({ ...current, method: event.target.value as 'GET' | 'POST' }))
                }
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Endpoint</span>
              <input
                value={connectionDraft.endpoint}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, endpoint: event.target.value }))}
                placeholder="https://pos.tienda/api/ventas"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Formato</span>
              <select
                value={connectionDraft.dataFormat}
                onChange={(event) =>
                  setConnectionDraft((current) => ({ ...current, dataFormat: event.target.value as 'json' | 'csv' }))
                }
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Token Bearer</span>
              <input
                value={connectionDraft.token}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, token: event.target.value }))}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Campo monto</span>
              <input
                value={connectionDraft.amountField}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, amountField: event.target.value }))}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Campo fecha</span>
              <input
                value={connectionDraft.dateField}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, dateField: event.target.value }))}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Campo tienda</span>
              <input
                value={connectionDraft.storeField}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, storeField: event.target.value }))}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Campo local</span>
              <input
                value={connectionDraft.localField}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, localField: event.target.value }))}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={saveConnection} className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white">
              Guardar conector
            </button>
            <select
              value={selectedConnectionId}
              onChange={(event) => setSelectedConnectionId(event.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="">Selecciona conector</option>
              {state.posConnections.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <button
              onClick={syncPos}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {posBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
              Sincronizar
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {state.posConnections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--sidebar-fg)]">
                Todavía no hay conectores guardados.
              </div>
            ) : (
              state.posConnections.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-[var(--border-color)] p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{profile.name}</p>
                      <p className="text-xs text-[var(--sidebar-fg)]">{profile.endpoint}</p>
                      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
                        {profile.method} · {profile.dataFormat.toUpperCase()} · monto `{profile.amountField}`
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setConnectionDraft(profile);
                          setSelectedConnectionId(profile.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          actions.deletePosConnection(profile.id);
                          if (selectedConnectionId === profile.id) {
                            setSelectedConnectionId('');
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <textarea
            rows={5}
            value={posPreviewPayload}
            onChange={(event) => setPosPreviewPayload(event.target.value)}
            placeholder="Opcional: pega un payload JSON/CSV para probar el parser sin llamar al endpoint."
            className="mt-4 w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
          />
          <textarea
            rows={3}
            value={requestBody}
            onChange={(event) => setRequestBody(event.target.value)}
            placeholder="Opcional: body JSON para conectores POST."
            className="mt-3 w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
          />
          <div className="mt-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-2.5 text-sm font-medium">
              <FileUp className="h-4 w-4" />
              Cargar JSON / CSV
              <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={(event) => event.target.files?.[0] && loadPosFile(event.target.files[0])} />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Contrato de respaldo</span>
            <select
              value={posBucket.fallbackContractId}
              onChange={(event) => setPosBucket((current) => ({ ...current, fallbackContractId: event.target.value }))}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="">Sin respaldo</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.storeName}
                </option>
              ))}
            </select>
          </label>
          <PreviewTable
            bucket={posBucket}
            onImport={() => {
              const result = commitDrafts(posBucket, 'pos_connection');
              if (result.added > 0) {
                setPosBucket((current) => ({ ...current, drafts: [] }));
              }
            }}
          />
        </section>
      </div>

      <div className="grid gap-6">
        <CsvBulkImporter />
      </div>
    </div>
  );
}

function PreviewTable({ bucket, onImport }: { bucket: DraftBucket; onImport: () => void }) {
  const { formatCurrency } = useCurrency();
  if (bucket.drafts.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--sidebar-fg)]">
        Todavía no hay registros preparados para importar.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Preview de carga</p>
        <button onClick={onImport} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Importar {bucket.drafts.length} registros
        </button>
      </div>
      <div className="overflow-auto rounded-2xl border border-[var(--border-color)]">
        <table className="w-full min-w-[600px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Fecha</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Local</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ticket</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Monto</th>
            </tr>
          </thead>
          <tbody>
            {bucket.drafts.map((draft) => (
              <tr key={draft.id} className="border-t border-[var(--border-color)]">
                <td className="px-3 py-2 text-sm">{draft.occurredAt ? formatDate(draft.occurredAt) : 'Sin fecha'}</td>
                <td className="px-3 py-2 text-sm">{draft.localCode ?? draft.storeLabel ?? 'Sin local'}</td>
                <td className="px-3 py-2 text-sm">{draft.ticketNumber ?? 'N/D'}</td>
                <td className="px-3 py-2 text-right text-sm font-semibold">{formatCurrency(draft.grossAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
