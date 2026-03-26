import { FileText, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { tenants, contracts } from '@/data/mockData';
import { formatPeso, formatDate, formatUF } from '@/lib/format';

const tenant = tenants[0];
const contract = contracts[0];

export function LocatarioContrato() {
    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Mi Contrato</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                    Detalles del contrato de arriendo — {tenant.name}
                </p>
            </div>

            {/* Contract Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase">Vigencia</span>
                    </div>
                    <p className="text-sm font-semibold">{formatDate(contract.startDate)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">hasta</p>
                    <p className="text-sm font-semibold">{formatDate(contract.endDate)}</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase">Renta Mensual</span>
                    </div>
                    <p className="text-xl font-bold">{formatPeso(contract.rentCLP)}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{formatUF(contract.rentUF)}</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase">Reajuste</span>
                    </div>
                    <p className="text-lg font-bold">{contract.escalation}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">Mecanismo de ajuste</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-[var(--sidebar-fg)] uppercase">Local</span>
                    </div>
                    <p className="text-lg font-bold">{tenant.local}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{tenant.areaM2} m² de superficie</p>
                </div>
            </div>

            {/* Rent Breakdown */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4">Desglose de Renta</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-[var(--sidebar-fg)]">Renta Fija</span>
                            <span className="font-semibold">{formatPeso(tenant.rentFixed)}</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-[var(--hover-bg)]">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(tenant.rentFixed / tenant.rentTotal) * 100}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-[var(--sidebar-fg)]">Renta Variable</span>
                            <span className="font-semibold">{formatPeso(tenant.rentVariable)}</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-[var(--hover-bg)]">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(tenant.rentVariable / tenant.rentTotal) * 100}%` }} />
                        </div>
                    </div>
                    <div className="mt-4 p-4 rounded-lg bg-[var(--hover-bg)]">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Renta Total Mensual</span>
                            <span className="text-xl font-bold">{formatPeso(tenant.rentTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
