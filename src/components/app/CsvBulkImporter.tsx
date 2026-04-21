import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Trash2, CheckSquare, Square } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/format';
import { buildSaleFingerprint, createId, type SaleRecord } from '@/lib/domain';
import { materializeSales, parseAmount, parseCsvRows, type ParsedSaleDraft } from '@/lib/importers';

interface CsvRowPreview {
  id: string;
  draft: ParsedSaleDraft;
  record: SaleRecord;
  fingerprint: string;
  isDuplicate: boolean;
  needsAttention: boolean;
  selected: boolean;
}

const DATE_KEYS = ['fecha', 'date', 'ocurred_at', 'occurred_at', 'ocurredAt', 'occurredAt', 'dia', 'f'];
const AMOUNT_KEYS = ['monto', 'amount', 'total', 'gross_amount', 'grossAmount', 'valor', 'importe', 'neto'];
const STORE_KEYS = ['tienda', 'store', 'storeLabel', 'store_name', 'storeName', 'nombre_tienda', 'localidad'];
const LOCAL_KEYS = ['local', 'local_code', 'localCode', 'codigo_local', 'codigo', 'code', 'loc', 'unidad'];
const TICKET_KEYS = ['ticket', 'ticketNumber', 'ticket_number', 'folio', 'boleta', 'referencia', 'ref', 'numero'];

