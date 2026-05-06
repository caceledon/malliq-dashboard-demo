import { Link } from 'react-router-dom';
import { MkFooter, MkHeader, MkPage } from '@/components/marketing/Shell';

interface Plan {
  n: string;
  p: string;
  sub: string;
  desc: string;
  feat: string[];
  cta: string;
  ctaTo: string;
  featured: boolean;
}

const PLANS: Plan[] = [
  {
    n: 'Plaza',
    p: 'A medida',
    sub: 'desde · pricing transparente al cierre',
    desc: 'Para malls boutique y centros vecinales hasta 60 locales.',
    feat: [
      'Cockpit y mapa interactivo',
      'Semáforo de salud (modelo estándar)',
      'Hasta 60 locatarios activos',
      'Portal del locatario incluido',
      'Soporte por email · 24h',
      'Onboarding self-serve',
    ],
    cta: 'Probar 30 días',
    ctaTo: '/demo',
    featured: false,
  },
  {
    n: 'Centro',
    p: 'A medida',
    sub: 'el plan más elegido · pricing al cierre',
    desc: 'El plan más elegido por administradores de portafolio mediano.',
    feat: [
      'Todo en Plaza',
      'Hasta 250 locatarios activos',
      'Forecast con escenarios (P10/P50/P90)',
      'Alertas custom por activo',
      'Asistente Kimi · 1,000 consultas/mes',
      'Solutions Architect dedicado',
      'Implementación en 14 días',
    ],
    cta: 'Agendar demo',
    ctaTo: '/demo',
    featured: true,
  },
  {
    n: 'Portafolio',
    p: 'A medida',
    sub: 'multi-activo · pricing dedicado',
    desc: 'Para FIBRAs, fideicomisos y portafolios de 5+ centros.',
    feat: [
      'Todo en Centro',
      'Locatarios ilimitados',
      'Vista consolidada multi-activo',
      'Asistente Kimi sin límite',
      'SSO + SCIM + control granular',
      'Residencia de datos dedicada',
      'SLA 99.95% + soporte 24/7',
      'Equipo de Customer Success',
    ],
    cta: 'Hablar con ventas',
    ctaTo: '/demo',
    featured: false,
  },
];

const COMPARISON = [
  {
    cat: 'Cockpit',
    rows: [
      ['Vista de portafolio', '·', '·', '·'],
      ['Comparativa entre activos', '—', '·', '·'],
      ['Board pack auditado', '—', '·', '·'],
    ],
  },
  {
    cat: 'Inteligencia',
    rows: [
      ['Semáforo de salud', 'Estándar', 'Estándar', 'Custom'],
      ['Forecast con escenarios', '—', '·', '·'],
      ['Asistente Kimi', '—', '1k/mes', 'Ilimitado'],
    ],
  },
  {
    cat: 'Operación',
    rows: [
      ['Portal del locatario', '·', '·', '·'],
      ['Reconciliación CFDI', '·', '·', '·'],
      ['Alertas custom', '—', '·', '·'],
    ],
  },
  {
    cat: 'Empresa',
    rows: [
      ['SSO + SCIM', '—', '—', '·'],
      ['SLA 99.95%', '—', '—', '·'],
      ['Residencia dedicada', '—', '—', '·'],
    ],
  },
];

const FAQ: [string, string][] = [
  [
    '¿El precio es por usuario o por mall?',
    'Por activo. Tu equipo entero entra incluido — directores, contralores, gerentes operativos. Los locatarios también acceden gratis al portal.',
  ],
  [
    '¿Cuánto toma implementar?',
    '14 días en plan Centro. Plaza puede ser self-serve en 48 horas. Portafolio depende del alcance, típicamente 4-6 semanas.',
  ],
  [
    '¿Migran nuestra data histórica?',
    'Sí, sin costo. Nuestro equipo recibe lo que tengas — Excel, SAP, Oracle, Yardi, carpetas — y lo dejamos limpio.',
  ],
  [
    '¿Hay lock-in contractual?',
    'No. Contrato mensual. Cancelas cuando quieras. Te entregamos toda tu data en CSV/Parquet en 7 días.',
  ],
  [
    '¿Se integra con nuestro ERP?',
    'Sí. Conectores nativos a SAP, Oracle Property, Yardi, Argus, y APIs custom para sistemas propios. DTE (factura y boleta electrónica) directo del SII.',
  ],
  [
    '¿Cómo manejan PII y datos sensibles?',
    'ISO 27001 + SOC 2 Type II. Residencia en Chile. Permisos granulares por rol. Bitácora inmutable. Encriptación at-rest y in-transit.',
  ],
];

