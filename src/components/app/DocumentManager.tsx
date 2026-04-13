import { useState, type ChangeEvent } from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { formatDate } from '@/lib/format';
import type { DocumentKind, DocumentRecord } from '@/lib/domain';

const documentKindLabels: Record<DocumentKind, string> = {
  contrato: 'Contrato',
  anexo: 'Anexo',
  carta_oferta: 'Carta oferta',
  cip: 'CIP',
  foto: 'Foto',
  render: 'Render',
  presupuesto: 'Presupuesto',
  forecast: 'Forecast',
  otro: 'Otro',
};

interface DocumentManagerProps {
  entityType: DocumentRecord['entityType'];
  entityId: string;
  title: string;
}

export function DocumentManager({ entityType, entityId, title }: DocumentManagerProps) {
  const { state, actions } = useAppState();
  const documents = state.documents.filter(
    (document) => document.entityType === entityType && document.entityId === entityId,
  );
  const [kind, setKind] = useState<DocumentKind>('anexo');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setBusy(true);
    try {
      for (const file of files) {
        await actions.uploadDocument({
          entityType,
          entityId,
          kind,
          note,
          file,
        });
      }
      setNote('');
      event.target.value = '';
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-[var(--sidebar-fg)]">Adjunta contratos, anexos, CIP, fotos, renders y respaldos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm"
          >
            {Object.entries(documentKindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
            <Upload className="h-4 w-4" />
            {busy ? 'Subiendo...' : 'Cargar archivo'}
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={busy} />
          </label>
        </div>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Nota opcional del documento"
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
      />

      <div className="space-y-2">
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--sidebar-fg)]">
            No hay documentos asociados todavía.
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-lg bg-[var(--hover-bg)] p-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{document.name}</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">
                    {documentKindLabels[document.kind]} · {formatDate(document.uploadedAt)} · {(document.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--sidebar-fg)]">
                    {document.storage === 'remote' ? 'Almacenado en backend' : 'Almacenado localmente'}
                  </p>
                  {document.note ? <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{document.note}</p> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => actions.downloadDocument(document.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
                <button
                  onClick={() => actions.deleteDocument(document.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
