/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  buildSaleFingerprint,
  buildAutomaticBudget,
  buildAutomaticForecast,
  buildDashboardInsights,
  createId,
  emptyAppState,
  type AppState,
  type BackupArchive,
  type Contract,
  type DocumentKind,
  type DocumentRecord,
  type ImportLog,
  type AssetSettings,
  type AssetUnit,
  type PlanningEntry,
  type PosConnectionProfile,
  type Prospect,
  type SaleRecord,
  type Supplier,
} from '@/lib/domain';
import {
  buildPortfolioAssetSummary,
  buildPortfolioStats,
  emptyPortfolioState,
  getActiveWorkspace,
  getWorkspaceById,
  normalizePortfolioState,
  parseStoredPortfolio,
  STORAGE_KEY,
  type AssetWorkspace,
  type PortfolioBackupArchive,
  type PortfolioAssetSummary,
  type PortfolioStats,
  type PortfolioState,
} from '@/lib/portfolio';
import {
  deleteRemoteDocument,
  downloadRemoteDocument,
  fetchServerHealth,
  ingestFiscalText,
  proxyPosRequest,
  pullArchive,
  pushArchive,
  resolveApiBase,
  type ServerHealth,
  uploadRemoteDocument,
} from '@/lib/api';
import { deleteDocumentBlob, getDocumentBlob, resetDocumentStorage, saveDocumentBlob } from '@/lib/files';

const AUTO_SYNC_DEBOUNCE_MS = 1500;
const REMOTE_SYNC_POLL_MS = 15000;

interface AssetSetupInput {
  asset: Omit<AssetSettings, 'id' | 'createdAt'>;
  units: Array<Omit<AssetUnit, 'id'>>;
}

interface CreateAssetInput extends AssetSetupInput {
  makeActive?: boolean;
}

interface UploadDocumentInput {
  entityType: DocumentRecord['entityType'];
  entityId: string;
  kind: DocumentKind;
  note?: string;
  file: File;
}

interface AddSalesResult {
  added: number;
  duplicates: number;
}

interface AppContextValue {
  state: AppState;
  portfolio: PortfolioState;
  activeAssetId: string | null;
  assetSummaries: PortfolioAssetSummary[];
  portfolioStats: PortfolioStats;
  insights: ReturnType<typeof buildDashboardInsights>;
  unitsByCode: Map<string, string>;
  currentTenantId?: string;
  actions: {
    initializeAsset: (payload: AssetSetupInput) => void;
    createAsset: (payload: CreateAssetInput) => string;
    switchAsset: (assetId: string) => void;
    deleteAsset: (assetId: string) => Promise<void>;
    updateAssetSettings: (payload: Partial<Omit<AssetSettings, 'id' | 'createdAt'>>) => void;
    replaceUnits: (units: AssetUnit[]) => void;
    upsertContract: (contract: Omit<Contract, 'createdAt'> & { createdAt?: string }) => void;
    deleteContract: (contractId: string) => void;
    addSales: (sales: SaleRecord[], log?: Omit<ImportLog, 'id' | 'createdAt'>) => AddSalesResult;
    deleteSale: (saleId: string) => void;
    upsertPlanningEntry: (entry: PlanningEntry) => void;
    deletePlanningEntry: (entryId: string) => void;
    replacePlanningEntries: (entries: PlanningEntry[], type?: PlanningEntry['type']) => void;
    generateBudget: (months?: number, upliftPct?: number) => void;
    generateForecast: (months?: number) => void;
    upsertSupplier: (supplier: Supplier) => void;
    deleteSupplier: (supplierId: string) => void;
    upsertProspect: (prospect: Prospect) => void;
    deleteProspect: (prospectId: string) => void;
    upsertPosConnection: (profile: PosConnectionProfile) => void;
    deletePosConnection: (profileId: string) => void;
    recordPosSync: (profileId: string, status: 'success' | 'error', message: string) => void;
    uploadDocument: (payload: UploadDocumentInput) => Promise<void>;
    deleteDocument: (documentId: string) => Promise<void>;
    downloadDocument: (documentId: string) => Promise<void>;
    exportBackup: () => Promise<BackupArchive>;
    importBackup: (archive: BackupArchive) => Promise<void>;
    exportPortfolioBackup: () => Promise<PortfolioBackupArchive>;
    importPortfolioBackup: (archive: PortfolioBackupArchive) => Promise<void>;
    pingServer: (apiBase?: string) => Promise<ServerHealth>;
    pushToServer: (apiBase?: string) => Promise<void>;
    forcePushToServer: (apiBase?: string) => Promise<void>;
    pullFromServer: (apiBase?: string) => Promise<BackupArchive>;
    fetchViaServerPosProxy: (payload: { endpoint: string; method: 'GET' | 'POST'; token?: string; requestBody?: string }, apiBase?: string) => Promise<{ status: number; body: string }>;
    ingestFiscalThroughServer: (payload: { rawText?: string; file?: File }, apiBase?: string) => Promise<{ text: string }>;
  };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function loadPortfolioState(): PortfolioState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyPortfolioState();
  }

  try {
    return parseStoredPortfolio(JSON.parse(raw));
  } catch {
    return emptyPortfolioState();
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, content] = dataUrl.split(',');
  const mimeType = metadata.match(/data:(.*?);base64/)?.[1] ?? 'application/octet-stream';
  const binary = atob(content);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function serializeStateForSync(state: AppState): string {
  return JSON.stringify({
    ...state,
    asset: state.asset
      ? {
          ...state.asset,
          lastSyncedAt: undefined,
          serverRevision: undefined,
          syncStatus: undefined,
          syncMessage: undefined,
        }
      : state.asset,
  });
}

