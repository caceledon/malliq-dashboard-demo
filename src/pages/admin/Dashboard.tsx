import {
    Building, DollarSign, Users, Activity,
    ArrowUpRight, ArrowDownRight, AlertTriangle
} from 'lucide-react';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { dashboardKPIs, revenueTrend, categoryDistribution, tenants, alerts } from '@/data/mockData';
import { formatPeso, formatPercent, formatNumber, formatUF } from '@/lib/format';
import { cn } from '@/lib/utils';

import { InteractiveMap } from '@/components/InteractiveMap';

const kpiCards = [
    {
        label: 'Ocupación',
        value: formatPercent(dashboardKPIs.occupancy),
        sub: `${dashboardKPIs.occupiedLocals}/${dashboardKPIs.totalLocals} locales`,
        delta: 2.1,
        icon: Building,
        color: '#3B82F6',
    },
    {
        label: 'Ingresos Mensuales',
        value: formatPeso(dashboardKPIs.monthlyRevenue),
        sub: 'Marzo 2026',
        delta: dashboardKPIs.revenueDelta,
        icon: DollarSign,
        color: '#10B981',
    },
    {
        label: 'Valor UF',
        value: formatUF(dashboardKPIs.ufRate),
        sub: formatPeso(dashboardKPIs.ufRate),
        delta: dashboardKPIs.ufDelta,
        icon: Activity,
        color: '#8B5CF6',
    },
    {
        label: 'Tráfico Mensual',
        value: formatNumber(dashboardKPIs.traffic),
        sub: 'Visitas estimadas',
        delta: dashboardKPIs.trafficDelta,
        icon: Users,
        color: '#F59E0B',
    },
];

export function AdminDashboard() {
    const unreadAlerts = alerts.filter(a => !a.read);

    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                    Patio Outlet Maipú — Resumen general del centro comercial
                </p>
            </div>

            {/* Interactive Map */}
            <InteractiveMap />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map(kpi => (
                    <div key={kpi.label} className="glass-card p-5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide">
                                {kpi.label}
                            </span>
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ background: `${kpi.color}20` }}
                            >
                                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold mb-1">{kpi.value}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--sidebar-fg)]">{kpi.sub}</span>
                            <span className={cn(
                                'flex items-center gap-0.5 text-xs font-semibold',
                                kpi.delta >= 0 ? 'text-emerald-500' : 'text-red-500'
                            )}>
                                {kpi.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {kpi.delta >= 0 ? '+' : ''}{formatPercent(kpi.delta)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold">Evolución de Ingresos</h3>
                            <p className="text-xs text-[var(--sidebar-fg)]">Últimos 6 meses vs meta</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Real
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Meta
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={revenueTrend}>
                            <defs>
                                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `$${(v / 1000000).toFixed(0)}M`}
                            />
                            <Tooltip
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                                formatter={(value: any) => [formatPeso(value as number), '']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gradRevenue)" name="Ingresos" />
                            <Area type="monotone" dataKey="target" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fill="none" name="Meta" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-1">Distribución por Categoría</h3>
                    <p className="text-xs text-[var(--sidebar-fg)] mb-4">% de locales por rubro</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={categoryDistribution}
                                cx="50%" cy="50%"
                                innerRadius={55} outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {categoryDistribution.map(entry => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                                formatter={(value: any) => [`${value}%`, '']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {categoryDistribution.map(cat => (
                            <div key={cat.name} className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                                <span className="text-[var(--sidebar-fg)]">{cat.name}</span>
                                <span className="font-semibold ml-auto">{cat.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom: Recent Alerts + Top Tenants */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Alerts */}
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">Alertas Recientes</h3>
                        {unreadAlerts.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                {unreadAlerts.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {alerts.slice(0, 4).map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
                                <span className={cn(
                                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                                    alert.type === 'critical' && 'bg-red-500',
                                    alert.type === 'warning' && 'bg-amber-500',
                                    alert.type === 'info' && 'bg-blue-500',
                                )} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{alert.title}</p>
                                    <p className="text-xs text-[var(--sidebar-fg)] mt-0.5 line-clamp-1">{alert.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Tenants */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4">Top Locatarios por Ventas/m²</h3>
                    <div className="space-y-3">
                        {[...tenants]
                            .sort((a, b) => b.salesPerM2 - a.salesPerM2)
                            .slice(0, 5)
                            .map((t, i) => (
                                <div key={t.id} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-xs font-bold text-[var(--sidebar-fg)]">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{t.name}</p>
                                        <p className="text-xs text-[var(--sidebar-fg)]">{t.category} · {t.local}</p>
                                    </div>
                                    <span className="text-sm font-semibold">{formatPeso(t.salesPerM2)}/m²</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
