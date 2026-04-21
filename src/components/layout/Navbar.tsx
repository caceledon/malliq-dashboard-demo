import { Menu, Moon, Sun, Building2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { useTheme } from '@/lib/theme';
import { useCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/appState';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, ufValue, setUfValue } = useCurrency();
  const { state, assetSummaries, activeAssetId, actions } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <nav
      className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border-color)] px-4 md:px-8"
      style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(14px)' }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} title="Menú" className="rounded-lg p-2 transition-colors hover:bg-[var(--hover-bg)] md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-2">
          <div className="rounded-full bg-white p-1.5 shadow-sm dark:bg-slate-900">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          {assetSummaries.length > 1 ? (
            <label className="leading-tight">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--sidebar-fg)]">Activo</span>
              <select
                value={activeAssetId ?? ''}
                onChange={(event) => actions.switchAsset(event.target.value)}
                className="bg-transparent text-sm font-semibold outline-none"
              >
                {assetSummaries.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--sidebar-fg)]">Activo</p>
              <p className="text-sm font-semibold">{state.asset?.name ?? 'Configura tu activo'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isAdmin ? (
          <button
            onClick={() => navigate('/admin/activos')}
            className="hidden rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold transition-colors hover:bg-[var(--hover-bg)] lg:block"
          >
            {assetSummaries.length > 1 ? `${assetSummaries.length} activos` : 'Portafolio'}
          </button>
        ) : null}
        <div className="flex items-center rounded-full bg-[var(--hover-bg)] p-0.5">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              isAdmin ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--sidebar-fg)]',
            )}
          >
            Admin
          </button>
          <button
            onClick={() => navigate('/locatario/dashboard')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              !isAdmin ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--sidebar-fg)]',
            )}
          >
            Locatario
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'UF' | 'CLP')}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-xs font-semibold outline-none"
          >
            <option value="CLP">CLP</option>
            <option value="UF">UF</option>
          </select>
          {currency === 'UF' ? (
            <input
              type="number"
              value={ufValue}
              onChange={(e) => setUfValue(Number(e.target.value))}
              className="w-20 rounded-lg border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-xs outline-none"
              title="Valor UF"
            />
          ) : null}
        </div>

        <button
          onClick={() => {
            setTheme(nextTheme);
            if (state.asset) {
              actions.updateAssetSettings({ themePreference: nextTheme });
            }
          }}
          className="rounded-lg p-2 transition-colors hover:bg-[var(--hover-bg)]"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        <NotificationDrawer />
      </div>
    </nav>
  );
}
