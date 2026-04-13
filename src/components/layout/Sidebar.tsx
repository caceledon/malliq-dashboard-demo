import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  Database,
  FileArchive,
  LayoutDashboard,
  LogOut,
  Map,
  ReceiptText,
  Settings,
  ShoppingBasket,
  Users,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/malls', label: 'Portafolio malls', icon: Map },
  { to: '/admin/locatarios', label: 'Locatarios', icon: Users },
  { to: '/admin/rentas', label: 'Rentas y contratos', icon: FileArchive },
  { to: '/admin/cargas', label: 'Carga de datos', icon: ReceiptText },
  { to: '/admin/planeacion', label: 'Presupuesto', icon: Database },
  { to: '/admin/ecosistema', label: 'Prospectos y proveedores', icon: ShoppingBasket },
  { to: '/admin/alertas', label: 'Alertas', icon: TriangleAlert },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

const locatarioLinks = [
  { to: '/locatario/dashboard', label: 'Mi dashboard', icon: LayoutDashboard },
  { to: '/locatario/contrato', label: 'Mi contrato', icon: FileArchive },
  { to: '/locatario/ventas', label: 'Mis ventas', icon: ReceiptText },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const links = isAdmin ? adminLinks : locatarioLinks;

  return (
    <>
      {mobileOpen ? (
        <div className="overlay-backdrop fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--border-color)] transition-transform duration-300',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-[var(--border-color)] px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">MallIQ Operativo</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--sidebar-fg)]">Datos reales del mall</p>
            </div>
          </div>

          <div className="border-b border-[var(--border-color)] px-4 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sidebar-fg)]">
              {isAdmin ? 'Panel administrador' : 'Panel locatario'}
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-600/15 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'text-[var(--sidebar-fg)] hover:bg-[var(--hover-bg)] hover:text-[var(--fg)]',
                  )
                }
              >
                <link.icon className="h-4.5 w-4.5" />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-[var(--border-color)] p-4">
            <button
              onClick={() => {
                setMobileOpen(false);
                window.location.href = '#/';
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4.5 w-4.5" />
              Cerrar sesión
            </button>
            <div className="mt-3 px-2 text-[11px] text-[var(--sidebar-fg)]">
              <p className="font-semibold text-[var(--fg)]">Versión productiva local</p>
              <p>Persistencia SQLite · IA · Proxy Auth</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
