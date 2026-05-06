import type { BackupArchive, Contract, DocumentKind, DocumentRecord } from '@/lib/domain';
import { authFetch } from '@/lib/auth';

export interface ServerHealth {
  ok: boolean;
  archiveExists: boolean;
  updatedAt: string | null;
  revision: number;
  aiMode?: 'openai' | 'moonshot' | 'mock_local';
  summary?: {
    units: number;
    contracts: number;
    sales: number;
    planning: number;
    documents: number;
    suppliers: number;
    prospects: number;
    posConnections: number;
    importLogs: number;
  };
}

export interface RemoteDocumentMutationResult {
  revision: number;
  updatedAt: string;
}

export interface RemoteDocumentUploadResult extends RemoteDocumentMutationResult {
  record: DocumentRecord;
}

export interface ContractAutofillResult {
  companyName?: Contract['companyName'] | null;
  storeName?: Contract['storeName'] | null;
  category?: Contract['category'] | null;
  baseRentUF?: Contract['baseRentUF'] | null;
  fixedRent?: Contract['fixedRent'] | null;
  variableRentPct?: Contract['variableRentPct'] | null;
  commonExpenses?: Contract['commonExpenses'] | null;
  escalation?: Contract['escalation'] | null;
  startDate?: Contract['startDate'] | null;
  endDate?: Contract['endDate'] | null;
  fondoPromocion?: Contract['fondoPromocion'] | null;
  garantiaMonto?: Contract['garantiaMonto'] | null;
  garantiaVencimiento?: Contract['garantiaVencimiento'] | null;
  feeIngreso?: Contract['feeIngreso'] | null;
  rentSteps?: Array<{
    startDate?: string | null;
    endDate?: string | null;
    rentaFijaUfM2?: number | null;
    evidence?: {
      startDate?: string | null;
      endDate?: string | null;
      rentaFijaUfM2?: string | null;
    };
  }>;
  evidence?: {
    companyName?: string | null;
    storeName?: string | null;
    category?: string | null;
    baseRentUF?: string | null;
    fixedRent?: string | null;
    variableRentPct?: string | null;
    commonExpenses?: string | null;
    fondoPromocion?: string | null;
    escalation?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    garantiaMonto?: string | null;
    garantiaVencimiento?: string | null;
    feeIngreso?: string | null;
  };
  missingFields?: string[];
  mocked?: boolean;
  source?: 'openai' | 'moonshot' | 'mock_local';
  textSnippet?: string;
  // Track 1 v1 — page-tagged provenance + persisted source PDF metadata.
  evidencePages?: {
    fields: Record<string, { text: string; page?: number }>;
    rentSteps: Array<Record<string, { text: string; page?: number }>>;
    extractedAt: string;
    source: 'openai' | 'moonshot' | 'mock_local';
  };
  sourceDocumentId?: string | null;
  sourceDocument?: DocumentRecord | null;
}

export interface AutofillAskResponse {
  answer: string;
  suggestedUpdates: Record<string, string | number | null> | null;
  source: 'openai' | 'moonshot' | 'mock_local';
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function resolveApiBase(raw?: string): string {
  const fallback = import.meta.env.VITE_API_BASE_URL || '/api';
  return trimTrailingSlash((raw || fallback).trim());
}

async function assertJson(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text) as { error?: unknown };
        if (typeof payload.error === 'string' && payload.error.trim()) {
          throw new Error(payload.error);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
      }
    }

    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchServerHealth(apiBase: string): Promise<ServerHealth> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/health`);
  return assertJson(response);
}

export async function pushArchive(apiBase: string, archive: BackupArchive, force = false): Promise<{ ok: boolean; updatedAt: string; revision: number }> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/archive${force ? '?force=1' : ''}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(archive),
  });
  return assertJson(response);
}

export async function pullArchive(apiBase: string): Promise<BackupArchive> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/archive`);
  return assertJson(response);
}

export async function uploadRemoteDocument(
  apiBase: string,
  payload: {
    id: string;
    entityType: DocumentRecord['entityType'];
    entityId: string;
    kind: DocumentKind;
    note?: string;
    file: File;
  },
): Promise<RemoteDocumentUploadResult> {
  const body = new FormData();
  body.set('id', payload.id);
  body.set('entityType', payload.entityType);
  body.set('entityId', payload.entityId);
  body.set('kind', payload.kind);
  body.set('note', payload.note ?? '');
  body.set('file', payload.file);

  const response = await authFetch(`${resolveApiBase(apiBase)}/documents`, {
    method: 'POST',
    body,
  });

  return assertJson(response);
}

export async function deleteRemoteDocument(apiBase: string, documentId: string): Promise<RemoteDocumentMutationResult> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/documents/${documentId}`, {
    method: 'DELETE',
  });
  return assertJson(response);
}

export async function downloadRemoteDocument(apiBase: string, documentId: string): Promise<Blob> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/documents/${documentId}/download`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.blob();
}

export async function proxyPosRequest(
  apiBase: string,
  payload: {
    endpoint: string;
    method: 'GET' | 'POST';
    token?: string;
    requestBody?: string;
  },
): Promise<{ status: number; body: string }> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/connectors/pos/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return assertJson(response);
}

export async function ingestFiscalText(
  apiBase: string,
  payload: { rawText?: string; file?: File },
): Promise<{ text: string }> {
  const body = new FormData();
  if (payload.rawText) {
    body.set('rawText', payload.rawText);
  }
  if (payload.file) {
    body.set('file', payload.file);
  }

  const response = await authFetch(`${resolveApiBase(apiBase)}/connectors/fiscal/ingest`, {
    method: 'POST',
    body,
  });
  return assertJson(response);
}

