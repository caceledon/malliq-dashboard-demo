import { Link } from 'react-router-dom';
import { MkFooter, MkHeader, MkPage, MkPulse } from '@/components/marketing/Shell';

const FEATURES = [
  { n: '01', t: 'Reporta ventas en 30 seg', b: 'Captura desde tu POS, súbelo en CSV o escribe el monto del día. WhatsApp también funciona.' },
  { n: '02', t: 'Paga renta en línea', b: 'OXXO, transferencia o tarjeta. Tu CFDI se genera automático y queda en tu portal.' },
  { n: '03', t: 'Ve tu salud en vivo', b: 'Misma vista que tu administrador. Sin sorpresas en la junta de renovación.' },
  { n: '04', t: 'Solicitudes y mantenimiento', b: 'Una fuga, un foco fundido, una solicitud de remodelación — todo en un ticket.' },
  { n: '05', t: 'Comparativa anónima', b: 'Cómo va tu giro vs el promedio del mall. Sin nombres, sin chismes — solo benchmarks.' },
  { n: '06', t: 'Renovación con datos', b: 'Tu administrador propone, tú contraproponer con cifras. La conversación deja de ser política.' },
];

export function LocatariosInfo() {
  return (
    <MkPage>
      <MkHeader active="tenants" />

      <section className="mk-section" style={{ paddingTop: 80 }}>
        <div className="mk-container mk-grid-2" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'end', gap: 64 }}>
          <div>
            <span className="mk-eyebrow">Para dueños de tienda · franquiciatarios · operadores de food court</span>
            <h1 className="mk-display mk-h2" style={{ maxWidth: '15ch', marginTop: 28 }}>
              Tu mall, <em>de tu lado</em>.
            </h1>
            <p className="mk-lede" style={{ marginTop: 28 }}>
              Reporta ventas en 30 segundos. Paga renta sin teléfono. Mira cómo va tu salud financiera con tu
              administrador. Lo mismo que él ve, sin filtros.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
              <Link to="/login" className="mk-btn primary">
                Entrar al portal <span className="arr">→</span>
              </Link>
              <a href="#" className="mk-btn ghost">
                Ver demo (2 min)
              </a>
            </div>
          </div>
          <div className="mk-tile" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--fg-3)',
              }}
            >
              <span>Tu tienda · Local A14</span>
              <span style={{ color: 'var(--mint-deep)' }}>● Saludable · AA</span>
            </div>
            <div style={{ padding: 24 }}>
              <div className="mk-eyebrow">Ventas · noviembre</div>
              <div className="mk-display" style={{ fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 8 }}>
                $284,500
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--mint-deep)', marginTop: 6 }}>
                +12.4% vs oct
              </div>
              <MkPulse accent="var(--mint-deep)" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 18,
                  paddingTop: 18,
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <div>
                  <div className="mk-eyebrow">Renta + servicios</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 4 }}>$48,200</div>
                </div>
                <div>
                  <div className="mk-eyebrow">% sobre ventas</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 4 }}>16.9%</div>
                </div>
              </div>
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
          <span className="mk-eyebrow">Lo que obtienes</span>
          <h2 className="mk-display mk-h3" style={{ maxWidth: '18ch', marginTop: 20 }}>
            Una sola entrada al ecosistema del mall.
          </h2>

          <div className="mk-grid-3" style={{ marginTop: 56, gap: 24 }}>
            {FEATURES.map((j) => (
              <div
                key={j.n}
                className="mk-tile"
                style={{
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  minHeight: 220,
                  background: 'var(--bg)',
                }}
              >
                <span className="mk-eyebrow" style={{ color: 'var(--mint)' }}>
                  {j.n}
                </span>
                <h3
                  className="mk-display"
                  style={{ fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}
                >
                  {j.t}
                </h3>
                <p className="mk-body" style={{ margin: 0, fontSize: 14 }}>
                  {j.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container mk-grid-2" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 64, alignItems: 'center' }}>
          <div className="mk-tile outlined" style={{ padding: 32 }}>
            <div className="mk-eyebrow">Caso · Cocina d'Autor</div>
            <p className="mk-display" style={{ fontSize: 26, lineHeight: 1.25, letterSpacing: '-0.01em', marginTop: 16 }}>
              <em>"</em>Por primera vez negocié mi renovación con números, no con corazonadas. Bajé 8% mi renta porque
              tenía la data del giro en mi mall y en otros tres.<em>"</em>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: 'var(--surface-3)',
                  border: '1px solid var(--hairline-strong)',
                }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Sebastián Otaegui Marín</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>Chef y dueño · Cocina d'Autor · Antara</div>
              </div>
            </div>
          </div>
          <div>
            <span className="mk-eyebrow">El compromiso</span>
            <h2 className="mk-display mk-h3" style={{ marginTop: 20, maxWidth: '16ch' }}>
              Tu data es <em>tuya</em>, no del mall.
            </h2>
            <p className="mk-body" style={{ marginTop: 24 }}>
              Tu administrador ve agregados y métricas operativas. No ve tu desglose de tickets, no ve tus proveedores,
              no ve tu margen. Si te cambias de mall, exportas tu historia con un clic.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Exportación a CSV / Excel sin restricciones',
                'Permisos granulares: tú decides qué comparte tu equipo',
                'Borrado completo bajo demanda en 7 días',
                'Sin lock-in contractual',
              ].map((p) => (
                <li key={p} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                  <span style={{ color: 'var(--mint-deep)' }}>✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
