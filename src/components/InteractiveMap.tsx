import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenants } from '@/data/mockData';
import { formatPeso } from '@/lib/format';

export function InteractiveMap() {
    const navigate = useNavigate();
    const [hoveredStore, setHoveredStore] = useState<string | null>(null);

    // Map stores physical attributes for a top-down view inside an 800x400 SVG viewBox
    // A U-shape strip center
    const storeLayout = [
        // Left Wing
        { id: 'mango', local: 'L-101', x: 20, y: 20, w: 180, h: 200, labelY: 100 },
        { id: 'sushi-go', local: 'L-205', x: 20, y: 220, w: 180, h: 160, labelY: 80 },
        
        // Center Wing
        { id: 'nike-factory', local: 'L-302', x: 200, y: 20, w: 300, h: 160, labelY: 80 },
        
        // Right Wing
        { id: 'starbucks', local: 'L-108', x: 500, y: 20, w: 140, h: 160, labelY: 80 },
        { id: 'optica-gmx', local: 'L-115', x: 640, y: 20, w: 140, h: 160, labelY: 80 },
        { id: 'farmacias-cruz-verde', local: 'L-410', x: 640, y: 180, w: 140, h: 200, labelY: 100 },
    ];

    const getStatusColors = (status: string) => {
        switch (status) {
            case 'activo': return { fill: '#10B98120', stroke: '#10B981', text: 'var(--fg)' };
            case 'en mora': return { fill: '#EF444420', stroke: '#EF4444', text: '#EF4444' };
            case 'por vencer': return { fill: '#F59E0B20', stroke: '#F59E0B', text: '#F59E0B' };
            default: return { fill: '#6B728020', stroke: '#6B7280', text: '#6B7280' };
        }
    };

    return (
        <div className="glass-card p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h3 className="text-lg font-bold">Plano del Strip Center</h3>
                    <p className="text-sm text-[var(--sidebar-fg)]">Haz clic en un local para ver sus métricas detalladas</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium bg-[var(--hover-bg)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500" /> Activo</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500" /> Por Vencer</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500" /> En Mora</span>
                </div>
            </div>

            <div className="relative w-full aspect-[2/1] max-h-[500px] bg-[#F8FAFC] dark:bg-[#0B1120] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-inner">
                <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    {/* Parking Lot */}
                    <rect x="220" y="200" width="400" height="180" rx="8" fill="transparent" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="6 6" />
                    <text x="420" y="290" textAnchor="middle" fill="var(--sidebar-fg)" fontSize="16" fontWeight="bold" opacity="0.4" letterSpacing="4">
                        ESTACIONAMIENTOS
                    </text>

                    {/* Stores */}
                    {storeLayout.map(layout => {
                        const tenant = tenants.find(t => t.id === layout.id);
                        if (!tenant) return null;
                        const colors = getStatusColors(tenant.status);
                        const isHovered = hoveredStore === layout.id;

                        return (
                            <g 
                                key={layout.id}
                                onClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
                                onMouseEnter={() => setHoveredStore(layout.id)}
                                onMouseLeave={() => setHoveredStore(null)}
                                className="cursor-pointer transition-all duration-300"
                                style={{ transformOrigin: `${layout.x + layout.w/2}px ${layout.y + layout.h/2}px` }}
                            >
                                <rect 
                                    x={layout.x} 
                                    y={layout.y} 
                                    width={layout.w} 
                                    height={layout.h} 
                                    rx="6"
                                    fill={isHovered ? colors.stroke : colors.fill} 
                                    stroke={colors.stroke} 
                                    strokeWidth={isHovered ? "3" : "2"}
                                    opacity={isHovered ? 0.3 : 1}
                                    className="transition-all duration-300"
                                />
                                <text 
                                    x={layout.x + layout.w / 2} 
                                    y={layout.y + layout.labelY - 10} 
                                    textAnchor="middle" 
                                    fill={colors.text} 
                                    fontSize="14" 
                                    fontWeight="bold"
                                    pointerEvents="none"
                                >
                                    {tenant.name}
                                </text>
                                <text 
                                    x={layout.x + layout.w / 2} 
                                    y={layout.y + layout.labelY + 10} 
                                    textAnchor="middle" 
                                    fill={colors.text} 
                                    fontSize="12" 
                                    opacity="0.8"
                                    pointerEvents="none"
                                >
                                    {tenant.local}
                                </text>

                                {/* ForeignObject for rich HTML tooltip when hovered */}
                                {isHovered && (
                                    <foreignObject x={layout.x + layout.w/2 - 75} y={layout.y + layout.labelY + 25} width="150" height="60" pointerEvents="none">
                                        <div className="bg-[var(--card-bg)] shadow-md border border-[var(--border-color)] rounded p-1.5 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                                            <span className="text-[10px] text-[var(--sidebar-fg)] uppercase">Ventas</span>
                                            <span className="text-sm font-bold text-[var(--fg)]">{formatPeso(tenant.salesCurrent)}</span>
                                        </div>
                                    </foreignObject>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
