// ===================== MOCK DATA =====================

export interface Tenant {
    id: string;
    name: string;
    category: string;
    local: string;
    areaM2: number;
    status: 'activo' | 'en mora' | 'por vencer' | 'vacante';
    salesCurrent: number;
    salesPrevious: number;
    salesPerM2: number;
    rentFixed: number;
    rentVariable: number;
    rentTotal: number;
    contractStart: string;
    contractEnd: string;
    rentUF: number;
    occupancy: number;
    gatewayStatus: 'online' | 'offline' | 'warning';
    gatewayLastSync: string;
    paymentHistory: { month: string; amount: number; status: 'pagado' | 'pendiente' | 'atrasado' }[];
    monthlySales: { month: string; sales: number }[];
}

export const tenants: Tenant[] = [
    {
        id: 'mango',
        name: 'Mango',
        category: 'Vestuario',
        local: 'L-101',
        areaM2: 120,
        status: 'activo',
        salesCurrent: 45200000,
        salesPrevious: 42800000,
        salesPerM2: 376667,
        rentFixed: 3200000,
        rentVariable: 1450000,
        rentTotal: 4650000,
        contractStart: '2024-03-01',
        contractEnd: '2027-02-28',
        rentUF: 125.3,
        occupancy: 100,
        gatewayStatus: 'online',
        gatewayLastSync: '2026-03-26T08:30:00',
        paymentHistory: [
            { month: 'Ene 2026', amount: 4650000, status: 'pagado' },
            { month: 'Feb 2026', amount: 4650000, status: 'pagado' },
            { month: 'Mar 2026', amount: 4650000, status: 'pendiente' },
        ],
        monthlySales: [
            { month: 'Oct', sales: 38500000 }, { month: 'Nov', sales: 41200000 },
            { month: 'Dic', sales: 52300000 }, { month: 'Ene', sales: 39800000 },
            { month: 'Feb', sales: 42800000 }, { month: 'Mar', sales: 45200000 },
        ],
    },
    {
        id: 'sushi-go',
        name: 'Sushi Go',
        category: 'Gastronomía',
        local: 'L-205',
        areaM2: 65,
        status: 'activo',
        salesCurrent: 28900000,
        salesPrevious: 26500000,
        salesPerM2: 444615,
        rentFixed: 2100000,
        rentVariable: 890000,
        rentTotal: 2990000,
        contractStart: '2025-01-15',
        contractEnd: '2027-12-31',
        rentUF: 80.5,
        occupancy: 100,
        gatewayStatus: 'online',
        gatewayLastSync: '2026-03-26T08:28:00',
        paymentHistory: [
            { month: 'Ene 2026', amount: 2990000, status: 'pagado' },
            { month: 'Feb 2026', amount: 2990000, status: 'pagado' },
            { month: 'Mar 2026', amount: 2990000, status: 'pagado' },
        ],
        monthlySales: [
            { month: 'Oct', sales: 24100000 }, { month: 'Nov', sales: 25800000 },
            { month: 'Dic', sales: 34200000 }, { month: 'Ene', sales: 23900000 },
            { month: 'Feb', sales: 26500000 }, { month: 'Mar', sales: 28900000 },
        ],
    },
    {
        id: 'nike-factory',
        name: 'Nike Factory',
        category: 'Calzado',
        local: 'L-302',
        areaM2: 180,
        status: 'por vencer',
        salesCurrent: 62400000,
        salesPrevious: 58100000,
        salesPerM2: 346667,
        rentFixed: 4800000,
        rentVariable: 2100000,
        rentTotal: 6900000,
        contractStart: '2023-06-01',
        contractEnd: '2026-05-31',
        rentUF: 185.8,
        occupancy: 100,
        gatewayStatus: 'online',
        gatewayLastSync: '2026-03-26T08:25:00',
        paymentHistory: [
            { month: 'Ene 2026', amount: 6900000, status: 'pagado' },
            { month: 'Feb 2026', amount: 6900000, status: 'pagado' },
            { month: 'Mar 2026', amount: 6900000, status: 'pendiente' },
        ],
        monthlySales: [
            { month: 'Oct', sales: 55200000 }, { month: 'Nov', sales: 57800000 },
            { month: 'Dic', sales: 78100000 }, { month: 'Ene', sales: 54300000 },
            { month: 'Feb', sales: 58100000 }, { month: 'Mar', sales: 62400000 },
        ],
    },
    {
        id: 'starbucks',
        name: 'Starbucks',
        category: 'Gastronomía',
        local: 'L-108',
        areaM2: 85,
        status: 'activo',
        salesCurrent: 35600000,
        salesPrevious: 33200000,
        salesPerM2: 418824,
        rentFixed: 2800000,
        rentVariable: 1200000,
        rentTotal: 4000000,
        contractStart: '2024-08-01',
        contractEnd: '2029-07-31',
        rentUF: 107.7,
        occupancy: 100,
        gatewayStatus: 'online',
        gatewayLastSync: '2026-03-26T08:32:00',
        paymentHistory: [
            { month: 'Ene 2026', amount: 4000000, status: 'pagado' },
            { month: 'Feb 2026', amount: 4000000, status: 'pagado' },
            { month: 'Mar 2026', amount: 4000000, status: 'pagado' },
        ],
        monthlySales: [
            { month: 'Oct', sales: 30100000 }, { month: 'Nov', sales: 31800000 },
            { month: 'Dic', sales: 42500000 }, { month: 'Ene', sales: 29700000 },
            { month: 'Feb', sales: 33200000 }, { month: 'Mar', sales: 35600000 },
        ],
    },
    {
        id: 'farmacias-cruz-verde',
        name: 'Cruz Verde',
        category: 'Servicios',
        local: 'L-410',
        areaM2: 95,
        status: 'en mora',
        salesCurrent: 22100000,
        salesPrevious: 24800000,
        salesPerM2: 232632,
        rentFixed: 1900000,
        rentVariable: 680000,
        rentTotal: 2580000,
        contractStart: '2024-01-01',
        contractEnd: '2026-12-31',
        rentUF: 69.5,
        occupancy: 100,
        gatewayStatus: 'warning',
        gatewayLastSync: '2026-03-26T06:15:00',
        paymentHistory: [
            { month: 'Ene 2026', amount: 2580000, status: 'pagado' },
            { month: 'Feb 2026', amount: 2580000, status: 'atrasado' },
            { month: 'Mar 2026', amount: 2580000, status: 'pendiente' },
        ],
        monthlySales: [
            { month: 'Oct', sales: 26300000 }, { month: 'Nov', sales: 25100000 },
            { month: 'Dic', sales: 28900000 }, { month: 'Ene', sales: 25600000 },
            { month: 'Feb', sales: 24800000 }, { month: 'Mar', sales: 22100000 },
        ],
    },
    {
        id: 'optica-gmx',
        name: 'GMO Ópticas',
        category: 'Servicios',
        local: 'L-115',
        areaM2: 50,
        status: 'activo',
        salesCurrent: 15800000,
        salesPrevious: 14900000,
        salesPerM2: 316000,
        rentFixed: 1400000,
        rentVariable: 520000,
        rentTotal: 1920000,
        contractStart: '2025-04-01',
        contractEnd: '2028-03-31',
        rentUF: 51.7,
        occupancy: 100,
        gatewayStatus: 'online',
        gatewayLastSync: '2026-03-26T08:29:00',
        paymentHistory: [
            { month: 'Ene 2026', amount: 1920000, status: 'pagado' },
            { month: 'Feb 2026', amount: 1920000, status: 'pagado' },
            { month: 'Mar 2026', amount: 1920000, status: 'pagado' },
        ],
        monthlySales: [
            { month: 'Oct', sales: 13200000 }, { month: 'Nov', sales: 14100000 },
            { month: 'Dic', sales: 19800000 }, { month: 'Ene', sales: 13500000 },
            { month: 'Feb', sales: 14900000 }, { month: 'Mar', sales: 15800000 },
        ],
    },
];

