import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tenantColorClass } from '@/components/mallq/helpers';

/* ---------- Sparkline ---------- */
interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  stroke?: string;
  fill?: string | null;
  strokeWidth?: number;
}

export function Sparkline({ data, w = 96, h = 24, stroke = 'var(--ink-1)', fill = null, strokeWidth = 1.4 }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 2) - 1] as const);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${w},${h} L 0,${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {fill ? <path d={area} fill={fill} opacity={0.18} /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2} fill={stroke} />
    </svg>
  );
}

/* ---------- Delta ---------- */
export function Delta({ v, d = 1 }: { v: number; d?: number }) {
  if (v === 0) {
    return <span className="t-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>±0%</span>;
  }
  const up = v > 0;
  return (
    <span className={cn('delta', up ? 'up' : 'down')} style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: up ? 'var(--ok)' : 'var(--danger)' }}>
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

/* ---------- HealthRing ---------- */
export function HealthRing({ value, size = 42, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  const color = value >= 85 ? 'var(--ok)' : value >= 70 ? 'var(--warn)' : 'var(--danger)';
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
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: 'var(--mono)', fontSize: size * 0.28, fontWeight: 600, fill: 'var(--ink-1)' }}
      >
        {value}
      </text>
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

