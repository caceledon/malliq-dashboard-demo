import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bolt,
  Bot,
  Calculator,
  ChevronDown,
  Database,
  FileArchive,
  LayoutDashboard,
  LogOut,
  Map,
  Plug2,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/appState';
import { logout } from '@/lib/auth';
import type { PortfolioAssetSummary } from '@/lib/portfolio';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Operador',
  locatario: 'Locatario',
};

function deriveInitials(name: string, fallbackEmail: string): string {
  const source = name.trim() || fallbackEmail.split('@')[0] || '?';
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join('').toUpperCase();
}

interface NavDef {
  to: string;
  label: string;
  icon: LucideIcon;
  tag?: string | number | null;
}

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const { state, insights, assetSummaries, activeAssetId, actions, authUser } = useAppState();
  const isAdmin = location.pathname.startsWith('/admin') && authUser?.role !== 'locatario';

  const operationNav: NavDef[] = useMemo(
    () =>
      isAdmin
        ? [
            { to: '/admin/dashboard', label: 'Cockpit', icon: LayoutDashboard },
            { to: '/admin/activos', label: 'Portafolio', icon: Map, tag: assetSummaries.length || null },
            { to: '/admin/locatarios', label: 'Locatarios', icon: Users, tag: insights.tenantSummaries.length || null },
            { to: '/admin/rentas', label: 'Rentas', icon: FileArchive },
            { to: '/admin/cargas', label: 'Cargas', icon: ReceiptText },
          ]
        : [
            { to: '/locatario/dashboard', label: 'Mi panel', icon: LayoutDashboard },
            { to: '/locatario/contrato', label: 'Mi contrato', icon: FileArchive },
            { to: '/locatario/ventas', label: 'Mis ventas', icon: ReceiptText },
          ],
    [isAdmin, assetSummaries.length, insights.tenantSummaries.length],
  );

  const managementNav: NavDef[] = useMemo(
    () =>
      isAdmin
        ? [
            { to: '/admin/alertas', label: 'Alertas', icon: AlertTriangle, tag: insights.alerts.length || null },
            { to: '/admin/planeacion', label: 'Planeación', icon: Database },
            { to: '/admin/simulador', label: 'Simulador', icon: Calculator },
            { to: '/admin/ecosistema', label: 'Ecosistema', icon: Store },
            { to: '/admin/asistente', label: 'Asistente IA', icon: Bot },
            { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
          ]
        : [],
    [isAdmin, insights.alerts.length],
  );

  const asset = state.asset;
  const userName = authUser?.displayName?.trim() || authUser?.email || 'Invitado';
  const userRole = authUser?.role ? ROLE_LABELS[authUser.role] ?? 'Sin rol' : 'Sin rol';
  const userInitials = deriveInitials(authUser?.displayName ?? '', authUser?.email ?? '');

  return (
    <>
      {mobileOpen ? (
        <div className="overlay-backdrop fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col border-r transition-transform duration-300',
          'md:sticky md:top-0 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'color-mix(in oklab, var(--sidebar) 75%, transparent)', borderColor: 'color-mix(in oklab, var(--line) 50%, transparent)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Brand */}
        <div className="mq-brand" style={{ padding: '24px 20px 20px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 10,
              background:
                'conic-gradient(from 220deg at 50% 50%, var(--mint-deep), var(--violet-deep), var(--amber), var(--mint-deep))',
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 4,
                borderRadius: 7,
                background: 'var(--surface)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink-1)',
              }}
            >
              M
            </span>
          </div>
          <div style={{ marginLeft: 12 }}>
            <div
              className="title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: 'var(--ink-1)',
              }}
            >
              Mall<i style={{ fontStyle: 'italic' }}>iq</i>
            </div>
            <div
              className="sub"
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: 'var(--ink-4)',
                marginTop: 4,
              }}
            >
              Operations OS · v3
            </div>
          </div>
        </div>

        {/* Asset switcher */}
        {isAdmin ? (
          <AssetSwitcher
            assetSummaries={assetSummaries}
            activeAssetId={activeAssetId}
            assetName={asset?.name ?? null}
            assetCity={asset?.city ?? null}
            onSwitch={(id) => actions.switchAsset(id)}
          />
        ) : null}

        {/* Nav */}
        <nav className="mq-nav">
          <div className="mq-nav-section">{isAdmin ? 'Operación' : 'Panel locatario'}</div>
          {operationNav.map((n) => (
            <NavItem key={n.to} def={n} onNavigate={() => setMobileOpen(false)} />
          ))}

          {managementNav.length > 0 ? (
            <>
              <div className="mq-nav-section" style={{ marginTop: 14 }}>
                Gestión
              </div>
              {managementNav.map((n) => (
                <NavItem key={n.to} def={n} onNavigate={() => setMobileOpen(false)} />
              ))}
            </>
          ) : null}

          <div style={{ flex: 1 }} />

          {isAdmin ? (
            <>
              <div className="mq-nav-section" style={{ marginTop: 14 }}>
                IA + Sync
              </div>
              <NavLink
                to="/admin/configuracion"
                onClick={() => setMobileOpen(false)}
                title="Configurar el modo de IA y sincronización"
                className={({ isActive }) => cn('mq-nav-item', isActive && 'active')}
              >
                <Sparkles size={16} style={{ color: 'var(--violet)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: 12.5 }}>Autofill Moonshot</span>
                  <span className="t-dim" style={{ fontSize: 10.5 }}>
                    {state.documents.length} docs · kimi-k2.5
                  </span>
                </div>
              </NavLink>
              <SyncStatusRow onNavigate={() => setMobileOpen(false)} />
            </>
          ) : null}
        </nav>

        {/* Footer */}
        <div className="sidebar-foot">
          <div className="mq-avatar">{userInitials}</div>
          <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{userName}</div>
            <div className="t-dim" style={{ fontSize: 11 }}>
              {userRole}
            </div>
          </div>
          <button
            type="button"
            className="iconbtn"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={() => {
              setMobileOpen(false);
              logout();
              window.location.reload();
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ def, onNavigate }: { def: NavDef; onNavigate: () => void }) {
  const Icon = def.icon;
  return (
    <NavLink
      to={def.to}
      onClick={onNavigate}
      className={({ isActive }) => cn('mq-nav-item', isActive && 'active')}
    >
      <Icon size={16} />
      <span>{def.label}</span>
      {def.tag ? <span className="ni-tag">{def.tag}</span> : null}
    </NavLink>
  );
}

interface AssetSwitcherProps {
  assetSummaries: PortfolioAssetSummary[];
  activeAssetId: string | null;
  assetName: string | null;
  assetCity: string | null;
  onSwitch: (id: string) => void;
}

function AssetSwitcher({ assetSummaries, activeAssetId, assetName, assetCity, onSwitch }: AssetSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const active = assetSummaries.find((a) => a.id === activeAssetId);
  const displayName = active?.name ?? assetName ?? 'Configura tu activo';
  const displayCity = active?.city ?? assetCity ?? '';
  const totalUnits = active?.totalUnits;
  const glaLabel = totalUnits ? `${totalUnits} locales` : null;

  return (
    <div style={{ position: 'relative' }} ref={rootRef}>
      <div
        className="asset-switch"
        onClick={() => assetSummaries.length > 0 && setOpen((v) => !v)}
        role="button"
        tabIndex={0}
      >
        <div
          className="asset-thumb"
          style={{
            background: assetGradient(active?.id ?? assetName ?? 'default'),
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="asset-name truncate">{displayName}</div>
          <div className="asset-meta">
            {displayCity}
            {displayCity && glaLabel ? ' · ' : ''}
            {glaLabel ?? ''}
          </div>
        </div>
        {assetSummaries.length > 1 ? <ChevronDown size={14} style={{ color: 'var(--ink-4)' }} /> : null}
      </div>

      {open ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 12,
            right: 12,
            zIndex: 50,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-pop)',
            padding: 4,
            animation: 'fadeIn .15s ease-out',
          }}
        >
          {assetSummaries.map((a) => (
            <div
              key={a.id}
              onClick={() => {
                onSwitch(a.id);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                background: a.id === activeAssetId ? 'var(--paper-2)' : 'transparent',
              }}
            >
              <div
                className="asset-thumb"
                style={{ background: assetGradient(a.id), width: 28, height: 28, borderRadius: 7 }}
              />
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }} className="truncate">
                  {a.name}
                </div>
                <div className="t-dim" style={{ fontSize: 10.5 }}>
                  {a.city ?? ''}
                </div>
              </div>
              <span className="t-mono t-dim" style={{ fontSize: 11 }}>
                {(a.occupancyPct ?? 0).toFixed(0)}%
              </span>
            </div>
          ))}
          <div className="mq-divider" style={{ margin: '4px 6px' }} />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/admin/activos');
            }}
            style={{
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--ink-3)',
              fontSize: 12.5,
              cursor: 'pointer',
              width: '100%',
              background: 'transparent',
              border: 0,
              textAlign: 'left',
            }}
          >
            <Plus size={14} /> Gestionar activos
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SyncStatusRow({ onNavigate }: { onNavigate: () => void }) {
  const { state } = useAppState();
  const syncEnabled = state.asset?.syncEnabled && !!state.asset?.backendUrl;
  return (
    <NavLink
      to="/admin/configuracion"
      onClick={onNavigate}
      title="Configurar la sincronización del backend"
      className={({ isActive }) => cn('mq-nav-item', isActive && 'active')}
    >
      {syncEnabled ? (
        <>
          <span className="mq-dot ok" style={{ marginLeft: 2, marginRight: 4 }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <span style={{ fontSize: 12.5 }}>Sync activo</span>
            <span className="t-dim" style={{ fontSize: 10.5 }}>
              <Bolt size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: -1 }} />
              Remoto · cada 15 s
            </span>
          </div>
        </>
      ) : (
        <>
          <Plug2 size={16} style={{ color: 'var(--ink-4)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <span style={{ fontSize: 12.5 }}>Sync local</span>
            <span className="t-dim" style={{ fontSize: 10.5 }}>
              SQLite · sin remoto
            </span>
          </div>
        </>
      )}
    </NavLink>
  );
}

function assetGradient(seed: string): string {
  const palettes = [
    'linear-gradient(135deg, oklch(0.72 0.10 55), oklch(0.55 0.14 35))',
    'linear-gradient(135deg, oklch(0.70 0.08 160), oklch(0.48 0.10 175))',
    'linear-gradient(135deg, oklch(0.72 0.08 240), oklch(0.46 0.11 250))',
    'linear-gradient(135deg, oklch(0.75 0.08 70), oklch(0.50 0.13 50))',
    'linear-gradient(135deg, oklch(0.72 0.08 300), oklch(0.48 0.12 320))',
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}
