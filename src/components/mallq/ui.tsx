import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatM, healthBucket, healthColor, sparkPath, tenantColorClass, type HealthBucket } from '@/components/mallq/helpers';

/* ---------- Sparkline ---------- */
interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  stroke?: string;
  fill?: string | null;
  strokeWidth?: number;
  ariaLabel?: string;
}

export function Sparkline({ data, w = 96, h = 24, stroke = 'var(--ink-1)', fill = null, strokeWidth = 1.4, ariaLabel }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 2) - 1] as const);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${w},${h} L 0,${h} Z`;
  const last = pts[pts.length - 1];
  const label = ariaLabel ?? `Sparkline de ${data.length} puntos`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} role="img" aria-label={label}>
      <title>{label}</title>
      {fill ? <path d={area} fill={fill} opacity={0.18} /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2} fill={stroke} />
    </svg>
  );
}

/* ---------- Delta ---------- */
export function Delta({ v, d = 1, inverse = false }: { v: number; d?: number; inverse?: boolean }) {
  if (v === 0) {
    return <span className="mq-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>±0%</span>;
  }
  const up = v > 0;
  // For inverse metrics (like vacancy), up is bad and down is good.
  const tone = inverse ? (up ? 'var(--coral)' : 'var(--mint-deep)') : up ? 'var(--mint-deep)' : 'var(--coral)';
  return (
    <span className="mq-mono" style={{ fontSize: 11.5, color: tone, fontWeight: 600 }}>
      {up ? '▲' : '▼'} {Math.abs(v * 100).toFixed(d)}%
    </span>
  );
}

/* ---------- Kpi ---------- */
interface KpiProps {
  label: string;
  value: ReactNode;
  unit?: string;
  trend?: ReactNode;
  delta?: number;
  sparkData?: number[];
  sparkColor?: string;
}

export function Kpi({ label, value, unit, trend, delta, sparkData, sparkColor }: KpiProps) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 2 }}>
        {delta !== undefined ? <Delta v={delta} /> : null}
        {trend ? <span className="t-dim" style={{ fontSize: 11 }}>{trend}</span> : null}
      </div>
      {sparkData ? (
        <div className="spark">
          <Sparkline data={sparkData} w={80} h={24} stroke={sparkColor ?? 'var(--umber)'} fill={sparkColor ?? 'var(--umber)'} />
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Donut ---------- */
export function Donut({ value, size = 120, stroke = 14, color = 'var(--umber)' }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-3)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/* ---------- HealthRing (5-color ramp A→E) ---------- */
export function HealthRing({
  value,
  size = 42,
  stroke = 4,
  showLabel = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const off = c * (1 - clamped / 100);
  const bucket = healthBucket(clamped);
  const color = healthColor(bucket);
  const label = `Salud ${Math.round(clamped)}/100 (categoría ${bucket})`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <title>{label}</title>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {showLabel ? (
        <text
          x="50%"
          y="52%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.28, fontWeight: 600, fill: 'var(--ink-1)' }}
        >
          {Math.round(clamped)}
        </text>
      ) : null}
    </svg>
  );
}

/* ---------- Area Chart ---------- */
interface AreaChartProps {
  data: number[];
  w?: number;
  h?: number;
  labels?: string[];
  format?: (v: number) => string;
  stroke?: string;
}

export function AreaChart({ data, w = 720, h = 180, labels, format = (v) => String(v), stroke = 'var(--umber)' }: AreaChartProps) {
  const pad = { t: 10, r: 12, b: 22, l: 46 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const max = Math.max(...data, 1) * 1.1;
  const step = iw / Math.max(data.length - 1, 1);
  const xy = (v: number, i: number): [number, number] => [pad.l + i * step, pad.t + ih - (v / max) * ih];
  const pts = data.map(xy);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${pad.l + iw},${pad.t + ih} L ${pad.l},${pad.t + ih} Z`;
  const yticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ y: pad.t + ih * (1 - t), v: max * t }));
  const gradId = `mqag-${Math.round(Math.random() * 1e6)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {yticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={pad.l + iw} y1={t.y} y2={t.y} stroke="var(--line)" strokeDasharray="2 3" />
          <text x={pad.l - 8} y={t.y + 3} textAnchor="end" style={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
            {format(t.v)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 0} fill={stroke} />
      ))}
      {labels?.map((lab, i) => (
        <text
          key={i}
          x={pad.l + i * step}
          y={h - 6}
          textAnchor="middle"
          style={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'var(--sans)' }}
        >
          {lab}
        </text>
      ))}
    </svg>
  );
}

/* ---------- Tenant logo chip ---------- */
export function TenantLogo({ name, seed, size = 'md', className }: { name: string; seed?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const words = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
  const colorCls = tenantColorClass(seed ?? name);
  return (
    <div className={cn('logo-chip', size === 'sm' && 'sm', size === 'lg' && 'lg', colorCls, className)}>
      {initials.toUpperCase() || '·'}
    </div>
  );
}

/* ---------- Status chips ---------- */
const LIFE_MAP = {
  vigente: { cls: 'ok', label: 'Vigente' },
  por_vencer: { cls: 'warn', label: 'Por vencer' },
  vencido: { cls: 'danger', label: 'Vencido' },
  en_firma: { cls: 'info', label: 'En firma' },
  borrador: { cls: 'ghost', label: 'Borrador' },
} as const;

export function LifeChip({ status }: { status: keyof typeof LIFE_MAP | string }) {
  const entry = (LIFE_MAP as Record<string, { cls: string; label: string }>)[status] ?? LIFE_MAP.borrador;
  return (
    <span className={cn('chip', entry.cls)}>
      <span className="dot" />
      {entry.label}
    </span>
  );
}

const SIG_MAP = {
  firmado: { cls: 'ok', label: 'Firmado' },
  en_revision: { cls: 'warn', label: 'En revisión' },
  pendiente: { cls: 'danger', label: 'Pendiente' },
} as const;

export function SigChip({ status }: { status: keyof typeof SIG_MAP | string }) {
  const entry = (SIG_MAP as Record<string, { cls: string; label: string }>)[status] ?? SIG_MAP.pendiente;
  return (
    <span className={cn('chip', entry.cls)}>
      <span className="dot" />
      {entry.label}
    </span>
  );
}

/* ---------- TopBar (editorial page header) ---------- */
export function TopBar({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        padding: '32px 4px 28px',
        marginBottom: 16,
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <div className="mq-h-eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div> : null}
        <h1 className="mq-h1" style={{ margin: 0 }}>
          {title}
        </h1>
        {sub ? (
          <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--ink-3)', maxWidth: 640, lineHeight: 1.5 }}>{sub}</p>
        ) : null}
      </div>
      {right ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div> : null}
    </header>
  );
}

/* ---------- Pill helper ---------- */
export function Pill({
  tone = 'default',
  children,
  dot = true,
}: {
  tone?: 'default' | 'mint' | 'violet' | 'amber' | 'coral' | 'sky';
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={cn('mq-pill', tone !== 'default' && tone)}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}

/* ---------- Spark (responsive sparkline) ---------- */
export function Spark({
  values,
  color = 'var(--mint-deep)',
  height = 36,
  fill = true,
  ariaLabel,
}: {
  values: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(160);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setW(Math.max(40, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { line, area } = useMemo(() => sparkPath(values, w, height, 3), [values, w, height]);
  const gradId = useId();
  const titleId = useId();
  const label = ariaLabel ?? 'Tendencia mensual';
  return (
    <div ref={ref} className="mq-spark" style={{ height, position: 'relative' }}>
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        style={{ display: 'block' }}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{label}</title>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {fill && area ? <path d={area} fill={`url(#${gradId})`} /> : null}
        {line ? <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
      </svg>
    </div>
  );
}

