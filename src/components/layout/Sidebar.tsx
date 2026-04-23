import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bolt,
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
import type { PortfolioAssetSummary } from '@/lib/portfolio';

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
  const isAdmin = location.pathname.startsWith('/admin');
  const { state, insights, assetSummaries, activeAssetId, actions } = useAppState();

  const operationNav: NavDef[] = useMemo(
    () =>
      isAdmin
        ? [
            { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/admin/activos', label: 'Portafolio activos', icon: Map, tag: assetSummaries.length || null },
            { to: '/admin/locatarios', label: 'Locatarios', icon: Users, tag: insights.tenantSummaries.length || null },
            { to: '/admin/rentas', label: 'Rentas y contratos', icon: FileArchive },
            { to: '/admin/cargas', label: 'Carga de datos', icon: ReceiptText },
          ]
        : [
            { to: '/locatario/dashboard', label: 'Mi dashboard', icon: LayoutDashboard },
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
            { to: '/admin/planeacion', label: 'Presupuesto', icon: Database },
            { to: '/admin/ecosistema', label: 'Prospectos', icon: Store },
            { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
          ]
        : [],
    [isAdmin, insights.alerts.length],
  );

  const asset = state.asset;
  const userName = 'Christian Celedón';
  const userRole = 'Gerente de operación';
  const userInitials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

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
        style={{ background: 'var(--sidebar)', borderColor: 'var(--line)' }}
      >
        {/* Brand */}
        <div className="mq-brand">
          <div className="logo">
            <span className="mark">M</span>
            <span
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--umber)',
                boxShadow: '0 0 0 2px var(--sidebar)',
              }}
            />
          </div>
          <div>
            <div className="title">MallQ</div>
            <div className="sub">Retail Operations</div>
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

          <div className="mq-nav-section" style={{ marginTop: 14 }}>
            IA + Sync
          </div>
          <div className="mq-nav-item" style={{ cursor: 'default' }}>
            <Sparkles size={16} style={{ color: 'var(--umber)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
              <span style={{ fontSize: 12.5 }}>Autofill Moonshot</span>
              <span className="t-dim" style={{ fontSize: 10.5 }}>
                {state.documents.length} docs · kimi-k2.5
              </span>
            </div>
          </div>
          <SyncStatusRow />
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
            onClick={() => {
              setMobileOpen(false);
              window.location.href = '#/';
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
          <a
            href="#/admin/activos"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--ink-3)',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Gestionar activos
          </a>
        </div>
      ) : null}
    </div>
  );
}

function SyncStatusRow() {
  const { state } = useAppState();
  const syncEnabled = state.asset?.syncEnabled && !!state.asset?.backendUrl;
  if (!syncEnabled) {
    return (
      <div className="mq-nav-item" style={{ cursor: 'default' }}>
        <Plug2 size={16} style={{ color: 'var(--ink-4)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
          <span style={{ fontSize: 12.5 }}>Sync local</span>
          <span className="t-dim" style={{ fontSize: 10.5 }}>
            SQLite · sin remoto
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="mq-nav-item" style={{ cursor: 'default' }}>
      <span className="mq-dot ok" style={{ marginLeft: 2, marginRight: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span style={{ fontSize: 12.5 }}>Sync activo</span>
        <span className="t-dim" style={{ fontSize: 10.5 }}>
          <Bolt size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: -1 }} />
          Remoto · cada 15 s
        </span>
      </div>
    </div>
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