export async function autofillContractFromPdf(apiBase: string, file: File): Promise<ContractAutofillResult> {
  const body = new FormData();
  body.set('file', file);

  const response = await authFetch(`${resolveApiBase(apiBase)}/contracts/autofill`, {
    method: 'POST',
    body,
  });

  return assertJson(response);
}

export interface AsistenteChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AsistenteChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface AsistenteChatResult {
  message: AsistenteChatMessage;
  toolCalls: AsistenteChatToolCall[];
  source: 'openai' | 'moonshot' | 'mock_local';
}

export interface BroadcastSendPayload {
  severity: 'aviso' | 'incidente' | 'evacuacion';
  audience: 'all' | 'tenants' | 'staff';
  title: string;
  body: string;
  channels: Array<'web_push' | 'email' | 'sms' | 'whatsapp'>;
  twoPersonConfirmedBy?: string;
}

export interface BroadcastSendResult {
  broadcast: {
    id: string;
    severity: BroadcastSendPayload['severity'];
    audience: BroadcastSendPayload['audience'];
    title: string;
    body: string;
    channels: BroadcastSendPayload['channels'];
    results: Array<{
      channel: BroadcastSendPayload['channels'][number];
      status: 'sent' | 'skipped' | 'unconfigured' | 'error';
      detail?: string;
      attemptedAt: string;
    }>;
    triggeredBy?: string | null;
    twoPersonConfirmedBy?: string;
    triggeredAt: string;
    acknowledgements: string[];
  };
  revision: number;
  updatedAt: string;
}

export async function sendBroadcast(
  apiBase: string,
  payload: BroadcastSendPayload,
): Promise<BroadcastSendResult> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/broadcasts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return assertJson(response);
}

export interface ContractClauseExtractionResult {
  clauses: Array<{
    id: string;
    type: string;
    text: string;
    evidence?: { text: string; page?: number };
    createdAt: string;
  }>;
  revision: number;
  updatedAt: string;
}

export async function extractContractClauses(
  apiBase: string,
  contractId: string,
): Promise<ContractClauseExtractionResult> {
  const response = await authFetch(
    `${resolveApiBase(apiBase)}/contracts/${encodeURIComponent(contractId)}/clauses/extract`,
    { method: 'POST' },
  );
  return assertJson(response);
}

export async function chatWithAsistente(
  apiBase: string,
  messages: AsistenteChatMessage[],
): Promise<AsistenteChatResult> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/asistente/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  return assertJson(response);
}

export async function askContractAutofill(
  apiBase: string,
  payload: { question: string; textSnippet: string; currentFields: Record<string, unknown> },
): Promise<AutofillAskResponse> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/contracts/autofill/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return assertJson(response);
}

export interface ActivityItem {
  id: number;
  action: string;
  entity_type?: string;
  entity_id?: string;
  actor?: string;
  details?: string | null;
  created_at: string;
}


export async function fetchRecentActivities(apiBase: string): Promise<{ activities: ActivityItem[] }> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/activities`);
  return assertJson(response);
}

export interface DailyDigest {
  generatedAt: string;
  since: string;
  counts: { anomalies: number; renewals: number; activities: number };
  anomalies: unknown[];
  renewals: unknown[];
  activities: ActivityItem[];
}

export async function fetchDailyDigest(apiBase: string): Promise<DailyDigest> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/notifications/daily`);
  return assertJson(response);
}

export interface AnomalyExplainPayload {
  anomaly: {
    contractId?: string | null;
    storeLabel: string;
    month: string;
    value: number;
    median: number;
    modifiedZ?: number;
    direction: 'high' | 'low';
    severity: 'warning' | 'critical';
    reason: string;
  };
  category?: string;
  recentSales?: { month: string; value: number }[];
}

export interface AnomalyExplainResult {
  explanation: string;
  source: string;
  cached: boolean;
}

export async function explainAnomaly(
  apiBase: string,
  payload: AnomalyExplainPayload,
): Promise<AnomalyExplainResult> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/anomalies/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return assertJson(response);
}

export interface LocatarioSaleInput {
  contractId: string;
  occurredAt: string;            // ISO date
  grossAmount: number;
  ticketNumber?: string;
  importReference?: string;
  storeLabel?: string;
  localIds?: string[];
  currency?: string;
  source?: 'manual' | 'ocr' | 'fiscal_printer' | 'pos_connection';
  assetId?: string;
}

export interface LocatarioSalesUploadResult {
  added: number;
  duplicates: number;
  revision: number;
}

export async function submitLocatarioSales(
  apiBase: string,
  sales: LocatarioSaleInput[],
): Promise<LocatarioSalesUploadResult> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/locatario/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sales }),
  });
  return assertJson(response);
}

export interface UfRate {
  date: string; // YYYY-MM-DD
  value: number;
  fetchedAt: string;
}

export interface UfLatest extends UfRate {
  source: 'cache' | 'remote' | 'cache_latest';
  stale?: boolean;
}

export interface UfForDate extends UfRate {
  requestedDate: string;
  source: 'cache' | 'remote' | 'cache_prior' | 'cache_latest';
}

export async function fetchUfLatest(apiBase: string): Promise<UfLatest> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/uf/latest`);
  return assertJson(response);
}

export async function fetchUfForDate(apiBase: string, date: string): Promise<UfForDate> {
  const response = await authFetch(`${resolveApiBase(apiBase)}/uf?date=${encodeURIComponent(date)}`);
  return assertJson(response);
}

export async function fetchUfRange(
  apiBase: string,
  from: string,
  to: string,
): Promise<{ from: string; to: string; rates: UfRate[] }> {
  const response = await authFetch(
    `${resolveApiBase(apiBase)}/uf/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return assertJson(response);
}

