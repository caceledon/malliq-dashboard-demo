// Track 5 — renewal-probability badge with an audit expander.
// The expander is rendered inline so the operator can see *why* the score is
// what it is, factor by factor.
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RenewalScore } from '@/lib/renewal';

const BUCKET_STYLES: Record<RenewalScore['bucket'], { bg: string; fg: string; label: string }> = {
  alto: {
    bg: 'color-mix(in oklab, var(--mint-deep) 14%, transparent)',
    fg: 'var(--mint-deep)',
    label: 'Renovable',
  },
  medio: {
    bg: 'color-mix(in oklab, var(--warn) 14%, transparent)',
    fg: 'var(--warn)',
    label: 'Atención',
  },
  bajo: {
    bg: 'color-mix(in oklab, var(--danger) 14%, transparent)',
    fg: 'var(--danger)',
    label: 'En riesgo',
  },
  na: {
    bg: 'color-mix(in oklab, var(--ink-3) 10%, transparent)',
    fg: 'var(--ink-3)',
    label: 'No aplica',
  },
};

export function RenewalBadge({
  score,
  showBreakdown = true,
}: {
  score: RenewalScore;
  showBreakdown?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const style = BUCKET_STYLES[score.bucket];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: style.bg, color: style.fg }}
        >
          {style.label}
          {score.bucket === 'na' ? null : <span style={{ opacity: 0.85 }}>· {score.probability}%</span>}
        </span>
        {showBreakdown && score.factors.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--sidebar-fg)] hover:text-[var(--ink-1)]"
            aria-expanded={open}
            aria-label={open ? 'Ocultar desglose de renovación' : 'Ver desglose de renovación'}
          >
            {open ? 'Ocultar' : 'Por qué'}
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="rounded-xl border border-[var(--border-color)] p-3 text-xs">
          <p className="text-[var(--sidebar-fg)]">
            Cálculo transparente: cada factor aporta valor × peso. Suma → probabilidad estimada.
          </p>
          <ul className="mt-2 space-y-1.5">
            {score.factors.map((factor) => (
              <li key={factor.key} className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="font-medium">{factor.label}</span>
                  <span className="ml-1 text-[var(--sidebar-fg)]">— {factor.detail}</span>
                </div>
                <span
                  className="font-mono"
                  style={{ color: factor.value >= 0.7 ? 'var(--mint-deep)' : factor.value <= 0.3 ? 'var(--danger)' : 'var(--ink-2)' }}
                >
                  {(factor.value * 100).toFixed(0)}% × {factor.weight.toFixed(2)} =
                  {' '}
                  {(factor.value * factor.weight * 100).toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
