import type { CSSProperties } from 'react';

const TENANT_COLOR_CLASSES = ['lc-1', 'lc-2', 'lc-3', 'lc-4', 'lc-5', 'lc-6', 'lc-7', 'lc-8'] as const;

export function tenantColorClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TENANT_COLOR_CLASSES[h % TENANT_COLOR_CLASSES.length];
}

export function heatFill(value: number | null | undefined, avg: number): string {
  if (value == null) return 'var(--heat-vacant)';
  const ratio = avg > 0 ? value / avg : 1;
  if (ratio < 0.55) return 'var(--heat-1)';
  if (ratio < 0.8) return 'var(--heat-2)';
  if (ratio < 1.05) return 'var(--heat-3)';
  if (ratio < 1.35) return 'var(--heat-4)';
  return 'var(--heat-5)';
}

export const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };

/** A→E bucket from a 0-100 health score. */
export type HealthBucket = 'A' | 'B' | 'C' | 'D' | 'E';
export function healthBucket(score: number): HealthBucket {
  if (score >= 88) return 'A';
  if (score >= 76) return 'B';
  if (score >= 60) return 'C';
  if (score >= 44) return 'D';
  return 'E';
}

/** Token color for an A–E bucket. */
export function healthColor(bucket: HealthBucket): string {
  switch (bucket) {
    case 'A':
      return 'var(--health-a)';
    case 'B':
      return 'var(--health-b)';
    case 'C':
      return 'var(--health-c)';
    case 'D':
      return 'var(--health-d)';
    case 'E':
      return 'var(--health-e)';
  }
}

/** Compact money formatter ("$1.2M", "$840K"). */
export function formatM(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/** Percentage formatter — pass `signed` to prepend +/− and never show "+0%". */
export function formatPct(n: number, signed = false, decimals = 1): string {
  const v = (n * 100).toFixed(decimals);
  if (!signed) return `${v}%`;
  if (n > 0) return `+${v}%`;
  if (n < 0) return `${v}%`;
  return `0%`;
}

/** Build SVG path string for a sparkline with optional padding. */
export function sparkPath(values: number[], w = 100, h = 30, pad = 2): { line: string; area: string } {
  if (!values || values.length === 0) return { line: '', area: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (w - pad * 2) / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)] as const);
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = `${line} L ${pad + (values.length - 1) * step},${h - pad} L ${pad},${h - pad} Z`;
  return { line, area };
}
