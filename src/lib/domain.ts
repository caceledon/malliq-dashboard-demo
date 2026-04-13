export type ThemeMode = 'light' | 'dark';
export type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'conflict';

export type SaleSource = 'manual' | 'ocr' | 'fiscal_printer' | 'pos_connection';

export type SignatureStatus = 'pendiente' | 'en_revision' | 'parcial' | 'firmado';

export type ContractLifecycle = 'borrador' | 'en_firma' | 'vigente' | 'por_vencer' | 'vencido';

export type DocumentKind =
  | 'contrato'
  | 'anexo'
  | 'carta_oferta'
  | 'cip'
  | 'foto'
  | 'render'
  | 'presupuesto'
  | 'forecast'
  | 'otro';

export type PlanType = 'budget' | 'forecast';

export type ProspectStage = 'nuevo' | 'contactado' | 'negociacion' | 'oferta' | 'cerrado' | 'descartado';

export type SupplierStatus = 'activo' | 'inactivo';

export interface MallSettings {
  id: string;
  name: string;
  city: string;
  region: string;
  notes: string;
  themePreference: ThemeMode;
  backendUrl?: string;
  syncEnabled?: boolean;
  lastSyncedAt?: string;
  serverRevision?: number;
  syncStatus?: SyncStatus;
  syncMessage?: string;
  createdAt: string;
}

export interface MallUnit {
  id: string;
  code: string;
  label: string;
  areaM2: number;
  level: string;
  frontage?: number;
  depth?: number;
  notes?: string;
  manualDisplayName?: string;
  manualCategory?: string;
}

export interface Contract {
  id: string;
  companyName: string;
  storeName: string;
  category: string;
  localIds: string[];
  startDate: string;
  endDate: string;
  fixedRent: number;
  variableRentPct: number;
  baseRentUF: number;
  commonExpenses: number;
  salesParticipationPct: number;
  escalation: string;
  conditions: string;
  signatureStatus: SignatureStatus;
  signedAt?: string;
  annexCount: number;
  autoFillUnits: boolean;
  manualCompanyName?: string;
  manualStoreName?: string;
  manualCategory?: string;
  manualOverrideNotes?: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  contractId?: string;
  localIds: string[];
  storeLabel: string;
  source: SaleSource;
  occurredAt: string;
  grossAmount: number;
  netAmount?: number;
  ticketNumber?: string;
  rawText?: string;
  importReference?: string;
  importedAt: string;
}

export interface PlanningEntry {
  id: string;
  type: PlanType;
  contractId?: string;
  month: string;
  salesAmount: number;
  rentAmount: number;
  generated: boolean;
  note?: string;
}

export interface DocumentRecord {
  id: string;
  entityType: 'mall' | 'unit' | 'contract';
  entityId: string;
  name: string;
  kind: DocumentKind;
  mimeType: string;
  size: number;
  note?: string;
  uploadedAt: string;
  storage?: 'local' | 'remote';
  remotePath?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  status: SupplierStatus;
  notes?: string;
}

export interface Prospect {
  id: string;
  brandName: string;
  category: string;
  targetAreaM2: number;
  stage: ProspectStage;
  contactName: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface PosConnectionProfile {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  dataFormat: 'json' | 'csv';
  token?: string;
  amountField: string;
  dateField: string;
  storeField: string;
  localField: string;
  lastSyncAt?: string;
  lastStatus?: 'idle' | 'success' | 'error';
  lastMessage?: string;
}

export interface ImportLog {
  id: string;
  source: SaleSource;
  status: 'success' | 'error';
  importedCount: number;
  createdAt: string;
  note: string;
}

export interface AppState {
  mall: MallSettings | null;
  units: MallUnit[];
  contracts: Contract[];
  sales: SaleRecord[];
  planning: PlanningEntry[];
  documents: DocumentRecord[];
  suppliers: Supplier[];
  prospects: Prospect[];
  posConnections: PosConnectionProfile[];
  importLogs: ImportLog[];
}

export interface TenantSummary {
  id: string;
  companyName: string;
  storeName: string;
  category: string;
  localCodes: string[];
  areaM2: number;
  salesCurrent: number;
  salesPrevious: number;
  salesPerM2: number;
  rentFixed: number;
  rentVariable: number;
  rentTotal: number;
  startDate: string;
  endDate: string;
  baseRentUF: number;
  lifecycle: ContractLifecycle;
  signatureStatus: SignatureStatus;
  localCount: number;
}

export interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  createdAt: string;
  contractId?: string;
  unitId?: string;
}

