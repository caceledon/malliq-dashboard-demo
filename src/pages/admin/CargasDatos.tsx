import { useDeferredValue, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SalesIngestionCenter } from '@/components/app/SalesIngestionCenter';
import { formatDate, formatPeso } from '@/lib/format';
import { useAppState } from '@/store/appState';

export function CargasDatos() {
  const { state, actions } = useAppState();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'ocr' | 'fiscal_printer' | 'pos_connection'>('all');
  const deferredSearch = useDeferredValue(search);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const sourceTotals = {
    manual: state.sales.filter((sale) => sale.source === 'manual').length,
    ocr: state.sales.filter((sale) => sale.source === 'ocr').length,
    fiscal_printer: state.sales.filter((sale) => sale.source === 'fiscal_printer').length,
    pos_connection: state.sales.filter((sale) => sale.source === 'pos_connection').length,
  };

  const filteredSales = state.sales.filter((sale) => {
    const haystack = `${sale.storeLabel} ${sale.ticketNumber ?? ''} ${sale.importReference ?? ''} ${sale.rawText ?? ''}`.toLowerCase();
    const matchesSearch = haystack.includes(deferredSearch.trim().toLowerCase());
    const matchesSource = sourceFilter === 'all' || sale.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Carga de datos</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          Ingreso de ventas por carga manual, OCR, lectura fiscal o sincronización directa con el POS.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SourceCard title="Manual" count={sourceTotals.manual} />
        <SourceCard title="OCR" count={sourceTotals.ocr} />
        <SourceCard title="Fiscal" count={sourceTotals.fiscal_printer} />
        <SourceCard title="POS" count={sourceTotals.pos_connection} />
      </div>

      <SalesIngestionCenter />

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Bitácora reciente</h3>
        <div className="mt-4 space-y-3">
          {state.importLogs.length === 0 ? (
            <p className="text-sm text-[var(--sidebar-fg)]">Todavía no hay registros de importación.</p>
          ) : (
            state.importLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-[var(--border-color)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{log.source}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{log.note}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{log.importedCount} registros</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{new Date(log.createdAt).toLocaleString('es-CL')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Ventas cargadas</h3>
            <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
              Vista operativa para auditar registros importados y borrar errores puntuales.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--sidebar-fg)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por tienda, ticket o texto"
                className="w-[220px] bg-transparent text-sm outline-none"
              />
            </div>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)} className="input-field">
              <option value="all">Todas las fuentes</option>
              <option value="manual">Manual</option>
              <option value="ocr">OCR</option>
              <option value="fiscal_printer">Fiscal</option>
              <option value="pos_connection">POS</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full min-w-[940px]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Tienda</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Origen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Referencia</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3 text-sm">{formatDate(sale.occurredAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-semibold">{sale.storeLabel}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{sale.localIds.length > 0 ? `${sale.localIds.length} local(es)` : 'Sin local asociado'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{sale.source}</td>
                  <td className="px-4 py-3 text-sm">{sale.ticketNumber ?? 'N/D'}</td>
                  <td className="px-4 py-3 text-sm">{sale.importReference ?? 'N/D'}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatPeso(sale.grossAmount)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteTarget({ id: sale.id, label: sale.storeLabel })}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--sidebar-fg)]">
                    No hay ventas que coincidan con los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar venta"
        message={`¿Estás seguro de eliminar la venta de ${deleteTarget?.label ?? 'este registro'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            actions.deleteSale(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SourceCard({ title, count }: { title: string; count: number }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{count}</p>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">Registros cargados</p>
    </div>
  );
}
