import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/store/appState';
import { contractDateRangesOverlap, getContractDisplayValues, getContractLifecycle, type Contract, type MallUnit } from '@/lib/domain';
import { formatPeso } from '@/lib/format';
import { cn } from '@/lib/utils';

interface UnitLayout extends MallUnit {
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildLayout(units: MallUnit[]): { layout: UnitLayout[], maxX: number, maxY: number } {
  if (units.length === 0) {
    return { layout: [], maxX: 100, maxY: 100 };
  }

  // Ordenamos de mayor a menor para distribuir locatarios
  const orderedUnits = [...units].sort((a, b) => b.areaM2 - a.areaM2);

  const topRow: UnitLayout[] = [];
  const bottomRow: UnitLayout[] = [];

  let topArea = 0;
  let bottomArea = 0;

  const BASE_DEPTH = 30; // Altura estándar (top to bottom)
  const CORRIDOR = 20; // Pasillo central (ancho del medio del Strip Center)
  const SCALING_FACTOR = 12; // Multiplicador para expandir SVG rects
  const GAP = 0; // Locales contiguos
  const MIN_WIDTH = 25; // Ningún local será excesivamente plano y largo verticalmente

  // Repartimos equitativamente por área
  orderedUnits.forEach((unit) => {
    if (topArea <= bottomArea) {
      topRow.push({ ...unit, x: 0, y: 0, width: 0, height: 0 }); // Placeholder
      topArea += unit.areaM2;
    } else {
      bottomRow.push({ ...unit, x: 0, y: 0, width: 0, height: 0 });
      bottomArea += unit.areaM2;
    }
  });

  // Reordenar por código internamente para mantener los pasillos lógicos L1, L2...
  topRow.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  bottomRow.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const finalLayout: UnitLayout[] = [];

  // Construir fila superior. Alineación Top: pegados a bottom 'y', creciendo hacia arriba si son muy grandes.
  let currentX = 10;
  topRow.forEach((unit) => {
    const areaScaled = unit.areaM2 * SCALING_FACTOR;
    let width = Math.max(areaScaled / BASE_DEPTH, MIN_WIDTH);
    let height = BASE_DEPTH;

    // Lógica Ancla
    if (width > BASE_DEPTH * 2.5) {
      height = BASE_DEPTH * 1.8; // Más profundo
      width = areaScaled / height; // Recalcular width exacto
    }

    finalLayout.push({ ...unit, x: currentX, y: 10 + (BASE_DEPTH * 1.8 - height), width, height });
    currentX += width + GAP;
  });

  const maxTopX = currentX;

  // Construir fila inferior. Crecen hacia abajo.
  currentX = 10;
  bottomRow.forEach((unit) => {
    const areaScaled = unit.areaM2 * SCALING_FACTOR;
    let width = Math.max(areaScaled / BASE_DEPTH, MIN_WIDTH);
    let height = BASE_DEPTH;

    // Lógica Ancla
    if (width > BASE_DEPTH * 2.5) {
      height = BASE_DEPTH * 1.8;
      width = areaScaled / height;
    }

    finalLayout.push({ ...unit, x: currentX, y: 10 + (BASE_DEPTH * 1.8) + CORRIDOR, width, height });
    currentX += width + GAP;
  });

  const maxBottomX = currentX;
  const maxX = Math.max(maxTopX, maxBottomX) + 10;
  const maxY = 10 + (BASE_DEPTH * 1.8) + CORRIDOR + (BASE_DEPTH * 1.8) + 10;

  return { layout: finalLayout, maxX, maxY };
}

function getUnitContracts(unitId: string, contracts: Contract[]) {
  return contracts.filter((contract) => contract.localIds.includes(unitId));
}

function getPrimaryUnitContract(unitContracts: Contract[]) {
  const validContracts =
    unitContracts.filter((contract) => getContractLifecycle(contract) !== 'vencido');

  return [...(validContracts.length > 0 ? validContracts : unitContracts)].sort((left, right) => {
    const leftLifecycle = getContractLifecycle(left);
    const rightLifecycle = getContractLifecycle(right);
    const lifecycleRank = (value: ReturnType<typeof getContractLifecycle>) =>
      ({ vigente: 0, por_vencer: 1, en_firma: 2, borrador: 3, vencido: 4 }[value]);
    return (
      lifecycleRank(leftLifecycle) - lifecycleRank(rightLifecycle) ||
      left.startDate.localeCompare(right.startDate) ||
      right.createdAt.localeCompare(left.createdAt)
    );
  })[0];
}

function fillForUnit(unitContracts: Contract[]) {
  if (unitContracts.length === 0) {
    return {
      fill: 'rgba(148, 163, 184, 0.16)',
      stroke: '#94A3B8',
      text: '#475569',
      gradient: 'url(#empty-grad)'
    };
  }

  const hasOverlap = unitContracts.some((contract, index) =>
    unitContracts.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index && contractDateRangesOverlap(contract, candidate),
    ),
  );
  if (hasOverlap) {
    return {
      fill: 'rgba(239, 68, 68, 0.18)',
      stroke: '#DC2626',
      text: '#991B1B',
      gradient: 'url(#danger-grad)'
    };
  }

