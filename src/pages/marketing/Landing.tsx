import { Link } from 'react-router-dom';
import { MkFooter, MkHeader, MkPage } from '@/components/marketing/Shell';
import { useReducedMotion } from '@/lib/useReducedMotion';

const TENANTS = [
  { x: 40, y: 60, w: 46, h: 54, c: 'var(--mint-deep)', o: 0.85, l: 'A1' },
  { x: 92, y: 60, w: 34, h: 54, c: 'var(--mint-deep)', o: 0.55, l: 'A2' },
  { x: 132, y: 60, w: 42, h: 54, c: '#C28A2E', o: 0.7, l: 'A3' },
  { x: 180, y: 60, w: 38, h: 54, c: 'var(--mint-deep)', o: 0.5, l: 'A4' },
  { x: 224, y: 60, w: 50, h: 54, c: '#C8523B', o: 0.75, l: 'A5' },
  { x: 40, y: 170, w: 62, h: 54, c: 'var(--mint-deep)', o: 0.8, l: 'B1' },
  { x: 108, y: 170, w: 38, h: 54, c: '#6E51C9', o: 0.55, l: 'B2' },
  { x: 152, y: 170, w: 46, h: 54, c: 'var(--mint-deep)', o: 0.7, l: 'B3' },
  { x: 204, y: 170, w: 30, h: 54, c: '#C28A2E', o: 0.55, l: 'B4' },
  { x: 240, y: 170, w: 38, h: 54, c: 'var(--mint-deep)', o: 0.8, l: 'B5' },
];

const MODULES = [
  { n: '01', t: 'Cockpit', b: 'KPIs del portafolio en una sola vista. Comparativa entre activos, alertas en vivo, próximos vencimientos.' },
  { n: '02', t: 'Mapa del activo', b: 'El plano del mall como interfaz. Cada local con su pulso de ventas, ocupación, salud.' },
  { n: '03', t: 'Semáforo de salud', b: 'Modelo propietario que califica a cada locatario en cinco niveles, AAA a D, en tiempo real.' },
  { n: '04', t: 'Rentas y contratos', b: 'Línea de tiempo del portafolio. Vencimientos, renovaciones, cláusulas críticas, renta variable.' },
  { n: '05', t: 'Forecast', b: 'Proyección de NOI, ocupación y rotación con escenarios. Simulación contrafactual de decisiones.' },
  { n: '06', t: 'Alertas', b: 'Inbox priorizado. Solo lo que requiere tu atención hoy. Reglas custom por activo.' },
  { n: '07', t: 'Asistente Kimi', b: 'IA conversacional con contexto del portafolio. Autofill de contratos. Respuestas con fuente.' },
  { n: '08', t: 'Portal del locatario', b: 'Tu inquilino reporta ventas, ve su salud, paga renta. Una sola entrada al ecosistema.' },
];

const PRINCIPLES = [
  { n: '01', t: 'Cockpit, no reportes.', b: 'Lo que importa, en una sola vista. Sin esperar a que cierre el mes.' },
  { n: '02', t: 'Salud, no fórmulas.', b: 'Cada locatario tiene un semáforo. Verde, amarillo, rojo — sin interpretación.' },
  { n: '03', t: 'Plano, no listas.', b: 'El mall se ve como mall. Cada local en su lugar, con su pulso visible.' },
];

