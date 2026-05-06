import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MkFooter, MkHeader, MkPage } from '@/components/marketing/Shell';

const STEPS = [
  { n: '01', t: 'Recibimos tu solicitud', b: 'Te respondemos en menos de 4 horas hábiles.' },
  { n: '02', t: 'Preparamos tu demo', b: 'Cargamos tu mall con datos públicos. Lo verás operando en vivo.' },
  { n: '03', t: 'Conversamos 30 min', b: 'Sin slides. Tú navegas, nosotros respondemos.' },
  { n: '04', t: 'Decides', b: 'Si encaja, en 14 días estás operando. Si no, te quedas con el deck.' },
];

export function Demo() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  return (
    <MkPage>
      <MkHeader active="" />

      <section className="mk-section" style={{ paddingTop: 80 }}>
        <div className="mk-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 96 }}>
            <span className="mk-eyebrow">Solicitar demo</span>
            <h1 className="mk-display mk-h2" style={{ maxWidth: '14ch', marginTop: 24 }}>
              30 minutos.
              <br />
              Tu mall, <em>cargado</em>.
            </h1>
            <p className="mk-lede" style={{ marginTop: 28 }}>
              Antes de la llamada, cargamos el cockpit con la información pública de tu activo. Te sentamos enfrente del
              producto, no de un PowerPoint.
            </p>

            <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {STEPS.map((s) => (
                <div key={s.n} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'baseline' }}>
                  <span className="mk-eyebrow" style={{ color: 'var(--mint-deep)' }}>
                    {s.n}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{s.t}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--fg-2)' }}>{s.b}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mk-tile outlined" style={{ marginTop: 48, padding: 24 }}>
              <div className="mk-eyebrow">¿Prefieres escribir?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 14, color: 'var(--fg)' }}>
                <span>hola@malliq.cl</span>
                <span style={{ color: 'var(--fg-3)' }}>Santiago, Chile</span>
              </div>
            </div>
          </div>

          {submitted ? (
            <div className="mk-tile" style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <span className="mk-eyebrow" style={{ color: 'var(--mint-deep)' }}>
                Solicitud recibida
              </span>
              <h2 className="mk-display mk-h3" style={{ margin: 0 }}>
                Gracias. Te respondemos en menos de <em>4 horas</em>.
              </h2>
              <p className="mk-body" style={{ margin: 0 }}>
                Mientras tanto, puedes explorar el cockpit cargado con datos de prueba.
              </p>
              <button type="button" className="mk-btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/login')}>
                Ver cockpit en vivo <span className="arr">→</span>
              </button>
            </div>
          ) : (
            <form
              className="mk-tile"
              style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 20 }}
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="mk-eyebrow">Tus datos</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="mk-field">
                  <label>Nombre</label>
                  <input placeholder="Nombre" />
                </div>
                <div className="mk-field">
                  <label>Apellido</label>
                  <input placeholder="Apellido" />
                </div>
              </div>
              <div className="mk-field">
                <label>Email corporativo</label>
                <input type="email" placeholder="nombre@empresa.cl" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="mk-field">
                  <label>Teléfono</label>
                  <input placeholder="+56 9 ..." />
                </div>
                <div className="mk-field">
                  <label>Cargo</label>
                  <input placeholder="Director(a) de Activos" />
                </div>
              </div>

              <hr className="mk-rule" style={{ margin: '8px 0' }} />
              <div className="mk-eyebrow">Tu portafolio</div>
              <div className="mk-field">
                <label>Empresa</label>
                <input placeholder="Tu empresa" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="mk-field">
                  <label>Centros que administras</label>
                  <select defaultValue="3-5">
                    <option>1</option>
                    <option>2</option>
                    <option>3-5</option>
                    <option>6-10</option>
                    <option>10+</option>
                  </select>
                </div>
                <div className="mk-field">
                  <label>Locatarios totales aprox.</label>
                  <select defaultValue="100-300">
                    <option>&lt; 100</option>
                    <option>100-300</option>
                    <option>300-1000</option>
                    <option>1000+</option>
                  </select>
                </div>
              </div>
              <div className="mk-field">
                <label>Cuéntanos qué te gustaría resolver</label>
                <textarea placeholder="Por ejemplo: cerramos contabilidad muy lento, queremos visibilidad en tiempo real de salud de locatarios, no tenemos forma de comparar entre nuestros 4 activos..." />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: 'var(--fg-3)', paddingTop: 8 }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--mint-deep)' }} />
                Acepto el aviso de privacidad y los términos de servicio.
              </div>

              <button type="submit" className="mk-btn primary" style={{ height: 52, justifyContent: 'center', marginTop: 12 }}>
                Solicitar demo de 30 minutos <span className="arr">→</span>
              </button>
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 11.5,
                  color: 'var(--fg-3)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Respuesta en &lt; 4 horas hábiles
              </p>
            </form>
          )}
        </div>
      </section>

      <MkFooter />
    </MkPage>
  );
}
