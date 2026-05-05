import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarStack,
  CategoryDonut,
  Delta,
  ForecastChart,
  HealthBar,
  HealthRing,
  Kpi,
  KpiTile,
  MallPlan,
  MiniKpi,
  Pill,
  Spark,
  Sparkline,
  TopBar,
} from '@/components/mallq/ui';
import type { HealthBucket } from '@/components/mallq/helpers';

// D4: design-lab. Renders every primitive against the live tokens and a small
// inline contrast checker so we can spot AA failures during refactors. The
// checker reads computed colors from real DOM, so it covers color-mix() too.

const DUMMY_SPARK = [40, 38, 42, 45, 48, 52, 47, 51, 56, 60, 58, 64];

const PALETTE = [
  ['--bg', '--ink-1'],
  ['--bg', '--ink-2'],
  ['--bg', '--ink-3'],
  ['--surface', '--ink-1'],
  ['--surface', '--ink-2'],
  ['--surface-2', '--ink-2'],
  ['--accent-soft', '--ink-1'],
  ['--mint-soft', '--mint-deep'],
  ['--violet-soft', '--violet-deep'],
  ['--coral-soft', '--coral'],
  ['--amber-soft', '--ink-1'],
] as const;

function parseColor(value: string): [number, number, number] | null {
  // canvas trick — let the browser resolve any oklch / color-mix / rgba.
  const ctx = parseColor.ctx ??= (() => {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.getContext('2d', { willReadFrequently: true });
  })();
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillStyle = value;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return [data[0], data[1], data[2]];
}
parseColor.ctx = null as CanvasRenderingContext2D | null;

