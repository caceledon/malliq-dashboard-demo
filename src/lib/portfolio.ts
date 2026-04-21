import {
  buildDashboardInsights,
  emptyAppState,
  type AppState,
  type AssetSettings,
  type BackupDocumentPayload,
} from '@/lib/domain';

export interface AssetWorkspace extends AppState {
  asset: AssetSettings;
}

export interface PortfolioState {
  version: 2;
  activeAssetId: string | null;
  workspaces: AssetWorkspace[];
}

export interface PortfolioBackupDocumentPayload extends BackupDocumentPayload {
  assetId: string;
}

export interface PortfolioBackupArchive {
  version: 2;
  exportedAt: string;
  portfolio: PortfolioState;
  documents: PortfolioBackupDocumentPayload[];
}

export interface PortfolioAssetSummary {
  id: string;
  name: string;
  city: string;
  region: string;
  syncStatus?: AssetSettings['syncStatus'];
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
  assetCount: number;
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
    activeAssetId: null,
    workspaces: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAssetSettings(value: unknown): value is AssetSettings {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    'asset' in value &&
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

function isAssetWorkspace(value: unknown): value is AssetWorkspace {
  return isAppState(value) && isAssetSettings(value.asset);
}

function isPortfolioState(value: unknown): value is PortfolioState {
  return isRecord(value) && value.version === 2 && Array.isArray(value.workspaces);
}

export function normalizePortfolioState(portfolio: PortfolioState): PortfolioState {
  const workspaces = portfolio.workspaces.filter(isAssetWorkspace);
  const activeAssetId = workspaces.some((workspace) => workspace.asset.id === portfolio.activeAssetId)
    ? portfolio.activeAssetId
    : workspaces[0]?.asset.id ?? null;

  return {
    version: 2,
    activeAssetId,
    workspaces,
  };
}

export function migrateLegacyAppState(state: AppState): PortfolioState {
  if (!state.asset) {
    return emptyPortfolioState();
  }

  return normalizePortfolioState({
    version: 2,
    activeAssetId: state.asset.id,
    workspaces: [
      {
        ...emptyAppState(),
        ...state,
        asset: state.asset,
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

  // Legacy migration from single-asset state (stored as AppState with 'mall' key)
  if (isRecord(raw) && ('mall' in raw || 'asset' in raw)) {
    return migrateLegacyAppState((raw as unknown) as AppState);
  }

  return emptyPortfolioState();
}

export function getActiveWorkspace(portfolio: PortfolioState): AssetWorkspace | null {
  if (!portfolio.activeAssetId) {
    return null;
  }

  return portfolio.workspaces.find((workspace) => workspace.asset.id === portfolio.activeAssetId) ?? null;
}

export function getWorkspaceById(portfolio: PortfolioState, assetId: string): AssetWorkspace | null {
  return portfolio.workspaces.find((workspace) => workspace.asset.id === assetId) ?? null;
}

export function buildPortfolioAssetSummary(workspace: AssetWorkspace): PortfolioAssetSummary {
  const insights = buildDashboardInsights(workspace);

  return {
    id: workspace.asset.id,
    name: workspace.asset.name,
    city: workspace.asset.city,
    region: workspace.asset.region,
    syncStatus: workspace.asset.syncStatus,
    lastSyncedAt: workspace.asset.lastSyncedAt,
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

export function buildPortfolioStats(summaries: PortfolioAssetSummary[]): PortfolioStats {
  const assetCount = summaries.length;
  const totalUnits = summaries.reduce((sum, item) => sum + item.totalUnits, 0);
  const occupiedUnits = summaries.reduce((sum, item) => sum + item.occupiedUnits, 0);
  const monthlySales = summaries.reduce((sum, item) => sum + item.monthlySales, 0);
  const alertCount = summaries.reduce((sum, item) => sum + item.alertCount, 0);

  return {
    assetCount,
    totalUnits,
    occupiedUnits,
    occupancyPct: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0,
    monthlySales,
    alertCount,
  };
}
