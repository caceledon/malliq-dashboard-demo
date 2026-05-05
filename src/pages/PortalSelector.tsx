import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight, ShieldCheck, LayoutDashboard, Database, Sparkles } from 'lucide-react';
import { useAppState } from '@/store/appState';
import logoNano from '@/assets/nano_banana/logo.png';
import photo1 from '@/assets/nano_banana/photo1.png';
import photo2 from '@/assets/nano_banana/photo2.png';

export function PortalSelector() {
  const navigate = useNavigate();
  const { authUser } = useAppState();

  useEffect(() => {
    if (authUser?.role === 'locatario') {
      navigate('/locatario/dashboard', { replace: true });
    }
  }, [authUser?.role, navigate]);

  if (authUser?.role === 'locatario') {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center page-enter">
      
      {/* Decorative backdrop elements */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center">
        {/* Brand Header */}
        <div className="mb-16 flex flex-col items-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-white p-2 shadow-2xl shadow-orange-500/20 ring-1 ring-orange-500/10 transition-transform duration-500 hover:scale-110">
            <img src={logoNano} alt="MallQ" className="h-full w-full rounded-[24px] object-cover" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-[var(--fg)] md:text-7xl">
            Mall<span className="text-orange-500">Q</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg font-medium text-[var(--sidebar-fg)] opacity-80">
            Plataforma Inteligente de Gestión y Analítica para Activos Comerciales
          </p>
        </div>

        {/* Role Selection Blocks */}
        <div className="grid w-full gap-8 md:grid-cols-2">
          
          {/* Admin Card */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="group relative flex flex-col overflow-hidden rounded-[40px] border border-white/20 bg-white/40 p-8 text-left backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/60 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:bg-black/20 dark:hover:bg-black/30"
          >
            <div className="absolute inset-0 z-0 opacity-10 transition-opacity duration-500 group-hover:opacity-20">
              <img src={photo1} alt="" className="h-full w-full object-cover grayscale" />
            </div>
            
            <div className="relative z-10">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/40">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--fg)]">
                Administración
              </h2>
              <p className="mb-8 text-base leading-relaxed text-[var(--sidebar-fg)]">
                Control total del portafolio, auditoría de contratos con IA, mapas de calor de ventas y planeación estratégica financiera.
              </p>
              <div className="flex items-center gap-3 font-bold text-orange-600 dark:text-orange-400">
                <span>Acceder al Panel</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 transition-transform duration-300 group-hover:translate-x-2">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </button>

          {/* Tenant Card */}
          <button
            onClick={() => navigate('/locatario/dashboard')}
            className="group relative flex flex-col overflow-hidden rounded-[40px] border border-white/20 bg-white/40 p-8 text-left backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/60 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:bg-black/20 dark:hover:bg-black/30"
          >
            <div className="absolute inset-0 z-0 opacity-10 transition-opacity duration-500 group-hover:opacity-20">
              <img src={photo2} alt="" className="h-full w-full object-cover grayscale" />
            </div>

            <div className="relative z-10">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/40">
                <Store className="h-7 w-7" />
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--fg)]">
                Locatarios
              </h2>
              <p className="mb-8 text-base leading-relaxed text-[var(--sidebar-fg)]">
                Portal exclusivo para tiendas. Reporte de ventas POS, estado de cuenta, documentos contractuales y métricas de desempeño.
              </p>
              <div className="flex items-center gap-3 font-bold text-blue-600 dark:text-blue-400">
                <span>Acceder como Tienda</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 transition-transform duration-300 group-hover:translate-x-2">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </button>

        </div>

        {/* Footer Info */}
        <div className="mt-20 flex flex-wrap justify-center gap-x-12 gap-y-4 font-bold uppercase tracking-widest text-[var(--sidebar-fg)] opacity-40">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard V4</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>AI Powered</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Real-time Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
