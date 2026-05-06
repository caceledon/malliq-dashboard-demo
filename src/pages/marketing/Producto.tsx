import { MkFooter, MkHeader, MkPage } from '@/components/marketing/Shell';

const COCKPIT_KPIS = [
  { l: 'NOI mensual', n: '$48.6M', d: '+12.4%', c: 'var(--mint-deep)' },
  { l: 'Ocupación', n: '94.2%', d: '+1.8pts', c: 'var(--mint-deep)' },
  { l: 'Locatarios críticos', n: '7', d: '−3 vs Q3', c: '#C8523B' },
];

const COCKPIT_ROWS: { name: string; occ: number; noi: string }[] = [
  { name: 'Mall A · demo', occ: 94, noi: '12.4M' },
  { name: 'Mall B · demo', occ: 91, noi: '9.1M' },
  { name: 'Mall C · demo', occ: 96, noi: '18.2M' },
  { name: 'Mall D · demo', occ: 88, noi: '5.6M' },
  { name: 'Mall E · demo', occ: 79, noi: '3.3M' },
];

const HEALTH_COLORS = [
  'var(--health-a)',
  'var(--health-a)',
  'var(--health-b)',
  'var(--health-a)',
  'var(--health-c)',
  'var(--health-a)',
  'var(--health-b)',
  'var(--health-d)',
  'var(--health-a)',
  'var(--health-a)',
  'var(--health-c)',
  'var(--health-e)',
  'var(--health-a)',
  'var(--health-b)',
];

const HEALTH_BUCKETS = [
  { l: 'AAA', c: 'var(--health-a)', n: 42 },
  { l: 'AA', c: 'var(--health-b)', n: 28 },
  { l: 'B', c: 'var(--health-c)', n: 14 },
  { l: 'C', c: 'var(--health-d)', n: 8 },
  { l: 'D', c: 'var(--health-e)', n: 3 },
];

const TRIPLE_MODULES = [
  {
    n: '04',
    t: 'Contratos como timeline',
    b: 'Cada vencimiento, cada renovación, cada renta variable, sobre una sola línea de tiempo. Filtras por activo, por giro, por nivel de riesgo. Lo que va a pasar en 90 días, ya está visible.',
    tag: 'Próximo: 17 contratos',
  },
  {
    n: '05',
    t: 'Forecast con escenarios',
    b: 'Proyecta NOI a 12, 24, 36 meses bajo tres escenarios: base, optimista, conservador. Simula contrafactuales: ¿y si suba renta a este giro? ¿y si rota el ancla?',
    tag: 'P50 · P10/P90',
  },
  {
    n: '06',
    t: 'Asistente Kimi',
    b: 'Conversacional, con contexto de tu portafolio. Autofill de contratos a partir de term sheets. Respuestas con fuente y trazabilidad. Nunca alucina cifras: cita la celda.',
    tag: 'GPT-4o · Claude · trazabilidad',
  },
];

const INTEGRATIONS = [
  'SAP',
  'Oracle Property',
  'Yardi',
  'Argus',
  'SII · DTE',
  'Banco de Chile API',
  'Santander API',
  'Transbank',
  'Mercado Pago',
  'Hubspot',
  'Slack',
  'WhatsApp Business',
];

