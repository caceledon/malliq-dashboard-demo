import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { GatewayStatus } from '@/components/GatewayStatus';
import { SetupWizard } from '@/components/app/SetupWizard';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette, type CommandItem } from '@/components/CommandPalette';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAppState } from '@/store/appState';

function useCommandItems(onClose: () => void): CommandItem[] {
  const navigate = useNavigate();
  const { state, assetSummaries, insights, actions } = useAppState();

  return useMemo(() => {
    const items: CommandItem[] = [];

    const go = (to: string) => () => {
      navigate(to);
      onClose();
    };

    items.push(
      { id: 'nav:dashboard', grupo: 'Navegación', titulo: 'Ir al dashboard', atajo: 'g d', onEjecutar: go('/admin/dashboard') },
      { id: 'nav:activos', grupo: 'Navegación', titulo: 'Ir al portafolio de activos', atajo: 'g p', onEjecutar: go('/admin/activos') },
      { id: 'nav:locatarios', grupo: 'Navegación', titulo: 'Ir a locatarios', atajo: 'g l', onEjecutar: go('/admin/locatarios') },
      { id: 'nav:rentas', grupo: 'Navegación', titulo: 'Ir a rentas y contratos', atajo: 'g r', onEjecutar: go('/admin/rentas') },
      { id: 'nav:cargas', grupo: 'Navegación', titulo: 'Ir a carga de datos', onEjecutar: go('/admin/cargas') },
      { id: 'nav:alertas', grupo: 'Navegación', titulo: 'Ir a alertas', atajo: 'g a', onEjecutar: go('/admin/alertas') },
      { id: 'nav:config', grupo: 'Navegación', titulo: 'Ir a configuración', onEjecutar: go('/admin/configuracion') },
    );

    items.push(
      { id: 'action:export', grupo: 'Acciones', titulo: 'Exportar backup de activo', onEjecutar: async () => { try { await actions.exportBackup(); } catch { /* ignore */ } onClose(); } },
      { id: 'action:export-portfolio', grupo: 'Acciones', titulo: 'Exportar backup de portafolio', onEjecutar: async () => { try { await actions.exportPortfolioBackup(); } catch { /* ignore */ } onClose(); } },
      { id: 'action:print', grupo: 'Acciones', titulo: 'Imprimir vista actual (PDF)', onEjecutar: () => { window.print(); onClose(); } },
    );

    for (const asset of assetSummaries) {
      items.push({
        id: `asset:${asset.id}`,
        grupo: 'Activos',
        titulo: asset.name,
        subtitulo: asset.city ?? undefined,
        onEjecutar: () => {
          actions.switchAsset(asset.id);
          navigate('/admin/dashboard');
          onClose();
        },
      });
    }

    for (const tenant of insights.tenantSummaries) {
      items.push({
        id: `tenant:${tenant.id}`,
        grupo: 'Locatarios',
        titulo: tenant.storeName,
        subtitulo: `${tenant.category}${tenant.localCodes.length ? ` · ${tenant.localCodes.join(', ')}` : ''}`,
        onEjecutar: go(`/admin/locatarios/${tenant.id}`),
      });
    }

    for (const contract of state.contracts) {
      items.push({
        id: `contract:${contract.id}`,
        grupo: 'Contratos',
        titulo: contract.storeName,
        subtitulo: `Contrato · ${contract.startDate} → ${contract.endDate}`,
        onEjecutar: go('/admin/rentas'),
      });
    }

    for (const alert of insights.alerts) {
      items.push({
        id: `alert:${alert.id}`,
        grupo: 'Alertas',
        titulo: alert.title,
        subtitulo: alert.description,
        onEjecutar: go('/admin/alertas'),
      });
    }

    return items;
  }, [navigate, state.contracts, assetSummaries, insights.tenantSummaries, insights.alerts, actions, onClose]);
}

function AppLayoutInner({
  paletteOpen,
  openPalette,
  closePalette,
}: {
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, insights } = useAppState();
  const items = useCommandItems(closePalette);
  const { helpOpen, setHelpOpen, shortcuts } = useKeyboardShortcuts();

  // Track which asset the operator dismissed the SetupWizard for. This is
  // session-only (no persistence) so a reload restores the wizard if setup
  // is still incomplete. Switching assets resets the dismissal automatically
  // since the dismissed-for id no longer matches the active id.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const activeAssetId = state.asset?.id ?? null;
  const wizardDismissed = dismissedFor !== null && dismissedFor === activeAssetId;
  const showWizard = !insights.isSetupComplete && !wizardDismissed;
  const showReopenChip = !insights.isSetupComplete && wizardDismissed;

  return (
    <div className="relative flex min-h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} onOpenCommandPalette={openPalette} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1440px]">
            {/* App.tsx already wraps every route in <Suspense> with a
                PageSkeleton fallback for lazy-loaded pages. We don't need
                a forced-delay loader on top of that. */}
            <Outlet />
          </div>
        </main>
      </div>

      <GatewayStatus />
      {showWizard ? <SetupWizard onDismiss={() => setDismissedFor(activeAssetId)} /> : null}
      {showReopenChip ? (
        <button
          type="button"
          onClick={() => setDismissedFor(null)}
          title="Reabrir configuración inicial"
          className="fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 shadow-lg transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Completa la configuración
        </button>
      ) : null}
      <CommandPalette open={paletteOpen} onClose={closePalette} items={items} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </div>
  );
}

export function AppLayout() {
  const { open, setOpen } = useCommandPalette();
  const openPalette = () => setOpen(true);
  const closePalette = () => setOpen(false);
  return <AppLayoutInner paletteOpen={open} openPalette={openPalette} closePalette={closePalette} />;
}