function classifySyncError(error: unknown): Pick<AssetSettings, 'syncStatus' | 'syncMessage'> {
  const message = error instanceof Error ? error.message : 'Error de sincronización.';
  return {
    syncStatus: /conflicto|revision conflict|409/i.test(message) ? 'conflict' : 'offline',
    syncMessage: message,
  };
}

function updateWorkspace(
  portfolio: PortfolioState,
  assetId: string,
  updater: (workspace: AssetWorkspace) => AssetWorkspace,
): PortfolioState {
  return normalizePortfolioState({
    ...portfolio,
    workspaces: portfolio.workspaces.map((workspace) =>
      workspace.asset.id === assetId ? updater(workspace) : workspace,
    ),
  });
}

function localizeDocumentRecords(documents: DocumentRecord[]): DocumentRecord[] {
  return documents.map((record) => ({
    ...record,
    storage: 'local',
    remotePath: undefined,
  }));
}

function mergeImportedAsset(importedAsset: AppState['asset'], currentAsset?: AssetSettings | null): AssetSettings | null {
  if (!importedAsset && !currentAsset) {
    return null;
  }

  return {
    ...(currentAsset ?? importedAsset ?? {}),
    ...(importedAsset ?? {}),
    id: currentAsset?.id ?? importedAsset?.id ?? createId('asset'),
    createdAt: currentAsset?.createdAt ?? importedAsset?.createdAt ?? new Date().toISOString(),
    syncStatus: importedAsset?.syncStatus ?? currentAsset?.syncStatus ?? 'idle',
    syncMessage: importedAsset?.syncMessage ?? currentAsset?.syncMessage ?? '',
  } as AssetSettings;
}

function normalizeImportedAppState(archiveState: AppState, currentAsset?: AssetSettings | null): AppState {
  return {
    ...emptyAppState(),
    ...archiveState,
    asset: mergeImportedAsset(archiveState.asset, currentAsset),
    documents: localizeDocumentRecords(archiveState.documents ?? []),
  };
}

function normalizeImportedWorkspace(workspace: AssetWorkspace): AssetWorkspace {
  return {
    ...workspace,
    asset: {
      ...workspace.asset,
      syncStatus: workspace.asset.syncStatus ?? 'idle',
      syncMessage: workspace.asset.syncMessage ?? '',
    },
    documents: localizeDocumentRecords(workspace.documents),
  };
}

function buildEmptyWorkspace(payload: AssetSetupInput): AssetWorkspace {
  return {
    ...emptyAppState(),
    asset: {
      id: createId('asset'),
      createdAt: new Date().toISOString(),
      ...payload.asset,
    },
    units: payload.units.map((unit) => ({
      ...unit,
      id: createId('unit'),
    })),
  };
}

async function cleanupLocalDocuments(documents: DocumentRecord[]) {
  await Promise.all(
    documents
      .filter((document) => document.storage !== 'remote')
      .map((document) => deleteDocumentBlob(document.id)),
  );
}

