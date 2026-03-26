import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { Locatarios } from '@/pages/admin/Locatarios';
import { LocatarioDetail } from '@/pages/admin/LocatarioDetail';
import { RentasContratos } from '@/pages/admin/RentasContratos';
import { Alertas } from '@/pages/admin/Alertas';
import { Configuracion } from '@/pages/admin/Configuracion';
import { LocatarioDashboard } from '@/pages/locatario/Dashboard';
import { LocatarioContrato } from '@/pages/locatario/Contrato';
import { LocatarioVentas } from '@/pages/locatario/Ventas';

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/locatarios" element={<Locatarios />} />
            <Route path="/admin/locatarios/:id" element={<LocatarioDetail />} />
            <Route path="/admin/rentas" element={<RentasContratos />} />
            <Route path="/admin/alertas" element={<Alertas />} />
            <Route path="/admin/configuracion" element={<Configuracion />} />

            {/* Locatario routes */}
            <Route path="/locatario/dashboard" element={<LocatarioDashboard />} />
            <Route path="/locatario/contrato" element={<LocatarioContrato />} />
            <Route path="/locatario/ventas" element={<LocatarioVentas />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