export interface ContractOverlapConflict {
  unitId: string;
  unitCode: string;
  contractIds: string[];
  storeNames: string[];
}

export interface ChartPoint {
  month: string;
  sales: number;
  rent: number;
  budget: number;
  forecast: number;
}

export interface DashboardInsights {
  isSetupComplete: boolean;
  tenantSummaries: TenantSummary[];
  alerts: AlertItem[];
  chartSeries: ChartPoint[];
  occupancyPct: number;
  occupiedUnits: number;
  totalUnits: number;
  totalAreaM2: number;
  monthlySales: number;
  averageSalesPerM2: number;
  monthlyRent: number;
  signedContracts: number;
  pendingSignatureContracts: number;
  budgetCompletionPct: number;
  activeForecast: number;
}

export interface BackupDocumentPayload {
  record: DocumentRecord;
  dataUrl?: string;
}

export interface BackupArchive {
  version: 1;
  exportedAt: string;
  state: AppState;
  documents: BackupDocumentPayload[];
  serverRevision?: number;
}

export const STORAGE_KEY = 'malliq-functional-state';

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getContractDisplayValues(contract: Contract) {
  return {
    companyName: contract.autoFillUnits ? contract.companyName : contract.manualCompanyName?.trim() || contract.companyName,
    storeName: contract.autoFillUnits ? contract.storeName : contract.manualStoreName?.trim() || contract.storeName,
    category: contract.autoFillUnits ? contract.category : contract.manualCategory?.trim() || contract.category,
  };
}