/* ---------- BarStack (single-bar progress) ---------- */
export function BarStack({ value, color = 'var(--mint-deep)' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${(pct * 100).toFixed(1)}%`,
          background: color,
          borderRadius: 999,
          transition: 'width .6s var(--ease-emphasized)',
        }}
      />
    </div>
  );
}

/* ---------- KpiTile (bento KPI with sparkline) ---------- */
export function KpiTile({
  span = 3,
  eyebrow,
  value,
  delta,
  spark,
  color = 'var(--mint-deep)',
  foot,
  onClick,
}: {
  span?: number;
  eyebrow: ReactNode;
  value: ReactNode;
  delta?: number;
  spark?: number[];
  color?: string;
  foot?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="mq-card kpi"
      style={{
        gridColumn: `span ${span}`,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 132,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="mq-h-eyebrow">{eyebrow}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
        <span className="mq-num-l">{value}</span>
        {delta !== undefined ? <Delta v={delta} /> : null}
      </div>
      {spark ? <Spark values={spark} color={color} /> : null}
      {foot ? <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{foot}</div> : null}
    </div>
  );
}

/* ---------- MiniKpi (narrower tile w/ progress bar) ---------- */
export function MiniKpi({
  span = 3,
  label,
  value,
  delta,
  color = 'var(--mint-deep)',
  inverse = false,
  bar,
}: {
  span?: number;
  label: ReactNode;
  value: ReactNode;
  delta?: number;
  color?: string;
  inverse?: boolean;
  bar?: number;
}) {
  return (
    <div
      className="mq-card"
      style={{
        gridColumn: `span ${span}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div className="mq-h-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mq-num-l">{value}</span>
        {delta !== undefined ? <Delta v={delta} inverse={inverse} /> : null}
      </div>
      {bar !== undefined ? <BarStack value={bar} color={color} /> : null}
    </div>
  );
}

