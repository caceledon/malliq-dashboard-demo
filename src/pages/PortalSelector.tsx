import { useNavigate } from 'react-router-dom';
import { Building2, Store, ArrowRight, ShieldCheck, UserCircle } from 'lucide-react';
import { useAppState } from '@/store/appState';

export function PortalSelector() {
  const navigate = useNavigate();
  const { state } = useAppState();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center page-enter sm:bg-[var(--main-bg)]">
      
      {/* Brand Header */}
      <div className="mb-12 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-500/40">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--fg)] md:text-5xl">
          {state.asset?.name || 'IQ Activo'}
        </h1>
        <p className="mt-3 max-w-md text-[var(--sidebar-fg)]">
          Selecciona el portal correspondiente a tu perfil de usuario para ingresar al dashboard de inteligencia.
        </p>
      </div>

      {/* Role Selection Blocks */}
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        
        {/* Admin Card */}
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="group relative flex flex-col items-start rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/20"
        >
          <div className="mb-6 rounded-2xl bg-blue-100 p-4 dark:bg-blue-900/30">
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-[var(--fg)]">
            Portal Administrador
          </h2>
          <p className="mb-8 text-sm text-[var(--sidebar-fg)]">
            Acceso completo para gestión de activos, rentas, contratos, cargas tributarias, reportes OCR y mapas de ocupación comerciales.
          </p>
          <div className="mt-auto flex w-full items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="font-semibold text-sm">Entrar como Operador</span>
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-2" />
          </div>
        </button>

        {/* Tenant Card */}
        <button
          onClick={() => navigate('/locatario/dashboard')}
          className="group relative flex flex-col items-start rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-900/20"
        >
          <div className="mb-6 rounded-2xl bg-emerald-100 p-4 dark:bg-emerald-900/30">
            <Store className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-[var(--fg)]">
            Portal Locatario
          </h2>
          <p className="mb-8 text-sm text-[var(--sidebar-fg)]">
            Acceso para los inquilinos y tiendas arrendatarias del activo. Revisa el estado de tus contratos, ventas reportadas y métricas mensuales.
          </p>
          <div className="mt-auto flex w-full items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="font-semibold text-sm">Entrar como Arrendatario</span>
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-2" />
          </div>
        </button>

      </div>

      {/* Footer Info */}
      <div className="mt-16 flex items-center gap-2 text-xs font-medium text-[var(--sidebar-fg)]">
        <UserCircle className="h-4 w-4" />
        Autenticación requerida post-selección en entorno cloud. Local-First Demo Enabled.
      </div>
    </div>
  );
}
