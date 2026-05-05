import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import miniLogoUrl from '@/assets/mini logo.png';
import wordmarkUrl from '@/assets/logo white.png';

type NavKey = 'product' | 'operators' | 'tenants' | 'pricing' | 'about';

const NAV_LINKS: { id: NavKey; label: string; to: string }[] = [
  { id: 'product', label: 'Producto', to: '/producto' },
  { id: 'operators', label: 'Para operadores', to: '/operadores' },
  { id: 'tenants', label: 'Para locatarios', to: '/locatarios-info' },
  { id: 'pricing', label: 'Precios', to: '/pricing' },
  { id: 'about', label: 'Manifiesto', to: '/manifiesto' },
];

export function MkLogo({ size = 'md', monoOnly = false }: { size?: 'sm' | 'md' | 'lg'; monoOnly?: boolean }) {
  const markH = size === 'sm' ? 26 : size === 'lg' ? 44 : 32;
  const wordH = size === 'sm' ? 22 : size === 'lg' ? 40 : 28;
  return (
    <Link to="/" className="mk-logo" aria-label="MallIQ">
      <img src={miniLogoUrl} alt="" style={{ height: markH, width: 'auto', display: 'block' }} />
      {!monoOnly ? (
        <img
          src={wordmarkUrl}
          alt="MallIQ"
          style={{ height: wordH, width: 'auto', display: 'block', marginLeft: 4 }}
        />
      ) : null}
    </Link>
  );
}

export function MkHeader({ active }: { active?: NavKey | '' }) {
  return (
    <header className="mk-nav">
      <div className="mk-container mk-nav-row">
        <MkLogo />
        <nav className="mk-nav-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.id} to={l.to} className={`mk-nav-link${active === l.id ? ' active' : ''}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mk-nav-links" style={{ gap: 12 }}>
          <Link className="mk-btn ghost sm" to="/login">
            Iniciar sesión
          </Link>
          <Link className="mk-btn mint sm" to="/demo">
            Solicitar demo <span className="arr">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MkFooter() {
  return (
    <footer className="mk-foot">
      <div className="mk-container">
        <div className="mk-foot-grid">
          <div>
            <MkLogo size="lg" />
            <p className="mk-body" style={{ marginTop: 18, maxWidth: '34ch' }}>
              El cerebro digital de los centros comerciales. Inteligencia operativa para portafolios premium en
              Latinoamérica.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <span className="mk-tag">
                <span className="dot" />
                Operando · CDMX · Bogotá · Lima
              </span>
            </div>
          </div>
          <div>
            <h5>Producto</h5>
            <ul>
              <li>
                <Link to="/producto">Cockpit de portafolio</Link>
              </li>
              <li>
                <Link to="/producto">Mapa de activo</Link>
              </li>
              <li>
                <Link to="/producto">Semáforo de salud</Link>
              </li>
              <li>
                <Link to="/producto">Forecast de rentas</Link>
              </li>
              <li>
                <Link to="/producto">Asistente Kimi</Link>
              </li>
              <li>
                <Link to="/locatarios-info">Portal del locatario</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5>Empresa</h5>
            <ul>
              <li>
                <Link to="/manifiesto">Manifiesto</Link>
              </li>
              <li>
                <Link to="/manifiesto">Equipo</Link>
              </li>
              <li>
                <Link to="/manifiesto">Clientes</Link>
              </li>
              <li>
                <Link to="/manifiesto">
                  Carreras <span style={{ color: 'var(--mint)' }}>· 4</span>
                </Link>
              </li>
              <li>
                <Link to="/manifiesto">Prensa</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5>Recursos</h5>
            <ul>
              <li>
                <a href="#">Bitácora</a>
              </li>
              <li>
                <a href="#">Reporte 2025: Retail Real Estate LATAM</a>
              </li>
              <li>
                <a href="#">Centro de ayuda</a>
              </li>
              <li>
                <a href="#">Estado del sistema</a>
              </li>
              <li>
                <a href="#">Seguridad</a>
              </li>
            </ul>
          </div>
        </div>
        <hr className="mk-rule" />
        <div className="mk-foot-bottom" style={{ paddingTop: 24 }}>
          <span>© 2025 MALLIQ TECHNOLOGIES SAPI DE CV</span>
          <span>HECHO EN LA CDMX · ISO/IEC 27001 · SOC 2 TYPE II</span>
          <span>PRIVACIDAD · TÉRMINOS · COOKIES</span>
        </div>
      </div>
    </footer>
  );
}

export function MkPulse({ accent = 'var(--mint)' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 280 64" style={{ width: '100%', height: 64, display: 'block' }} preserveAspectRatio="none">
      <path
        d="M0,40 L40,40 L52,28 L64,52 L76,16 L92,40 L130,40 L142,32 L156,46 L172,22 L188,40 L240,40 L252,30 L266,42 L280,38"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MkPage({ children }: { children: ReactNode }) {
  return <div className="mk mk-page cream">{children}</div>;
}
