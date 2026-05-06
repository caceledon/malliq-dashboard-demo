// Track 4 — stacking plan + occupancy timeline.
//
// Renders the active Activo as a stacked grid coloured by lease lifecycle at
// the scrubber month. Hovering a unit shows the contract behind it; clicking
// jumps to the LocatarioDetail.
//
// "Lifecycle at month M" is computed by replaying getContractLifecycle with
// referenceDate=first day of M, so the same logic that powers alerts and the
// dashboard drives this view too.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { monthLabel, monthKey, startOfToday, type ContractLifecycle } from '@/lib/domain';
import { buildUnitStates, type UnitCellState } from '@/lib/stackingPlan';
import { useAppState } from '@/store/appState';

const LIFECYCLE_COLOR: Record<ContractLifecycle | 'vacante', { bg: string; fg: string; label: string }> = {
  vigente: { bg: 'var(--mint-deep)', fg: '#fff', label: 'Vigente' },
  por_vencer: { bg: 'var(--warn)', fg: '#fff', label: 'Por vencer' },
  vencido: { bg: 'var(--danger)', fg: '#fff', label: 'Vencido' },
  borrador: { bg: 'var(--ink-3)', fg: '#fff', label: 'Borrador' },
  en_firma: { bg: 'var(--info)', fg: '#fff', label: 'En firma' },
  vacante: { bg: 'color-mix(in oklab, var(--paper-2) 80%, transparent)', fg: 'var(--ink-2)', label: 'Vacante' },
};

function groupUnitsByLevel(states: UnitCellState[]): Map<string, UnitCellState[]> {
  const grouped = new Map<string, UnitCellState[]>();
  for (const state of states) {
    const level = state.unit.level || 'P0';
    const bucket = grouped.get(level) ?? [];
    bucket.push(state);
    grouped.set(level, bucket);
  }
  for (const [level, bucket] of grouped) {
    bucket.sort((a, b) => a.unit.code.localeCompare(b.unit.code, 'es'));
    grouped.set(level, bucket);
  }
  return grouped;
}

export function StackingPlan() {
  const { state, isFeatureEnabled } = useAppState();
  const navigate = useNavigate();
  const enabled = isFeatureEnabled('stackingPlan');
  const [offset, setOffset] = useState(0);

  const referenceDate = useMemo(() => {
    const base = startOfToday();
    return new Date(base.getFullYear(), base.getMonth() + offset, 1);
  }, [offset]);

  const cellStates = useMemo(
    () => buildUnitStates(state.units, state.contracts, referenceDate),
    [state.units, state.contracts, referenceDate],
  );
  const grouped = useMemo(() => groupUnitsByLevel(cellStates), [cellStates]);
  const totals = useMemo(() => {
    const counts: Record<string, number> = { vigente: 0, por_vencer: 0, en_firma: 0, borrador: 0, vencido: 0, vacante: 0 };
    for (const cell of cellStates) {
      counts[cell.status] = (counts[cell.status] ?? 0) + 1;
    }
    return counts;
  }, [cellStates]);

  if (!enabled) return null;
  if (state.units.length === 0) {
    return (
      <section className="glass-card p-5" aria-label="Stacking plan">
        <h3 className="text-sm font-semibold">Stacking plan</h3>
        <p className="mt-2 text-sm text-[var(--sidebar-fg)]">
          Carga locales en este activo para visualizar el plano de ocupación.
        </p>
      </section>
    );
  }

  const levels = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a, 'es'));
  const monthLabelText = monthLabel(monthKey(referenceDate));

  return (
    <section className="glass-card p-5" aria-label="Stacking plan">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Stacking plan · {monthLabelText}</h3>
          <p className="text-xs text-[var(--sidebar-fg)]">
            Estado de cada local en el mes seleccionado. Mueve el control para proyectar a futuro.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--sidebar-fg)]">
          <button
            type="button"
            onClick={() => setOffset((value) => Math.max(value - 1, -12))}
            className="rounded-lg border border-[var(--border-color)] px-2 py-1 font-mono text-[11px]"
            aria-label="Mes anterior"
          >
            ◀
          </button>
          <input
            type="range"
            min={-12}
            max={36}
            value={offset}
            onChange={(event) => setOffset(Number(event.target.value))}
            aria-label="Offset de meses para el stacking plan"
            style={{ accentColor: 'var(--violet-deep)' }}
          />
          <button
            type="button"
            onClick={() => setOffset((value) => Math.min(value + 1, 36))}
            className="rounded-lg border border-[var(--border-color)] px-2 py-1 font-mono text-[11px]"
            aria-label="Mes siguiente"
          >
            ▶
          </button>
          <span className="font-mono text-[11px]">{offset >= 0 ? `+${offset}` : offset} m</span>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
        {(Object.entries(LIFECYCLE_COLOR) as [keyof typeof LIFECYCLE_COLOR, typeof LIFECYCLE_COLOR.vigente][]).map(([key, color]) => (
          <span key={key} className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] px-2 py-0.5">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color.bg, display: 'inline-block' }} />
            {color.label}
            <span className="font-mono text-[var(--sidebar-fg)]">{totals[key as string] ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {levels.map((level) => {
          const cells = grouped.get(level) ?? [];
          return (
            <div key={level}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-fg)]">{level}</div>
              <div className="mt-1 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
                {cells.map((cell) => {
                  const palette = LIFECYCLE_COLOR[cell.status];
                  return (
                    <button
                      key={cell.unit.id}
                      type="button"
                      onClick={() =>
                        cell.contract ? navigate(`/admin/locatarios/${cell.contract.id}`) : undefined
                      }
                      title={
                        cell.contract
                          ? `${cell.unit.code} · ${cell.contract.storeName} · ${palette.label}`
                          : `${cell.unit.code} · vacante`
                      }
                      className="flex flex-col items-start rounded-lg border border-transparent px-2 py-1.5 text-left transition-shadow hover:shadow-sm"
                      style={{ background: palette.bg, color: palette.fg, cursor: cell.contract ? 'pointer' : 'default' }}
                    >
                      <span className="font-mono text-[11px]" style={{ opacity: 0.85 }}>
                        {cell.unit.code}
                      </span>
                      <span className="text-[11px] truncate" style={{ maxWidth: '100%' }}>
                        {cell.contract?.storeName ?? '—'}
                      </span>
                      <span className="text-[10px]" style={{ opacity: 0.85 }}>
                        {cell.unit.areaM2} m²
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