  const contract = unitContracts[0];
  const lifecycle = getContractLifecycle(contract);
  if (contract.signatureStatus !== 'firmado') {
    return {
      fill: 'rgba(245, 158, 11, 0.18)',
      stroke: '#F59E0B',
      text: '#B45309',
      gradient: 'url(#warning-grad)'
    };
  }

  if (lifecycle === 'por_vencer') {
    return {
      fill: 'rgba(251, 191, 36, 0.18)',
      stroke: '#F59E0B',
      text: '#92400E',
      gradient: 'url(#warning-grad)'
    };
  }

  if (lifecycle === 'vencido') {
    return {
      fill: 'rgba(239, 68, 68, 0.18)',
      stroke: '#EF4444',
      text: '#B91C1C',
      gradient: 'url(#vencido-grad)'
    };
  }

  return {
    fill: 'rgba(16, 185, 129, 0.18)',
    stroke: '#10B981',
    text: 'var(--fg)',
    gradient: 'url(#active-grad)'
  };
}

export function InteractiveMap() {
  const navigate = useNavigate();
  const { state, insights } = useAppState();
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const { layout: units, maxX, maxY } = buildLayout(state.units);

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold">Plano dinámico del mall</h3>
          <p className="text-sm text-[var(--sidebar-fg)]">
            El tamaño de cada bloque se calcula en base a los m2 cargados. Un contrato puede ocupar varios locales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-500/20" />
            Contrato firmado
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-500/20" />
            En firma / por vencer
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-slate-400 bg-slate-400/20" />
            Vacante
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-red-600 bg-red-500/20" />
            Conflicto contractual
          </span>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--sidebar-fg)]">
          Completa la configuración inicial del mall para generar el plano automáticamente.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[24px] border-2 border-[var(--border-color)] bg-white shadow-inner dark:bg-slate-900">
          <svg
            onMouseMove={(e) => setHoverPosition({ x: e.clientX, y: e.clientY })}
            viewBox={`0 0 ${maxX} ${maxY}`}
            className="w-full"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.05))', minHeight: '300px', maxHeight: '600px' }}
          >
            <rect x="0" y="0" width={maxX} height={maxY} fill="url(#mall-grid)" />
            <defs>
              <pattern id="mall-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.1" />
                <path d="M 0 4 L 4 4 0 4" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.1" />
              </pattern>

              <linearGradient id="active-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.25)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.10)" />
              </linearGradient>
              <linearGradient id="warning-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.25)" />
                <stop offset="100%" stopColor="rgba(245, 158, 11, 0.10)" />
              </linearGradient>
              <linearGradient id="danger-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.25)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.10)" />
              </linearGradient>
              <linearGradient id="vencido-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.25)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.10)" />
              </linearGradient>
              <linearGradient id="empty-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(148, 163, 184, 0.15)" />
                <stop offset="100%" stopColor="rgba(148, 163, 184, 0.05)" />
              </linearGradient>

              <filter id="shadow-hover" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.2" />
              </filter>
            </defs>

            {units.map((unit) => {
              const unitContracts = getUnitContracts(unit.id, state.contracts);
              const contract = getPrimaryUnitContract(unitContracts);
              const display = contract ? getContractDisplayValues(contract) : undefined;
              const colors = fillForUnit(unitContracts);
              const summary = contract ? insights.tenantSummaries.find((item) => item.id === contract.id) : undefined;
              const isHovered = hoveredUnitId === unit.id;
              return (
                <g
                  key={unit.id}
                  onMouseEnter={() => setHoveredUnitId(unit.id)}
                  onMouseLeave={() => setHoveredUnitId(null)}
                  onClick={() => {
                    if (contract) navigate(`/admin/locatarios/${contract.id}`);
                  }}
                  className={cn(contract ? 'cursor-pointer' : '', 'transition-all duration-300')}
                >
                  <rect
                    x={unit.x}
                    y={unit.y}
                    width={unit.width}
                    height={unit.height}
                    fill={colors.gradient}
                    stroke={colors.stroke}
                    strokeWidth={isHovered ? '0.8' : '0.4'}
                    filter={isHovered ? 'url(#shadow-hover)' : 'none'}
                    className="transition-all duration-300 transform-gpu"
                  />
                  <text x={unit.x + 2} y={unit.y + 6.5} fontSize="3.8" fontWeight="800" fill={colors.text} style={{ transition: 'all 300ms' }}>
                    {unit.code}
                  </text>
                  <text x={unit.x + 2} y={unit.y + 11} fontSize="2.8" fontWeight="600" fill={colors.text} opacity="0.9" style={{ transition: 'all 300ms' }}>
                    {display?.storeName ?? unit.manualDisplayName ?? unit.label}
                  </text>
                  <text x={unit.x + 2} y={unit.y + 15} fontSize="2.2" fontWeight="600" fill={colors.text} opacity="0.75" style={{ transition: 'all 300ms' }}>
                    {unit.areaM2} m²
                  </text>

                  {/* Render Sales KPI natively inside unit if there is space */}
                  {summary && unit.height >= 25 && unit.width >= 15 ? (
                    <text x={unit.x + 2} y={unit.y + 21} fontSize="2.5" fontWeight="800" fill={colors.text} className="drop-shadow-sm transition-all duration-300">
                      {formatPeso(summary.salesCurrent)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* DOM-Based Tooltip prevents SVG scaling bugs and overlaps */}
      {hoveredUnitId && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]/95 p-3 text-xs shadow-2xl backdrop-blur-md animate-in fade-in duration-200"
          style={{ left: hoverPosition.x + 15, top: hoverPosition.y + 15, transform: 'translate(0, -50%)' }}
        >
          {(() => {
            const unit = state.units.find(u => u.id === hoveredUnitId);
            if (!unit) return null;
            const unitContracts = getUnitContracts(unit.id, state.contracts);
            const contract = getPrimaryUnitContract(unitContracts);
            const display = contract ? getContractDisplayValues(contract) : undefined;
            const summary = contract ? insights.tenantSummaries.find(item => item.id === contract.id) : undefined;
            const conflictingStores = unitContracts
              .filter((candidate, idx) =>
                unitContracts.some((other, oIdx) => oIdx !== idx && contractDateRangesOverlap(candidate, other)),
              )
              .map(c => getContractDisplayValues(c).storeName);

            return (
              <>
                <p className="font-bold text-[14px] text-[var(--fg)]">
                  {conflictingStores.length > 1
                    ? `Conflicto: ${conflictingStores.join(', ')}`
                    : display?.storeName ?? unit.manualDisplayName ?? unit.label}
                </p>
                <div className="mt-1 pb-2 mb-2 border-b border-[var(--border-color)]">
                  <span className="font-medium text-[var(--sidebar-fg)]">{unit.code} · {unit.areaM2} m²</span>
                  {!contract && unit.manualCategory ? (
                    <span className="ml-2 rounded-md bg-[var(--hover-bg)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{unit.manualCategory}</span>
                  ) : null}
                </div>
                {conflictingStores.length > 1 ? (
                  <p className="font-semibold text-red-600 dark:text-red-400">Hay contratos superpuestos.</p>
                ) : null}
                <div className="space-y-1">
                  <p className="font-medium text-[var(--fg)]">
                    <span className="text-[var(--sidebar-fg)]">Ventas:</span> {summary ? formatPeso(summary.salesCurrent) : 'Sin datos'}
                  </p>
                  {summary ? (
                    <p className="font-medium text-[var(--fg)]">
                      <span className="text-[var(--sidebar-fg)]">Renta:</span> {formatPeso(summary.rentTotal)}
                    </p>
                  ) : null}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
