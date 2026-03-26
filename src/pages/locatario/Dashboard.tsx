import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingCart, TrendingUp, Calendar } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { tenants } from '@/data/mockData';
import { formatPeso, formatPercent, formatUF, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

// Simulating "Mango" as the logged-in tenant
const tenant = tenants[0];
const salesDelta = ((tenant.salesCurrent - tenant.salesPrevious) / tenant.salesPrevious) * 100;

export function LocatarioDashboard() {
    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Mi Dashboard</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                    Bienvenido, {tenant.name} — Local {tenant.local}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide">Ventas del Mes</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesCurrent)}</p>
                    <span className={cn('flex items-center gap-0.5 text-xs font-semibold mt-1', salesDelta >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {salesDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {salesDelta >= 0 ? '+' : ''}{formatPercent(salesDelta)} vs mes anterior
                    </span>
                </div>

                <div className="glass-card p-5 group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide">Renta Mensual</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{formatPeso(tenant.rentTotal)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">{formatUF(tenant.rentUF)}</p>
                </div>

                <div className="glass-card p-5 group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide">Ventas/m²</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesPerM2)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">{tenant.areaM2} m² de superficie</p>
                </div>

                <div className="glass-card p-5 group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide">Fin de Contrato</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>
                    <p className="text-lg font-bold">{formatDate(tenant.contractEnd)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">Desde {formatDate(tenant.contractStart)}</p>
                </div>
            </div>

            {/* Sales Chart */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-1">Evolución de Ventas</h3>
                <p className="text-xs text-[var(--sidebar-fg)] mb-4">Últimos 6 meses</p>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={tenant.monthlySales}>
                        <defs>
                            <linearGradient id="locGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip
                            contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                            formatter={(value: number) => [formatPeso(value), 'Ventas']}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2.5} fill="url(#locGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Payment History */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4">Últimos Pagos</h3>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border-color)]">
                            <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Período</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Monto</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenant.paymentHistory.map(p => (
                            <tr key={p.month} className="table-row-hover border-b border-[var(--border-color)] last:border-0">
                                <td className="px-4 py-3 text-sm">{p.month}</td>
                                <td className="px-4 py-3 text-sm font-semibold">{formatPeso(p.amount)}</td>
                                <td className="px-4 py-3">
                                    <span className={cn(
                                        'px-2 py-0.5 rounded-full text-xs font-medium',
                                        p.status === 'pagado' && 'badge-success',
                                        p.status === 'pendiente' && 'badge-warning',
                                        p.status === 'atrasado' && 'badge-danger',
                                    )}>
                                        {p.status === 'pagado' ? 'Pagado' : p.status === 'pendiente' ? 'Pendiente' : 'Atrasado'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
