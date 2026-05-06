import { useMemo, useState, useRef, useEffect, useLayoutEffect, MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/lib/currency';
import { contractDateRangesOverlap, getContractDisplayValues, getContractLifecycle, type AssetUnit, type Contract } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/appState';

interface UnitLayout extends AssetUnit {
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildLayout(units: AssetUnit[]): { layout: UnitLayout[]; maxX: number; maxY: number } {
  if (units.length === 0) {
    return { layout: [], maxX: 100, maxY: 100 };
  }

  const orderedUnits = [...units].sort((left, right) => right.areaM2 - left.areaM2);
  const topRow: UnitLayout[] = [];
  const bottomRow: UnitLayout[] = [];
  let topArea = 0;
  let bottomArea = 0;

  const baseDepth = 30;
  const corridor = 20;
  const scalingFactor = 12;
  const gap = 0;
  const minWidth = 25;

  orderedUnits.forEach((unit) => {
    if (topArea <= bottomArea) {
      topRow.push({ ...unit, x: 0, y: 0, width: 0, height: 0 });
      topArea += unit.areaM2;
      return;
    }

    bottomRow.push({ ...unit, x: 0, y: 0, width: 0, height: 0 });
    bottomArea += unit.areaM2;
  });

  topRow.sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }));
  bottomRow.sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }));

  const finalLayout: UnitLayout[] = [];
  let currentX = 10;

  topRow.forEach((unit) => {
    const areaScaled = unit.areaM2 * scalingFactor;
    let width = Math.max(areaScaled / baseDepth, minWidth);
    let height = baseDepth;

    if (width > baseDepth * 2.5) {
      height = baseDepth * 1.8;
      width = areaScaled / height;
    }

    finalLayout.push({ ...unit, x: currentX, y: 10 + (baseDepth * 1.8 - height), width, height });
    currentX += width + gap;
  });

  const maxTopX = currentX;
  currentX = 10;

  bottomRow.forEach((unit) => {
    const areaScaled = unit.areaM2 * scalingFactor;
    let width = Math.max(areaScaled / baseDepth, minWidth);
    let height = baseDepth;

    if (width > baseDepth * 2.5) {
      height = baseDepth * 1.8;
      width = areaScaled / height;
    }

    finalLayout.push({ ...unit, x: currentX, y: 10 + baseDepth * 1.8 + corridor, width, height });
    currentX += width + gap;
  });

  const maxBottomX = currentX;
  return {
    layout: finalLayout,
    maxX: Math.max(maxTopX, maxBottomX) + 10,
    maxY: 10 + baseDepth * 1.8 + corridor + baseDepth * 1.8 + 10,
  };
}

function getUnitContracts(unitId: string, contracts: Contract[]) {
  return contracts.filter((contract) => contract.localIds.includes(unitId));
}

function getPrimaryUnitContract(unitContracts: Contract[]) {
  const validContracts = unitContracts.filter((contract) => getContractLifecycle(contract) !== 'vencido');

  return [...(validContracts.length > 0 ? validContracts : unitContracts)].sort((left, right) => {
    const leftLifecycle = getContractLifecycle(left);
    const rightLifecycle = getContractLifecycle(right);
    const lifecycleRank = (value: ReturnType<typeof getContractLifecycle>) =>
      ({ vigente: 0, por_vencer: 1, en_firma: 2, borrador: 3, vencido: 4 })[value];

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
      stroke: 'var(--hairline-strong)',
      text: 'var(--ink-3)',
      gradient: 'url(#empty-grad)',
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
      stroke: 'var(--coral)',
      text: 'var(--coral)',
      gradient: 'url(#danger-grad)',
    };
  }

  const contract = unitContracts[0];
  const lifecycle = getContractLifecycle(contract);
  if (contract.signatureStatus !== 'firmado' || lifecycle === 'por_vencer') {
    return {
      stroke: 'var(--amber)',
      text: 'oklch(0.42 0.11 60)',
      gradient: 'url(#warning-grad)',
    };
  }

  if (lifecycle === 'vencido') {
    return {
      stroke: 'var(--coral)',
      text: 'var(--coral)',
      gradient: 'url(#vencido-grad)',
    };
  }

  return {
    stroke: 'var(--mint)',
    text: 'var(--fg)',
    gradient: 'url(#active-grad)',
  };
}