export function Producto() {
  return (
    <MkPage>
      <MkHeader active="product" />

      <section className="mk-section" style={{ paddingTop: 80, paddingBottom: 64 }}>
        <div className="mk-container">
          <span className="mk-eyebrow">Producto</span>
          <h1 className="mk-display mk-h2" style={{ maxWidth: '18ch', marginTop: 24 }}>
            Diseñado para leer un <em>mall completo</em>
            <br />
            en treinta segundos.
          </h1>
          <p className="mk-lede" style={{ marginTop: 28 }}>
            MallIQ no es un ERP, ni un CRM, ni un dashboard de BI. Es un instrumento de lectura. Una superficie donde
            el portafolio se vuelve transparente.
          </p>
        </div>
      </section>

      <div
        className="mk-container"
        style={{
          borderTop: '1px solid var(--hairline)',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          gap: 32,
          padding: '14px 48px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--fg-3)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'var(--fg)' }}>01 · Cockpit</span>
        <span>02 · Mapa</span>
        <span>03 · Semáforo</span>
        <span>04 · Contratos</span>
        <span>05 · Forecast</span>
        <span>06 · Asistente</span>
      </div>

      <section className="mk-section">
        <div className="mk-container mk-grid-2" style={{ gridTemplateColumns: '1fr 1.3fr', alignItems: 'start', gap: 80 }}>
          <div style={{ position: 'sticky', top: 96 }}>
            <span className="mk-eyebrow" style={{ color: 'var(--mint)' }}>
              01
            </span>
            <h2 className="mk-display mk-h3" style={{ marginTop: 16 }}>
              Cockpit de portafolio
            </h2>
            <p className="mk-body" style={{ marginTop: 20 }}>
              Una sola vista para todos tus activos. Ocupación, NOI, alertas, próximos vencimientos, comparativa entre
              malls. Diseñado para mirarse de pie, café en mano, antes de entrar al comité.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Vista comparativa entre 14 activos en simultáneo',
                'KPIs en vivo, sin esperar al cierre de mes',
                'Drill-down a cualquier mall en un clic',
                'Exportable a board pack en un PDF auditado',
              ].map((p) => (
                <li key={p} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                  <span style={{ color: 'var(--mint)', fontFamily: 'var(--font-mono)' }}>+</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="mk-tile" style={{ padding: 0, overflow: 'hidden', borderRadius: 20 }}>
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--fg-3)',
              }}
            >
              <span>Cockpit · Portafolio · Q4 2025</span>
              <span>14 activos</span>
            </div>
            <div className="mk-mini-kpi" style={{ padding: 24, gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
              {COCKPIT_KPIS.map((k) => (
                <div key={k.l} style={{ padding: 16, border: '1px solid var(--hairline)', borderRadius: 12 }}>
                  <div className="mk-eyebrow">{k.l}</div>
                  <div className="mk-display" style={{ fontSize: 32, letterSpacing: '-0.02em', marginTop: 6 }}>
                    {k.n}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: k.c, marginTop: 4 }}>{k.d}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {COCKPIT_ROWS.map((m, i) => (
                <div
                  key={m.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 80px',
                    gap: 14,
                    padding: '12px 0',
                    borderTop: i ? '1px solid var(--hairline)' : 'none',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <span>{m.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-2)' }}>{m.occ}%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-2)' }}>${m.noi}</span>
                  <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${m.occ}%`,
                        height: '100%',
                        background: m.occ > 90 ? 'var(--mint-deep)' : m.occ > 85 ? '#C28A2E' : '#C8523B',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
        <div className="mk-container mk-grid-2" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start', gap: 80 }}>
          <div className="mk-tile" style={{ padding: 24, background: 'var(--bg)' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-3)',
                marginBottom: 16,
              }}
            >
              Mall · demo · Nivel L1
            </div>
            <svg viewBox="0 0 480 260" style={{ width: '100%' }}>
              <rect width="480" height="260" fill="var(--surface-2)" rx="8" />
              <path
                d="M40 130 Q240 100 440 130"
                fill="none"
                stroke="var(--hairline-strong)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              {Array.from({ length: 14 }).map((_, i) => {
                const x = 50 + i * 28;
                const yTop = 50;
                const yBot = 175;
                return (
                  <g key={i}>
                    <rect x={x} y={yTop} width={26} height={50} fill={HEALTH_COLORS[i]} fillOpacity="0.7" rx="2" />
                    <rect
                      x={x}
                      y={yBot}
                      width={26}
                      height={50}
                      fill={HEALTH_COLORS[(i + 5) % 14]}
                      fillOpacity="0.7"
                      rx="2"
                    />
                  </g>
                );
              })}
              <circle cx="386" cy="200" r="5" fill="var(--coral)">
                <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 20 }}>
              {HEALTH_BUCKETS.map((s) => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ height: 4, background: s.c, borderRadius: 2 }} />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 6, color: 'var(--fg-2)' }}>
                    {s.l} · {s.n}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'sticky', top: 96 }}>
            <span className="mk-eyebrow" style={{ color: 'var(--mint)' }}>
              02 + 03
            </span>
            <h2 className="mk-display mk-h3" style={{ marginTop: 16 }}>
              Mapa interactivo
              <br />+ Semáforo de salud
            </h2>
            <p className="mk-body" style={{ marginTop: 20 }}>
              El plano del mall, con cada local pintado por su salud financiera. Verde quiere decir lo que parece. Rojo
              también. Sin tablas, sin filtros, sin interpretación.
            </p>
            <div className="mk-tile outlined" style={{ marginTop: 28, padding: 20 }}>
              <div className="mk-eyebrow">Modelo MallIQ Health™</div>
              <p style={{ marginTop: 12, fontSize: 13.5, color: 'var(--fg-2)' }}>
                Cinco grados (AAA → D) calculados con 17 señales: ventas reportadas, puntualidad de renta, ticket
                promedio, foot traffic, cláusulas activas, antigüedad del contrato, y once más.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-grid-3" style={{ gap: 32 }}>
            {TRIPLE_MODULES.map((m) => (
              <div key={m.n} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="mk-eyebrow" style={{ color: 'var(--mint)' }}>
                  {m.n}
                </div>
                <h3
                  className="mk-display"
                  style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.02em', textWrap: 'balance' }}
                >
                  {m.t}
                </h3>
                <p className="mk-body" style={{ margin: 0, fontSize: 14 }}>
                  {m.b}
                </p>
                <span className="mk-tag" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                  <span className="dot" />
                  {m.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section dense" style={{ background: 'var(--bg-deep)', borderTop: '1px solid var(--hairline)' }}>
        <div className="mk-container">
          <span className="mk-eyebrow">Integraciones</span>
          <h2 className="mk-display mk-h3" style={{ maxWidth: '18ch', marginTop: 20 }}>
            Conectado a tu stack actual.
            <br />
            Sin migrar nada.
          </h2>
          <div className="mk-integrations-grid" style={{ marginTop: 48 }}>
            {INTEGRATIONS.map((i) => (
              <div
                key={i}
                className="mk-tile outlined"
                style={{
                  padding: 18,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--fg-2)',
                  minHeight: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i}
              </div>
            ))}
          </div>
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
