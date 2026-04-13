import {
  buildDashboardInsights,
  emptyAppState,
  type AppState,
  type BackupDocumentPayload,
  type MallSettings,
} from '@/lib/domain';

export interface MallWorkspace extends AppState {
  mall: MallSettings;
}

export interface PortfolioState {
  version: 2;
  activeMallId: string | null;
  workspaces: MallWorkspace[];
}

export interface PortfolioBackupDocumentPayload extends BackupDocumentPayload {
  mallId: string;
}

export interface PortfolioBackupArchive {
  version: 2;
  exportedAt: string;
  portfolio: PortfolioState;
  documents: PortfolioBackupDocumentPayload[];
}

export interface PortfolioMallSummary {
  id: string;
  name: string;
  city: string;
  region: string;
  syncStatus?: MallSettings['syncStatus'];
  lastSyncedAt?: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyPct: number;
  monthlySales: number;
  alertCount: number;
  activeContracts: number;
  prospectCount: number;
}

export interface PortfolioStats {
  mallCount: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyPct: number;
  monthlySales: number;
  alertCount: number;
}

export const STORAGE_KEY = 'malliq-functional-state';

export function emptyPortfolioState(): PortfolioState {
  return {
    version: 2,
    activeMallId: null,
    workspaces: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMallSettings(value: unknown): value is MallSettings {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    'mall' in value &&
    'units' in value &&
    'contracts' in value &&
    'sales' in value &&
    'planning' in value &&
    'documents' in value &&
    'suppliers' in value &&
    'prospects' in value &&
    'posConnections' in value &&
    'importLogs' in value
  );
}

function isMallWorkspace(value: unknown): value is MallWorkspace {
  return isAppState(value) && isMallSettings(value.mall);
}

function isPortfolioState(value: unknown): value is PortfolioState {
  return isRecord(value) && value.version === 2 && Array.isArray(value.workspaces);
}

export function normalizePortfolioState(portfolio: PortfolioState): PortfolioState {
  const workspaces = portfolio.workspaces.filter(isMallWorkspace);
  const activeMallId = workspaces.some((workspace) => workspace.mall.id === portfolio.activeMallId)
    ? portfolio.activeMallId
    : workspaces[0]?.mall.id ?? null;

  return {
    version: 2,
    activeMallId,
    workspaces,
  };
}

export function migrateLegacyAppState(state: AppState): PortfolioState {
  if (!state.mall) {
    return emptyPortfolioState();
  }

  return normalizePortfolioState({
    version: 2,
    activeMallId: state.mall.id,
    workspaces: [
      {
        ...emptyAppState(),
        ...state,
        mall: state.mall,
      },
    ],
  });
}

export function parseStoredPortfolio(raw: unknown): PortfolioState {
  if (isPortfolioState(raw)) {
    return normalizePortfolioState(raw);
  }

  if (isAppState(raw)) {
    return migrateLegacyAppState(raw);
  }

  return emptyPortfolioState();
}

export function getActiveWorkspace(portfolio: PortfolioState): MallWorkspace | null {
  if (!portfolio.activeMallId) {
    return null;
  }

  return portfolio.workspaces.find((workspace) => workspace.mall.id === portfolio.activeMallId) ?? null;
}

export function getWorkspaceById(portfolio: PortfolioState, mallId: string): MallWorkspace | null {
  return portfolio.workspaces.find((workspace) => workspace.mall.id === mallId) ?? null;
}

export function buildPortfolioMallSummary(workspace: MallWorkspace): PortfolioMallSummary {
  const insights = buildDashboardInsights(workspace);

  return {
    id: workspace.mall.id,
    name: workspace.mall.name,
    city: workspace.mall.city,
    region: workspace.mall.region,
    syncStatus: workspace.mall.syncStatus,
    lastSyncedAt: workspace.mall.lastSyncedAt,
    totalUnits: insights.totalUnits,
    occupiedUnits: insights.occupiedUnits,
    occupancyPct: insights.occupancyPct,
    monthlySales: insights.monthlySales,
    alertCount: insights.alerts.length,
    activeContracts: insights.tenantSummaries.length,
    prospectCount: workspace.prospects.filter(
      (prospect) => prospect.stage !== 'cerrado' && prospect.stage !== 'descartado',
    ).length,
  };
}

export function buildPortfolioStats(summaries: PortfolioMallSummary[]): PortfolioStats {
  const mallCount = summaries.length;
  const totalUnits = summaries.reduce((sum, item) => sum + item.totalUnits, 0);
  const occupiedUnits = summaries.reduce((sum, item) => sum + item.occupiedUnits, 0);
  const monthlySales = summaries.reduce((sum, item) => sum + item.monthlySales, 0);
  const alertCount = summaries.reduce((sum, item) => sum + item.alertCount, 0);

  return {
    mallCount,
    totalUnits,
    occupiedUnits,
    occupancyPct: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0,
    monthlySales,
    alertCount,
  };
}
