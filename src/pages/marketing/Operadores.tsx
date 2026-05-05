import { Link } from 'react-router-dom';
import { MkFooter, MkHeader, MkPage } from '@/components/marketing/Shell';

const COMPARISONS = [
  { l: 'Cierre contable', a: '21 días', b: '14 horas' },
  { l: 'Cobranza vencida', a: '8.4%', b: '2.1%' },
  { l: 'Tiempo en armar board pack', a: '3 días', b: '12 minutos' },
  { l: 'Visibilidad de salud por local', a: 'Ad hoc', b: 'Tiempo real' },
];

const JOBS = [
  {
    t: 'Pedir reportes de ventas a 200 locatarios cada mes',
    d: 'El portal de locatario los captura. Si no reportan, MallIQ los persigue en automático por WhatsApp.',
  },
  {
    t: 'Reconciliar pagos con CFDI uno por uno',
    d: 'La integración con SAT cruza cada depósito con su factura y marca discrepancias en segundos.',
  },
  {
    t: 'Armar board pack en PowerPoint a mano',
    d: 'Un clic. Todas tus métricas en un PDF auditado, con notas y comparativas históricas.',
  },
  {
    t: 'Saber qué locatarios están en problemas tarde',
    d: 'El semáforo de salud se actualiza en vivo. Una caída de ventas dispara alerta antes de que se note en cobranza.',
  },
  {
    t: 'Recordar manualmente vencimientos de contrato',
    d: 'Línea de tiempo automática. 90, 60, 30 días antes — más una sugerencia de renta de mercado por giro y zona.',
  },
  {
    t: 'Negociar a ciegas la renovación',
    d: 'Kimi te muestra el comparable: qué pagan los giros similares en tus otros activos, en otros malls de tu zona.',
  },
];

const TIMELINE = [
  {
    n: 'Día 1-2',
    t: 'Onboarding',
    b: 'Recibimos tus contratos, layout del mall y catálogo de locatarios. Te asignamos un Solutions Architect dedicado.',
  },
  {
    n: 'Día 3-7',
    t: 'Ingesta',
    b: 'Conectamos tu ERP, tu portal de cobranza y CFDIs del SAT. La data histórica se carga automáticamente.',
  },
  {
    n: 'Día 8-12',
    t: 'Calibración',
    b: 'Validamos modelos de salud con tus criterios. Ajustamos alertas y dashboards a tu manera de operar.',
  },
  {
    n: 'Día 13-14',
    t: 'Lanzamiento',
    b: 'Capacitación al equipo, kickoff con locatarios, y primer cierre en vivo. A partir de aquí, soporte continuo.',
  },
];

const SECURITY = [
  { t: 'ISO/IEC 27001', d: 'Sistema de gestión de seguridad de la información, certificado anualmente.' },
  { t: 'SOC 2 Type II', d: 'Controles de seguridad, disponibilidad y confidencialidad auditados.' },
  { t: 'Residencia · MX', d: 'Tus datos viven en data centers en Querétaro. Nunca cruzan frontera.' },
  { t: 'SAT compatible', d: 'Lectura nativa de CFDI 4.0. Reconciliación automática de complementos de pago.' },
];

export function Operadores() {
  return (
    <MkPage>
      <MkHeader active="operators" />

      <section className="mk-section" style={{ paddingTop: 80, paddingBottom: 64 }}>
        <div className="mk-container mk-grid-2" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'end', gap: 64 }}>
          <div>
            <span className="mk-eyebrow">Para directores de portafolio · gerentes operativos · CFOs</span>
            <h1 className="mk-display mk-h2" style={{ maxWidth: '14ch', marginTop: 28 }}>
              Cierra el mes <em>el día siguiente</em>, no tres semanas después.
            </h1>
            <p className="mk-lede" style={{ marginTop: 28 }}>
              La operación de un mall vive entre Excel, WhatsApp y carpetas compartidas. MallIQ unifica todo en un solo
              lugar — y lo deja auditable.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
              <Link to="/login" className="mk-btn primary">
                Ver cockpit en vivo <span className="arr">→</span>
              </Link>
              <a href="#" className="mk-btn ghost">
                Descargar pitch (PDF)
              </a>
            </div>
          </div>
          <div className="mk-tile" style={{ padding: 24 }}>
            <span className="mk-eyebrow">Antes / Después</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>
              {COMPARISONS.map((r) => (
                <div
                  key={r.l}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr',
                    gap: 12,
                    alignItems: 'baseline',
                    borderBottom: '1px solid var(--hairline)',
                    paddingBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{r.l}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--fg-3)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {r.a}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      color: 'var(--mint-deep)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {r.b}
                  </span>
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
        <div className="mk-container">
          <span className="mk-eyebrow">Trabajos que MallIQ hace por ti</span>
          <h2 className="mk-display mk-h3" style={{ maxWidth: '18ch', marginTop: 20 }}>
            Lo que dejas de hacer la próxima semana.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1,
              marginTop: 56,
              background: 'var(--hairline-strong)',
              border: '1px solid var(--hairline-strong)',
            }}
          >
            {JOBS.map((j, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg)',
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  minHeight: 180,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--coral)',
                      textDecoration: 'line-through',
                    }}
                  >
                    Antes:
                  </span>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500, lineHeight: 1.3, color: 'var(--fg)' }}>
                    {j.t}
                  </h3>
                </div>
                <p className="mk-body" style={{ margin: 0, fontSize: 14, paddingLeft: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mint-deep)' }}>
                    AHORA ·{' '}
                  </span>
                  {j.d}
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
              <span className="mk-eyebrow">Implementación</span>
              <h2 className="mk-display mk-h3" style={{ maxWidth: '14ch' }}>
                De firma a producción en <em>14 días</em>.
              </h2>
            </div>
            <p className="mk-lede">
              Sin reemplazar tu ERP, sin migrar tu base de datos. Conectamos lo que ya tienes y lo dejamos legible.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              borderTop: '1px solid var(--hairline)',
            }}
          >
            {TIMELINE.map((s, i) => (
              <div
                key={s.n}
                style={{
                  borderRight: i < 3 ? '1px solid var(--hairline)' : 'none',
                  padding: '32px 24px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', top: -1, left: 0, width: '50%', height: 2, background: 'var(--mint)' }} />
                <div className="mk-eyebrow" style={{ color: 'var(--fg)' }}>
                  {s.n}
                </div>
                <h3
                  className="mk-display"
                  style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}
                >
                  {s.t}
                </h3>
                <p className="mk-body" style={{ fontSize: 13.5, marginTop: 4 }}>
                  {s.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section dense" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--hairline)' }}>
        <div className="mk-container mk-security-grid">
          <div>
            <span className="mk-eyebrow">Seguridad y cumplimiento</span>
            <h2 className="mk-display mk-h3" style={{ marginTop: 20, maxWidth: '14ch' }}>
              Hecho para fideicomisos y FIBRAs.
            </h2>
            <p className="mk-lede" style={{ marginTop: 24 }}>
              Auditoría continua, control granular de permisos por rol, bitácora inmutable de cambios, residencia de
              datos en México.
            </p>
          </div>
          <div className="mk-security-cards">
            {SECURITY.map((s) => (
              <div
                key={s.t}
                className="mk-tile"
                style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      border: '1px solid var(--mint-deep)',
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      color: 'var(--mint-deep)',
                    }}
                  >
                    ✓
                  </span>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{s.t}</h3>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
