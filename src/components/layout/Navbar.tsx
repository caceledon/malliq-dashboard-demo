import { useEffect, useState } from 'react';
import { LogOut, Menu, Moon, Printer, Search, Sparkles, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { useTheme } from '@/lib/theme';
import { useCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/appState';
import { getAuthUser, logout, subscribeAuthUser, type AuthUser } from '@/lib/auth';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

interface NavbarProps {
  onMenuClick: () => void;
  onOpenCommandPalette: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard operativo',
  '/admin/activos': 'Portafolio activos',
  '/admin/locatarios': 'Locatarios',
  '/admin/rentas': 'Rentas y contratos',
  '/admin/cargas': 'Carga de datos',
  '/admin/planeacion': 'Presupuesto operativo',
  '/admin/ecosistema': 'Prospectos y proveedores',
  '/admin/alertas': 'Alertas',
  '/admin/configuracion': 'Configuración',
  '/locatario/dashboard': 'Mi dashboard',
  '/locatario/contrato': 'Mi contrato',
  '/locatario/ventas': 'Mis ventas',
};

function matchRouteTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const prefix = Object.keys(ROUTE_TITLES).find((k) => pathname.startsWith(k));
  return prefix ? ROUTE_TITLES[prefix] : 'Panel';
}

export function Navbar({ onMenuClick, onOpenCommandPalette }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, ufValue, setUfValue } = useCurrency();
  const { state, actions } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const assetName = state.asset?.name ?? 'Sin activo';
  const pageTitle = matchRouteTitle(location.pathname);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());
  useEffect(() => subscribeAuthUser(setAuthUser), []);

  return (
    <nav className="mq-topbar">
      <button
        onClick={onMenuClick}
        title="Menú"
        type="button"
        className="iconbtn md:hidden"
      >
        <Menu size={16} />
      </button>

      <div className="breadcrumb" style={{ minWidth: 0 }}>
        <span className="truncate">{assetName}</span>
        <span className="sep">/</span>
        <span style={{ color: 'var(--ink-1)', fontWeight: 500 }} className="truncate">
          {pageTitle}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search — opens command palette */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        title="Buscar (⌘K / Ctrl+K)"
        className="hidden md:flex items-center mq-input search"
        style={{
          width: 340,
          textAlign: 'left',
          color: 'var(--ink-4)',
          cursor: 'pointer',
          background: 'var(--card)',
          paddingLeft: 34,
          paddingRight: 42,
          position: 'relative',
        }}
      >
        <Search
          size={14}
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}
        />
        <span style={{ flex: 1 }}>Buscar locatario, local, contrato…</span>
        <span
          className="t-mono"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 10.5,
            color: 'var(--ink-4)',
            padding: '2px 6px',
            border: '1px solid var(--line)',
            borderRadius: 5,
            background: 'var(--paper-2)',
          }}
        >
          {IS_MAC ? '⌘K' : 'Ctrl K'}
        </span>
      </button>

      {/* Portal switcher */}
      <div
        className="seg hidden lg:inline-flex"
        role="tablist"
        aria-label="Portal"
      >
        <button
          type="button"
          className={cn(isAdmin && 'on')}
          onClick={() => navigate('/admin/dashboard')}
        >
          Admin
        </button>
        <button
          type="button"
          className={cn(!isAdmin && 'on')}
          onClick={() => navigate('/locatario/dashboard')}
        >
          Locatario
        </button>
      </div>

      {/* Currency */}
      <div className="hidden md:flex items-center gap-2">
        <div className="seg">
          <button
            type="button"
            className={cn(currency === 'CLP' && 'on')}
            onClick={() => setCurrency('CLP')}
          >
            CLP
          </button>
          <button
            type="button"
            className={cn(currency === 'UF' && 'on')}
            onClick={() => setCurrency('UF')}
          >
            UF
          </button>
        </div>
        {currency === 'UF' ? (
          <input
            type="number"
            value={ufValue}
            onChange={(e) => setUfValue(Number(e.target.value))}
            className="mq-input"
            style={{ width: 88, padding: '6px 8px', fontSize: 12 }}
            title="Valor UF"
          />
        ) : null}
      </div>

      {/* Theme */}
      <button
        type="button"
        className="iconbtn"
        title={`Cambiar a modo ${nextTheme === 'dark' ? 'oscuro' : 'claro'}`}
        onClick={() => {
          setTheme(nextTheme);
          if (state.asset) {
            actions.updateAssetSettings({ themePreference: nextTheme });
          }
        }}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <NotificationDrawer />

      <button
        type="button"
        className="mq-btn sm hidden md:inline-flex"
        onClick={() => window.print()}
        title="Imprimir PDF ejecutivo"
      >
        <Printer size={14} /> PDF ejecutivo
      </button>
      <button
        type="button"
        className="mq-btn primary sm"
        onClick={() => navigate('/admin/rentas')}
      >
        <Sparkles size={14} /> Asistente MallQ
      </button>

      {authUser ? (
        <div className="row hidden lg:flex" style={{ gap: 6 }}>
          <span className="t-dim truncate" style={{ fontSize: 11.5, maxWidth: 160 }} title={authUser.email}>
            {authUser.displayName ?? authUser.email}
          </span>
          <button
            type="button"
            className="iconbtn"
            onClick={() => {
              logout();
              window.location.reload();
            }}
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
