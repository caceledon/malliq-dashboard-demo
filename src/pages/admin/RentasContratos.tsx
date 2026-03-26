import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { contracts, rentCollection } from '@/data/mockData';
import { formatPeso, formatDate, formatUF } from '@/lib/format';
import { cn } from '@/lib/utils';

export function RentasContratos() {
    const collectionStats = { collected: 92.5, pending: 5.2, overdue: 2.3 };

    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Rentas y Contratos</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">Seguimiento financiero y gestión de contratos</p>
            </div>

            {/* Collection Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Recaudado', value: collectionStats.collected, color: '#10B981' },
                    { label: 'Pendiente', value: collectionStats.pending, color: '#F59E0B' },
                    { label: 'En Mora', value: collectionStats.overdue, color: '#EF4444' },
                ].map(stat => (
                    <div key={stat.label} className="glass-card p-5">
                        <p className="text-xs font-medium text-[var(--sidebar-fg)] uppercase mb-2">{stat.label}</p>
                        <div className="flex items-end gap-2 mb-3">
                            <span className="text-2xl font-bold">{stat.value}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--hover-bg)]">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${stat.value}%`, background: stat.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Rent Chart */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-1">Recaudación Mensual</h3>
                <p className="text-xs text-[var(--sidebar-fg)] mb-4">Renta fija vs variable</p>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={rentCollection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--sidebar-fg)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip
                            contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                            formatter={(value: number) => [formatPeso(value), '']}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="fixed" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} name="Renta Fija" />
                        <Bar dataKey="variable" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} name="Renta Variable" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Contracts Table */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4">Contratos Vigentes</h3>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-[var(--border-color)]">
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Locatario</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Local</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Inicio</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Término</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Renta UF</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Renta CLP</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Reajuste</th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--sidebar-fg)] uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map(c => (
                                <tr key={c.local} className="table-row-hover border-b border-[var(--border-color)] last:border-0">
                                    <td className="px-4 py-3 text-sm font-semibold">{c.tenantName}</td>
                                    <td className="px-4 py-3 text-sm font-mono text-[var(--sidebar-fg)]">{c.local}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--sidebar-fg)]">{formatDate(c.startDate)}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--sidebar-fg)]">{formatDate(c.endDate)}</td>
                                    <td className="px-4 py-3 text-sm">{formatUF(c.rentUF)}</td>
                                    <td className="px-4 py-3 text-sm font-semibold">{formatPeso(c.rentCLP)}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--sidebar-fg)]">{c.escalation}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'px-2 py-0.5 rounded-full text-xs font-medium',
                                            c.status === 'vigente' && 'badge-success',
                                            c.status === 'por vencer' && 'badge-warning',
                                            c.status === 'vencido' && 'badge-danger',
                                        )}>
                                            {c.status === 'vigente' ? 'Vigente' : c.status === 'por vencer' ? 'Por Vencer' : 'Vencido'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
