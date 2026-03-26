import { Users, Wifi, Building2, Shield, Database, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const configSections = [
    {
        title: 'Usuarios y Roles',
        icon: Users,
        description: 'Gestión de accesos y permisos del sistema',
        items: [
            { name: 'Carlos Méndez', role: 'Administrador', email: 'cmendez@grupopatio.cl', active: true },
            { name: 'María Fernández', role: 'Analista', email: 'mfernandez@grupopatio.cl', active: true },
            { name: 'Pedro Soto', role: 'Operador', email: 'psoto@grupopatio.cl', active: true },
            { name: 'Ana Torres', role: 'Viewer', email: 'atorres@grupopatio.cl', active: false },
        ],
    },
];

const integrations = [
    { name: 'SAP Business One', status: 'connected', icon: Database, lastSync: '26/03/2026 08:30' },
    { name: 'Gateway IoT', status: 'connected', icon: Wifi, lastSync: '26/03/2026 08:32' },
    { name: 'API Facturación', status: 'connected', icon: Globe, lastSync: '26/03/2026 08:00' },
    { name: 'CRM Salesforce', status: 'disconnected', icon: Shield, lastSync: 'N/A' },
];

const mallParams = [
    { label: 'Nombre del Mall', value: 'Patio Outlet Maipú' },
    { label: 'Superficie Total', value: '4.850 m²' },
    { label: 'Total Locales', value: '52' },
    { label: 'Horario', value: '10:00 - 21:00' },
    { label: 'Región', value: 'Metropolitana' },
    { label: 'Comuna', value: 'Maipú' },
];

export function Configuracion() {
    return (
        <div className="p-4 md:p-6 space-y-6 fade-in">
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Configuración</h1>
                <p className="text-sm text-[var(--sidebar-fg)] mt-1">
                    Parámetros del sistema y gestión de integraciones
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Users */}
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-semibold">Usuarios y Roles</h3>
                    </div>
                    <div className="space-y-3">
                        {configSections[0].items.map(user => (
                            <div key={user.email} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <p className="text-xs text-[var(--sidebar-fg)]">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium badge-info">{user.role}</span>
                                    <span className={cn(
                                        'w-2 h-2 rounded-full',
                                        user.active ? 'bg-emerald-500' : 'bg-gray-400'
                                    )} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Integrations */}
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Wifi className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold">Integraciones</h3>
                    </div>
                    <div className="space-y-3">
                        {integrations.map(int => (
                            <div key={int.name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-[var(--hover-bg)] flex items-center justify-center">
                                    <int.icon className="w-4 h-4 text-[var(--sidebar-fg)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{int.name}</p>
                                    <p className="text-xs text-[var(--sidebar-fg)]">Última sync: {int.lastSync}</p>
                                </div>
                                <span className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-medium',
                                    int.status === 'connected' ? 'badge-success' : 'badge-danger',
                                )}>
                                    {int.status === 'connected' ? 'Conectado' : 'Desconectado'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mall Parameters */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm font-semibold">Parámetros del Mall</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mallParams.map(p => (
                        <div key={p.label} className="p-3 rounded-lg bg-[var(--hover-bg)]">
                            <p className="text-xs text-[var(--sidebar-fg)] mb-1">{p.label}</p>
                            <p className="text-sm font-semibold">{p.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
