import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { tenants } from '@/data/mockData';
import { formatPeso, formatPercent } from '@/lib/format';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const tenant = tenants[0];

export function LocatarioVentas() {
    const salesDelta = ((tenant.salesCurrent - tenant.salesPrevious) / tenant.salesPrevious) * 100;

    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Mis Ventas</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                    Resumen de ventas — {tenant.name}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase mb-2">Ventas Mes Actual</p>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesCurrent)}</p>
                    <span className={cn('flex items-center gap-0.5 text-xs font-semibold mt-1', salesDelta >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {salesDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {salesDelta >= 0 ? '+' : ''}{formatPercent(salesDelta)}
                    </span>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase mb-2">Mes Anterior</p>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesPrevious)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">Feb 2026</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase mb-2">Ventas/m²</p>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesPerM2)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">{tenant.areaM2} m²</p>
                </div>
            </div>

            {/* Sales Bar Chart */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-1">Ventas Mensuales</h3>
                <p className="text-xs text-[var(--sidebar-fg)] mb-4">Últimos 6 meses</p>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={tenant.monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip
                            contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                            formatter={(value: number) => [formatPeso(value), 'Ventas']}
                        />
                        <Bar dataKey="sales" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly Detail Table */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4">Detalle por Mes</h3>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border-color)]">
                            <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Mes</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Ventas</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Ventas/m²</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenant.monthlySales.map(m => (
                            <tr key={m.month} className="table-row-hover border-b border-[var(--border-color)] last:border-0">
                                <td className="px-4 py-3 text-sm font-medium">{m.month}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold">{formatPeso(m.sales)}</td>
                                <td className="px-4 py-3 text-sm text-right text-[var(--sidebar-fg)]">
                                    {formatPeso(Math.round(m.sales / tenant.areaM2))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
