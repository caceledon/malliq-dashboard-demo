import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Receipt, AlertTriangle, Settings,
    BarChart3, FileText, ShoppingCart, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/locatarios', label: 'Locatarios', icon: Users },
    { to: '/admin/rentas', label: 'Rentas y Contratos', icon: Receipt },
    { to: '/admin/alertas', label: 'Alertas', icon: AlertTriangle },
    { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

const locatarioLinks = [
    { to: '/locatario/dashboard', label: 'Mi Dashboard', icon: LayoutDashboard },
    { to: '/locatario/contrato', label: 'Mi Contrato', icon: FileText },
    { to: '/locatario/ventas', label: 'Mis Ventas', icon: ShoppingCart },
];

interface SidebarProps {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');
    const links = isAdmin ? adminLinks : locatarioLinks;

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-4 border-b border-[var(--border-color)]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                    <h1 className="text-base font-bold leading-tight tracking-tight">MallIQ</h1>
                    <p className="text-[10px] text-[var(--sidebar-fg)] leading-none -mt-0.5">Inteligencia de Datos</p>
                </div>
            </div>

            {/* Role label */}
            <div className="px-4 py-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sidebar-fg)]">
                        {isAdmin ? 'Panel Administrador' : 'Panel Locatario'}
                    </span>
                </div>
            </div>

            {/* Links */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                            isActive
                                ? 'bg-blue-600/15 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400'
                                : 'text-[var(--sidebar-fg)] hover:bg-[var(--hover-bg)] hover:text-[var(--fg)]'
                        )}
                    >
                        <link.icon className="w-4.5 h-4.5" />
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-[var(--border-color)]">
                <div className="text-[10px] text-[var(--sidebar-fg)] leading-relaxed">
                    <p className="font-semibold text-[var(--fg)]">MallIQ v1.0</p>
                    <p>Grupo Patio © 2026</p>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 overlay-backdrop md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-60 border-r border-[var(--border-color)] transition-transform duration-300',
                    'md:sticky md:top-0 md:h-screen md:translate-x-0',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ background: 'var(--sidebar-bg)' }}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
