import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GatewayStatus } from '@/components/GatewayStatus';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { SetupWizard } from '@/components/app/SetupWizard';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppState } from '@/store/appState';

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { insights } = useAppState();

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1680px]">
            <SkeletonLoader key={location.pathname}>
              <Outlet />
            </SkeletonLoader>
          </div>
        </main>
      </div>

      <GatewayStatus />
      {!insights.isSetupComplete ? <SetupWizard /> : null}
    </div>
  );
}
