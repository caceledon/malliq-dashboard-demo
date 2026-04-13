/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
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
  type MallSettings,
  type MallUnit,
  type PlanningEntry,
  type PosConnectionProfile,
  type Prospect,
  type SaleRecord,
  type Supplier,
} from '@/lib/domain';
import {
  buildPortfolioMallSummary,
  buildPortfolioStats,
  emptyPortfolioState,
  getActiveWorkspace,
  getWorkspaceById,
  normalizePortfolioState,
  parseStoredPortfolio,
  STORAGE_KEY,
  type MallWorkspace,
  type PortfolioBackupArchive,
  type PortfolioMallSummary,
  type PortfolioState,
  type PortfolioStats,
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
  uploadRemoteDocument,
} from '@/lib/api';
import { deleteDocumentBlob, getDocumentBlob, resetDocumentStorage, saveDocumentBlob } from '@/lib/files';

interface MallSetupInput {
  mall: Omit<MallSettings, 'id' | 'createdAt'>;
  units: Array<Omit<MallUnit, 'id'>>;
}

interface CreateMallInput extends MallSetupInput {
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
  activeMallId: string | null;
  mallSummaries: PortfolioMallSummary[];
  portfolioStats: PortfolioStats;
  insights: ReturnType<typeof buildDashboardInsights>;
  unitsByCode: Map<string, string>;
  currentTenantId?: string;
  actions: {
    initializeMall: (payload: MallSetupInput) => void;
    createMall: (payload: CreateMallInput) => string;
    switchMall: (mallId: string) => void;
    deleteMall: (mallId: string) => Promise<void>;
    updateMallSettings: (payload: Partial<Omit<MallSettings, 'id' | 'createdAt'>>) => void;
    replaceUnits: (units: MallUnit[]) => void;
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
    pingServer: (apiBase?: string) => Promise<{ ok: boolean; archiveExists: boolean; updatedAt: string | null; revision: number }>;
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
    mall: state.mall
      ? {
          ...state.mall,
          lastSyncedAt: undefined,
          serverRevision: undefined,
          syncStatus: undefined,
          syncMessage: undefined,
        }
      : state.mall,
  });
}