async function exportWorkspaceBackup(workspace: AppState): Promise<BackupArchive> {
  const documents = await Promise.all(
    workspace.documents.map(async (record) => {
      const blob = await getDocumentBlob(record.id);
      if (blob) {
        return {
          record,
          dataUrl: await blobToDataUrl(blob),
        };
      }

      if (record.storage === 'remote' && workspace.asset?.backendUrl) {
        const remoteBlob = await downloadRemoteDocument(resolveApiBase(workspace.asset.backendUrl), record.id);
        return {
          record,
          dataUrl: await blobToDataUrl(remoteBlob),
        };
      }

      return { record };
    }),
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: workspace,
    documents,
    serverRevision: workspace.asset?.serverRevision,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<PortfolioState>(loadPortfolioState);
  const activeWorkspace = useMemo(() => getActiveWorkspace(portfolio), [portfolio]);
  const state = useMemo(() => activeWorkspace ?? emptyAppState(), [activeWorkspace]);
  const activeAssetId = activeWorkspace?.asset.id ?? portfolio.activeAssetId ?? null;
  const syncHash = useMemo(() => (activeAssetId ? serializeStateForSync(state) : ''), [activeAssetId, state]);
  const insights = useMemo(() => buildDashboardInsights(state), [state]);
  const unitsByCode = useMemo(
    () => new Map(state.units.map((unit) => [unit.code.toUpperCase(), unit.id])),
    [state.units],
  );
  const currentTenantId = useMemo(
    () =>
      insights.tenantSummaries.find((tenant) => tenant.lifecycle !== 'vencido')?.id ??
      insights.tenantSummaries[0]?.id,
    [insights.tenantSummaries],
  );
  const assetSummaries = useMemo(
    () =>
      [...portfolio.workspaces]
        .map(buildPortfolioAssetSummary)
        .sort((left, right) => left.name.localeCompare(right.name, 'es')),
    [portfolio.workspaces],
  );
  const portfolioStats = useMemo(() => buildPortfolioStats(assetSummaries), [assetSummaries]);
  const configuredApiBase = useMemo(() => resolveApiBase(state.asset?.backendUrl), [state.asset?.backendUrl]);
  const shouldSyncRemotely = Boolean(state.asset?.syncEnabled && state.asset?.backendUrl);

  const portfolioRef = useRef(portfolio);
  const stateRef = useRef(state);
  const activeAssetIdRef = useRef<string | null>(activeAssetId);
  const syncingRef = useRef(false);
  const suppressDirtyTrackingRef = useRef(false);
  const lastStableSyncHashRef = useRef<Record<string, string>>({});
  const dirtyRef = useRef<Record<string, boolean>>({});
  const pushTimeoutRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const actionsRef = useRef<AppContextValue['actions'] | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    activeAssetIdRef.current = activeAssetId;
  }, [activeAssetId]);

  const setSyncMetadata = (payload: Partial<AssetSettings>, assetId = activeAssetIdRef.current) => {
    if (!assetId) {
      return;
    }

    setPortfolio((current) =>
      updateWorkspace(current, assetId, (workspace) => ({
        ...workspace,
        asset: {
          ...workspace.asset,
          ...payload,
        },
      })),
    );
  };

  const actions: AppContextValue['actions'] = {
    initializeAsset(payload) {
      setPortfolio((current) => {
        if (!current.activeAssetId) {
          const workspace = buildEmptyWorkspace(payload);
          return normalizePortfolioState({
            ...current,
            activeAssetId: workspace.asset.id,
            workspaces: [...current.workspaces, workspace],
          });
        }

        return updateWorkspace(current, current.activeAssetId, (workspace) => ({
          ...workspace,
          asset: {
            ...workspace.asset,
            ...payload.asset,
          },
          units: payload.units.map((unit, index) => ({
            ...unit,
            id: workspace.units[index]?.id ?? createId('unit'),
          })),
        }));
      });
    },
    createAsset(payload) {
      const workspace = buildEmptyWorkspace(payload);
      setPortfolio((current) =>
        normalizePortfolioState({
          ...current,
          activeAssetId: payload.makeActive ?? !current.activeAssetId ? workspace.asset.id : current.activeAssetId,
          workspaces: [...current.workspaces, workspace],
        }),
      );
      return workspace.asset.id;
    },
    switchAsset(assetId) {
      setPortfolio((current) =>
        normalizePortfolioState({
          ...current,
          activeAssetId: assetId,
        }),
      );
    },
    async deleteAsset(assetId) {
      const workspace = getWorkspaceById(portfolioRef.current, assetId);
      if (!workspace) {
        return;
      }

      await cleanupLocalDocuments(workspace.documents);
      setPortfolio((current) =>
        normalizePortfolioState({
          ...current,
          workspaces: current.workspaces.filter((item) => item.asset.id !== assetId),
          activeAssetId:
            current.activeAssetId === assetId
              ? current.workspaces.find((item) => item.asset.id !== assetId)?.asset.id ?? null
              : current.activeAssetId,
        }),
      );
      delete lastStableSyncHashRef.current[assetId];
      delete dirtyRef.current[assetId];
    },
    updateAssetSettings(payload) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          asset: {
            ...workspace.asset,
            ...payload,
          },
        })),
      );
    },
    replaceUnits(units) {
      if (!activeAssetIdRef.current) {
        return;
      }

      const validUnitIds = new Set(units.map((unit) => unit.id));
      const currentContracts = stateRef.current.contracts
        .map((contract) => ({
          ...contract,
          localIds: contract.localIds.filter((unitId) => validUnitIds.has(unitId)),
        }))
        .filter((contract) => contract.localIds.length > 0);
      const validContractIds = new Set(currentContracts.map((contract) => contract.id));
      const removedDocuments = stateRef.current.documents.filter(
        (document) =>
          (document.entityType === 'unit' && !validUnitIds.has(document.entityId)) ||
          (document.entityType === 'contract' && !validContractIds.has(document.entityId)),
      );
      void cleanupLocalDocuments(removedDocuments);

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const nextContracts = workspace.contracts
            .map((contract) => ({
              ...contract,
              localIds: contract.localIds.filter((unitId) => validUnitIds.has(unitId)),
            }))
            .filter((contract) => contract.localIds.length > 0);
          const nextContractIds = new Set(nextContracts.map((contract) => contract.id));

          return {
            ...workspace,
            units,
            contracts: nextContracts,
            sales: workspace.sales
              .map((sale) => ({
                ...sale,
                contractId: sale.contractId && nextContractIds.has(sale.contractId) ? sale.contractId : undefined,
                localIds: sale.localIds.filter((unitId) => validUnitIds.has(unitId)),
              }))
              .filter((sale) => sale.localIds.length > 0 || sale.contractId),
            planning: workspace.planning.filter(
              (entry) => !entry.contractId || nextContractIds.has(entry.contractId),
            ),
            documents: workspace.documents.filter(
              (document) =>
                !(
                  (document.entityType === 'unit' && !validUnitIds.has(document.entityId)) ||
                  (document.entityType === 'contract' && !nextContractIds.has(document.entityId))
                ),
            ),
          };
        }),
      );
    },
    upsertContract(contract) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const nextContract: Contract = {
            ...contract,
            fondoPromocion: contract.fondoPromocion ?? 0,
            garantiaMonto: contract.garantiaMonto ?? 0,
            garantiaVencimiento: contract.garantiaVencimiento ?? '',
            feeIngreso: contract.feeIngreso ?? 0,
            rentSteps: contract.rentSteps ?? [],
            healthPagoAlDia: contract.healthPagoAlDia ?? true,
            healthEntregaVentas: contract.healthEntregaVentas ?? true,
            healthNivelVenta: contract.healthNivelVenta ?? false,
            healthNivelRenta: contract.healthNivelRenta ?? false,
            healthPercepcionAdmin: contract.healthPercepcionAdmin ?? true,
            signedAt:
              contract.signatureStatus === 'firmado'
                ? contract.signedAt ?? new Date().toISOString()
                : undefined,
            createdAt: contract.createdAt ?? new Date().toISOString(),
          };
          const exists = workspace.contracts.some((item) => item.id === nextContract.id);

          return {
            ...workspace,
            contracts: exists
              ? workspace.contracts.map((item) => (item.id === nextContract.id ? nextContract : item))
              : [...workspace.contracts, nextContract],
          };
        }),
      );
    },
    deleteContract(contractId) {
      if (!activeAssetIdRef.current) {
        return;
      }

      const removedDocuments = stateRef.current.documents.filter(
        (document) => document.entityType === 'contract' && document.entityId === contractId,
      );
      void cleanupLocalDocuments(removedDocuments);

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          contracts: workspace.contracts.filter((contract) => contract.id !== contractId),
          sales: workspace.sales.filter((sale) => sale.contractId !== contractId),
          planning: workspace.planning.filter((entry) => entry.contractId !== contractId),
          documents: workspace.documents.filter(
            (document) => !(document.entityType === 'contract' && document.entityId === contractId),
          ),
        })),
      );
    },
    addSales(sales, log) {
      if (!activeAssetIdRef.current) {
        return { added: 0, duplicates: 0 };
      }

      let result: AddSalesResult = { added: 0, duplicates: 0 };
      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const existingFingerprints = new Set(workspace.sales.map((sale) => buildSaleFingerprint(sale)));
          const uniqueSales = sales.filter((sale) => {
            const fingerprint = buildSaleFingerprint(sale);
            if (existingFingerprints.has(fingerprint)) {
              return false;
            }

            existingFingerprints.add(fingerprint);
            return true;
          });

          result = {
            added: uniqueSales.length,
            duplicates: sales.length - uniqueSales.length,
          };

          return {
            ...workspace,
            sales: [...uniqueSales, ...workspace.sales].sort((left, right) =>
              right.occurredAt.localeCompare(left.occurredAt),
            ),
            importLogs: log
              ? [
                  {
                    id: createId('import'),
                    createdAt: new Date().toISOString(),
                    ...log,
                    importedCount: uniqueSales.length,
                    note:
                      result.duplicates > 0
                        ? `${log.note} ${result.duplicates} duplicado(s) omitido(s).`
                        : log.note,
                  },
                  ...workspace.importLogs,
                ]
              : workspace.importLogs,
          };
        }),
      );
      return result;
    },
    deleteSale(saleId) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          sales: workspace.sales.filter((sale) => sale.id !== saleId),
        })),
      );
    },
    upsertPlanningEntry(entry) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const exists = workspace.planning.some((item) => item.id === entry.id);
          return {
            ...workspace,
            planning: exists
              ? workspace.planning.map((item) => (item.id === entry.id ? entry : item))
              : [...workspace.planning, entry],
          };
        }),
      );
    },
    deletePlanningEntry(entryId) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          planning: workspace.planning.filter((entry) => entry.id !== entryId),
        })),
      );
    },
    replacePlanningEntries(entries, type) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          planning: [
            ...workspace.planning.filter((entry) => (type ? entry.type !== type : false)),
            ...entries,
          ],
        })),
      );
    },
    generateBudget(months = 6, upliftPct = 6) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          planning: [
            ...workspace.planning.filter((entry) => entry.type !== 'budget'),
            ...buildAutomaticBudget(workspace, months, upliftPct),
          ],
        })),
      );
    },
    generateForecast(months = 6) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          planning: [
            ...workspace.planning.filter((entry) => entry.type !== 'forecast'),
            ...buildAutomaticForecast(workspace, months),
          ],
        })),
      );
    },
    upsertSupplier(supplier) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const exists = workspace.suppliers.some((item) => item.id === supplier.id);
          return {
            ...workspace,
            suppliers: exists
              ? workspace.suppliers.map((item) => (item.id === supplier.id ? supplier : item))
              : [...workspace.suppliers, supplier],
          };
        }),
      );
    },
    deleteSupplier(supplierId) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          suppliers: workspace.suppliers.filter((supplier) => supplier.id !== supplierId),
        })),
      );
    },
    upsertProspect(prospect) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const exists = workspace.prospects.some((item) => item.id === prospect.id);
          return {
            ...workspace,
            prospects: exists
              ? workspace.prospects.map((item) => (item.id === prospect.id ? prospect : item))
              : [...workspace.prospects, prospect],
          };
        }),
      );
    },
    deleteProspect(prospectId) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          prospects: workspace.prospects.filter((prospect) => prospect.id !== prospectId),
        })),
      );
    },
    upsertPosConnection(profile) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => {
          const existing = workspace.posConnections.find((item) => item.id === profile.id);
          const nextProfile: PosConnectionProfile = {
            ...profile,
            lastStatus: existing?.lastStatus ?? profile.lastStatus,
            lastMessage: existing?.lastMessage ?? profile.lastMessage,
            lastSyncAt: existing?.lastSyncAt ?? profile.lastSyncAt,
          };
          const exists = Boolean(existing);

          return {
            ...workspace,
            posConnections: exists
              ? workspace.posConnections.map((item) => (item.id === profile.id ? nextProfile : item))
              : [...workspace.posConnections, nextProfile],
          };
        }),
      );
    },
    deletePosConnection(profileId) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          posConnections: workspace.posConnections.filter((profile) => profile.id !== profileId),
        })),
      );
    },
    recordPosSync(profileId, status, message) {
      if (!activeAssetIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeAssetIdRef.current!, (workspace) => ({
          ...workspace,
          posConnections: workspace.posConnections.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  lastStatus: status,
                  lastMessage: message,
                  lastSyncAt: new Date().toISOString(),
                }
              : profile,
          ),
        })),
      );
    },
    async uploadDocument(payload) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      if (!currentWorkspace?.asset) {
        return;
      }

      const documentId = createId('document');
      const shouldUploadRemotely = Boolean(currentWorkspace.asset.syncEnabled && currentWorkspace.asset.backendUrl);
      const apiBase = resolveApiBase(currentWorkspace.asset.backendUrl);
      const localRecord: DocumentRecord = {
        id: documentId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        name: payload.file.name,
        kind: payload.kind,
        mimeType: payload.file.type || 'application/octet-stream',
        size: payload.file.size,
        note: payload.note,
        uploadedAt: new Date().toISOString(),
        storage: shouldUploadRemotely ? 'remote' : 'local',
      };

      let record = localRecord;
      let syncedAt: string | undefined;
      let revision: number | undefined;
      if (shouldUploadRemotely) {
        const remote = await uploadRemoteDocument(apiBase, {
          id: documentId,
          entityType: payload.entityType,
          entityId: payload.entityId,
          kind: payload.kind,
          note: payload.note,
          file: payload.file,
        });
        record = remote.record;
        syncedAt = remote.updatedAt;
        revision = remote.revision;
        suppressDirtyTrackingRef.current = true;
      } else {
        await saveDocumentBlob(documentId, payload.file);
      }

      setPortfolio((current) =>
        updateWorkspace(current, currentWorkspace.asset.id, (workspace) => ({
          ...workspace,
          asset:
            shouldUploadRemotely
              ? {
                  ...workspace.asset,
                  lastSyncedAt: syncedAt ?? new Date().toISOString(),
                  serverRevision: revision ?? workspace.asset.serverRevision,
                  syncStatus: 'online',
                  syncMessage: 'Documento sincronizado con backend.',
                }
              : workspace.asset,
          documents: [record, ...workspace.documents],
          contracts:
            payload.entityType === 'contract' && payload.kind === 'anexo'
              ? workspace.contracts.map((contract) =>
                  contract.id === payload.entityId
                    ? { ...contract, annexCount: contract.annexCount + 1 }
                    : contract,
                )
              : workspace.contracts,
        })),
      );
    },
    async deleteDocument(documentId) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      const target = currentWorkspace?.documents.find((document) => document.id === documentId);
      if (!currentWorkspace || !target) {
        return;
      }

      let syncedAt: string | undefined;
      let revision: number | undefined;
      if (target.storage === 'remote') {
        const remote = await deleteRemoteDocument(resolveApiBase(currentWorkspace.asset.backendUrl), documentId);
        syncedAt = remote.updatedAt;
        revision = remote.revision;
        suppressDirtyTrackingRef.current = true;
      } else {
        await deleteDocumentBlob(documentId);
      }

      setPortfolio((current) =>
        updateWorkspace(current, currentWorkspace.asset.id, (workspace) => ({
          ...workspace,
          asset:
            target.storage === 'remote'
              ? {
                  ...workspace.asset,
                  lastSyncedAt: syncedAt ?? new Date().toISOString(),
                  serverRevision: revision ?? workspace.asset.serverRevision,
                  syncStatus: 'online',
                  syncMessage: 'Documento eliminado y sincronizado con backend.',
                }
              : workspace.asset,
          documents: workspace.documents.filter((document) => document.id !== documentId),
          contracts:
            target.entityType === 'contract' && target.kind === 'anexo'
              ? workspace.contracts.map((contract) =>
                  contract.id === target.entityId
                    ? { ...contract, annexCount: Math.max(0, contract.annexCount - 1) }
                    : contract,
                )
              : workspace.contracts,
        })),
      );
    },
    async downloadDocument(documentId) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      const record = currentWorkspace?.documents.find((document) => document.id === documentId);
      if (!currentWorkspace || !record) {
        return;
      }

      const blob =
        record.storage === 'remote'
          ? await downloadRemoteDocument(resolveApiBase(currentWorkspace.asset.backendUrl), documentId)
          : await getDocumentBlob(documentId);
      if (!blob) {
        return;
      }

      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = record.name;
      link.click();
      URL.revokeObjectURL(href);
    },
    async exportBackup() {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      return exportWorkspaceBackup(currentWorkspace ?? stateRef.current);
    },
    async importBackup(archive) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      const importedState = normalizeImportedAppState(archive.state, currentWorkspace?.asset);
      const nextState = importedState.asset
        ? {
            ...importedState,
            asset: {
              ...importedState.asset,
              serverRevision: archive.serverRevision ?? importedState.asset.serverRevision,
            },
          }
        : importedState;

      suppressDirtyTrackingRef.current = true;
      await resetDocumentStorage();
      for (const item of archive.documents) {
        if (item.dataUrl) {
          await saveDocumentBlob(item.record.id, dataUrlToBlob(item.dataUrl));
        }
      }

      if (!nextState.asset) {
        return;
      }

      setPortfolio((current) => {
        if (!current.activeAssetId) {
          return normalizePortfolioState({
            ...current,
            activeAssetId: nextState.asset!.id,
            workspaces: [
              {
                ...(nextState as AssetWorkspace),
                asset: nextState.asset!,
              },
            ],
          });
        }

        return updateWorkspace(current, current.activeAssetId, () => ({
          ...(nextState as AssetWorkspace),
          asset: nextState.asset!,
        }));
      });
      lastStableSyncHashRef.current[nextState.asset.id] = serializeStateForSync(nextState);
      dirtyRef.current[nextState.asset.id] = false;
    },
    async exportPortfolioBackup() {
      const currentPortfolio = portfolioRef.current;
      const documents = (
        await Promise.all(
          currentPortfolio.workspaces.map(async (workspace) => {
            const archive = await exportWorkspaceBackup(workspace);
            return archive.documents.map((item) => ({
              assetId: workspace.asset.id,
              ...item,
            }));
          }),
        )
      ).flat();

      return {
        version: 2,
        exportedAt: new Date().toISOString(),
        portfolio: currentPortfolio,
        documents,
      };
    },
    async importPortfolioBackup(archive) {
      suppressDirtyTrackingRef.current = true;
      await resetDocumentStorage();

      for (const item of archive.documents) {
        if (item.dataUrl) {
          await saveDocumentBlob(item.record.id, dataUrlToBlob(item.dataUrl));
        }
      }

      const nextPortfolio = normalizePortfolioState({
        ...archive.portfolio,
        workspaces: archive.portfolio.workspaces.map(normalizeImportedWorkspace),
      });
      setPortfolio(nextPortfolio);
      lastStableSyncHashRef.current = Object.fromEntries(
        nextPortfolio.workspaces.map((workspace) => [workspace.asset.id, serializeStateForSync(workspace)]),
      );
      dirtyRef.current = Object.fromEntries(nextPortfolio.workspaces.map((workspace) => [workspace.asset.id, false]));
    },
    async pingServer(apiBase) {
      return fetchServerHealth(apiBase ?? configuredApiBase);
    },
    async pushToServer(apiBase) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      if (!currentWorkspace?.asset?.backendUrl) {
        return;
      }
      const base = apiBase ?? resolveApiBase(currentWorkspace.asset.backendUrl);
      const snapshotHash = serializeStateForSync(currentWorkspace);
      setSyncMetadata({
        syncStatus: 'syncing',
        syncMessage: 'Publicando cambios locales en el backend...',
      });
      const archive = await exportWorkspaceBackup(currentWorkspace);
      const response = await pushArchive(base, archive);
      setSyncMetadata({
        lastSyncedAt: response.updatedAt,
        serverRevision: response.revision,
        syncStatus: 'online',
        syncMessage: 'Sincronizado correctamente.',
      });
      lastStableSyncHashRef.current[currentWorkspace.asset.id] = snapshotHash;
      dirtyRef.current[currentWorkspace.asset.id] = false;
    },
    async forcePushToServer(apiBase) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      if (!currentWorkspace?.asset?.backendUrl) {
        return;
      }
      const base = apiBase ?? resolveApiBase(currentWorkspace.asset.backendUrl);
      const snapshotHash = serializeStateForSync(currentWorkspace);
      setSyncMetadata({
        syncStatus: 'syncing',
        syncMessage: 'Forzando publicación local al backend...',
      });
      const archive = await exportWorkspaceBackup(currentWorkspace);
      const response = await pushArchive(base, { ...archive, force: true });
      setSyncMetadata({
        lastSyncedAt: response.updatedAt,
        serverRevision: response.revision,
        syncStatus: 'online',
        syncMessage: 'Sincronización forzada exitosa.',
      });
      lastStableSyncHashRef.current[currentWorkspace.asset.id] = snapshotHash;
      dirtyRef.current[currentWorkspace.asset.id] = false;
    },
    async pullFromServer(apiBase) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      const base = apiBase ?? (currentWorkspace?.asset?.backendUrl ? resolveApiBase(currentWorkspace.asset.backendUrl) : '');
      if (!base) {
        throw new Error('No hay URL de backend configurada.');
      }
      const archive = await pullArchive(base);
      await this.importBackup(archive);
      setSyncMetadata({
        lastSyncedAt: archive.exportedAt,
        serverRevision: archive.serverRevision,
        syncStatus: 'online',
        syncMessage: 'Estado remoto descargado correctamente.',
      });
      return archive;
    },
    async fetchViaServerPosProxy(payload, apiBase) {
      return proxyPosRequest(apiBase ?? configuredApiBase, payload);
    },
    async ingestFiscalThroughServer(payload, apiBase) {
      return ingestFiscalText(apiBase ?? configuredApiBase, payload);
    },
  };
  actionsRef.current = actions;

  // Auto-sync effect
  useEffect(() => {
    if (!shouldSyncRemotely || !activeAssetIdRef.current) {
      if (pushTimeoutRef.current) {
        window.clearTimeout(pushTimeoutRef.current);
      }
      return;
    }

    const assetId = activeAssetIdRef.current;
    const previousHash = lastStableSyncHashRef.current[assetId];
    const isDirty = previousHash !== undefined && previousHash !== syncHash;

    if (suppressDirtyTrackingRef.current) {
      suppressDirtyTrackingRef.current = false;
      lastStableSyncHashRef.current[assetId] = syncHash;
      dirtyRef.current[assetId] = false;
      return;
    }

    if (previousHash === undefined) {
      lastStableSyncHashRef.current[assetId] = syncHash;
      dirtyRef.current[assetId] = false;
      return;
    }

    if (isDirty && !dirtyRef.current[assetId]) {
      dirtyRef.current[assetId] = true;
    }

    if (pushTimeoutRef.current) {
      window.clearTimeout(pushTimeoutRef.current);
    }

    pushTimeoutRef.current = window.setTimeout(() => {
      if (dirtyRef.current[assetId] && !syncingRef.current) {
        syncingRef.current = true;
        setSyncMetadata({
          syncStatus: 'syncing',
          syncMessage: 'Publicando cambios locales en el backend...',
        }, assetId);
        actionsRef.current
          ?.pushToServer()
          .catch((error) => {
            setSyncMetadata(classifySyncError(error), assetId);
          })
          .finally(() => {
            syncingRef.current = false;
          });
      }
    }, AUTO_SYNC_DEBOUNCE_MS);

    return () => {
      if (pushTimeoutRef.current) {
        window.clearTimeout(pushTimeoutRef.current);
      }
    };
  }, [syncHash, shouldSyncRemotely, configuredApiBase]);

  useEffect(() => {
    if (!shouldSyncRemotely || !activeAssetId || !state.asset?.backendUrl) {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
      return;
    }

    const assetId = activeAssetId;
    const apiBase = configuredApiBase;

    const pollRemoteHealth = () => {
      if (syncingRef.current) {
        return;
      }

      fetchServerHealth(apiBase)
        .then((health) => {
          if (activeAssetIdRef.current !== assetId) {
            return;
          }

          const currentAsset = stateRef.current.asset;
          const knownRevision = currentAsset?.serverRevision ?? 0;

          if (health.revision > knownRevision) {
            if (dirtyRef.current[assetId]) {
              setSyncMetadata({
                lastSyncedAt: health.updatedAt ?? currentAsset?.lastSyncedAt,
                serverRevision: health.revision,
                syncStatus: 'conflict',
                syncMessage: `Se detectaron cambios remotos en revisión ${health.revision}. Descarga el estado del servidor o fuerza publicación.`,
              }, assetId);
              return;
            }

            syncingRef.current = true;
            setSyncMetadata({
              syncStatus: 'syncing',
              syncMessage: `Descargando cambios remotos de la revisión ${health.revision}...`,
            }, assetId);
            actionsRef.current
              ?.pullFromServer(apiBase)
              .catch((error) => {
                setSyncMetadata(classifySyncError(error), assetId);
              })
              .finally(() => {
                syncingRef.current = false;
              });
            return;
          }

          setSyncMetadata({
            lastSyncedAt: health.updatedAt ?? currentAsset?.lastSyncedAt,
            serverRevision: health.revision,
            syncStatus: dirtyRef.current[assetId] ? currentAsset?.syncStatus : 'online',
            syncMessage: dirtyRef.current[assetId]
              ? currentAsset?.syncMessage ?? 'Hay cambios locales pendientes por sincronizar.'
              : 'Conexión remota operativa.',
          }, assetId);
        })
        .catch((error) => {
          if (activeAssetIdRef.current !== assetId) {
            return;
          }
          setSyncMetadata(classifySyncError(error), assetId);
        });
    };

    pollRemoteHealth();
    pollIntervalRef.current = window.setInterval(pollRemoteHealth, REMOTE_SYNC_POLL_MS);

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeAssetId, configuredApiBase, shouldSyncRemotely, state.asset?.backendUrl]);

  return (
    <AppContext.Provider
      value={{
        state,
        portfolio,
        activeAssetId,
        assetSummaries,
        portfolioStats,
        insights,
        unitsByCode,
        currentTenantId,
        actions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