export function Pricing() {
  return (
    <MkPage>
      <MkHeader active="pricing" />

      <section className="mk-section" style={{ paddingTop: 80 }}>
        <div className="mk-container">
          <span className="mk-eyebrow">Precios</span>
          <h1 className="mk-display mk-h2" style={{ maxWidth: '16ch', marginTop: 24 }}>
            Precio por <em>activo</em>, no por usuario.
          </h1>
          <p className="mk-lede" style={{ marginTop: 24 }}>
            Tu equipo entero — directores, gerentes, contralores, locatarios — sin licencias por cabeza. Pagas por lo
            que mides: el mall.
          </p>
        </div>
      </section>

      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <div className="mk-pricing">
            {PLANS.map((p) => (
              <div key={p.n} className={'mk-plan' + (p.featured ? ' featured' : '')}>
                {p.featured && (
                  <span
                    className="mk-tag"
                    style={{ alignSelf: 'flex-start', borderColor: 'var(--mint)', color: 'var(--mint-deep)' }}
                  >
                    <span className="dot" />
                    Más elegido
                  </span>
                )}
                <div>
                  <div className="mk-plan-name">{p.n}</div>
                  <p className="mk-body" style={{ fontSize: 13.5, marginTop: 10 }}>
                    {p.desc}
                  </p>
                </div>
                <div className="mk-plan-price">
                  <b>{p.p}</b>
                  <span>{p.sub}</span>
                </div>
                <ul>
                  {p.feat.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  to={p.ctaTo}
                  className={'mk-btn ' + (p.featured ? 'mint' : 'primary')}
                  style={{ justifyContent: 'center', marginTop: 'auto' }}
                >
                  {p.cta} <span className="arr">→</span>
                </Link>
              </div>
            ))}
          </div>
          <p
            style={{
              textAlign: 'center',
              marginTop: 32,
              fontSize: 13,
              color: 'var(--fg-3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
            }}
          >
            PRECIOS EN UF / CLP · IVA NO INCLUIDO · CONTRATO MENSUAL · SIN LOCK-IN · 30 DÍAS DE PRUEBA
          </p>
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
          <span className="mk-eyebrow">Comparación detallada</span>
          <h2 className="mk-display mk-h3" style={{ maxWidth: '16ch', marginTop: 16 }}>
            Qué hay en cada plan.
          </h2>

          <div
            style={{
              marginTop: 56,
              border: '1px solid var(--hairline-strong)',
              borderRadius: 16,
              overflow: 'hidden',
              background: 'var(--bg)',
            }}
          >
            {COMPARISON.map((g, gi) => (
              <div key={g.cat}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '14px 24px',
                    background: 'var(--surface-2)',
                    borderTop: gi ? '1px solid var(--hairline)' : 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-3)',
                  }}
                >
                  <span>{g.cat}</span>
                  {gi === 0 && (
                    <>
                      <span style={{ color: 'var(--fg)' }}>Plaza</span>
                      <span style={{ color: 'var(--mint-deep)' }}>Centro</span>
                      <span style={{ color: 'var(--fg)' }}>Portafolio</span>
                    </>
                  )}
                </div>
                {g.rows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '14px 24px',
                      borderTop: '1px solid var(--hairline)',
                      fontSize: 14,
                      alignItems: 'center',
                    }}
                  >
                    <span>{r[0]}</span>
                    {r.slice(1).map((v, j) => (
                      <span
                        key={j}
                        style={{
                          color: v === '—' ? 'var(--fg-4)' : v === '·' ? 'var(--mint-deep)' : 'var(--fg)',
                          fontFamily: ['—', '·'].includes(v) ? 'inherit' : 'var(--font-mono)',
                          fontSize: ['—', '·'].includes(v) ? 18 : 13,
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <span className="mk-eyebrow">Preguntas frecuentes</span>
          <h2 className="mk-display mk-h3" style={{ marginTop: 16, maxWidth: '14ch' }}>
            Lo que más nos preguntan.
          </h2>
          <div className="mk-faq" style={{ marginTop: 48 }}>
            {FAQ.map(([q, a]) => (
              <div key={q} className="mk-faq-row">
                <q>{q}</q>
                <p className="mk-body" style={{ margin: 0, fontSize: 15 }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
