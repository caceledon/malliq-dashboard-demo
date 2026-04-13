import type { BackupArchive, DocumentKind, DocumentRecord } from '@/lib/domain';

export interface ServerHealth {
  ok: boolean;
  archiveExists: boolean;
  updatedAt: string | null;
  revision: number;
}

export interface RemoteDocumentMutationResult {
  revision: number;
  updatedAt: string;
}

export interface RemoteDocumentUploadResult extends RemoteDocumentMutationResult {
  record: DocumentRecord;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function resolveApiBase(raw?: string): string {
  const fallback = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  return trimTrailingSlash((raw || fallback).trim());
}

async function assertJson(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchServerHealth(apiBase: string): Promise<ServerHealth> {
  const response = await fetch(`${resolveApiBase(apiBase)}/health`);
  return assertJson(response);
}

export async function pushArchive(apiBase: string, archive: BackupArchive, force = false): Promise<{ ok: boolean; updatedAt: string; revision: number }> {
  const response = await fetch(`${resolveApiBase(apiBase)}/archive${force ? '?force=1' : ''}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(archive),
  });
  return assertJson(response);
}

export async function pullArchive(apiBase: string): Promise<BackupArchive> {
  const response = await fetch(`${resolveApiBase(apiBase)}/archive`);
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

  const response = await fetch(`${resolveApiBase(apiBase)}/documents`, {
    method: 'POST',
    body,
  });

  return assertJson(response);
}

export async function deleteRemoteDocument(apiBase: string, documentId: string): Promise<RemoteDocumentMutationResult> {
  const response = await fetch(`${resolveApiBase(apiBase)}/documents/${documentId}`, {
    method: 'DELETE',
  });
  return assertJson(response);
}

export async function downloadRemoteDocument(apiBase: string, documentId: string): Promise<Blob> {
  const response = await fetch(`${resolveApiBase(apiBase)}/documents/${documentId}/download`);
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
  const response = await fetch(`${resolveApiBase(apiBase)}/connectors/pos/proxy`, {
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

  const response = await fetch(`${resolveApiBase(apiBase)}/connectors/fiscal/ingest`, {
    method: 'POST',
    body,
  });
  return assertJson(response);
}
