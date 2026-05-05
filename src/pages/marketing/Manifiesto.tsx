import { MkFooter, MkHeader, MkPage } from '@/components/marketing/Shell';

const PRINCIPLES: [string, string][] = [
  [
    'I. Lo invisible',
    'En cualquier centro comercial bien operado, lo importante pasa fuera de la junta. La verdadera salud está en señales pequeñas: un local que llega tarde a su renta tres meses seguidos, un giro que pierde 12% de ticket promedio en seis semanas, un pasillo que se vacía por las tardes. MallIQ existe para volver visible lo invisible.',
  ],
  [
    'II. Sin filtros',
    'Dueños de mall y locatarios no son enemigos. Son socios obligados. Casi todo el conflicto entre ellos es asimetría de información. Cuando ambos miran la misma data — la real, no la editada — la conversación cambia. La negociación se vuelve técnica. Las decisiones, defendibles.',
  ],
  [
    'III. Lectura, no exportación',
    'El cierre del mes no debería ser un evento. Debería ser un estado continuo. Si tu sistema te obliga a "exportar a Excel" para entender lo que pasa, ese sistema te falló. MallIQ no exporta. MallIQ se mira.',
  ],
  [
    'IV. Boutique, no enterprise',
    'Las herramientas que se ven bien no son un lujo: son una declaración. Lo que se diseña con cuidado se opera con cuidado. El centro comercial premium merece una herramienta a su altura. La fealdad funcional ya nos costó suficiente.',
  ],
];

const TEAM = [
  { n: 'Andrea Pellicer Vázquez', r: 'CEO · Cofundadora', bg: '18 años en Fibra Danhos. Antes, asociada en Bain.' },
  { n: 'Tomás Berenguer Iturbe', r: 'CTO · Cofundador', bg: 'Ex-Plaid. Construyó la plataforma de pagos de Belvo.' },
  { n: 'Renata Quiroz Mancera', r: 'Head of Product', bg: 'Diseñó el cockpit de operaciones de Rappi México.' },
  { n: 'Iñaki Saavedra Domínguez', r: 'Head of Real Estate', bg: '27 años. Operó Antara, Reforma 222 y Patio Universidad.' },
];

const INVESTORS = ['Variv Capital', 'Kaszek', 'MAYA Capital', 'ALL VP', 'Magma Partners', 'Liquid 2'];

export function Manifiesto() {
  return (
    <MkPage>
      <MkHeader active="about" />

      <section className="mk-section" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div className="mk-container">
          <span className="mk-eyebrow">Manifiesto · 2024</span>
          <h1
            className="mk-display"
            style={{
              fontSize: 'clamp(56px, 8vw, 120px)',
              lineHeight: 0.96,
              letterSpacing: '-0.025em',
              maxWidth: '14ch',
              marginTop: 28,
            }}
          >
            Un mall <em>no</em> es una <em>hoja</em> de cálculo.
          </h1>
          <p className="mk-lede" style={{ marginTop: 40, maxWidth: '52ch' }}>
            Es un organismo. Tiene pulso, presión, fiebres, contagios. Tiene horas felices y horas muertas, géneros que
            florecen y giros que se apagan. Tiene memoria de mercado y conducta de tribu.
          </p>
          <p className="mk-lede" style={{ marginTop: 24, maxWidth: '52ch' }}>
            El software que existía lo trataba como una tabla. MallIQ lo trata como lo que es.
          </p>
        </div>
      </section>

      <section
        className="mk-section dense"
        style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}
      >
        <div className="mk-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            {PRINCIPLES.map(([t, b]) => (
              <div key={t}>
                <h3
                  className="mk-display"
                  style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}
                >
                  {t}
                </h3>
                <p className="mk-body" style={{ marginTop: 16 }}>
                  {b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-sec-head">
            <div className="stack">
              <span className="mk-eyebrow">Equipo</span>
              <h2 className="mk-display mk-h3" style={{ maxWidth: '12ch' }}>
                Operadores y constructores.
              </h2>
            </div>
            <p className="mk-lede">
              Mitad real estate, mitad ingeniería. Hemos administrado, financiado y construido los malls que ahora
              medimos.
            </p>
          </div>

          <div className="mk-grid-4" style={{ gap: 16 }}>
            {TEAM.map((p) => (
              <div
                key={p.n}
                className="mk-tile outlined"
                style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 200 }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--hairline-strong)',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{p.n}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--mint-deep)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.06em',
                      marginTop: 4,
                    }}
                  >
                    {p.r}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45 }}>{p.bg}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mk-section dense"
        style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--hairline)' }}
      >
        <div className="mk-container">
          <div className="mk-investors-grid">
            <div>
              <span className="mk-eyebrow">Respaldo</span>
              <h2 className="mk-display mk-h3" style={{ marginTop: 20, maxWidth: '12ch' }}>
                Bien acompañados.
              </h2>
              <p className="mk-lede" style={{ marginTop: 24 }}>
                Capital paciente. Inversionistas que entienden retail real estate y construyen para décadas.
              </p>
            </div>
            <div className="mk-investors-list">
              {INVESTORS.map((i) => (
                <div key={i} className="mk-investor-card">
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