function relLum([r, g, b]: [number, number, number]): number {
  const norm = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function contrastRatio(a: string, b: string): number | null {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return null;
  const la = relLum(ca);
  const lb = relLum(cb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

interface ContrastRow {
  bg: string;
  fg: string;
  ratio: number | null;
  pass: boolean;
}

export function DesignLab() {
  const probeRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<ContrastRow[]>([]);

  useEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const cs = getComputedStyle(probe);
    const next: ContrastRow[] = PALETTE.map(([bgVar, fgVar]) => {
      const bg = cs.getPropertyValue(bgVar).trim();
      const fg = cs.getPropertyValue(fgVar).trim();
      const ratio = contrastRatio(bg, fg);
      return {
        bg: bgVar,
        fg: fgVar,
        ratio,
        pass: ratio !== null && ratio >= 4.5,
      };
    });
    setRows(next);
  }, []);

  const sampleStores = useMemo(
    () =>
      // Deterministic distribution so the page stays stable across re-renders
      // (and so the linter is satisfied — useMemo bodies are pure).
      Array.from({ length: 24 }).map((_, i) => ({
        id: `lab-${i}`,
        label: `Local ${i + 1}`,
        value: 1_000_000 + ((i * 1_037_357) % 9_000_000),
        health: (['A', 'B', 'C', 'D', 'E'] as HealthBucket[])[i % 5],
      })),
    [],
  );

  return (
    <div style={{ padding: '8px 28px 56px' }}>
      <div ref={probeRef} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden' }} />
      <TopBar
        eyebrow="Design lab"
        title={
          <>
            Primitivos contra los <i style={{ fontStyle: 'italic', color: 'var(--accent)' }}>tokens vivos</i>.
          </>
        }
        sub="Reporte de contraste WCAG AA + galería de componentes — ruta interna para verificar refactors de tokens."
      />

      <Section title="Surfaces y contraste WCAG AA">
        <div className="mq-card" style={{ padding: 18 }}>
          <table style={{ width: '100%', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-3)' }}>
                <th style={{ padding: '6px 8px' }}>Fondo</th>
                <th style={{ padding: '6px 8px' }}>Texto</th>
                <th style={{ padding: '6px 8px' }}>Ratio</th>
                <th style={{ padding: '6px 8px' }}>WCAG AA</th>
                <th style={{ padding: '6px 8px' }}>Vista</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.bg}-${r.fg}`} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td className="mq-mono" style={{ padding: '6px 8px' }}>{r.bg}</td>
                  <td className="mq-mono" style={{ padding: '6px 8px' }}>{r.fg}</td>
                  <td className="mq-mono" style={{ padding: '6px 8px' }}>{r.ratio ? r.ratio.toFixed(2) : '—'}</td>
                  <td style={{ padding: '6px 8px', color: r.pass ? 'var(--mint-deep)' : 'var(--coral)' }}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: `var(${r.bg})`,
                        color: `var(${r.fg})`,
                        fontWeight: 500,
                      }}
                    >
                      Texto de muestra
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Pills">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Pill tone="mint">A · 92</Pill>
          <Pill tone="violet">AI · forecast</Pill>
          <Pill tone="amber">Por vencer</Pill>
          <Pill tone="coral">Crítica</Pill>
          <Pill tone="sky">Info</Pill>
        </div>
      </Section>

      <Section title="KPI tiles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
          <KpiTile span={3} eyebrow="Ocupación" value="92.4%" delta={0.014} spark={DUMMY_SPARK} foot="vs mes anterior" />
          <KpiTile span={3} eyebrow="Ventas mes" value="$420M" delta={0.038} spark={DUMMY_SPARK} color="var(--violet)" />
          <KpiTile span={3} eyebrow="Salud media" value="84/100" foot="A 12 · B 7 · C 3" color="var(--mint)" />
          <KpiTile span={3} eyebrow="Vacancia" value="3" delta={-0.05} color="var(--coral)" />
        </div>
      </Section>

      <Section title="Mini KPIs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <MiniKpi label="Renta UF/m²" value="0.62" />
          <MiniKpi label="GLA (m²)" value="6,840" />
          <MiniKpi label="Tickets" value="184k" />
          <MiniKpi label="Ticket prom." value="$24.3K" />
        </div>
      </Section>

      <Section title="Sparklines + delta">
        <div className="mq-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Sparkline data={DUMMY_SPARK} ariaLabel="Sparkline de ventas mensuales" />
          <Spark values={DUMMY_SPARK} ariaLabel="Sparkline con relleno" />
          <Delta v={0.034} />
          <Delta v={-0.018} inverse />
          <BarStack value={0.72} />
        </div>
      </Section>

      <Section title="Health (5-color ramp A→E)">
        <div className="mq-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[92, 80, 65, 48, 32].map((v) => (
            <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <HealthRing value={v} size={56} />
              <HealthBar score={v} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Charts">
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
          <div className="mq-card" style={{ padding: 18 }}>
            <ForecastChart
              past={[120, 132, 128, 140, 155, 148]}
              base={[152, 158, 162, 168, 174, 180]}
              low={[140, 142, 144, 145, 147, 149]}
              high={[164, 174, 180, 192, 201, 211]}
              months={['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']}
            />
          </div>
          <div className="mq-card" style={{ padding: 18 }}>
            <CategoryDonut
              slices={[
                { name: 'Moda', value: 38 },
                { name: 'Gastronomía', value: 24 },
                { name: 'Tecnología', value: 16 },
                { name: 'Servicios', value: 14 },
                { name: 'Otros', value: 8 },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="MallPlan">
        <div className="mq-card" style={{ padding: 4 }}>
          <MallPlan stores={sampleStores} metric="health" />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="mq-card" style={{ padding: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="mq-btn primary">Primaria</button>
          <button type="button" className="mq-btn">Secundaria</button>
          <button type="button" className="mq-btn ghost sm">Ghost</button>
          <button type="button" className="mq-btn mint sm">Mint (data)</button>
          <button type="button" className="mq-btn violet sm">Violet (AI)</button>
          <button type="button" className="mq-btn primary" disabled>Disabled</button>
        </div>
      </Section>

      <Section title="Inline samples">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <div className="mq-card" style={{ padding: 18 }}>
            <div className="mq-h-eyebrow">Cuerpo de texto</div>
            <h3 className="mq-h2" style={{ marginTop: 6 }}>
              Cockpit editorial.
            </h3>
            <p className="mt-2" style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              MallIQ usa una tipografía editorial como ancla y mantiene la grilla apretada para que el operador
              encuentre la señal antes que el ruido.
            </p>
            <div style={{ marginTop: 12, display: 'inline-flex', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-deep)', fontSize: 12, fontWeight: 600 }}>
              accent badge
            </div>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <div className="t-eyebrow">Glass surface</div>
            <p style={{ fontSize: 13, marginTop: 6, color: 'var(--ink-2)' }}>
              Glass-card with capped opacity floor — body text in <code>var(--ink-2)</code> against this surface
              should pass WCAG AA in light mode.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Kpi (legacy)">
        <div className="mq-card" style={{ padding: 12 }}>
          <Kpi label="Ventas / m²" value="$240" unit="K" delta={0.025} sparkData={DUMMY_SPARK} />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 8 }}>
      <div className="mq-h-eyebrow" style={{ marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