export function InteractiveMap() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { state, insights } = useAppState();
  
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { layout: units, maxX, maxY } = useMemo(() => buildLayout(state.units), [state.units]);

  // Pre-calculate conflicting contracts so we don't do it on hover
  const conflictingContractsByUnit = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    state.units.forEach(unit => {
      const unitContracts = getUnitContracts(unit.id, state.contracts);
      const conflicts = unitContracts
        .filter((candidate, index) =>
          unitContracts.some((other, otherIndex) => otherIndex !== index && contractDateRangesOverlap(candidate, other)),
        )
        .map((candidate) => getContractDisplayValues(candidate).storeName);
      if (conflicts.length > 1) {
        mapping[unit.id] = conflicts;
      }
    });
    return mapping;
  }, [state.units, state.contracts]);

  // Zoom & Pan state
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });



  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMoveMap = (e: ReactMouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
    }
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredUnitId(null);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomSensitivity = 0.002;
        setTransform(prev => {
          const newScale = Math.max(0.5, Math.min(prev.scale - e.deltaY * zoomSensitivity, 4));
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const dx = (mouseX - prev.x) * (newScale / prev.scale - 1);
          const dy = (mouseY - prev.y) * (newScale / prev.scale - 1);
          return { x: prev.x - dx, y: prev.y - dy, scale: newScale };
        });
      };
      container.addEventListener('wheel', onWheel, { passive: false });
      return () => container.removeEventListener('wheel', onWheel);
    }
  }, []);

  // Position the hover tooltip directly on the DOM node — measuring layout
  // requires a ref read after paint, but routing the result through React
  // state would mean setState-in-effect (forbidden by the
  // react-hooks/set-state-in-effect rule in React 19) and would also cost
  // an extra render per pixel of mouse motion.
  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    if (!hoveredUnitId) {
      node.style.opacity = '0';
      return;
    }
    const rect = node.getBoundingClientRect();
    const margin = 10;
    let newX = hoverPosition.x + 15;
    let newY = hoverPosition.y;

    if (newX + rect.width + margin > window.innerWidth) {
      newX = hoverPosition.x - rect.width - 15;
    }
    if (newY - rect.height / 2 < margin) {
      newY = margin + rect.height / 2;
    } else if (newY + rect.height / 2 > window.innerHeight - margin) {
      newY = window.innerHeight - margin - rect.height / 2;
    }
    node.style.left = `${newX}px`;
    node.style.top = `${newY}px`;
    node.style.transform = 'translate(0, -50%)';
    node.style.opacity = '1';
  }, [hoveredUnitId, hoverPosition.x, hoverPosition.y]);

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold">Plano dinámico del activo</h3>
          <p className="text-sm text-[var(--sidebar-fg)]">
            El tamaño de cada bloque se calcula en base a los m2 cargados. Usa el mouse para arrastrar y hacer zoom.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <LegendDot label="Contrato firmado" borderClassName="border-emerald-500" fillClassName="bg-emerald-500/20" />
          <LegendDot label="En firma / por vencer" borderClassName="border-amber-500" fillClassName="bg-amber-500/20" />
          <LegendDot label="Vacante" borderClassName="border-slate-400" fillClassName="bg-slate-400/20" />
          <LegendDot label="Conflicto contractual" borderClassName="border-red-600" fillClassName="bg-red-500/20" />
        </div>
      </div>

      {units.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--sidebar-fg)]">
          Completa la configuración inicial del activo para generar el plano automáticamente.
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="mt-4 overflow-hidden rounded-[24px] border-2 border-[var(--border-color)] bg-[var(--surface-2)] shadow-inner dark:bg-[var(--bg-deep)] relative cursor-grab active:cursor-grabbing"
          style={{ height: 600, touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveMap}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            width="100%"
            height="100%"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.05))' }}
          >
            <defs>
              <pattern id="mall-grid" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--hairline)" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="active-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--mint-soft)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--mint-soft)" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="warning-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--amber-soft)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--amber-soft)" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="danger-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--coral-soft)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--coral-soft)" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="vencido-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--coral-soft)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--coral-soft)" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="empty-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--surface-3)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--surface-3)" stopOpacity="0.3" />
              </linearGradient>
              <filter id="shadow-hover" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" floodColor="#000" />
              </filter>
              <filter id="shadow-base" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.1" floodColor="#000" />
              </filter>
            </defs>

            <rect x="0" y="0" width="100%" height="100%" fill="url(#mall-grid)" pointerEvents="none" />
            
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              <g transform={`translate(${400 - (maxX*3)/2}, ${300 - (maxY*3)/2}) scale(3)`}>
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
                      onClick={() => {
                        if (contract) {
                          navigate(`/admin/locatarios/${contract.id}`);
                        }
                      }}
                      className={cn(contract ? 'cursor-pointer' : '', 'transition-all duration-300')}
                      style={{ transformOrigin: `${unit.x + unit.width/2}px ${unit.y + unit.height/2}px`, transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
                    >
                      <rect
                        x={unit.x}
                        y={unit.y}
                        width={unit.width}
                        height={unit.height}
                        rx="1.5"
                        ry="1.5"
                        fill={colors.gradient}
                        stroke={colors.stroke}
                        strokeWidth={isHovered ? '0.8' : '0.5'}
                        filter={isHovered ? 'url(#shadow-hover)' : 'url(#shadow-base)'}
                        className="transition-all duration-300"
                      />
                      <text x={unit.x + 2} y={unit.y + 6.5} fontSize="3.8" fontWeight="800" fill={colors.text} style={{ pointerEvents: 'none' }}>
                        {unit.code}
                      </text>
                      <text x={unit.x + 2} y={unit.y + 11} fontSize="2.8" fontWeight="600" fill={colors.text} opacity="0.9" style={{ pointerEvents: 'none' }}>
                        {display?.storeName ?? unit.manualDisplayName ?? unit.label}
                      </text>
                      <text x={unit.x + 2} y={unit.y + 15} fontSize="2.2" fontWeight="600" fill={colors.text} opacity="0.75" style={{ pointerEvents: 'none' }}>
                        {unit.areaM2} m²
                      </text>

                      {summary && unit.height >= 25 && unit.width >= 15 ? (
                        <text x={unit.x + 2} y={unit.y + 21} fontSize="2.5" fontWeight="800" fill={colors.text} style={{ pointerEvents: 'none' }}>
                          {formatCurrency(summary.salesCurrent)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>

          {/* Tooltip Overlay — position written directly via tooltipRef in
              the useLayoutEffect above. Initial style hides the node
              before the first measurement lands. */}
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-[9999] rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]/95 p-3 text-xs shadow-pop backdrop-blur-md transition-opacity duration-200"
            style={{ left: 0, top: 0, transform: 'translate(0, -50%)', opacity: 0 }}
          >
            {hoveredUnitId && (() => {
              const unit = state.units.find((item) => item.id === hoveredUnitId);
              if (!unit) return null;

              const unitContracts = getUnitContracts(unit.id, state.contracts);
              const contract = getPrimaryUnitContract(unitContracts);
              const display = contract ? getContractDisplayValues(contract) : undefined;
              const summary = contract ? insights.tenantSummaries.find((item) => item.id === contract.id) : undefined;
              const conflictingStores = conflictingContractsByUnit[unit.id] || [];

              return (
                <>
                  <p className="text-[14px] font-bold text-[var(--fg)]">
                    {conflictingStores.length > 1
                      ? `Conflicto: ${conflictingStores.join(', ')}`
                      : display?.storeName ?? unit.manualDisplayName ?? unit.label}
                  </p>
                  <div className="mb-2 mt-1 border-b border-[var(--border-color)] pb-2">
                    <span className="font-medium text-[var(--sidebar-fg)]">
                      {unit.code} · {unit.areaM2} m²
                    </span>
                    {!contract && unit.manualCategory ? (
                      <span className="ml-2 rounded-md bg-[var(--hover-bg)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                        {unit.manualCategory}
                      </span>
                    ) : null}
                  </div>
                  {conflictingStores.length > 1 ? (
                    <p className="font-semibold text-[var(--coral)] mb-2">Hay contratos superpuestos.</p>
                  ) : null}
                  <div className="space-y-1">
                    <p className="font-medium text-[var(--fg)]">
                      <span className="text-[var(--sidebar-fg)]">Ventas:</span> {summary ? formatCurrency(summary.salesCurrent) : 'Sin datos'}
                    </p>
                    {summary ? (
                      <p className="font-medium text-[var(--fg)]">
                        <span className="text-[var(--sidebar-fg)]">Renta:</span> {formatCurrency(summary.rentTotal)}
                      </p>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({
  label,
  borderClassName,
  fillClassName,
}: {
  label: string;
  borderClassName: string;
  fillClassName: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full border', borderClassName, fillClassName)} />
      {label}
    </span>
  );
}
