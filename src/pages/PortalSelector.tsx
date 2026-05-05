import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowRight, Zap, ShieldCheck, Globe, Store } from 'lucide-react';

export function PortalSelector() {
  const navigate = useNavigate();

  const handleSelect = (role: 'admin' | 'locatario') => {
    navigate(role === 'admin' ? '/admin/dashboard' : '/locatario/dashboard');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--paper)] font-sans text-[var(--ink-1)]">
      {/* Soft Background Gradients for depth */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[10%] -left-[5%] h-[60%] w-[60%] rounded-full bg-orange-100/50 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[70%] w-[70%] rounded-full bg-blue-50/50 blur-[150px]" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(var(--ink-1) 1px, transparent 1px), linear-gradient(90deg, var(--ink-1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* LOGO SECTION */}
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 rounded-[28px] bg-orange-500 blur-xl opacity-10" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-xl ring-1 ring-black/[0.05]">
              <div className="h-full w-full rounded-[22px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-inner">
                <Zap size={32} fill="white" className="text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter sm:text-6xl text-[var(--ink-1)]">
            MALL<span className="text-orange-600">IQ</span>
          </h1>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.4em] text-[var(--ink-3)]">
            Operational Intelligence
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-8 sm:grid-cols-2">
          {/* ADMIN PORTAL */}
          <button
            onClick={() => handleSelect('admin')}
            className="group relative flex flex-col overflow-hidden rounded-[32px] border border-[var(--line)] bg-white p-10 text-left transition-all duration-300 hover:border-orange-500/30 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[20px] bg-orange-50 text-orange-600 ring-1 ring-orange-200/50 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
              <LayoutDashboard size={28} />
            </div>

            <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--ink-1)]">Administración</h2>
            <p className="mb-8 text-lg leading-relaxed text-[var(--ink-3)]">
              Análisis de KPIs, gestión de activos y supervisión estratégica de contratos.
            </p>

            <div className="mt-auto flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
              Ingresar <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* TENANT PORTAL */}
          <button
            onClick={() => handleSelect('locatario')}
            className="group relative flex flex-col overflow-hidden rounded-[32px] border border-[var(--line)] bg-white p-10 text-left transition-all duration-300 hover:border-blue-500/30 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[20px] bg-blue-50 text-blue-600 ring-1 ring-blue-200/50 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Store size={28} />
            </div>

            <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--ink-1)]">Locatario</h2>
            <p className="mb-8 text-lg leading-relaxed text-[var(--ink-3)]">
              Acceso a reportes de ventas, facturación y métricas de desempeño por local.
            </p>

            <div className="mt-auto flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Ingresar <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        <footer className="mt-20 flex flex-wrap justify-center gap-x-12 gap-y-6 text-[var(--ink-4)] font-bold uppercase tracking-[0.1em] text-[10px]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} /> Secure Access
          </div>
          <div className="flex items-center gap-2">
            <Zap size={14} /> Intelligence
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} /> Analytics
          </div>
        </footer>
      </div>
    </div>
  );
}
