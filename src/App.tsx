import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastProvider } from '@/components/Toast';
import { UndoToastProvider } from '@/components/UndoToast';
import { AuthGate } from '@/components/AuthGate';
import { AdminOnly, LocatarioOnly } from '@/components/RoleGuards';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { CurrencyProvider } from '@/lib/currency';
import { AppStateProvider, useAppState } from '@/store/appState';
import { NotFound } from '@/pages/NotFound';
import { PortalSelector } from '@/pages/PortalSelector';

const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard').then((module) => ({ default: module.AdminDashboard })));
const Portafolio = lazy(() => import('@/pages/admin/Portafolio').then((module) => ({ default: module.Portafolio })));
const Locatarios = lazy(() => import('@/pages/admin/Locatarios').then((module) => ({ default: module.Locatarios })));
const LocatarioDetail = lazy(() => import('@/pages/admin/LocatarioDetail').then((module) => ({ default: module.LocatarioDetail })));
const RentasContratos = lazy(() => import('@/pages/admin/RentasContratos').then((module) => ({ default: module.RentasContratos })));
const CargasDatos = lazy(() => import('@/pages/admin/CargasDatos').then((module) => ({ default: module.CargasDatos })));
const Planeacion = lazy(() => import('@/pages/admin/Planeacion').then((module) => ({ default: module.Planeacion })));
const Ecosistema = lazy(() => import('@/pages/admin/Ecosistema').then((module) => ({ default: module.Ecosistema })));
const Alertas = lazy(() => import('@/pages/admin/Alertas').then((module) => ({ default: module.Alertas })));
const Configuracion = lazy(() => import('@/pages/admin/Configuracion').then((module) => ({ default: module.Configuracion })));
const Simulador = lazy(() => import('@/pages/admin/Simulador').then((module) => ({ default: module.Simulador })));
const LocatarioDashboard = lazy(() => import('@/pages/locatario/Dashboard').then((module) => ({ default: module.LocatarioDashboard })));
const LocatarioContrato = lazy(() => import('@/pages/locatario/Contrato').then((module) => ({ default: module.LocatarioContrato })));
const LocatarioVentas = lazy(() => import('@/pages/locatario/Ventas').then((module) => ({ default: module.LocatarioVentas })));

function withSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="glass-card p-6 text-sm text-[var(--sidebar-fg)]">Cargando módulo…</div>
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

function ActiveAssetThemeSync() {
  const { state } = useAppState();
  const { mode, setTheme } = useTheme();

  useEffect(() => {
    if (state.asset?.themePreference && state.asset.themePreference !== mode) {
      setTheme(state.asset.themePreference);
    }
  }, [state.asset?.id, state.asset?.themePreference, mode, setTheme]);

  return null;
}

function App() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
  return (
    <AuthGate apiBase={apiBase}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <AppStateProvider>
              <UndoToastProvider>
                <HashRouter>
              <ActiveAssetThemeSync />
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/admin/dashboard" element={<AdminOnly>{withSuspense(<AdminDashboard />)}</AdminOnly>} />
                  <Route path="/admin/activos" element={<AdminOnly>{withSuspense(<Portafolio />)}</AdminOnly>} />
                  <Route path="/admin/locatarios" element={<AdminOnly>{withSuspense(<Locatarios />)}</AdminOnly>} />
                  <Route path="/admin/locatarios/:id" element={<AdminOnly>{withSuspense(<LocatarioDetail />)}</AdminOnly>} />
                  <Route path="/admin/rentas" element={<AdminOnly>{withSuspense(<RentasContratos />)}</AdminOnly>} />
                  <Route path="/admin/cargas" element={<AdminOnly>{withSuspense(<CargasDatos />)}</AdminOnly>} />
                  <Route path="/admin/planeacion" element={<AdminOnly>{withSuspense(<Planeacion />)}</AdminOnly>} />
                  <Route path="/admin/ecosistema" element={<AdminOnly>{withSuspense(<Ecosistema />)}</AdminOnly>} />
                  <Route path="/admin/alertas" element={<AdminOnly>{withSuspense(<Alertas />)}</AdminOnly>} />
                  <Route path="/admin/configuracion" element={<AdminOnly>{withSuspense(<Configuracion />)}</AdminOnly>} />
                  <Route path="/admin/simulador" element={<AdminOnly>{withSuspense(<Simulador />)}</AdminOnly>} />

                  <Route path="/locatario/dashboard" element={<LocatarioOnly>{withSuspense(<LocatarioDashboard />)}</LocatarioOnly>} />
                  <Route path="/locatario/contrato" element={<LocatarioOnly>{withSuspense(<LocatarioContrato />)}</LocatarioOnly>} />
                  <Route path="/locatario/ventas" element={<LocatarioOnly>{withSuspense(<LocatarioVentas />)}</LocatarioOnly>} />
                </Route>

                {/* Standalone Views without Sidebar */}
                <Route path="/" element={<PortalSelector />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
                </HashRouter>
              </UndoToastProvider>
            </AppStateProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </AuthGate>
  );
}

export default App;
