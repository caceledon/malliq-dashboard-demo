import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastProvider } from '@/components/Toast';
import { UndoToastProvider } from '@/components/UndoToast';
import { AuthGate } from '@/components/AuthGate';
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
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (state.asset?.themePreference && state.asset.themePreference !== theme) {
      setTheme(state.asset.themePreference);
    }
  }, [state.asset?.id, state.asset?.themePreference, theme, setTheme]);

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
                  <Route path="/admin/dashboard" element={withSuspense(<AdminDashboard />)} />
                  <Route path="/admin/activos" element={withSuspense(<Portafolio />)} />
                  <Route path="/admin/locatarios" element={withSuspense(<Locatarios />)} />
                  <Route path="/admin/locatarios/:id" element={withSuspense(<LocatarioDetail />)} />
                  <Route path="/admin/rentas" element={withSuspense(<RentasContratos />)} />
                  <Route path="/admin/cargas" element={withSuspense(<CargasDatos />)} />
                  <Route path="/admin/planeacion" element={withSuspense(<Planeacion />)} />
                  <Route path="/admin/ecosistema" element={withSuspense(<Ecosistema />)} />
                  <Route path="/admin/alertas" element={withSuspense(<Alertas />)} />
                  <Route path="/admin/configuracion" element={withSuspense(<Configuracion />)} />

                  <Route path="/locatario/dashboard" element={withSuspense(<LocatarioDashboard />)} />
                  <Route path="/locatario/contrato" element={withSuspense(<LocatarioContrato />)} />
                  <Route path="/locatario/ventas" element={withSuspense(<LocatarioVentas />)} />
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
