import { useMemo } from 'react';
import type { RentStep } from '@/lib/domain';
import { formatDate } from '@/lib/format';

interface RentStepGanttProps {
  steps: RentStep[];
  contractStart: string;
  contractEnd: string;
}

function parseDate(value: string): number {
  return new Date(value).getTime();
}

export function RentStepGantt({ steps, contractStart, contractEnd }: RentStepGanttProps) {
  const startMs = parseDate(contractStart);
  const endMs = parseDate(contractEnd);
  const totalMs = Math.max(1, endMs - startMs);

  const items = useMemo(() => {
    return [...steps]
      .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate))
      .map((step) => {
        const s = Math.max(startMs, parseDate(step.startDate));
        const e = Math.min(endMs, parseDate(step.endDate));
        const left = ((s - startMs) / totalMs) * 100;
        const width = ((e - s) / totalMs) * 100;
        return { step, left: Math.max(0, left), width: Math.max(2, Math.min(100, width)) };
      });
  }, [steps, startMs, endMs, totalMs]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Desktop / tablet timeline */}
      <div className="hidden md:block">
        <div className="relative h-24 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4">
          {/* axis ticks */}
          <div className="absolute inset-x-4 top-0 flex justify-between pt-2 text-[10px] text-[var(--sidebar-fg)]">
            <span>{formatDate(contractStart)}</span>
            <span>{formatDate(contractEnd)}</span>
          </div>
          {/* bars */}
          <div className="absolute inset-x-4 top-8 bottom-3">
            {items.map(({ step, left, width }) => (
              <div
                key={step.id}
                className="absolute top-1/2 h-8 -translate-y-1/2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-2 text-[10px] font-semibold text-white shadow-sm"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${formatDate(step.startDate)} – ${formatDate(step.endDate)} · ${step.rentaFijaUfM2} UF/m²`}
              >
                <div className="flex h-full items-center justify-between gap-2 overflow-hidden">
                  <span className="truncate">{step.rentaFijaUfM2} UF/m²</span>
                  <span className="shrink-0 opacity-80">{formatDate(step.startDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {items.map(({ step, width }) => {
          const durationDays = Math.max(1, Math.round((parseDate(step.endDate) - parseDate(step.startDate)) / (1000 * 60 * 60 * 24)));
          return (
            <div key={step.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{step.rentaFijaUfM2} UF/m²</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">{formatDate(step.startDate)} – {formatDate(step.endDate)}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {durationDays} días
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-[var(--card-bg)]">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500"
                  style={{ width: `${Math.max(5, Math.min(100, width))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
