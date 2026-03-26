import { AlertCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { alerts } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function Alertas() {
    const getIcon = (type: string) => {
        switch (type) {
            case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const formatTimestamp = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    };

    const critical = alerts.filter(a => a.type === 'critical');
    const warning = alerts.filter(a => a.type === 'warning');
    const info = alerts.filter(a => a.type === 'info');

    const renderAlertGroup = (title: string, items: typeof alerts, icon: React.ReactNode) => (
        <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h3 className="text-sm font-semibold">{title}</h3>
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--hover-bg)]">
                    {items.length}
                </span>
            </div>
            <div className="space-y-3">
                {items.map(alert => (
                    <div
                        key={alert.id}
                        className={cn(
                            'p-4 rounded-lg border border-[var(--border-color)] transition-all hover:shadow-md',
                            !alert.read && 'ring-1 ring-blue-500/30'
                        )}
                        style={{ background: 'var(--bg)' }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold">{alert.title}</h4>
                                    {!alert.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <p className="text-xs text-[var(--sidebar-fg)] leading-relaxed">{alert.description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--sidebar-fg)] flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(alert.timestamp)}
                            </div>
                        </div>
                        {alert.tenant && (
                            <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                                <span className="text-xs text-[var(--sidebar-fg)]">Locatario: </span>
                                <span className="text-xs font-semibold">{alert.tenant}</span>
                            </div>
                        )}
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-sm text-[var(--sidebar-fg)] text-center py-4">Sin alertas en esta categoría</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Alertas</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                    Centro de notificaciones y alertas del sistema
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Críticas', count: critical.length, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
                    { label: 'Advertencias', count: warning.length, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                    { label: 'Informativas', count: info.length, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                ].map(s => (
                    <div key={s.label} className="glass-card p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                            <span className="text-xl font-bold" style={{ color: s.color }}>{s.count}</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">{s.label}</p>
                            <p className="text-xs text-[var(--sidebar-fg)]">alertas activas</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alert Groups */}
            <div className="space-y-4">
                {renderAlertGroup('Alertas Críticas', critical, <AlertCircle className="w-4 h-4 text-red-500" />)}
                {renderAlertGroup('Advertencias', warning, <AlertTriangle className="w-4 h-4 text-amber-500" />)}
                {renderAlertGroup('Informativas', info, <Info className="w-4 h-4 text-blue-500" />)}
            </div>
        </div>
    );
}
