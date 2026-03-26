import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { tenants } from '@/data/mockData';
import { formatPeso, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function Locatarios() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const filtered = tenants
        .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const key = sortKey as keyof typeof a;
            const aVal = a[key];
            const bVal = b[key];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return sortDir === 'asc'
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            'activo': 'badge-success',
            'en mora': 'badge-danger',
            'por vencer': 'badge-warning',
            'vacante': 'badge-info',
        };
        const labelMap: Record<string, string> = {
            'activo': 'Activo',
            'en mora': 'En Mora',
            'por vencer': 'Por Vencer',
            'vacante': 'Vacante',
        };
        return (
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status] || 'badge-info')}>
                {labelMap[status] || status}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Locatarios</h1>
                    <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                        Directorio de locatarios del centro comercial
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sidebar-fg)]" />
                        <input
                            type="text"
                            placeholder="Buscar locatario..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg text-sm border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                            style={{ background: 'var(--input-bg)' }}
                        />
                    </div>
                    <button className="p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer border border-[var(--border-color)]">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-x-auto">
                <table className="w-full min-w-[700px]">
                    <thead>
                        <tr className="border-b border-[var(--border-color)]">
                            {[
                                { key: 'name', label: 'Locatario' },
                                { key: 'category', label: 'Categoría' },
                                { key: 'local', label: 'Local' },
                                { key: 'status', label: 'Estado' },
                                { key: 'salesPerM2', label: 'Ventas/m²' },
                                { key: 'rentTotal', label: 'Renta Total' },
                                { key: 'contractEnd', label: 'Fin Contrato' },
                            ].map(col => (
                                <th
                                    key={col.key}
                                    className="text-left px-4 py-3 text-xs font-medium text-[var(--sidebar-fg)] uppercase tracking-wide cursor-pointer hover:text-[var(--fg)] transition-colors"
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(tenant => (
                            <tr
                                key={tenant.id}
                                className="table-row-hover border-b border-[var(--border-color)] last:border-0 cursor-pointer"
                                onClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
                            >
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-blue-500">
                                            {tenant.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-semibold">{tenant.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm text-[var(--sidebar-fg)]">{tenant.category}</td>
                                <td className="px-4 py-3.5 text-sm font-mono text-[var(--sidebar-fg)]">{tenant.local}</td>
                                <td className="px-4 py-3.5">{statusBadge(tenant.status)}</td>
                                <td className="px-4 py-3.5 text-sm font-semibold">{formatPeso(tenant.salesPerM2)}</td>
                                <td className="px-4 py-3.5 text-sm">{formatPeso(tenant.rentTotal)}</td>
                                <td className="px-4 py-3.5 text-sm text-[var(--sidebar-fg)]">{formatDate(tenant.contractEnd)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