function inferMapping(headers: string[], keywords: string[]): string | undefined {
  const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  for (const kw of keywords) {
    const idx = lowerHeaders.findIndex((h) => h.includes(kw.toLowerCase()));
    if (idx >= 0) return headers[idx];
  }
  for (const kw of keywords) {
    const idx = lowerHeaders.findIndex((h) => h === kw.toLowerCase());
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

function parseDate(value: string): string | undefined {
  if (!value) return undefined;
  const isoMatch = value.match(/\b(20\d{2})[-/](0?\d|1[0-2])[-/](0?\d|[12]\d|3[01])\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const latinMatch = value.match(/\b(0?\d|[12]\d|3[01])[/. -](0?\d|1[0-2])[/. -](20\d{2})\b/);
  if (latinMatch) {
    const [, day, month, year] = latinMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
  return undefined;
}

export function CsvBulkImporter() {
  const { state, unitsByCode, actions } = useAppState();
  const { formatCurrency } = useCurrency();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [rawCsv, setRawCsv] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);

  const [dateCol, setDateCol] = useState<string>('');
  const [amountCol, setAmountCol] = useState<string>('');
  const [storeCol, setStoreCol] = useState<string>('');
  const [localCol, setLocalCol] = useState<string>('');
  const [ticketCol, setTicketCol] = useState<string>('');
  const [fallbackContractId, setFallbackContractId] = useState<string>('');
  const [selectionOverrides, setSelectionOverrides] = useState<Record<string, boolean>>({});

  const existingFingerprints = useMemo(
    () => new Set(state.sales.map((sale) => buildSaleFingerprint(sale))),
    [state.sales],
  );

  const previews: CsvRowPreview[] = useMemo(() => {
    if (!amountCol) return [];
    const now = new Date().toISOString();
    const drafts: ParsedSaleDraft[] = rows.map((row) => {
      const amount = parseAmount(row[amountCol] ?? '0');
      const occurredAt = dateCol ? parseDate(row[dateCol] ?? '') : undefined;
      const storeLabel = storeCol ? String(row[storeCol] ?? '').trim() : undefined;
      const localCode = localCol ? String(row[localCol] ?? '').trim() : undefined;
      const ticketNumber = ticketCol ? String(row[ticketCol] ?? '').trim() : undefined;
      return {
        id: createId('sale'),
        source: 'manual' as const,
        importedAt: now,
        grossAmount: Math.round(amount),
        occurredAt,
        storeLabel,
        localCode,
        ticketNumber,
        rawText: JSON.stringify(row),
      };
    }).filter((d) => d.grossAmount > 0);

    const records = materializeSales(drafts, state.contracts, unitsByCode).map((record) => {
      if (!record.contractId && fallbackContractId) {
        const fallback = state.contracts.find((c) => c.id === fallbackContractId);
        if (fallback) {
          return {
            ...record,
            contractId: fallback.id,
            localIds: fallback.localIds,
            storeLabel: fallback.storeName,
          };
        }
      }
      return record;
    });

    return drafts.map((draft, index) => {
      const record = records[index];
      const fingerprint = buildSaleFingerprint(record);
      return {
        id: draft.id,
        draft,
        record,
        fingerprint,
        isDuplicate: existingFingerprints.has(fingerprint),
        needsAttention: !record.contractId && record.localIds.length === 0,
        selected: !existingFingerprints.has(fingerprint),
      };
    });
  }, [rows, amountCol, dateCol, storeCol, localCol, ticketCol, state.contracts, unitsByCode, existingFingerprints, fallbackContractId]);

  const duplicateCount = previews.filter((p) => p.isDuplicate).length;
  const attentionCount = previews.filter((p) => p.needsAttention).length;

  const finalPreviews: CsvRowPreview[] = useMemo(
    () =>
      previews.map((preview) => ({
        ...preview,
        selected: selectionOverrides[preview.id] ?? preview.selected,
      })),
    [previews, selectionOverrides],
  );

  const finalSelectedCount = finalPreviews.filter((preview) => preview.selected).length;

  const handleFile = async (file: File) => {
    const text = await file.text();
    setRawCsv(text);
    setSelectionOverrides({});
    const parsed = parseCsvRows(text);
    if (parsed.length === 0) {
      setHeaders([]);
      setRows([]);
      return;
    }
    const detectedHeaders = Object.keys(parsed[0]);
    setHeaders(detectedHeaders);
    setRows(parsed);
    setDateCol(inferMapping(detectedHeaders, DATE_KEYS) ?? '');
    setAmountCol(inferMapping(detectedHeaders, AMOUNT_KEYS) ?? '');
    setStoreCol(inferMapping(detectedHeaders, STORE_KEYS) ?? '');
    setLocalCol(inferMapping(detectedHeaders, LOCAL_KEYS) ?? '');
    setTicketCol(inferMapping(detectedHeaders, TICKET_KEYS) ?? '');
  };

  const toggleAll = (value: boolean) => {
    setSelectionOverrides(
      Object.fromEntries(finalPreviews.map((preview) => [preview.id, value])),
    );
  };

  const toggleOnlyNew = () => {
    setSelectionOverrides(
      Object.fromEntries(finalPreviews.map((preview) => [preview.id, !preview.isDuplicate])),
    );
  };

  const handleImport = () => {
    const toImport = finalPreviews.filter((p) => p.selected).map((p) => p.record);
    if (toImport.length === 0) return;
    actions.addSales(toImport, {
      source: 'manual',
      status: 'success',
      importedCount: toImport.length,
      note: `Carga masiva CSV: ${toImport.length} registros importados.`,
    });
    // Reset
    setRawCsv('');
    setHeaders([]);
    setRows([]);
    setSelectionOverrides({});
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="glass-card p-5">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-pink-600" />
        <h3 className="text-sm font-semibold">5. Carga masiva CSV</h3>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-2.5 text-sm font-medium">
          <Upload className="h-4 w-4" />
          Subir archivo CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        {rawCsv ? (
          <button
            onClick={() => {
              setRawCsv('');
              setHeaders([]);
              setRows([]);
              setSelectionOverrides({});
              if (fileRef.current) fileRef.current.value = '';
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </button>
        ) : null}
      </div>

      {headers.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Columna fecha</span>
            <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none">
              <option value="">—</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Columna monto *</span>
            <select value={amountCol} onChange={(e) => setAmountCol(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none">
              <option value="">—</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Columna tienda</span>
            <select value={storeCol} onChange={(e) => setStoreCol(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none">
              <option value="">—</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Columna local / código</span>
            <select value={localCol} onChange={(e) => setLocalCol(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none">
              <option value="">—</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Columna ticket / referencia</span>
            <select value={ticketCol} onChange={(e) => setTicketCol(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none">
              <option value="">—</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Contrato de respaldo</span>
            <select value={fallbackContractId} onChange={(e) => setFallbackContractId(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none">
              <option value="">Sin respaldo</option>
              {state.contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.storeName}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {finalPreviews.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">{finalPreviews.length}</span> filas parseadas ·{' '}
              <span className={`font-semibold ${duplicateCount > 0 ? 'text-amber-600' : ''}`}>{duplicateCount}</span> duplicados ·{' '}
              <span className={`font-semibold ${attentionCount > 0 ? 'text-rose-600' : ''}`}>{attentionCount}</span> por revisar ·{' '}
              <span className="font-semibold text-emerald-600">{finalSelectedCount}</span> seleccionadas
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleAll(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-bg)]">
                <CheckSquare className="h-3.5 w-3.5" />
                Todas
              </button>
              <button onClick={toggleOnlyNew} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-bg)]">
                <Square className="h-3.5 w-3.5" />
                Solo nuevas
              </button>
              <button onClick={() => toggleAll(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-bg)]">
                <Square className="h-3.5 w-3.5" />
                Ninguna
              </button>
              <button
                onClick={handleImport}
                disabled={finalSelectedCount === 0}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Importar {finalSelectedCount}
              </button>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-[var(--border-color)]">
            <table className="w-full min-w-[720px]">
              <thead className="bg-[var(--hover-bg)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">
                    <input
                      type="checkbox"
                      checked={finalPreviews.length > 0 && finalPreviews.every((p) => p.selected)}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Tienda / Local</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ticket</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Monto</th>
                </tr>
              </thead>
              <tbody>
                {finalPreviews.map((p) => (
                  <tr key={p.id} className={`border-t border-[var(--border-color)] ${p.isDuplicate ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={p.selected}
                        onChange={(e) =>
                          setSelectionOverrides((prev) => ({ ...prev, [p.id]: e.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {p.isDuplicate ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Duplicado</span>
                      ) : p.needsAttention ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Revisar</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Nuevo</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{p.draft.occurredAt ? formatDate(p.draft.occurredAt) : 'Sin fecha'}</td>
                    <td className="px-3 py-2 text-sm">
                      <p className="font-medium">{p.record.storeLabel}</p>
                      {p.record.localIds.length > 0 ? (
                        <p className="text-xs text-[var(--sidebar-fg)]">{p.record.localIds.length} local(es)</p>
                      ) : p.record.contractId ? (
                        <p className="text-xs text-[var(--sidebar-fg)]">Asociado por contrato de respaldo</p>
                      ) : p.draft.localCode ? (
                        <p className="text-xs text-[var(--sidebar-fg)]">Código: {p.draft.localCode}</p>
                      ) : p.needsAttention ? (
                        <p className="text-xs text-rose-600 dark:text-rose-300">Sin match de local o contrato</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-sm">{p.draft.ticketNumber ?? 'N/D'}</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold">{formatCurrency(p.draft.grossAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : rawCsv ? (
        <p className="mt-4 text-sm text-[var(--sidebar-fg)]">No se pudieron parsear filas válidas. Revisa que el separador sea coma o punto y coma y que la columna de monto esté correctamente mapeada.</p>
      ) : null}
    </section>
  );
}