function updateWorkspace(
  portfolio: PortfolioState,
  mallId: string,
  updater: (workspace: MallWorkspace) => MallWorkspace,
): PortfolioState {
  return normalizePortfolioState({
    ...portfolio,
    workspaces: portfolio.workspaces.map((workspace) =>
      workspace.mall.id === mallId ? updater(workspace) : workspace,
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

function mergeImportedMall(importedMall: AppState['mall'], currentMall?: MallSettings | null): MallSettings | null {
  if (!importedMall && !currentMall) {
    return null;
  }

  return {
    ...(currentMall ?? importedMall ?? {}),
    ...(importedMall ?? {}),
    id: currentMall?.id ?? importedMall?.id ?? createId('mall'),
    createdAt: currentMall?.createdAt ?? importedMall?.createdAt ?? new Date().toISOString(),
    syncStatus: importedMall?.syncStatus ?? currentMall?.syncStatus ?? 'idle',
    syncMessage: importedMall?.syncMessage ?? currentMall?.syncMessage ?? '',
  } as MallSettings;
}

function normalizeImportedAppState(archiveState: AppState, currentMall?: MallSettings | null): AppState {
  return {
    ...emptyAppState(),
    ...archiveState,
    mall: mergeImportedMall(archiveState.mall, currentMall),
    documents: localizeDocumentRecords(archiveState.documents ?? []),
  };
}

function normalizeImportedWorkspace(workspace: MallWorkspace): MallWorkspace {
  return {
    ...workspace,
    mall: {
      ...workspace.mall,
      syncStatus: workspace.mall.syncStatus ?? 'idle',
      syncMessage: workspace.mall.syncMessage ?? '',
    },
    documents: localizeDocumentRecords(workspace.documents),
  };
}

function buildEmptyWorkspace(payload: MallSetupInput): MallWorkspace {
  return {
    ...emptyAppState(),
    mall: {
      id: createId('mall'),
      createdAt: new Date().toISOString(),
      ...payload.mall,
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

      if (record.storage === 'remote' && workspace.mall?.backendUrl) {
        const remoteBlob = await downloadRemoteDocument(resolveApiBase(workspace.mall.backendUrl), record.id);
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
    serverRevision: workspace.mall?.serverRevision,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<PortfolioState>(loadPortfolioState);
  const activeWorkspace = getActiveWorkspace(portfolio);
  const state = activeWorkspace ?? emptyAppState();
  const activeMallId = activeWorkspace?.mall.id ?? portfolio.activeMallId ?? null;
  const insights = buildDashboardInsights(state);
  const unitsByCode = new Map(state.units.map((unit) => [unit.code.toUpperCase(), unit.id]));
  const currentTenantId =
    insights.tenantSummaries.find((tenant) => tenant.lifecycle !== 'vencido')?.id ??
    insights.tenantSummaries[0]?.id;
  const mallSummaries = [...portfolio.workspaces]
    .map(buildPortfolioMallSummary)
    .sort((left, right) => left.name.localeCompare(right.name, 'es'));
  const portfolioStats = buildPortfolioStats(mallSummaries);
  const configuredApiBase = resolveApiBase(state.mall?.backendUrl);
  const shouldSyncRemotely = Boolean(state.mall?.syncEnabled && state.mall?.backendUrl);
  const syncHash = activeMallId ? serializeStateForSync(state) : '';

  const portfolioRef = useRef(portfolio);
  const stateRef = useRef(state);
  const activeMallIdRef = useRef<string | null>(activeMallId);
  const syncingRef = useRef(false);
  const suppressDirtyTrackingRef = useRef(false);
  const lastStableSyncHashRef = useRef<Record<string, string>>({});
  const dirtyRef = useRef<Record<string, boolean>>({});
  const pushTimeoutRef = useRef<number | null>(null);

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
    activeMallIdRef.current = activeMallId;
  }, [activeMallId]);

  const setSyncMetadata = (payload: Partial<MallSettings>, mallId = activeMallIdRef.current) => {
    if (!mallId) {
      return;
    }

    setPortfolio((current) =>
      updateWorkspace(current, mallId, (workspace) => ({
        ...workspace,
        mall: {
          ...workspace.mall,
          ...payload,
        },
      })),
    );
  };

  const actions: AppContextValue['actions'] = {
    initializeMall(payload) {
      setPortfolio((current) => {
        if (!current.activeMallId) {
          const workspace = buildEmptyWorkspace(payload);
          return normalizePortfolioState({
            ...current,
            activeMallId: workspace.mall.id,
            workspaces: [...current.workspaces, workspace],
          });
        }

        return updateWorkspace(current, current.activeMallId, (workspace) => ({
          ...workspace,
          mall: {
            ...workspace.mall,
            ...payload.mall,
          },
          units: payload.units.map((unit, index) => ({
            ...unit,
            id: workspace.units[index]?.id ?? createId('unit'),
          })),
        }));
      });
    },
    createMall(payload) {
      const workspace = buildEmptyWorkspace(payload);
      setPortfolio((current) =>
        normalizePortfolioState({
          ...current,
          activeMallId: payload.makeActive ?? !current.activeMallId ? workspace.mall.id : current.activeMallId,
          workspaces: [...current.workspaces, workspace],
        }),
      );
      return workspace.mall.id;
    },
    switchMall(mallId) {
      setPortfolio((current) =>
        normalizePortfolioState({
          ...current,
          activeMallId: mallId,
        }),
      );
    },
    async deleteMall(mallId) {
      const workspace = getWorkspaceById(portfolioRef.current, mallId);
      if (!workspace) {
        return;
      }

      await cleanupLocalDocuments(workspace.documents);
      setPortfolio((current) =>
        normalizePortfolioState({
          ...current,
          workspaces: current.workspaces.filter((item) => item.mall.id !== mallId),
          activeMallId:
            current.activeMallId === mallId
              ? current.workspaces.find((item) => item.mall.id !== mallId)?.mall.id ?? null
              : current.activeMallId,
        }),
      );
      delete lastStableSyncHashRef.current[mallId];
      delete dirtyRef.current[mallId];
    },
    updateMallSettings(payload) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          mall: {
            ...workspace.mall,
            ...payload,
          },
        })),
      );
    },
    replaceUnits(units) {
      if (!activeMallIdRef.current) {
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
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
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
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
          const nextContract: Contract = {
            ...contract,
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
      if (!activeMallIdRef.current) {
        return;
      }

      const removedDocuments = stateRef.current.documents.filter(
        (document) => document.entityType === 'contract' && document.entityId === contractId,
      );
      void cleanupLocalDocuments(removedDocuments);

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
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
      if (!activeMallIdRef.current) {
        return { added: 0, duplicates: 0 };
      }

      let result: AddSalesResult = { added: 0, duplicates: 0 };
      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
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
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          sales: workspace.sales.filter((sale) => sale.id !== saleId),
        })),
      );
    },
    upsertPlanningEntry(entry) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
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
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          planning: workspace.planning.filter((entry) => entry.id !== entryId),
        })),
      );
    },
    replacePlanningEntries(entries, type) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          planning: [
            ...workspace.planning.filter((entry) => (type ? entry.type !== type : false)),
            ...entries,
          ],
        })),
      );
    },
    generateBudget(months = 6, upliftPct = 6) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          planning: [
            ...workspace.planning.filter((entry) => entry.type !== 'budget'),
            ...buildAutomaticBudget(workspace, months, upliftPct),
          ],
        })),
      );
    },
    generateForecast(months = 6) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          planning: [
            ...workspace.planning.filter((entry) => entry.type !== 'forecast'),
            ...buildAutomaticForecast(workspace, months),
          ],
        })),
      );
    },
    upsertSupplier(supplier) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
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
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          suppliers: workspace.suppliers.filter((supplier) => supplier.id !== supplierId),
        })),
      );
    },
    upsertProspect(prospect) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
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
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          prospects: workspace.prospects.filter((prospect) => prospect.id !== prospectId),
        })),
      );
    },
    upsertPosConnection(profile) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => {
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
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
          ...workspace,
          posConnections: workspace.posConnections.filter((profile) => profile.id !== profileId),
        })),
      );
    },
    recordPosSync(profileId, status, message) {
      if (!activeMallIdRef.current) {
        return;
      }

      setPortfolio((current) =>
        updateWorkspace(current, activeMallIdRef.current!, (workspace) => ({
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
      if (!currentWorkspace?.mall) {
        return;
      }

      const documentId = createId('document');
      const shouldUploadRemotely = Boolean(currentWorkspace.mall.syncEnabled && currentWorkspace.mall.backendUrl);
      const apiBase = resolveApiBase(currentWorkspace.mall.backendUrl);
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
        updateWorkspace(current, currentWorkspace.mall.id, (workspace) => ({
          ...workspace,
          mall:
            shouldUploadRemotely
              ? {
                  ...workspace.mall,
                  lastSyncedAt: syncedAt ?? new Date().toISOString(),
                  serverRevision: revision ?? workspace.mall.serverRevision,
                  syncStatus: 'online',
                  syncMessage: 'Documento sincronizado con backend.',
                }
              : workspace.mall,
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
        const remote = await deleteRemoteDocument(resolveApiBase(currentWorkspace.mall.backendUrl), documentId);
        syncedAt = remote.updatedAt;
        revision = remote.revision;
        suppressDirtyTrackingRef.current = true;
      } else {
        await deleteDocumentBlob(documentId);
      }

      setPortfolio((current) =>
        updateWorkspace(current, currentWorkspace.mall.id, (workspace) => ({
          ...workspace,
          mall:
            target.storage === 'remote'
              ? {
                  ...workspace.mall,
                  lastSyncedAt: syncedAt ?? new Date().toISOString(),
                  serverRevision: revision ?? workspace.mall.serverRevision,
                  syncStatus: 'online',
                  syncMessage: 'Documento eliminado y sincronizado con backend.',
                }
              : workspace.mall,
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
          ? await downloadRemoteDocument(resolveApiBase(currentWorkspace.mall.backendUrl), documentId)
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
      const nextState = normalizeImportedAppState(archive.state, currentWorkspace?.mall);

      suppressDirtyTrackingRef.current = true;
      await resetDocumentStorage();
      for (const item of archive.documents) {
        if (item.dataUrl) {
          await saveDocumentBlob(item.record.id, dataUrlToBlob(item.dataUrl));
        }
      }

      if (!nextState.mall) {
        return;
      }

      setPortfolio((current) => {
        if (!current.activeMallId) {
          return normalizePortfolioState({
            ...current,
            activeMallId: nextState.mall!.id,
            workspaces: [
              {
                ...(nextState as MallWorkspace),
                mall: nextState.mall!,
              },
            ],
          });
        }

        return updateWorkspace(current, current.activeMallId, () => ({
          ...(nextState as MallWorkspace),
          mall: nextState.mall!,
        }));
      });
      lastStableSyncHashRef.current[nextState.mall.id] = serializeStateForSync(nextState);
      dirtyRef.current[nextState.mall.id] = false;
    },
    async exportPortfolioBackup() {
      const currentPortfolio = portfolioRef.current;
      const documents = (
        await Promise.all(
          currentPortfolio.workspaces.map(async (workspace) => {
            const archive = await exportWorkspaceBackup(workspace);
            return archive.documents.map((item) => ({
              mallId: workspace.mall.id,
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
        nextPortfolio.workspaces.map((workspace) => [workspace.mall.id, serializeStateForSync(workspace)]),
      );
      dirtyRef.current = Object.fromEntries(nextPortfolio.workspaces.map((workspace) => [workspace.mall.id, false]));
    },
    async pingServer(apiBase) {
      return fetchServerHealth(apiBase ?? configuredApiBase);
    },
    async pushToServer(apiBase) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      if (!currentWorkspace?.mall) {
        return;
      }

      const targetBase = apiBase ?? resolveApiBase(currentWorkspace.mall.backendUrl);
      syncingRef.current = true;
      try {
        const archive = await exportWorkspaceBackup(currentWorkspace);
        const syncedAt = new Date().toISOString();
        const currentHash = serializeStateForSync(currentWorkspace);
        archive.serverRevision = currentWorkspace.mall.serverRevision ?? archive.serverRevision;
        archive.state = {
          ...archive.state,
          mall: archive.state.mall
            ? {
                ...archive.state.mall,
                backendUrl: targetBase,
                syncEnabled: true,
                lastSyncedAt: syncedAt,
              }
            : archive.state.mall,
        };
        setSyncMetadata({ syncStatus: 'syncing', syncMessage: 'Subiendo cambios al backend…' }, currentWorkspace.mall.id);
        const result = await pushArchive(targetBase, archive);
        lastStableSyncHashRef.current[currentWorkspace.mall.id] = currentHash;
        dirtyRef.current[currentWorkspace.mall.id] = false;
        setPortfolio((current) =>
          updateWorkspace(current, currentWorkspace.mall.id, (workspace) => ({
            ...workspace,
            mall: {
              ...workspace.mall,
              backendUrl: targetBase,
              syncEnabled: true,
              lastSyncedAt: syncedAt,
              serverRevision: result.revision,
              syncStatus: 'online',
              syncMessage: 'Sincronizado con backend.',
            },
          })),
        );
      } finally {
        syncingRef.current = false;
      }
    },
    async forcePushToServer(apiBase) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      if (!currentWorkspace?.mall) {
        return;
      }

      const targetBase = apiBase ?? resolveApiBase(currentWorkspace.mall.backendUrl);
      syncingRef.current = true;
      try {
        const archive = await exportWorkspaceBackup(currentWorkspace);
        const syncedAt = new Date().toISOString();
        const currentHash = serializeStateForSync(currentWorkspace);
        archive.serverRevision = currentWorkspace.mall.serverRevision ?? archive.serverRevision;
        archive.state = {
          ...archive.state,
          mall: archive.state.mall
            ? {
                ...archive.state.mall,
                backendUrl: targetBase,
                syncEnabled: true,
                lastSyncedAt: syncedAt,
              }
            : archive.state.mall,
        };
        setSyncMetadata(
          {
            syncStatus: 'syncing',
            syncMessage: 'Forzando sincronización local hacia backend…',
          },
          currentWorkspace.mall.id,
        );
        const result = await pushArchive(targetBase, archive, true);
        lastStableSyncHashRef.current[currentWorkspace.mall.id] = currentHash;
        dirtyRef.current[currentWorkspace.mall.id] = false;
        setPortfolio((current) =>
          updateWorkspace(current, currentWorkspace.mall.id, (workspace) => ({
            ...workspace,
            mall: {
              ...workspace.mall,
              backendUrl: targetBase,
              syncEnabled: true,
              lastSyncedAt: syncedAt,
              serverRevision: result.revision,
              syncStatus: 'online',
              syncMessage: 'Versión local publicada sobre la remota.',
            },
          })),
        );
      } finally {
        syncingRef.current = false;
      }
    },
    async pullFromServer(apiBase) {
      const currentWorkspace = getActiveWorkspace(portfolioRef.current);
      if (!currentWorkspace?.mall) {
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          state: emptyAppState(),
          documents: [],
        };
      }

      const targetBase = apiBase ?? resolveApiBase(currentWorkspace.mall.backendUrl);
      syncingRef.current = true;
      try {
        setSyncMetadata(
          {
            syncStatus: 'syncing',
            syncMessage: 'Descargando cambios del backend…',
          },
          currentWorkspace.mall.id,
        );
        const archive = await pullArchive(targetBase);
        await actions.importBackup(archive);
        suppressDirtyTrackingRef.current = true;
        setPortfolio((current) =>
          updateWorkspace(current, currentWorkspace.mall.id, (workspace) => ({
            ...workspace,
            mall: {
              ...workspace.mall,
              backendUrl: targetBase,
              syncEnabled: true,
              lastSyncedAt: new Date().toISOString(),
              serverRevision: archive.serverRevision ?? workspace.mall.serverRevision,
              syncStatus: 'online',
              syncMessage: 'Estado remoto cargado.',
            },
          })),
        );
        return archive;
      } finally {
        syncingRef.current = false;
      }
    },
    async fetchViaServerPosProxy(payload, apiBase) {
      return proxyPosRequest(apiBase ?? configuredApiBase, payload);
    },
    async ingestFiscalThroughServer(payload, apiBase) {
      return ingestFiscalText(apiBase ?? configuredApiBase, payload);
    },
  };

  const runAutoPush = useEffectEvent(async () => {
    const currentMallId = activeMallIdRef.current;
    if (!currentMallId || syncingRef.current || !dirtyRef.current[currentMallId]) {
      return;
    }

    try {
      await actions.pushToServer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar con el backend.';
      if (message.toLowerCase().includes('conflicto')) {
        setSyncMetadata(
          {
            syncStatus: 'conflict',
            syncMessage: 'El servidor cambió mientras había cambios locales pendientes.',
          },
          currentMallId,
        );
        return;
      }

      setSyncMetadata(
        {
          syncStatus: 'offline',
          syncMessage: message,
        },
        currentMallId,
      );
    }
  });

  const reconcileRemoteState = useEffectEvent(async () => {
    const currentMallId = activeMallIdRef.current;
    const currentWorkspace = getActiveWorkspace(portfolioRef.current);
    if (!currentMallId || syncingRef.current || !currentWorkspace?.mall?.syncEnabled || !currentWorkspace.mall.backendUrl) {
      return;
    }

    try {
      const health = await actions.pingServer();
      if (!health.ok) {
        throw new Error('Backend no disponible.');
      }

      const localRevision = currentWorkspace.mall.serverRevision ?? 0;
      const hasRemoteChanges = health.revision > localRevision;
      const hasLocalChanges = dirtyRef.current[currentMallId];

      if (hasRemoteChanges) {
        if (hasLocalChanges) {
          setSyncMetadata(
            {
              syncStatus: 'conflict',
              syncMessage: 'Cambios remotos detectados mientras hay cambios locales sin sincronizar.',
            },
            currentMallId,
          );
          return;
        }

        await actions.pullFromServer();
        return;
      }

      if (currentWorkspace.mall.syncStatus !== 'online' && currentWorkspace.mall.syncStatus !== 'syncing') {
        setSyncMetadata(
          {
            syncStatus: 'online',
            syncMessage:
              health.updatedAt
                ? `Backend conectado. Última actualización remota ${new Date(health.updatedAt).toLocaleString('es-CL')}.`
                : 'Backend conectado.',
          },
          currentMallId,
        );
      }
    } catch (error) {
      setSyncMetadata(
        {
          syncStatus: currentWorkspace.mall.syncStatus === 'conflict' ? 'conflict' : 'offline',
          syncMessage: error instanceof Error ? error.message : 'Backend no disponible.',
        },
        currentMallId,
      );
    }
  });

  useEffect(() => {
    if (!activeMallId) {
      return;
    }

    if (suppressDirtyTrackingRef.current) {
      suppressDirtyTrackingRef.current = false;
      lastStableSyncHashRef.current[activeMallId] = syncHash;
      dirtyRef.current[activeMallId] = false;
      return;
    }

    if (!(activeMallId in lastStableSyncHashRef.current)) {
      lastStableSyncHashRef.current[activeMallId] = syncHash;
      dirtyRef.current[activeMallId] = false;
      return;
    }

    dirtyRef.current[activeMallId] = syncHash !== lastStableSyncHashRef.current[activeMallId];

    if (pushTimeoutRef.current) {
      window.clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = null;
    }

    if (!shouldSyncRemotely || syncingRef.current || state.mall?.syncStatus === 'conflict' || !dirtyRef.current[activeMallId]) {
      return;
    }

    pushTimeoutRef.current = window.setTimeout(() => {
      pushTimeoutRef.current = null;
      void runAutoPush();
    }, 1500);
  }, [activeMallId, shouldSyncRemotely, state.mall?.syncStatus, syncHash]);

  useEffect(() => {
    if (!shouldSyncRemotely || !activeMallId) {
      return;
    }

    void reconcileRemoteState();
    const interval = window.setInterval(() => {
      void reconcileRemoteState();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [activeMallId, configuredApiBase, shouldSyncRemotely]);

  useEffect(
    () => () => {
      if (pushTimeoutRef.current) {
        window.clearTimeout(pushTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        portfolio,
        activeMallId,
        mallSummaries,
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

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }

  return context;
}
