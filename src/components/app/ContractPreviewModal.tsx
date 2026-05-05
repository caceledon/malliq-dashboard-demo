import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useAppState } from '@/store/appState';

interface Props {
  documentId: string | null;
  fileName?: string;
  onClose: () => void;
}

export function ContractPreviewModal({ documentId, fileName, onClose }: Props) {
  const { actions } = useAppState();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The parent unmounts the modal when documentId is null, so the effect
    // body only runs when there's a doc to load. Cleanup revokes the URL.
    if (!documentId) return;
    let revoked = false;
    let createdUrl: string | null = null;
    (async () => {
      try {
        const blob = await actions.getDocumentBlob(documentId);
        if (!blob) {
          if (!revoked) setError('No se pudo cargar el documento.');
          return;
        }
        if (revoked) return;
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
      } catch (err) {
        if (!revoked) setError(err instanceof Error ? err.message : 'Error desconocido.');
      }
    })();
    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [documentId, actions]);

  if (!documentId) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={fileName ? `Vista previa de ${fileName}` : 'Vista previa del contrato'}
        onClick={(event) => event.stopPropagation()}
        className="mq-card"
        style={{
          width: 960,
          maxWidth: '100%',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fileName ?? 'Vista previa de contrato'}</p>
            <p className="text-[11px] text-[var(--sidebar-fg)]">PDF preview</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => documentId && actions.downloadDocument(documentId)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold"
            >
              <Download className="h-3 w-3" />
              Descargar
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg border border-[var(--border-color)] p-1.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, background: 'var(--paper-2)' }}>
          {error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : url ? (
            <iframe
              title="Contrato"
              src={url}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div className="p-6 text-sm text-[var(--sidebar-fg)]">Cargando…</div>
          )}
        </div>
      </div>
    </div>
  );
}