export function monthKey(dateLike: Date | string): string {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function monthLabel(month: string): string {
  const [year, rawMonth] = month.split('-');
  const date = new Date(Number(year), Number(rawMonth) - 1, 1);
  return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

export function formatIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function diffInDays(from: Date, to: Date): number {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((to.getTime() - from.getTime()) / oneDay);
}

export function contractDateRangesOverlap(
  left: Pick<Contract, 'startDate' | 'endDate'>,
  right: Pick<Contract, 'startDate' | 'endDate'>,
): boolean {
  return new Date(left.startDate) <= new Date(right.endDate) && new Date(right.startDate) <= new Date(left.endDate);
}

export function buildRenewalContractTemplate(contract: Contract): Partial<Contract> {
  const renewalStart = addDays(new Date(contract.endDate), 1);
  const renewalEnd = addDays(
    new Date(renewalStart.getFullYear() + 1, renewalStart.getMonth(), renewalStart.getDate()),
    -1,
  );
  const renewalNote = `Renovación generada desde contrato anterior con término ${contract.endDate}.`;

  return {
    companyName: contract.companyName,
    storeName: contract.storeName,
    category: contract.category,
    localIds: [...contract.localIds],
    startDate: formatIsoDate(renewalStart),
    endDate: formatIsoDate(renewalEnd),
    fixedRent: contract.fixedRent,
    variableRentPct: contract.variableRentPct,
    baseRentUF: contract.baseRentUF,
    commonExpenses: contract.commonExpenses,
    salesParticipationPct: contract.salesParticipationPct,
    escalation: contract.escalation,
    conditions: [contract.conditions, renewalNote].filter(Boolean).join('\n\n'),
    signatureStatus: 'pendiente',
    annexCount: 0,
    autoFillUnits: contract.autoFillUnits,
    manualCompanyName: contract.manualCompanyName ?? '',
    manualStoreName: contract.manualStoreName ?? '',
    manualCategory: contract.manualCategory ?? '',
    manualOverrideNotes: contract.manualOverrideNotes ?? '',
    signedAt: undefined,
  };
}

export function buildProspectContractTemplate(prospect: Prospect, localIds: string[] = []): Partial<Contract> {
  const contractStart = startOfToday();
  const contractEnd = addDays(
    new Date(contractStart.getFullYear() + 1, contractStart.getMonth(), contractStart.getDate()),
    -1,
  );

  return {
    companyName: prospect.brandName,
    storeName: prospect.brandName,
    category: prospect.category,
    localIds,
    startDate: formatIsoDate(contractStart),
    endDate: formatIsoDate(contractEnd),
    fixedRent: 0,
    variableRentPct: 0,
    baseRentUF: 0,
    commonExpenses: 0,
    salesParticipationPct: 0,
    escalation: 'Por definir',
    conditions: [
      `Borrador originado desde prospecto ${prospect.brandName}.`,
      prospect.notes?.trim() ? `Notas comerciales: ${prospect.notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    signatureStatus: 'pendiente',
    annexCount: 0,
    autoFillUnits: true,
    manualCompanyName: '',
    manualStoreName: '',
    manualCategory: '',
    manualOverrideNotes: '',
    signedAt: undefined,
  };
}

export function emptyAppState(): AppState {
  return {
    mall: null,
    units: [],
    contracts: [],
    sales: [],
    planning: [],
    documents: [],
    suppliers: [],
    prospects: [],
    posConnections: [],
    importLogs: [],
  };
}

export function getContractLifecycle(contract: Contract, referenceDate = startOfToday()): ContractLifecycle {
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);

  if (endDate < referenceDate) {
    return 'vencido';
  }

  if (contract.signatureStatus !== 'firmado') {
    return 'en_firma';
  }

  if (startDate > referenceDate) {
    return 'borrador';
  }

  const daysToEnd = diffInDays(referenceDate, endDate);
  if (daysToEnd <= 120) {
    return 'por_vencer';
  }

  return 'vigente';
}

export function getUnitArea(unitIds: string[], units: MallUnit[]): number {
  return unitIds.reduce((sum, unitId) => {
    const unit = units.find((item) => item.id === unitId);
    return sum + (unit?.areaM2 ?? 0);
  }, 0);
}

export function sumSalesByContract(contractId: string, sales: SaleRecord[], month: string): number {
  return sales
    .filter((entry) => entry.contractId === contractId && monthKey(entry.occurredAt) === month)
    .reduce((sum, entry) => sum + entry.grossAmount, 0);
}

export function normalizeIsoDay(dateLike: string): string {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return dateLike.slice(0, 10);
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function buildSaleFingerprint(sale: SaleRecord): string {
  const scope = sale.contractId ?? sale.localIds.join('|') ?? sale.storeLabel;
  const ticket = sale.ticketNumber?.trim().toLowerCase() || 'no-ticket';
  return [
    scope,
    normalizeIsoDay(sale.occurredAt),
    Math.round(sale.grossAmount),
    ticket,
  ].join('::');
}

export function buildTenantSummaries(state: AppState, referenceDate = new Date()): TenantSummary[] {
  const currentMonth = monthKey(referenceDate);
  const previousMonth = monthKey(addMonths(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), -1));

  return state.contracts
    .map((contract) => {
      const display = getContractDisplayValues(contract);
      const areaM2 = getUnitArea(contract.localIds, state.units);
      const salesCurrent = sumSalesByContract(contract.id, state.sales, currentMonth);
      const salesPrevious = sumSalesByContract(contract.id, state.sales, previousMonth);
      const rentVariable = Math.round((salesCurrent * contract.variableRentPct) / 100);
      const rentTotal = contract.fixedRent + contract.commonExpenses + rentVariable;

      return {
        id: contract.id,
        companyName: display.companyName,
        storeName: display.storeName,
        category: display.category,
        localCodes: contract.localIds
          .map((unitId) => state.units.find((unit) => unit.id === unitId)?.code ?? unitId)
          .filter(Boolean),
        areaM2,
        salesCurrent,
        salesPrevious,
        salesPerM2: areaM2 > 0 ? Math.round(salesCurrent / areaM2) : 0,
        rentFixed: contract.fixedRent,
        rentVariable,
        rentTotal,
        startDate: contract.startDate,
        endDate: contract.endDate,
        baseRentUF: contract.baseRentUF,
        lifecycle: getContractLifecycle(contract),
        signatureStatus: contract.signatureStatus,
        localCount: contract.localIds.length,
      };
    })
    .sort((left, right) => left.storeName.localeCompare(right.storeName, 'es'));
}

export function buildAlerts(state: AppState, referenceDate = new Date()): AlertItem[] {
  const alerts: AlertItem[] = [];
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const currentMonth = monthKey(today);
  const currentBudgetLoaded = state.planning.some((entry) => entry.type === 'budget' && entry.month === currentMonth);
  const currentForecastLoaded = state.planning.some((entry) => entry.type === 'forecast' && entry.month === currentMonth);

  if (state.units.length === 0) {
    alerts.push({
      id: 'setup-mall',
      type: 'critical',
      title: 'Falta configurar el mall',
      description: 'Debes cargar los locales y sus m2 para activar el mapa, contratos y KPIs.',
      createdAt: today.toISOString(),
    });
  }

  if (!currentBudgetLoaded) {
    alerts.push({
      id: 'budget-missing-current',
      type: 'info',
      title: 'Falta presupuesto del mes actual',
      description: 'No hay presupuesto cargado para el mes en curso. Puedes importarlo o generarlo automáticamente.',
      createdAt: today.toISOString(),
    });
  }

  if (!currentForecastLoaded) {
    alerts.push({
      id: 'forecast-missing-current',
      type: 'info',
      title: 'Falta forecast del mes actual',
      description: 'No hay forecast cargado para el mes en curso. La app puede generarlo automáticamente.',
      createdAt: today.toISOString(),
    });
  }

  state.units.forEach((unit) => {
    const linkedContracts = state.contracts.filter(
      (contract) =>
        contract.localIds.includes(unit.id) && getContractLifecycle(contract, today) !== 'vencido',
    );
    if (linkedContracts.length === 0) {
      alerts.push({
        id: `unit-vacant-${unit.id}`,
        type: 'warning',
        title: `Local sin contrato: ${unit.code}`,
        description: `${unit.label} (${unit.areaM2} m2) no tiene contrato asociado.`,
        createdAt: today.toISOString(),
        unitId: unit.id,
      });
    }
  });

  state.contracts.forEach((contract) => {
    const display = getContractDisplayValues(contract);
    const lifecycle = getContractLifecycle(contract, today);
    const daysToEnd = diffInDays(today, new Date(contract.endDate));
    const currentMonthSales = sumSalesByContract(contract.id, state.sales, currentMonth);

    if (contract.signatureStatus !== 'firmado') {
      alerts.push({
        id: `signature-${contract.id}`,
        type: contract.signatureStatus === 'pendiente' ? 'critical' : 'warning',
        title: `Firma pendiente: ${display.storeName}`,
        description: `Estado actual: ${contract.signatureStatus.replace('_', ' ')}. Inicio ${contract.startDate}.`,
        createdAt: today.toISOString(),
        contractId: contract.id,
      });
    }

    if (lifecycle === 'por_vencer') {
      alerts.push({
        id: `expiring-${contract.id}`,
        type: 'warning',
        title: `Contrato por vencer: ${display.storeName}`,
        description: `Vence en ${daysToEnd} días. Revisar renovación y anexos.`,
        createdAt: today.toISOString(),
        contractId: contract.id,
      });
    }

    if (lifecycle === 'vencido') {
      alerts.push({
        id: `expired-${contract.id}`,
        type: 'critical',
        title: `Contrato vencido: ${display.storeName}`,
        description: `El contrato terminó el ${contract.endDate}.`,
        createdAt: today.toISOString(),
        contractId: contract.id,
      });
    }

    if (currentMonthSales === 0 && lifecycle !== 'vencido') {
      alerts.push({
        id: `sales-missing-${contract.id}`,
        type: 'info',
        title: `Sin ventas cargadas: ${display.storeName}`,
        description: 'No hay ventas del mes actual registradas para este contrato.',
        createdAt: today.toISOString(),
        contractId: contract.id,
      });
    }
  });

  buildContractOverlapConflicts(state).forEach((conflict) => {
    alerts.push({
      id: `overlap-${conflict.unitId}`,
      type: 'critical',
      title: `Conflicto contractual en ${conflict.unitCode}`,
      description: `Hay más de un contrato superpuesto para este local: ${conflict.storeNames.join(', ')}.`,
      createdAt: today.toISOString(),
      unitId: conflict.unitId,
    });
  });

  return alerts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function buildChartSeries(state: AppState, referenceDate = new Date()): ChartPoint[] {
  const series: ChartPoint[] = [];

  for (let offset = -5; offset <= 0; offset += 1) {
    const date = addMonths(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), offset);
    const month = monthKey(date);
    const monthSales = state.sales
      .filter((item) => monthKey(item.occurredAt) === month)
      .reduce((sum, item) => sum + item.grossAmount, 0);
    const monthlyBudget = state.planning
      .filter((item) => item.type === 'budget' && item.month === month)
      .reduce((sum, item) => sum + item.salesAmount, 0);
    const monthlyForecast = state.planning
      .filter((item) => item.type === 'forecast' && item.month === month)
      .reduce((sum, item) => sum + item.salesAmount, 0);
    const monthlyRent = buildTenantSummaries(state, date).reduce((sum, item) => sum + item.rentTotal, 0);

    series.push({
      month: monthLabel(month),
      sales: monthSales,
      rent: monthlyRent,
      budget: monthlyBudget,
      forecast: monthlyForecast,
    });
  }

  return series;
}

export function buildDashboardInsights(state: AppState, referenceDate = new Date()): DashboardInsights {
  const tenantSummaries = buildTenantSummaries(state, referenceDate);
  const alerts = buildAlerts(state, referenceDate);
  const currentMonth = monthKey(referenceDate);
  const activeTenantSummaries = tenantSummaries.filter((tenant) => tenant.lifecycle !== 'vencido');
  const activeContracts = state.contracts.filter((contract) => getContractLifecycle(contract, referenceDate) !== 'vencido');
  const occupiedUnitIds = new Set(activeContracts.flatMap((contract) => contract.localIds));
  const totalAreaM2 = state.units.reduce((sum, item) => sum + item.areaM2, 0);
  const monthlySales = state.sales
    .filter((entry) => monthKey(entry.occurredAt) === currentMonth)
    .reduce((sum, entry) => sum + entry.grossAmount, 0);
  const occupiedArea = activeTenantSummaries.reduce((sum, item) => sum + item.areaM2, 0);
  const monthlyRent = activeTenantSummaries.reduce((sum, item) => sum + item.rentTotal, 0);
  const currentBudget = state.planning
    .filter((entry) => entry.type === 'budget' && entry.month === currentMonth)
    .reduce((sum, entry) => sum + entry.salesAmount, 0);
  const currentForecast = state.planning
    .filter((entry) => entry.type === 'forecast' && entry.month === currentMonth)
    .reduce((sum, entry) => sum + entry.salesAmount, 0);

  return {
    isSetupComplete: state.mall !== null && state.units.length > 0,
    tenantSummaries,
    alerts,
    chartSeries: buildChartSeries(state, referenceDate),
    occupancyPct: state.units.length > 0 ? Math.round((occupiedUnitIds.size / state.units.length) * 1000) / 10 : 0,
    occupiedUnits: occupiedUnitIds.size,
    totalUnits: state.units.length,
    totalAreaM2,
    monthlySales,
    averageSalesPerM2: occupiedArea > 0 ? Math.round(monthlySales / occupiedArea) : 0,
    monthlyRent,
    signedContracts: activeContracts.filter((contract) => contract.signatureStatus === 'firmado').length,
    pendingSignatureContracts: activeContracts.filter((contract) => contract.signatureStatus !== 'firmado').length,
    budgetCompletionPct: currentBudget > 0 ? Math.round((monthlySales / currentBudget) * 1000) / 10 : 0,
    activeForecast: currentForecast,
  };
}

function estimatePortfolioVariableRate(state: AppState, referenceDate = new Date()): number {
  const activeContracts = state.contracts.filter((contract) => getContractLifecycle(contract, referenceDate) !== 'vencido');
  if (activeContracts.length === 0) {
    return 0;
  }

  const recentMonths = new Set(
    [-2, -1, 0].map((offset) =>
      monthKey(addMonths(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), offset)),
    ),
  );

  const salesByContract = new Map<string, number>();
  state.sales.forEach((sale) => {
    if (!sale.contractId || !recentMonths.has(monthKey(sale.occurredAt))) {
      return;
    }
    salesByContract.set(sale.contractId, (salesByContract.get(sale.contractId) ?? 0) + sale.grossAmount);
  });

  const totalRecentSales = Array.from(salesByContract.values()).reduce((sum, value) => sum + value, 0);
  if (totalRecentSales > 0) {
    return activeContracts.reduce((sum, contract) => {
      const weight = (salesByContract.get(contract.id) ?? 0) / totalRecentSales;
      return sum + weight * contract.variableRentPct;
    }, 0);
  }

  return (
    activeContracts.reduce((sum, contract) => sum + contract.variableRentPct, 0) / activeContracts.length
  );
}

function estimatePlanningRent(state: AppState, projectedSales: number, referenceDate = new Date()): number {
  const activeContracts = state.contracts.filter((contract) => getContractLifecycle(contract, referenceDate) !== 'vencido');
  const fixedBase = activeContracts.reduce((sum, contract) => sum + contract.fixedRent + contract.commonExpenses, 0);
  const variableRate = estimatePortfolioVariableRate(state, referenceDate) / 100;
  return Math.round(fixedBase + projectedSales * variableRate);
}

export function buildAutomaticBudget(
  state: AppState,
  horizonMonths = 6,
  upliftPct = 6,
  referenceDate = new Date(),
): PlanningEntry[] {
  const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const historyByMonth = new Map<string, number>();

  state.sales.forEach((entry) => {
    const month = monthKey(entry.occurredAt);
    historyByMonth.set(month, (historyByMonth.get(month) ?? 0) + entry.grossAmount);
  });

  const historicalMonths = Array.from(historyByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6);
  const historicalAverage =
    historicalMonths.length > 0
      ? historicalMonths.reduce((sum, [, value]) => sum + value, 0) / historicalMonths.length
      : 0;

  const result: PlanningEntry[] = [];

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const monthDate = addMonths(startDate, offset);
    const month = monthKey(monthDate);
    const priorYearMonth = monthKey(addMonths(monthDate, -12));
    const referenceSales =
      historyByMonth.get(month) ??
      historyByMonth.get(priorYearMonth) ??
      (offset > 0 ? result[offset - 1]?.salesAmount : undefined) ??
      historicalAverage;
    const salesAmount = Math.round(referenceSales * (1 + upliftPct / 100));

    result.push({
      id: createId('budget'),
      type: 'budget',
      month,
      salesAmount,
      rentAmount: estimatePlanningRent(state, salesAmount, monthDate),
      generated: true,
      note: `Generado automáticamente con uplift de ${upliftPct}% sobre histórico reciente.`,
    });
  }

  return result;
}

export function buildAutomaticForecast(state: AppState, horizonMonths = 6, referenceDate = new Date()): PlanningEntry[] {
  const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const historyByMonth = new Map<string, number>();

  state.sales.forEach((entry) => {
    const month = monthKey(entry.occurredAt);
    const currentValue = historyByMonth.get(month) ?? 0;
    historyByMonth.set(month, currentValue + entry.grossAmount);
  });

  const historicalMonths = Array.from(historyByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6);
  const historicalAverage =
    historicalMonths.length > 0
      ? historicalMonths.reduce((sum, [, value]) => sum + value, 0) / historicalMonths.length
      : 0;

  const budgetIndex = new Map(
    state.planning
      .filter((entry) => entry.type === 'budget')
      .map((entry) => [entry.month, entry.salesAmount]),
  );

  const result: PlanningEntry[] = [];

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const monthDate = addMonths(startDate, offset);
    const month = monthKey(monthDate);
    const budgetForMonth = budgetIndex.get(month) ?? 0;
    const projectedSales = Math.round(budgetForMonth > 0 ? budgetForMonth * 0.97 : historicalAverage * (1 + offset * 0.015));

    result.push({
      id: createId('forecast'),
      type: 'forecast',
      month,
      salesAmount: projectedSales,
      rentAmount: estimatePlanningRent(state, projectedSales, monthDate),
      generated: true,
      note: 'Generado automáticamente a partir del histórico y del presupuesto disponible.',
    });
  }

  return result;
}

export function buildContractOverlapConflicts(state: AppState): ContractOverlapConflict[] {
  return state.units
    .map((unit) => {
      const overlappingContracts = state.contracts.filter((contract) => contract.localIds.includes(unit.id));
      const conflictingContracts = overlappingContracts.filter((contract, index) =>
        overlappingContracts.some(
          (candidate, candidateIndex) =>
            candidateIndex !== index && contractDateRangesOverlap(contract, candidate),
        ),
      );

      if (conflictingContracts.length <= 1) {
        return undefined;
      }

      return {
        unitId: unit.id,
        unitCode: unit.code,
        contractIds: conflictingContracts.map((contract) => contract.id),
        storeNames: conflictingContracts.map((contract) => getContractDisplayValues(contract).storeName),
      };
    })
    .filter((item): item is ContractOverlapConflict => Boolean(item));
}
