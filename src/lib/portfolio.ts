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

// Track-level feature flags. Keys are added when a track ships behind a flag;
// every flag is opt-in and defaults to the values in DEFAULT_FEATURE_FLAGS.
export type FeatureFlagKey =
  | 'sourceLinkedAbstracts'
  | 'asistenteIA'
  | 'clausulasLedger'
  | 'stackingPlan'
  | 'renewalScoring'
  | 'casualLicensing'
  | 'tenantPwa'
  | 'camReconciliation'
  | 'crossShopping'
  | 'crisisBroadcast'
  | 'mallqIndex'
  | 'scenarioModeling';

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  sourceLinkedAbstracts: true,
  asistenteIA: false,
  clausulasLedger: false,
  stackingPlan: false,
  renewalScoring: false,
  casualLicensing: false,
  tenantPwa: false,
  camReconciliation: false,
  crossShopping: false,
  crisisBroadcast: false,
  mallqIndex: false,
  scenarioModeling: false,
};

export interface PortfolioState {
  version: 3;
  activeAssetId: string | null;
  workspaces: AssetWorkspace[];
  featureFlags?: Partial<Record<FeatureFlagKey, boolean>>;
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
  monthlyRent: number;
  totalCost: number;
  expiringSoon: number;
  expired: number;
}

export interface PortfolioStats {
  assetCount: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyPct: number;
  monthlySales: number;
  alertCount: number;
  monthlyRent: number;
  totalCost: number;
  costoOcupacionPct: number;
  expiringSoon: number;
  expired: number;
}

export const STORAGE_KEY = 'malliq-functional-state';

export function emptyPortfolioState(): PortfolioState {
  return {
    version: 3,
    activeAssetId: null,
    workspaces: [],
    featureFlags: { sourceLinkedAbstracts: true },
  };
}

export function resolveFeatureFlag(
  portfolio: PortfolioState | null | undefined,
  key: FeatureFlagKey,
): boolean {
  return portfolio?.featureFlags?.[key] ?? DEFAULT_FEATURE_FLAGS[key];
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
  // v2 (legacy) and v3 are both accepted; normalizePortfolioState upgrades
  // shape and stamps version: 3 on the way out.
  return (
    isRecord(value) &&
    (value.version === 2 || value.version === 3) &&
    Array.isArray(value.workspaces)
  );
}

function sanitizeFeatureFlags(
  raw: unknown,
): Partial<Record<FeatureFlagKey, boolean>> {
  if (!isRecord(raw)) return {};
  const out: Partial<Record<FeatureFlagKey, boolean>> = {};
  for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]) {
    if (typeof raw[key] === 'boolean') {
      out[key] = raw[key] as boolean;
    }
  }
  return out;
}

export function normalizePortfolioState(portfolio: PortfolioState): PortfolioState {
  const workspaces = portfolio.workspaces.filter(isAssetWorkspace);
  const activeAssetId = workspaces.some((workspace) => workspace.asset.id === portfolio.activeAssetId)
    ? portfolio.activeAssetId
    : workspaces[0]?.asset.id ?? null;

  const incomingFlags = sanitizeFeatureFlags(portfolio.featureFlags);
  // v2 → v3 migration: when no flags slot exists, opt the operator into the
  // tracks that ship default-on (today: sourceLinkedAbstracts).
  const featureFlags: Partial<Record<FeatureFlagKey, boolean>> = {
    sourceLinkedAbstracts: true,
    ...incomingFlags,
  };

  return {
    version: 3,
    activeAssetId,
    workspaces,
    featureFlags,
  };
}

export function migrateLegacyAppState(state: AppState): PortfolioState {
  if (!state.asset) {
    return emptyPortfolioState();
  }

  return normalizePortfolioState({
    version: 3,
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
  const tenants = insights.tenantSummaries;
  const monthlyRent = tenants.reduce((sum, t) => sum + t.rentTotal, 0);
  const totalCost = tenants.reduce(
    (sum, t) => sum + t.rentTotal + t.commonExpensesClp + t.fondoPromocionClp,
    0,
  );
  const expiringSoon = tenants.filter((t) => t.lifecycle === 'por_vencer').length;
  const expired = tenants.filter((t) => t.lifecycle === 'vencido').length;

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
    activeContracts: tenants.length,
    prospectCount: workspace.prospects.filter(
      (prospect) => prospect.stage !== 'cerrado' && prospect.stage !== 'descartado',
    ).length,
    monthlyRent,
    totalCost,
    expiringSoon,
    expired,
  };
}

export function buildPortfolioStats(summaries: PortfolioAssetSummary[]): PortfolioStats {
  const assetCount = summaries.length;
  const totalUnits = summaries.reduce((sum, item) => sum + item.totalUnits, 0);
  const occupiedUnits = summaries.reduce((sum, item) => sum + item.occupiedUnits, 0);
  const monthlySales = summaries.reduce((sum, item) => sum + item.monthlySales, 0);
  const alertCount = summaries.reduce((sum, item) => sum + item.alertCount, 0);
  const monthlyRent = summaries.reduce((sum, item) => sum + item.monthlyRent, 0);
  const totalCost = summaries.reduce((sum, item) => sum + item.totalCost, 0);
  const expiringSoon = summaries.reduce((sum, item) => sum + item.expiringSoon, 0);
  const expired = summaries.reduce((sum, item) => sum + item.expired, 0);

  return {
    assetCount,
    totalUnits,
    occupiedUnits,
    occupancyPct: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0,
    monthlySales,
    alertCount,
    monthlyRent,
    totalCost,
    costoOcupacionPct: monthlySales > 0 ? (totalCost / monthlySales) * 100 : 0,
    expiringSoon,
    expired,
  };
}