// Dashboard KPIs
export const dashboardKPIs = {
    occupancy: 94.2,
    totalLocals: 52,
    occupiedLocals: 49,
    monthlyRevenue: 210000000,
    revenueDelta: 7.4,
    ufRate: 37128.56,
    ufDelta: 0.3,
    traffic: 185400,
    trafficDelta: 12.1,
    avgSalesPerM2: 356000,
    totalAreaM2: 4850,
    collectionRate: 92.5,
};

// Monthly revenue trend
export const revenueTrend = [
    { month: 'Oct', revenue: 185000000, target: 190000000 },
    { month: 'Nov', revenue: 192000000, target: 195000000 },
    { month: 'Dic', revenue: 248000000, target: 230000000 },
    { month: 'Ene', revenue: 178000000, target: 200000000 },
    { month: 'Feb', revenue: 198000000, target: 205000000 },
    { month: 'Mar', revenue: 210000000, target: 210000000 },
];

// Category distribution
export const categoryDistribution = [
    { name: 'Vestuario', value: 32, color: '#3B82F6' },
    { name: 'Gastronomía', value: 28, color: '#10B981' },
    { name: 'Calzado', value: 15, color: '#F59E0B' },
    { name: 'Servicios', value: 18, color: '#8B5CF6' },
    { name: 'Vacante', value: 7, color: '#6B7280' },
];

