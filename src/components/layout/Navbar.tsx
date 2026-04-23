import { Menu, Moon, Printer, Sparkles, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { useTheme } from '@/lib/theme';
import { useCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/appState';

interface NavbarProps {
  onMenuClick: () => void;
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

export function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, ufValue, setUfValue } = useCurrency();
  const { state, actions } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const assetName = state.asset?.name ?? 'Sin activo';
  const pageTitle = matchRouteTitle(location.pathname);

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

      {/* Search */}
      <div style={{ position: 'relative', width: 340 }} className="hidden md:block">
        <input
          className="mq-input search"
          placeholder="Buscar locatario, local, contrato…"
          onFocus={(e) => e.currentTarget.select()}
        />
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            color: 'var(--ink-4)',
            padding: '2px 6px',
            border: '1px solid var(--line)',
            borderRadius: 5,
          }}
        >
          ⌘K
        </span>
      </div>

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
    </nav>
  );
}
