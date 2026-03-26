import { useState } from 'react';
import { Wifi, X, Signal } from 'lucide-react';
import { gateways } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function GatewayStatus() {
    const [open, setOpen] = useState(false);
    const onlineCount = gateways.filter(g => g.status === 'online').length;
    const total = gateways.length;

    return (
        <>
            {/* Floating Indicator */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full glass-card cursor-pointer hover:scale-105 transition-transform"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            >
                <span className="relative flex h-2.5 w-2.5">
                    <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-sm font-medium">{onlineCount}/{total} gateways activos</span>
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overlay-backdrop" onClick={() => setOpen(false)}>
                    <div
                        className="glass-card w-full max-w-lg mx-4 scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-2">
                                <Wifi className="w-5 h-5 text-[#3B82F6]" />
                                <h2 className="text-lg font-semibold">Estado de Gateways</h2>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs uppercase text-[var(--sidebar-fg)] border-b border-[var(--border-color)]">
                                        <th className="text-left py-2 font-medium">Locatario</th>
                                        <th className="text-left py-2 font-medium">Local</th>
                                        <th className="text-center py-2 font-medium">Estado</th>
                                        <th className="text-center py-2 font-medium">Señal</th>
                                        <th className="text-right py-2 font-medium">Última Sync</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gateways.map(gw => (
                                        <tr key={gw.local} className="table-row-hover border-b border-[var(--border-color)] last:border-0">
                                            <td className="py-3 font-medium text-sm">{gw.tenantName}</td>
                                            <td className="py-3 text-sm text-[var(--sidebar-fg)]">{gw.local}</td>
                                            <td className="py-3 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                                    gw.status === 'online' && 'badge-success',
                                                    gw.status === 'warning' && 'badge-warning',
                                                    gw.status === 'offline' && 'badge-danger',
                                                )}>
                                                    <span className={cn(
                                                        'w-1.5 h-1.5 rounded-full',
                                                        gw.status === 'online' && 'bg-emerald-500',
                                                        gw.status === 'warning' && 'bg-amber-500',
                                                        gw.status === 'offline' && 'bg-red-500',
                                                    )} />
                                                    {gw.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Signal className={cn(
                                                        'w-3.5 h-3.5',
                                                        gw.signalStrength > 80 ? 'text-emerald-500' : gw.signalStrength > 50 ? 'text-amber-500' : 'text-red-500'
                                                    )} />
                                                    <span className="text-xs">{gw.signalStrength}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right text-xs text-[var(--sidebar-fg)]">
                                                {new Date(gw.lastSync).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
