// Track 1 v1 — opens the source PDF for an extracted field, scrolled to the
// page the AI cited via the standard #page=N URL fragment supported by every
// major browser PDF viewer. Falls back to a "descargar" link when the page
// number is unknown.
import { useEffect, useMemo } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { resolveApiBase } from '@/lib/api';

export interface ContractEvidenceModalProps {
  open: boolean;
  onClose: () => void;
  fieldLabel: string;
  snippet: string;
  page?: number;
  sourceDocumentId?: string | null;
}

export function ContractEvidenceModal({
  open,
  onClose,
  fieldLabel,
  snippet,
  page,
  sourceDocumentId,
}: ContractEvidenceModalProps) {
  const { state } = useAppState();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const apiBase = state.asset?.backendUrl ?? resolveApiBase();
  const previewUrl = useMemo(() => {
    if (!sourceDocumentId) return null;
    const url = `${apiBase.replace(/\/+$/, '')}/documents/${sourceDocumentId}/download`;
    return page ? `${url}#page=${page}` : url;
  }, [apiBase, sourceDocumentId, page]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120]"
      role="dialog"
      aria-modal="true"
      aria-label={`Evidencia: ${fieldLabel}`}
      onClick={onClose}
    >
      <div className="overlay-backdrop absolute inset-0" />
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mq-card flex max-h-[90vh] w-full max-w-5xl flex-col"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            className="mq-card-hd"
            style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="t-eyebrow" style={{ fontSize: 10 }}>
                Fuente del autofill {page ? `· página ${page}` : ''}
              </div>
              <h3 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
                {fieldLabel}
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="iconbtn"
                  title="Abrir en una nueva pestaña"
                  aria-label="Abrir PDF en una nueva pestaña"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12 }}
                >
                  <ExternalLink size={13} />
                  Abrir
                </a>
              ) : null}
              <button type="button" onClick={onClose} className="iconbtn" title="Cerrar" aria-label="Cerrar evidencia">
                <X size={14} />
              </button>
            </div>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--line)',
              fontSize: 12.5,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              fontFamily: 'var(--mono)',
              background: 'color-mix(in oklab, var(--paper-2) 30%, transparent)',
            }}
          >
            "{snippet}"
          </div>
          <div style={{ flex: 1, minHeight: 360, background: 'var(--paper-2)' }}>
            {previewUrl ? (
              <embed
                src={previewUrl}
                type="application/pdf"
                title={`PDF fuente — ${fieldLabel}${page ? ` · p. ${page}` : ''}`}
                style={{ width: '100%', height: '100%', minHeight: 360, border: 0 }}
              />
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No hay un PDF persistido para esta extracción. Solo se conserva el fragmento citado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