// Rent collection data
export const rentCollection = [
    { month: 'Oct', fixed: 68000000, variable: 28000000 },
    { month: 'Nov', fixed: 68000000, variable: 31000000 },
    { month: 'Dic', fixed: 68000000, variable: 42000000 },
    { month: 'Ene', fixed: 68000000, variable: 25000000 },
    { month: 'Feb', fixed: 68000000, variable: 30000000 },
    { month: 'Mar', fixed: 68000000, variable: 34000000 },
];

// Alerts / Notifications
export interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    tenant?: string;
    timestamp: string;
    read: boolean;
}

export const alerts: Alert[] = [
    {
        id: 'a1',
        type: 'critical',
        title: 'Pago atrasado - Cruz Verde',
        description: 'El locatario Cruz Verde tiene 1 mes de renta impaga (Feb 2026). Monto: $2.580.000',
        tenant: 'Cruz Verde',
        timestamp: '2026-03-25T14:30:00',
        read: false,
    },
    {
        id: 'a2',
        type: 'warning',
        title: 'Contrato por vencer - Nike Factory',
        description: 'El contrato de Nike Factory vence el 31/05/2026. Quedan 66 días para renovación.',
        tenant: 'Nike Factory',
        timestamp: '2026-03-25T10:15:00',
        read: false,
    },
    {
        id: 'a3',
        type: 'info',
        title: 'Gateway con intermitencia - Cruz Verde',
        description: 'El gateway del local L-410 (Cruz Verde) reporta intermitencia. Última sincronización: 06:15 hrs.',
        tenant: 'Cruz Verde',
        timestamp: '2026-03-26T06:20:00',
        read: false,
    },
    {
        id: 'a4',
        type: 'warning',
        title: 'Caída de ventas detectada',
        description: 'Cruz Verde muestra una caída del 10.9% en ventas vs mes anterior.',
        tenant: 'Cruz Verde',
        timestamp: '2026-03-24T09:00:00',
        read: true,
    },
    {
        id: 'a5',
        type: 'info',
        title: 'Meta de recaudación alcanzada',
        description: 'Se alcanzó el 92.5% de la meta de recaudación mensual de marzo.',
        timestamp: '2026-03-23T16:00:00',
        read: true,
    },
];

// Gateway data
export interface Gateway {
    tenantName: string;
    local: string;
    status: 'online' | 'offline' | 'warning';
    lastSync: string;
    signalStrength: number;
}

export const gateways: Gateway[] = [
    { tenantName: 'Mango', local: 'L-101', status: 'online', lastSync: '2026-03-26T08:30:00', signalStrength: 98 },
    { tenantName: 'Sushi Go', local: 'L-205', status: 'online', lastSync: '2026-03-26T08:28:00', signalStrength: 95 },
    { tenantName: 'Nike Factory', local: 'L-302', status: 'online', lastSync: '2026-03-26T08:25:00', signalStrength: 92 },
    { tenantName: 'Starbucks', local: 'L-108', status: 'online', lastSync: '2026-03-26T08:32:00', signalStrength: 97 },
    { tenantName: 'Cruz Verde', local: 'L-410', status: 'warning', lastSync: '2026-03-26T06:15:00', signalStrength: 45 },
    { tenantName: 'GMO Ópticas', local: 'L-115', status: 'online', lastSync: '2026-03-26T08:29:00', signalStrength: 94 },
];

// Contracts data
export interface Contract {
    tenantName: string;
    local: string;
    startDate: string;
    endDate: string;
    rentUF: number;
    rentCLP: number;
    escalation: string;
    status: 'vigente' | 'por vencer' | 'vencido';
}

export const contracts: Contract[] = [
    { tenantName: 'Mango', local: 'L-101', startDate: '2024-03-01', endDate: '2027-02-28', rentUF: 125.3, rentCLP: 4650000, escalation: 'IPC + 2%', status: 'vigente' },
    { tenantName: 'Sushi Go', local: 'L-205', startDate: '2025-01-15', endDate: '2027-12-31', rentUF: 80.5, rentCLP: 2990000, escalation: 'IPC + 1.5%', status: 'vigente' },
    { tenantName: 'Nike Factory', local: 'L-302', startDate: '2023-06-01', endDate: '2026-05-31', rentUF: 185.8, rentCLP: 6900000, escalation: 'UF anual', status: 'por vencer' },
    { tenantName: 'Starbucks', local: 'L-108', startDate: '2024-08-01', endDate: '2029-07-31', rentUF: 107.7, rentCLP: 4000000, escalation: 'IPC + 2%', status: 'vigente' },
    { tenantName: 'Cruz Verde', local: 'L-410', startDate: '2024-01-01', endDate: '2026-12-31', rentUF: 69.5, rentCLP: 2580000, escalation: 'IPC', status: 'vigente' },
    { tenantName: 'GMO Ópticas', local: 'L-115', startDate: '2025-04-01', endDate: '2028-03-31', rentUF: 51.7, rentCLP: 1920000, escalation: 'UF semestral', status: 'vigente' },
];