export function Landing() {
  const reducedMotion = useReducedMotion();
  return (
    <MkPage>
      <MkHeader active="" />

      <section className="mk-section" style={{ paddingTop: 56 }}>
        <div className="mk-container mk-hero">
          <div>
            <span className="mk-eyebrow">Inteligencia para retail real estate · v 2025.4</span>
            <h1 className="mk-display mk-h1 mk-hero-headline" style={{ marginTop: 28 }}>
              El cerebro digital
              <br />
              de tu <em>centro comercial</em>.
            </h1>
            <p className="mk-lede" style={{ marginTop: 32 }}>
              MallIQ unifica contratos, ventas, ocupación y salud financiera de cada locatario en un solo cockpit.
              Tu portafolio, finalmente legible.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 40, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to="/demo" className="mk-btn primary">
                Agendar demo de 30 min <span className="arr">→</span>
              </Link>
              <Link to="/login" className="mk-btn ghost">
                Ver el cockpit en vivo
              </Link>
            </div>
          </div>

          <div
            className="mk-tile mk-hero-canvas"
            style={{
              padding: 0,
              overflow: 'hidden',
              borderRadius: 24,
              background: 'var(--surface)',
              border: '1px solid var(--hairline-strong)',
            }}
          >
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-3)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--mint-deep)' }} />
                Mall · demo · live
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>14:32:08</span>
            </div>
            <div
              className="mk-hero-canvas-body"
              style={{ padding: 28, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}
            >
              <svg viewBox="0 0 320 280" style={{ width: '100%' }}>
                <defs>
                  <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M16 0 L0 0 0 16" fill="none" stroke="var(--hairline)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="320" height="280" fill="url(#grid)" />
                <path
                  d="M30 140 Q160 110 290 140"
                  fill="none"
                  stroke="var(--hairline-strong)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {TENANTS.map((t) => (
                  <g key={t.l}>
                    <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={t.c} fillOpacity={t.o} rx="3" />
                    <text
                      x={t.x + t.w / 2}
                      y={t.y + t.h / 2 + 3}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize="9"
                      fill="white"
                      opacity="0.85"
                    >
                      {t.l}
                    </text>
                  </g>
                ))}
                <rect
                  x="280"
                  y="60"
                  width="24"
                  height="164"
                  fill="var(--surface-3)"
                  stroke="var(--hairline-strong)"
                  strokeWidth="1"
                  rx="2"
                />
                <text
                  x="292"
                  y="148"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="9"
                  fill="var(--fg-3)"
                  transform="rotate(-90 292 148)"
                >
                  ANCLA
                </text>
                <circle cx="245" cy="87" r="4" fill="#C8523B">
                  {!reducedMotion ? (
                    <>
                      <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
                    </>
                  ) : null}
                </circle>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="mk-eyebrow">Ocupación</div>
                  <div
                    className="mk-display"
                    style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4 }}
                  >
                    94.2<span style={{ fontSize: 18, color: 'var(--fg-3)' }}>%</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mint-deep)', marginTop: 4 }}>
                    +1.8 vs Q3
                  </div>
                </div>
                <div>
                  <div className="mk-eyebrow">NOI mensual</div>
                  <div
                    className="mk-display"
                    style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4 }}
                  >
                    $48.6 <span style={{ fontSize: 18, color: 'var(--fg-3)' }}>M</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
                  <div className="mk-eyebrow" style={{ color: '#C8523B' }}>
                    Alerta · A5
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 4, lineHeight: 1.4 }}>
                    Ventas −34% vs trimestre anterior. Contrato vence en 47 días.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mk-hero-meta" style={{ marginTop: 24 }}>
            <div>
              <div className="num">14</div>
              <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                Centros administrados
              </div>
            </div>
            <div style={{ paddingLeft: 24 }}>
              <div className="num">2,840</div>
              <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                Locatarios activos
              </div>
            </div>
            <div style={{ paddingLeft: 24 }}>
              <div className="num">
                <span style={{ fontSize: 22, color: 'var(--fg-3)' }}>UF</span> XXX
              </div>
              <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                Renta gestionada / año
              </div>
            </div>
            <div style={{ paddingLeft: 24 }}>
              <div className="num">
                11<span style={{ fontSize: 22, color: 'var(--fg-3)' }}>×</span>
              </div>
              <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                Más rápido cerrar contrato
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mk-container">
        <div className="mk-strip">
          <span>CONFIADO POR</span>
          <span style={{ color: 'var(--fg-2)' }}>Próximamente</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>Próximamente</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>Próximamente</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>Próximamente</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>Próximamente</span>
        </div>
      </div>

      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-sec-head">
            <div className="stack">
              <span className="mk-eyebrow">Manifiesto</span>
              <h2 className="mk-display mk-h3" style={{ maxWidth: '14ch' }}>
                Un mall es un organismo vivo.
              </h2>
            </div>
            <p className="mk-lede">
              Tiene pulso, presión arterial, momentos de fiebre. El software tradicional lo trata como una hoja de
              cálculo. MallIQ lo trata como lo que es: un sistema con vida propia que merece ser{' '}
              <em>leído, no exportado</em>.
            </p>
          </div>

          <div className="mk-grid-3">
            {PRINCIPLES.map((p) => (
              <div
                key={p.n}
                className="mk-tile outlined"
                style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 220 }}
              >
                <div className="mk-eyebrow" style={{ color: 'var(--mint)' }}>
                  {p.n}
                </div>
                <h3 className="mk-display" style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                  {p.t}
                </h3>
                <p className="mk-body" style={{ margin: 0 }}>
                  {p.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mk-section dense"
        style={{
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--hairline)',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div className="mk-container">
          <div className="mk-sec-head">
            <div className="stack">
              <span className="mk-eyebrow">Producto</span>
              <h2 className="mk-display mk-h2" style={{ maxWidth: '12ch' }}>
                Una <em>plataforma</em>, ocho módulos.
              </h2>
            </div>
            <p className="mk-lede">
              Diseñados para los tres roles que conviven en un centro comercial: el director de portafolio, el gerente
              operativo, y el dueño de la tienda. Cada uno con la información que necesita, ni más ni menos.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: 'var(--hairline-strong)',
              border: '1px solid var(--hairline-strong)',
            }}
          >
            {MODULES.map((m) => (
              <div
                key={m.n}
                style={{ background: 'var(--bg)', padding: 28, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 200 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="mk-eyebrow" style={{ color: 'var(--mint)' }}>
                    {m.n}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>↗</span>
                </div>
                <h3 className="mk-display" style={{ fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                  {m.t}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.45 }}>{m.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-grid-2" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            <div>
              <span className="mk-eyebrow">Caso · Próximamente</span>
              <h2 className="mk-display mk-h3" style={{ marginTop: 24, maxWidth: '14ch' }}>
                <em>"</em>Antes cerraba mes con tres semanas de retraso. Ahora cierro al día siguiente, con
                confianza<em>."</em>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--hairline-strong)',
                  }}
                  aria-hidden="true"
                />
                <div>
                  <div style={{ fontWeight: 500 }}>Caso piloto</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Próximamente · Chile</div>
                </div>
              </div>
            </div>
            <div className="mk-tile" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="mk-eyebrow">Resultados · 9 meses</div>
              <div className="mk-grid-2" style={{ gap: 24 }}>
                <div>
                  <div className="mk-display" style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    −43%
                  </div>
                  <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                    Locatarios morosos
                  </div>
                </div>
                <div>
                  <div className="mk-display" style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    +8.4<span style={{ fontSize: 24, color: 'var(--fg-3)' }}>pts</span>
                  </div>
                  <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                    Ocupación
                  </div>
                </div>
                <div>
                  <div className="mk-display" style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    11<span style={{ fontSize: 24, color: 'var(--fg-3)' }}>×</span>
                  </div>
                  <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                    Velocidad de cierre
                  </div>
                </div>
                <div>
                  <div className="mk-display" style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    14<span style={{ fontSize: 24, color: 'var(--fg-3)' }}>h</span>
                  </div>
                  <div className="mk-eyebrow" style={{ marginTop: 8 }}>
                    Cierre de mes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-section dense mk-cta-block">
        <div className="mk-container mk-cta-grid">
          <div>
            <span className="mk-eyebrow">Próximo paso</span>
            <h2 className="mk-display mk-h2" style={{ marginTop: 20 }}>
              Hagamos un <em>recorrido</em> por tu mall.
            </h2>
            <p className="mk-lede" style={{ marginTop: 24 }}>
              30 minutos. Te mostramos el cockpit cargado con tus datos públicos, sin compromiso. Si te interesa, en 2
              semanas estás operando.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Link to="/demo" className="mk-btn primary mk-cta-btn">
              Agendar demo de 30 min <span className="arr">→</span>
            </Link>
            <Link to="/demo" className="mk-btn mk-cta-btn">
              Hablar con ventas <span className="arr">→</span>
            </Link>
            <div className="mk-eyebrow" style={{ marginTop: 12 }}>
              O escríbenos a hola@malliq.cl
            </div>
          </div>
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