/* ---------- HealthBar (tile + bar + score, used in Locatarios rows) ---------- */
export function HealthBar({ score, bucket }: { score: number; bucket?: HealthBucket }) {
  const b = bucket ?? healthBucket(score);
  const color = healthColor(b);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          background: color,
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {b}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: '100%', background: color }} />
        </div>
      </div>
      <span className="mq-mono" style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600, minWidth: 26, textAlign: 'right' }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

/* ---------- SemaforoStrip (A→E ribbon + 5 columns) ---------- */
export function SemaforoStrip({ buckets }: { buckets: Record<HealthBucket, number> }) {
  const total = (['A', 'B', 'C', 'D', 'E'] as HealthBucket[]).reduce((sum, k) => sum + (buckets[k] || 0), 0);
  return (
    <div className="mq-card" style={{ padding: 18 }}>
      <div className="mq-h-eyebrow" style={{ marginBottom: 12 }}>
        Semáforo · salud del portafolio
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        {(['A', 'B', 'C', 'D', 'E'] as HealthBucket[]).map((k) => {
          const pct = total > 0 ? (buckets[k] || 0) / total : 0;
          return <span key={k} style={{ flex: pct === 0 ? 0.001 : pct, background: healthColor(k) }} />;
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {(['A', 'B', 'C', 'D', 'E'] as HealthBucket[]).map((k) => {
          const count = buckets[k] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={k} style={{ borderRadius: 12, background: 'var(--surface-2)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: healthColor(k) }} />
                <span className="mq-h-eyebrow">{k}</span>
              </div>
              <div className="mq-num-l" style={{ fontSize: 22 }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{pct.toFixed(0)}% del portafolio</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- ComponentBar (single check row in tenant detail) ---------- */
export function ComponentBar({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--hairline)' }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: ok ? 'var(--mint-soft)' : 'var(--coral-soft)',
          color: ok ? 'var(--mint-deep)' : 'var(--coral)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {ok ? '✓' : '✕'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{label}</div>
        {detail ? <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{detail}</div> : null}
      </div>
    </div>
  );
}

/* ---------- AiTask (violet-tinted task card) ---------- */
export function AiTask({
  eyebrow = 'Asistente',
  title,
  body,
  cta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <div className="ai-halo mq-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="mq-h-eyebrow" style={{ color: 'var(--violet-deep)' }}>
        {eyebrow}
      </div>
      <div className="mq-h2">{title}</div>
      {body ? <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{body}</div> : null}
      {cta ? <div style={{ marginTop: 6 }}>{cta}</div> : null}
    </div>
  );
}

/* ---------- InsightCard (small AI insight grid item) ---------- */
export function InsightCard({
  tone = 'violet',
  title,
  body,
  action,
}: {
  tone?: 'mint' | 'violet' | 'amber' | 'coral' | 'sky';
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  const accent: Record<string, string> = {
    mint: 'var(--mint)',
    violet: 'var(--violet)',
    amber: 'var(--amber)',
    coral: 'var(--coral)',
    sky: 'var(--sky)',
  };
  return (
    <div
      className="mq-card"
      style={{
        padding: 14,
        borderLeft: `3px solid ${accent[tone] ?? accent.violet}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{title}</div>
      {body ? <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{body}</div> : null}
      {action ? <div style={{ marginTop: 4 }}>{action}</div> : null}
    </div>
  );
}

/* ---------- Term (definition row) ---------- */
export function Term({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '6px 0', borderTop: '1px solid var(--hairline)' }}>
      <span style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span className="mq-mono" style={{ fontSize: 12.5, color: 'var(--ink-1)' }}>
        {value}
      </span>
    </div>
  );
}

/* ---------- Stat (label + big number) ---------- */
export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="mq-h-eyebrow">{label}</div>
      <div className="mq-num-l">{value}</div>
      {hint ? <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{hint}</div> : null}
    </div>
  );
}

/* ---------- CategoryHeatmap (months × categories grid) ---------- */
export function CategoryHeatmap({
  months,
  categories,
}: {
  months: string[];
  categories: { name: string; values: number[] }[];
}) {
  const allVals = categories.flatMap((c) => c.values);
  const max = Math.max(...allVals, 1);
  return (
    <div className="mq-card" style={{ padding: 16 }}>
      <div className="mq-h-eyebrow" style={{ marginBottom: 10 }}>
        Mapa de calor · ventas por categoría
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${months.length}, 1fr)`, gap: 4, fontSize: 11 }}>
        <div />
        {months.map((m) => (
          <div key={m} style={{ textAlign: 'center', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
            {m}
          </div>
        ))}
        {categories.map((c) => (
          <FragmentRow key={c.name} name={c.name} values={c.values} max={max} />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({ name, values, max }: { name: string; values: number[]; max: number }) {
  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center' }}>{name}</div>
      {values.map((v, i) => {
        const ratio = max > 0 ? v / max : 0;
        const bg = ratio > 0.05 ? `color-mix(in oklab, var(--mint) ${Math.round(ratio * 90)}%, var(--surface-2))` : 'var(--surface-2)';
        return (
          <div
            key={i}
            title={`${name}: ${formatM(v)}`}
            style={{ height: 26, borderRadius: 4, background: bg }}
          />
        );
      })}
    </>
  );
}

/* ---------- ExpiryRiver (small horizontal bar of upcoming expirations) ---------- */
export function ExpiryRiver({ counts }: { counts: { label: string; count: number; tone?: 'mint' | 'amber' | 'coral' }[] }) {
  const total = counts.reduce((s, x) => s + x.count, 0) || 1;
  return (
    <div className="mq-card" style={{ padding: 16 }}>
      <div className="mq-h-eyebrow" style={{ marginBottom: 10 }}>
        Vencimientos próximos
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden' }}>
        {counts.map((c, i) => (
          <span
            key={i}
            style={{
              flex: c.count / total,
              background:
                c.tone === 'coral' ? 'var(--coral)' : c.tone === 'amber' ? 'var(--amber)' : 'var(--mint)',
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {counts.map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    c.tone === 'coral' ? 'var(--coral)' : c.tone === 'amber' ? 'var(--amber)' : 'var(--mint)',
                }}
              />
              {c.label}
            </span>
            <span className="mq-mono" style={{ color: 'var(--ink-1)', fontWeight: 600 }}>
              {c.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- ContractTimeline (river of contract bars colored by health) ---------- */
export function ContractTimeline({
  contracts,
  today,
  height = 320,
  ariaLabel,
}: {
  contracts: { id: string; storeName: string; startDate: string; endDate: string; healthScore: number }[];
  today: Date;
  height?: number;
  ariaLabel?: string;
}) {
  if (contracts.length === 0) {
    return (
      <div className="mq-card" style={{ padding: 16, height, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
        Sin contratos para visualizar.
      </div>
    );
  }
  const allTimes = contracts.flatMap((c) => [new Date(c.startDate).getTime(), new Date(c.endDate).getTime()]).filter((t) => !Number.isNaN(t));
  const min = Math.min(...allTimes, today.getTime());
  const max = Math.max(...allTimes, today.getTime());
  const span = Math.max(1, max - min);
  const visible = contracts.slice(0, 18);
  const rowH = Math.max(16, Math.floor((height - 56) / Math.max(visible.length, 1)));
  const todayPct = ((today.getTime() - min) / span) * 100;
  return (
    <div
      className="mq-card"
      style={{ padding: 16, position: 'relative' }}
      role="img"
      aria-label={ariaLabel ?? `Línea de tiempo de ${contracts.length} contratos`}
    >
      <div className="mq-h-eyebrow" style={{ marginBottom: 12 }}>
        Línea de contratos
      </div>
      <div style={{ position: 'relative', height: rowH * visible.length + 24 }}>
        {/* today marker */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 16,
            left: `${todayPct}%`,
            width: 1,
            background: 'var(--coral)',
            opacity: 0.7,
            zIndex: 2,
          }}
        />
        <div style={{ position: 'absolute', top: -2, left: `calc(${todayPct}% + 4px)`, fontSize: 10, color: 'var(--coral)', fontWeight: 600 }}>
          hoy
        </div>
        {visible.map((c, i) => {
          const start = new Date(c.startDate).getTime();
          const end = new Date(c.endDate).getTime();
          if (Number.isNaN(start) || Number.isNaN(end)) return null;
          const left = ((start - min) / span) * 100;
          const width = Math.max(1, ((end - start) / span) * 100);
          const color = healthColor(healthBucket(c.healthScore));
          return (
            <div key={c.id} style={{ position: 'absolute', top: i * rowH + 4, left: 0, right: 0, height: rowH, fontSize: 11 }}>
              <span style={{ position: 'absolute', left: 0, top: 2, color: 'var(--ink-3)', whiteSpace: 'nowrap', maxWidth: '20%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.storeName}
              </span>
              <span
                title={`${c.storeName}: ${c.startDate} → ${c.endDate}`}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 6,
                  height: rowH - 12,
                  background: color,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- ForecastChart (past + base/low/high bands) ---------- */
export function ForecastChart({
  past,
  base,
  low,
  high,
  months,
  height = 240,
  ariaLabel,
}: {
  past: number[];
  base: number[];
  low: number[];
  high: number[];
  months: string[];
  height?: number;
  ariaLabel?: string;
}) {
  const w = 720;
  const pad = { t: 12, r: 12, b: 28, l: 50 };
  const allValues = [...past, ...base, ...low, ...high];
  const max = Math.max(...allValues, 1) * 1.1;
  const totalCount = past.length + base.length;
  const step = (w - pad.l - pad.r) / Math.max(totalCount - 1, 1);
  const xy = (v: number, i: number): [number, number] => [
    pad.l + i * step,
    pad.t + (height - pad.t - pad.b) - (v / max) * (height - pad.t - pad.b),
  ];
  const path = (vals: number[], offset: number) => vals.map((v, i) => (i === 0 ? 'M' : 'L') + xy(v, i + offset).map((n) => n.toFixed(1)).join(',')).join(' ');
  const pastPath = path(past, 0);
  const basePath = past.length > 0 ? `M ${xy(past[past.length - 1], past.length - 1).map((n) => n.toFixed(1)).join(',')} ${base.map((v, i) => 'L ' + xy(v, past.length + i).map((n) => n.toFixed(1)).join(',')).join(' ')}` : path(base, 0);
  const bandTop = high.map((v, i) => xy(v, past.length + i));
  const bandBot = low.map((v, i) => xy(v, past.length + i));
  const bandPath = bandTop.length > 0 ? `M ${bandTop.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L ')} L ${[...bandBot].reverse().map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L ')} Z` : '';
  const label = ariaLabel ?? `Forecast con histórico de ${past.length} meses y proyección de ${base.length}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      style={{ width: '100%', height }}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <line x1={pad.l + (past.length - 1) * step} y1={pad.t} x2={pad.l + (past.length - 1) * step} y2={height - pad.b} stroke="var(--hairline-strong)" strokeDasharray="3 3" />
      {bandPath ? <path d={bandPath} fill="var(--violet-soft)" opacity={0.6} /> : null}
      <path d={pastPath} fill="none" stroke="var(--ink-1)" strokeWidth={1.6} strokeLinejoin="round" />
      <path d={basePath} fill="none" stroke="var(--violet)" strokeWidth={1.8} strokeDasharray="0" strokeLinejoin="round" />
      {months.map((m, i) => (
        <text key={m + i} x={pad.l + i * step} y={height - 8} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
          {m}
        </text>
      ))}
    </svg>
  );
}

/* ---------- FootfallChart (small line chart for foot traffic) ---------- */
export function FootfallChart({ data, height = 160 }: { data: number[]; height?: number }) {
  return <AreaChart data={data} h={height} stroke="var(--violet)" />;
}

/* ---------- CategoryDonut (simple pie/donut for category mix) ---------- */
export function CategoryDonut({
  slices,
  size = 160,
  ariaLabel,
}: {
  slices: { name: string; value: number; color?: string }[];
  size?: number;
  ariaLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  // Pre-compute cumulative offsets so we never mutate during render.
  const offsets: number[] = [];
  for (let i = 0; i < slices.length; i += 1) {
    const last = i === 0 ? 0 : offsets[i - 1] + (slices[i - 1].value / total) * c;
    offsets.push(last);
  }
  const label = ariaLabel ?? `Composición por categoría con ${slices.length} segmentos`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={14} />
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const offset = -offsets[i];
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color ?? `var(--health-${'abcde'.charAt(i % 5)})`}
              strokeWidth={14}
              strokeDasharray={dash}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color ?? `var(--health-${'abcde'.charAt(i % 5)})` }} />
            <span style={{ flex: 1, color: 'var(--ink-2)' }}>{s.name}</span>
            <span className="mq-mono" style={{ color: 'var(--ink-1)' }}>{((s.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- MallPlan (simple grid floor plan) ---------- */
export interface PlanStore {
  id: string;
  label: string;
  value: number;
  health?: HealthBucket;
  vacant?: boolean;
}
export function MallPlan({
  stores,
  metric = 'sales',
  selectedId,
  onSelect,
  ariaLabel,
}: {
  stores: PlanStore[];
  metric?: 'sales' | 'health';
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
}) {
  const max = Math.max(...stores.map((s) => s.value), 1);
  return (
    <div
      className="mallmap"
      style={{ padding: 14 }}
      role="img"
      aria-label={ariaLabel ?? `Plano del mall con ${stores.length} locales (métrica: ${metric === 'health' ? 'salud' : 'ventas'})`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8 }}>
        {stores.map((s) => {
          const bg = s.vacant
            ? 'var(--heat-vacant)'
            : metric === 'health'
              ? healthColor(s.health ?? 'C')
              : `color-mix(in oklab, var(--mint) ${Math.round((s.value / max) * 100)}%, var(--surface-2))`;
          const sel = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect?.(s.id)}
              style={{
                aspectRatio: '1.2 / 1',
                borderRadius: 8,
                background: bg,
                border: sel ? '2px solid var(--ink-1)' : '1px solid var(--hairline)',
                color: 'var(--ink-1)',
                fontSize: 11,
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                cursor: onSelect ? 'pointer' : 'default',
                transition: 'transform .12s, box-shadow .12s',
              }}
              title={s.label}
            >
              <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s.label}</span>
              <span className="mq-mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
                {s.vacant ? 'libre' : metric === 'health' ? s.health : formatM(s.value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- RentSteps (horizontal Gantt of rent steps) ---------- */
export function RentSteps({
  steps,
  today,
}: {
  steps: { startDate: string; endDate: string; rentaFijaUfM2: number }[];
  today: Date;
}) {
  if (steps.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: 8 }}>Sin escalonamiento de renta.</div>;
  }
  const times = steps.flatMap((s) => [new Date(s.startDate).getTime(), new Date(s.endDate).getTime()]);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(1, max - min);
  const todayPct = ((today.getTime() - min) / span) * 100;
  const maxRent = Math.max(...steps.map((s) => s.rentaFijaUfM2), 0.01);
  return (
    <div style={{ position: 'relative', padding: '10px 0' }}>
      {steps.map((s, i) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        const left = ((start - min) / span) * 100;
        const width = Math.max(1, ((end - start) / span) * 100);
        const intensity = Math.round((s.rentaFijaUfM2 / maxRent) * 100);
        return (
          <div key={i} style={{ height: 28, position: 'relative', marginBottom: 6 }}>
            <span
              title={`${s.startDate} → ${s.endDate} · ${s.rentaFijaUfM2.toFixed(2)} UF/m²`}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: 4,
                height: 20,
                background: `color-mix(in oklab, var(--mint-deep) ${intensity}%, var(--surface-3))`,
                borderRadius: 4,
                fontSize: 10,
                color: 'var(--ink-1)',
                fontFamily: 'var(--font-mono)',
                paddingLeft: 6,
                lineHeight: '20px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {s.rentaFijaUfM2.toFixed(2)} UF/m²
            </span>
          </div>
        );
      })}
      {todayPct >= 0 && todayPct <= 100 ? (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayPct}%`, width: 1, background: 'var(--coral)' }} />
      ) : null}
    </div>
  );
}

/* ---------- ArrearsTimeline (horizontal payment-status row) ---------- */
export function ArrearsTimeline({ months }: { months: { label: string; status: 'paid' | 'late' | 'pending' }[] }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {months.map((m, i) => {
        const tone = m.status === 'paid' ? 'var(--mint)' : m.status === 'late' ? 'var(--coral)' : 'var(--amber)';
        return (
          <div key={i} title={`${m.label}: ${m.status}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ width: '100%', height: 24, borderRadius: 4, background: tone, opacity: 0.85 }} />
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Used by the layout/Sidebar AppLayout to render bento containers ---------- */
export function Bento({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="mq-bento" style={style}>
      {children}
    </div>
  );
}

