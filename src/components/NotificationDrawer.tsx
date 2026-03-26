import { useState } from 'react';
import { Bell, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { alerts } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function NotificationDrawer() {
    const [open, setOpen] = useState(false);
    const unreadCount = alerts.filter(a => !a.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Hace unos minutos';
        if (hours < 24) return `Hace ${hours}h`;
        return `Hace ${Math.floor(hours / 24)}d`;
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Drawer overlay */}
            {open && (
                <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 overlay-backdrop" />

                    {/* Drawer */}
                    <div
                        className="absolute top-0 right-0 h-full w-full max-w-md slide-in-right"
                        style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-[#3B82F6]" />
                                <h2 className="text-lg font-semibold">Notificaciones</h2>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        {unreadCount} nuevas
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto" style={{ height: 'calc(100% - 73px)' }}>
                            {alerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={cn(
                                        'p-4 border-b border-[var(--border-color)] transition-colors hover:bg-[var(--hover-bg)]',
                                        !alert.read && 'bg-[var(--hover-bg)]'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">{getIcon(alert.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={cn('text-sm font-semibold', !alert.read && 'text-[var(--fg)]')}>
                                                    {alert.title}
                                                </p>
                                                {!alert.read && (
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-[var(--sidebar-fg)] mb-2 leading-relaxed">
                                                {alert.description}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                                                    alert.type === 'critical' && 'badge-danger',
                                                    alert.type === 'warning' && 'badge-warning',
                                                    alert.type === 'info' && 'badge-info',
                                                )}>
                                                    {alert.type === 'critical' ? 'Crítico' : alert.type === 'warning' ? 'Advertencia' : 'Info'}
                                                </span>
                                                <span className="text-[10px] text-[var(--sidebar-fg)]">
                                                    {getTimeAgo(alert.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
