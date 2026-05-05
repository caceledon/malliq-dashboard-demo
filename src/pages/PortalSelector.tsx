import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles, Store, Truck } from 'lucide-react';
import { useAppState } from '@/store/appState';

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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
      }}
    >
      {/* Left — editorial brand panel */}
      <aside
        style={{
          position: 'relative',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(620px 420px at 12% 8%, color-mix(in oklab, var(--mint-soft) 80%, transparent), transparent 60%),' +
            'radial-gradient(540px 380px at 110% 110%, color-mix(in oklab, var(--violet-soft) 75%, transparent), transparent 60%),' +
            'var(--bg-deep)',
          borderRight: '1px solid var(--hairline)',
          overflow: 'hidden',
        }}
      >
        {/* brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background:
                'conic-gradient(from 220deg at 50% 50%, var(--mint-deep), var(--violet-deep), var(--amber), var(--mint-deep))',
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 5,
                borderRadius: 8,
                background: 'var(--surface)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--ink-1)',
              }}
            >
              M
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink-1)' }}>
            Mall<i style={{ fontStyle: 'italic' }}>iq</i>
          </div>
        </div>

        {/* headline */}
        <div style={{ maxWidth: 560 }}>
          <div className="mq-h-eyebrow" style={{ marginBottom: 18 }}>
            Operations OS · v3
          </div>
          <h1
            className="mq-h1"
            style={{
              fontSize: 'clamp(48px, 5.4vw, 76px)',
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            Operar un mall
            <br />
            <i style={{ fontStyle: 'italic', color: 'var(--violet-deep)' }}>sin perderse</i>
            <br />
            en planillas.
          </h1>
          <p style={{ marginTop: 24, fontSize: 16, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 480 }}>
            Cockpit editorial para administradores y locatarios. Salud por semáforo, mapa del mall, autofill de
            contratos y un asistente que entiende tu portafolio.
          </p>
        </div>

        {/* footer marks */}
        <div
          style={{
            display: 'flex',
            gap: 28,
            color: 'var(--ink-4)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontWeight: 600,
          }}
        >
          <span>Auditoría · Salud · Renta</span>
          <span>Real-time sync</span>
          <span>AI · violet</span>
        </div>
      </aside>

      {/* Right — portal selection + login form */}
      <main style={{ padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
        <div>
          <div className="mq-h-eyebrow" style={{ marginBottom: 8 }}>
            Bienvenido
          </div>
          <h2 className="mq-h2" style={{ margin: 0 }}>
            Elige tu portal
          </h2>
          <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 460 }}>
            Cada perfil ve solo lo suyo. Los administradores manejan el portafolio; los locatarios entran a su
            propio dashboard.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <PortalCard
            tone="mint"
            Icon={ShieldCheck}
            title="Administración"
            sub="Cockpit editorial · auditoría de contratos · salud del portafolio"
            badge="Recomendado"
            onClick={() => navigate('/admin/dashboard')}
          />
          <PortalCard
            tone="violet"
            Icon={Store}
            title="Locatario"
            sub="Reporte de ventas · estado de cuenta · documentos"
            onClick={() => navigate('/locatario/dashboard')}
          />
          <PortalCard
            tone="amber"
            Icon={Truck}
            title="Proveedor"
            sub="Próximamente · órdenes de servicio y facturación"
            disabled
          />
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 14,
            background: 'var(--surface-2)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            color: 'var(--ink-3)',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--violet)' }} />
          ¿Sin cuenta? Pide acceso al administrador del activo. La configuración inicial se hace desde el portal de
          Administración.
        </div>
      </main>
    </div>
  );
}

function PortalCard({
  tone,
  Icon,
  title,
  sub,
  badge,
  onClick,
  disabled,
}: {
  tone: 'mint' | 'violet' | 'amber';
  Icon: typeof ShieldCheck;
  title: string;
  sub: string;
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ring: Record<string, string> = {
    mint: 'var(--mint)',
    violet: 'var(--violet)',
    amber: 'var(--amber)',
  };
  const soft: Record<string, string> = {
    mint: 'var(--mint-soft)',
    violet: 'var(--violet-soft)',
    amber: 'var(--amber-soft)',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: 18,
        borderRadius: 18,
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = ring[tone];
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: soft[tone],
          color: ring[tone],
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink-1)' }}>{title}</span>
          {badge ? <span className="mq-pill mint">{badge}</span> : null}
        </span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</span>
      </span>
      <ArrowRight size={20} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
    </button>
  );
}
