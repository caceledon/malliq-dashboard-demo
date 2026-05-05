import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowRight, Zap, ShieldCheck, Globe, Store } from 'lucide-react';

export function PortalSelector() {
  const navigate = useNavigate();

  const handleSelect = (role: 'admin' | 'locatario') => {
    navigate(role === 'admin' ? '/admin/dashboard' : '/locatario/dashboard');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0C10] font-sans text-white">
      {/* Abstract Background with CSS Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[10%] -left-[5%] h-[60%] w-[60%] rounded-full bg-orange-600/15 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[70%] w-[70%] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_0%,rgba(10,12,16,1)_100%)]" />
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* LOGO SECTION */}
        <div className="mb-20 flex flex-col items-center text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 rounded-[32px] bg-orange-500 blur-2xl opacity-20 animate-pulse" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white p-1 shadow-2xl ring-1 ring-white/20">
              <div className="h-full w-full rounded-[24px] bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center shadow-inner">
                <Zap size={40} fill="white" className="text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter sm:text-7xl">
            MALL<span className="bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-transparent">IQ</span>
          </h1>
          <div className="mt-4 flex items-center gap-3">
             <div className="h-px w-8 bg-orange-500/30" />
             <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500/80">Nano Banana 2.0</p>
             <div className="h-px w-8 bg-orange-500/30" />
          </div>
        </div>

        <div className="grid w-full max-w-5xl gap-10 sm:grid-cols-2">
          {/* ADMIN PORTAL */}
          <button
            onClick={() => handleSelect('admin')}
            className="group relative flex flex-col overflow-hidden rounded-[48px] border border-white/10 bg-white/[0.03] p-10 text-left transition-all duration-500 hover:border-orange-500/40 hover:bg-white/[0.06] hover:shadow-[0_20px_100px_rgba(249,115,22,0.15)] hover:-translate-y-2"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[24px] bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30 shadow-xl group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
              <LayoutDashboard size={36} />
            </div>

            <h2 className="mb-4 text-4xl font-bold tracking-tight">Administración</h2>
            <p className="mb-10 text-xl leading-relaxed text-slate-400/90 font-medium">
              Gestión estratégica del portafolio, análisis de KPIs operativos y auditoría de contratos inteligente.
            </p>

            <div className="mt-auto flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-orange-500">
              Ingresar <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
            </div>

            <span className="absolute -bottom-12 -right-12 text-[220px] font-black text-white/[0.02] select-none pointer-events-none">01</span>
          </button>

          {/* TENANT PORTAL */}
          <button
            onClick={() => handleSelect('locatario')}
            className="group relative flex flex-col overflow-hidden rounded-[48px] border border-white/10 bg-white/[0.03] p-10 text-left transition-all duration-500 hover:border-blue-500/40 hover:bg-white/[0.06] hover:shadow-[0_20px_100px_rgba(59,130,246,0.15)] hover:-translate-y-2"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 shadow-xl group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
              <Store size={36} />
            </div>

            <h2 className="mb-4 text-4xl font-bold tracking-tight">Locatario</h2>
            <p className="mb-10 text-xl leading-relaxed text-slate-400/90 font-medium">
              Portal de gestión para tiendas. Reporte de ventas POS, estado de cuenta y métricas de desempeño comercial.
            </p>

            <div className="mt-auto flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-blue-500">
              Ingresar <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
            </div>

             <span className="absolute -bottom-12 -right-12 text-[220px] font-black text-white/[0.02] select-none pointer-events-none">02</span>
          </button>
        </div>

        <footer className="mt-24 flex flex-wrap justify-center gap-x-16 gap-y-8 text-slate-500/60 font-bold uppercase tracking-[0.15em] text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-orange-500/40" /> Enterprise Grade Security
          </div>
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-orange-500/40" /> Real-time Analytics
          </div>
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-orange-500/40" /> Global Operations
          </div>
        </footer>
      </div>
    </div>
  );
}
