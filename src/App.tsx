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

const Landing = lazy(() => import('@/pages/marketing/Landing').then((module) => ({ default: module.Landing })));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard').then((module) => ({ default: module.AdminDashboard })));
const Portafolio = lazy(() => import('@/pages/admin/Portafolio').then((module) => ({ default: module.Portafolio })));
const AssetDetail = lazy(() => import('@/pages/admin/AssetDetail').then((module) => ({ default: module.AssetDetail })));
const Locatarios = lazy(() => import('@/pages/admin/Locatarios').then((module) => ({ default: module.Locatarios })));
const LocatarioDetail = lazy(() => import('@/pages/admin/LocatarioDetail').then((module) => ({ default: module.LocatarioDetail })));
const RentasContratos = lazy(() => import('@/pages/admin/RentasContratos').then((module) => ({ default: module.RentasContratos })));
const CargasDatos = lazy(() => import('@/pages/admin/CargasDatos').then((module) => ({ default: module.CargasDatos })));
const Planeacion = lazy(() => import('@/pages/admin/Planeacion').then((module) => ({ default: module.Planeacion })));
const Ecosistema = lazy(() => import('@/pages/admin/Ecosistema').then((module) => ({ default: module.Ecosistema })));
const Alertas = lazy(() => import('@/pages/admin/Alertas').then((module) => ({ default: module.Alertas })));
const Configuracion = lazy(() => import('@/pages/admin/Configuracion').then((module) => ({ default: module.Configuracion })));
const Simulador = lazy(() => import('@/pages/admin/Simulador').then((module) => ({ default: module.Simulador })));
const Asistente = lazy(() => import('@/pages/admin/Asistente').then((module) => ({ default: module.Asistente })));
const DesignLab = lazy(() => import('@/pages/admin/DesignLab').then((module) => ({ default: module.DesignLab })));
const LocatarioDashboard = lazy(() => import('@/pages/locatario/Dashboard').then((module) => ({ default: module.LocatarioDashboard })));
const LocatarioContrato = lazy(() => import('@/pages/locatario/Contrato').then((module) => ({ default: module.LocatarioContrato })));
const LocatarioVentas = lazy(() => import('@/pages/locatario/Ventas').then((module) => ({ default: module.LocatarioVentas })));

// Marketing pages — public, no auth, no providers needed.
const Producto = lazy(() => import('@/pages/marketing/Producto').then((module) => ({ default: module.Producto })));
const Operadores = lazy(() => import('@/pages/marketing/Operadores').then((module) => ({ default: module.Operadores })));
const LocatariosInfo = lazy(() => import('@/pages/marketing/Locatarios').then((module) => ({ default: module.LocatariosInfo })));
const Pricing = lazy(() => import('@/pages/marketing/Pricing').then((module) => ({ default: module.Pricing })));
const Manifiesto = lazy(() => import('@/pages/marketing/Manifiesto').then((module) => ({ default: module.Manifiesto })));
const Demo = lazy(() => import('@/pages/marketing/Demo').then((module) => ({ default: module.Demo })));

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

function withMarketingSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="mk mk-page cream" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <div className="mk-eyebrow">Cargando…</div>
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

/** Wraps the authed app routes in providers + AuthGate. */
function AppShell({ apiBase, children }: { apiBase: string; children: ReactNode }) {
  return (
    <AuthGate apiBase={apiBase}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <AppStateProvider>
              <UndoToastProvider>
                <ActiveAssetThemeSync />
                {children}
              </UndoToastProvider>
            </AppStateProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </AuthGate>
  );
}

function App() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
  return (
    <HashRouter>
      <Routes>
        {/* Public marketing site — no auth, no providers */}
        <Route path="/" element={withMarketingSuspense(<Landing />)} />
        <Route path="/producto" element={withMarketingSuspense(<Producto />)} />
        <Route path="/operadores" element={withMarketingSuspense(<Operadores />)} />
        <Route path="/locatarios-info" element={withMarketingSuspense(<LocatariosInfo />)} />
        <Route path="/pricing" element={withMarketingSuspense(<Pricing />)} />
        <Route path="/manifiesto" element={withMarketingSuspense(<Manifiesto />)} />
        <Route path="/demo" element={withMarketingSuspense(<Demo />)} />

        {/* Login — needs the auth provider stack so getAuthUser() works */}
        <Route
          path="/login"
          element={
            <AppShell apiBase={apiBase}>
              <PortalSelector />
            </AppShell>
          }
        />

        {/* Admin app */}
        <Route
          path="/admin/*"
          element={
            <AppShell apiBase={apiBase}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="dashboard" element={<AdminOnly>{withSuspense(<AdminDashboard />)}</AdminOnly>} />
                  <Route path="activos" element={<AdminOnly>{withSuspense(<Portafolio />)}</AdminOnly>} />
                  <Route path="activos/:id" element={<AdminOnly>{withSuspense(<AssetDetail />)}</AdminOnly>} />
                  <Route path="locatarios" element={<AdminOnly>{withSuspense(<Locatarios />)}</AdminOnly>} />
                  <Route path="locatarios/:id" element={<AdminOnly>{withSuspense(<LocatarioDetail />)}</AdminOnly>} />
                  <Route path="rentas" element={<AdminOnly>{withSuspense(<RentasContratos />)}</AdminOnly>} />
                  <Route path="cargas" element={<AdminOnly>{withSuspense(<CargasDatos />)}</AdminOnly>} />
                  <Route path="planeacion" element={<AdminOnly>{withSuspense(<Planeacion />)}</AdminOnly>} />
                  <Route path="ecosistema" element={<AdminOnly>{withSuspense(<Ecosistema />)}</AdminOnly>} />
                  <Route path="alertas" element={<AdminOnly>{withSuspense(<Alertas />)}</AdminOnly>} />
                  <Route path="configuracion" element={<AdminOnly>{withSuspense(<Configuracion />)}</AdminOnly>} />
                  <Route path="simulador" element={<AdminOnly>{withSuspense(<Simulador />)}</AdminOnly>} />
                  <Route path="asistente" element={<AdminOnly>{withSuspense(<Asistente />)}</AdminOnly>} />
                  <Route path="design-lab" element={<AdminOnly>{withSuspense(<DesignLab />)}</AdminOnly>} />
                </Route>
              </Routes>
            </AppShell>
          }
        />

        {/* Locatario app */}
        <Route
          path="/locatario/*"
          element={
            <AppShell apiBase={apiBase}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="dashboard" element={<LocatarioOnly>{withSuspense(<LocatarioDashboard />)}</LocatarioOnly>} />
                  <Route path="contrato" element={<LocatarioOnly>{withSuspense(<LocatarioContrato />)}</LocatarioOnly>} />
                  <Route path="ventas" element={<LocatarioOnly>{withSuspense(<LocatarioVentas />)}</LocatarioOnly>} />
                </Route>
              </Routes>
            </AppShell>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
