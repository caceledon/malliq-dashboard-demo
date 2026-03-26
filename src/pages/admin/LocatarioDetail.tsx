import { useParams, Link } from 'react-router-dom';
import { ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { tenants } from '@/data/mockData';
import { formatPeso, formatDate, formatUF, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export function LocatarioDetail() {
    const { id } = useParams<{ id: string }>();
    const tenant = tenants.find(t => t.id === id);

    if (!tenant) {
        return (
            <div className="p-6 text-center">
                <p className="text-lg text-[var(--sidebar-fg)]">Locatario no encontrado</p>
                <Link to="/admin/locatarios" className="text-blue-500 hover:underline text-sm mt-2 inline-block">
                    Volver a Locatarios
                </Link>
            </div>
        );
    }

    const salesDelta = ((tenant.salesCurrent - tenant.salesPrevious) / tenant.salesPrevious) * 100;

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            'activo': 'badge-success',
            'en mora': 'badge-danger',
            'por vencer': 'badge-warning',
        };
        const labelMap: Record<string, string> = {
            'activo': 'Activo',
            'en mora': 'En Mora',
            'por vencer': 'Por Vencer',
        };
        return (
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', map[status])}>
                {labelMap[status] || status}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
                <Link to="/admin/dashboard" className="text-[var(--sidebar-fg)] hover:text-[var(--fg)] transition-colors">
                    Dashboard
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--sidebar-fg)]" />
                <Link to="/admin/locatarios" className="text-[var(--sidebar-fg)] hover:text-[var(--fg)] transition-colors">
                    Locatarios
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--sidebar-fg)]" />
                <span className="font-semibold">{tenant.name}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                        {tenant.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl md:text-2xl font-bold">{tenant.name}</h1>
                            {statusBadge(tenant.status)}
                        </div>
                        <p className="text-sm text-[var(--sidebar-fg)] mt-0.5">
                            {tenant.category} · Local {tenant.local} · {tenant.areaM2} m²
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide mb-2">Ventas Mes Actual</p>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesCurrent)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className={cn('flex items-center gap-0.5 text-xs font-semibold', salesDelta >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                            {salesDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {salesDelta >= 0 ? '+' : ''}{formatPercent(salesDelta)}
                        </span>
                        <span className="text-xs text-[var(--sidebar-fg)]">vs mes anterior</span>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide mb-2">Ventas/m²</p>
                    <p className="text-2xl font-bold">{formatPeso(tenant.salesPerM2)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">{tenant.areaM2} m² de superficie</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide mb-2">Renta Total</p>
                    <p className="text-2xl font-bold">{formatPeso(tenant.rentTotal)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">{formatUF(tenant.rentUF)}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide mb-2">Contrato</p>
                    <p className="text-lg font-bold">{formatDate(tenant.contractEnd)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)] mt-1">Desde {formatDate(tenant.contractStart)}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sales Trend */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-1">Evolución de Ventas</h3>
                    <p className="text-xs text-[var(--sidebar-fg)] mb-4">Últimos 6 meses</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={tenant.monthlySales}>
                            <defs>
                                <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(0)}M`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                                formatter={(value: number) => [formatPeso(value), 'Ventas']}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gradSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Rent Breakdown */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-1">Desglose de Renta</h3>
                    <p className="text-xs text-[var(--sidebar-fg)] mb-4">Fija vs Variable</p>
                    <div className="space-y-4 mb-6">
                        <div>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="text-[var(--sidebar-fg)]">Renta Fija</span>
                                <span className="font-semibold">{formatPeso(tenant.rentFixed)}</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-[var(--hover-bg)]">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(tenant.rentFixed / tenant.rentTotal) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="text-[var(--sidebar-fg)]">Renta Variable</span>
                                <span className="font-semibold">{formatPeso(tenant.rentVariable)}</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-[var(--hover-bg)]">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${(tenant.rentVariable / tenant.rentTotal) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--hover-bg)]">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total Mensual</span>
                            <span className="text-lg font-bold">{formatPeso(tenant.rentTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4">Historial de Pagos</h3>
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
