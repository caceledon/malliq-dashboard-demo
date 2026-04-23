import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GatewayStatus } from '@/components/GatewayStatus';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { SetupWizard } from '@/components/app/SetupWizard';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette, type CommandItem } from '@/components/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { insights } = useAppState();
  const items = useCommandItems(closePalette);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} onOpenCommandPalette={openPalette} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1440px]">
            <SkeletonLoader key={location.pathname}>
              <Outlet />
            </SkeletonLoader>
          </div>
        </main>
      </div>

      <GatewayStatus />
      {!insights.isSetupComplete ? <SetupWizard /> : null}
      <CommandPalette open={paletteOpen} onClose={closePalette} items={items} />
    </div>
  );
}

export function AppLayout() {
  const { open, setOpen } = useCommandPalette();
  const openPalette = () => setOpen(true);
  const closePalette = () => setOpen(false);
  return <AppLayoutInner paletteOpen={open} openPalette={openPalette} closePalette={closePalette} />;
}
