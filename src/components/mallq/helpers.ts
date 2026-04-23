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
