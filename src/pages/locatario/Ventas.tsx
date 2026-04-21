import { useDeferredValue, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Search } from 'lucide-react';
import { monthKey } from '@/lib/domain';
import { downloadTextFile, exportFilteredSalesCsv } from '@/lib/exporters';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';

export function LocatarioVentas() {
  const { currentTenantId, state, insights } = useAppState();
  const { formatCurrency } = useCurrency();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'ocr' | 'fiscal_printer' | 'pos_connection'>('all');
  const deferredSearch = useDeferredValue(search);
  const summary = insights.tenantSummaries.find((item) => item.id === currentTenantId);
  const contract = state.contracts.find((item) => item.id === currentTenantId);

  if (!summary || !contract) {
    return (
      <div className="p-6">
        <div className="glass-card p-6 text-sm text-[var(--sidebar-fg)]">Aún no hay ventas disponibles para este locatario.</div>
      </div>
    );
  }

  const sales = state.sales.filter((sale) => sale.contractId === contract.id);
  const filteredSales = sales.filter((sale) => {
    const matchesSource = sourceFilter === 'all' || sale.source === sourceFilter;
    const haystack = `${sale.ticketNumber ?? ''} ${sale.importReference ?? ''} ${sale.rawText ?? ''}`.toLowerCase();
    const matchesSearch = haystack.includes(deferredSearch.trim().toLowerCase());
    return matchesSource && matchesSearch;
  });
  const byMonth = sales.reduce<Record<string, number>>((accumulator, sale) => {
    const month = monthKey(sale.occurredAt);
    accumulator[month] = (accumulator[month] ?? 0) + sale.grossAmount;
    return accumulator;
  }, {});
  const chartData = Object.entries(byMonth)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, amount]) => ({ month, amount }));

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Mis ventas</h1>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            Ventas cargadas desde todas las fuentes disponibles para {summary.storeName}.
          </p>
        </div>
        <button
          onClick={() => downloadTextFile(`ventas-${summary.storeName.toLowerCase().replace(/\s+/g, '-')}.csv`, exportFilteredSalesCsv(filteredSales, state))}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold"
        >
          <Download className="h-4 w-4" />
          Exportar ventas visibles
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Mes actual" value={formatCurrency(summary.salesCurrent)} />
        <Stat title="Mes anterior" value={formatCurrency(summary.salesPrevious)} />
        <Stat title="Ventas / m2" value={formatCurrency(summary.salesPerM2)} />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Ventas por mes</h3>
        <div className="mt-4 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'var(--sidebar-fg)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, fontSize: 12 }}
                formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Ventas']}
              />
              <Bar dataKey="amount" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-sm font-semibold">Detalle transaccional</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--sidebar-fg)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar ticket o referencia"
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
        {/* Desktop table */}
        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[var(--border-color)] md:block">
          <table className="w-full min-w-[760px]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Origen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Referencia</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3 text-sm">{formatDate(sale.occurredAt)}</td>
                  <td className="px-4 py-3 text-sm">{sale.source}</td>
                  <td className="px-4 py-3 text-sm">{sale.ticketNumber ?? 'N/D'}</td>
                  <td className="px-4 py-3 text-sm">{sale.importReference ?? 'N/D'}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(sale.grossAmount)}</td>
                </tr>
              ))}
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--sidebar-fg)]">
                    No hay ventas que coincidan con los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-4 space-y-3 md:hidden">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="rounded-2xl border border-[var(--border-color)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{formatDate(sale.occurredAt)}</p>
                <p className="text-sm font-semibold">{formatCurrency(sale.grossAmount)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--sidebar-fg)]">
                <span className="rounded-full bg-[var(--hover-bg)] px-2 py-0.5">{sale.source}</span>
                {sale.ticketNumber ? <span>Ticket: {sale.ticketNumber}</span> : null}
                {sale.importReference ? <span>Ref: {sale.importReference}</span> : null}
              </div>
            </div>
          ))}
          {filteredSales.length === 0 ? (
            <p className="text-center text-sm text-[var(--sidebar-fg)]">No hay ventas que coincidan con los filtros.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
