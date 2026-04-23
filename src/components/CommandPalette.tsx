import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Paleta de comandos tipo Linear/Raycast.
 * Busca cross-entidad: activos, locatarios, contratos, acciones, atajos.
 */
export type CommandItem = {
  id: string;
  grupo: 'Activos' | 'Locatarios' | 'Contratos' | 'Alertas' | 'Acciones' | 'Navegación';
  titulo: string;
  subtitulo?: string;
  atajo?: string;
  onEjecutar: () => void;
};

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items
      .filter((item) => {
        const haystack = `${item.titulo} ${item.subtitulo ?? ''} ${item.grupo}`.toLowerCase();
        return q.split(' ').every((t) => haystack.includes(t));
      })
      .slice(0, 50);
  }, [query, items]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, filtrados.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtrados[cursor];
        if (item) {
          item.onEjecutar();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtrados, cursor, onClose]);

  if (!open) return null;

  const agrupado = filtrados.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.grupo] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      className="fixed inset-0 z-[200]"
      onMouseDown={onClose}
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}
    >
      <div className="overlay-backdrop absolute inset-0" />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="mq-card"
        style={{
          position: 'relative',
          width: 640,
          maxWidth: '92vw',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div
          className="row"
          style={{
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Search size={16} style={{ color: 'var(--ink-4)', flex: 'none' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar activos, locatarios, contratos, acciones…"
            className="flex-1"
            style={{
              flex: 1,
              border: 0,
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ink-1)',
              fontFamily: 'var(--sans)',
            }}
          />
          <kbd
            className="t-mono"
            style={{
              fontSize: 10.5,
              padding: '2px 6px',
              borderRadius: 5,
              color: 'var(--ink-4)',
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: '55vh', overflowY: 'auto', padding: '6px 0' }}>
          {filtrados.length === 0 ? (
            <div className="t-dim" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13 }}>
              Sin resultados para "{query}"
            </div>
          ) : null}
          {Object.entries(agrupado).map(([grupo, bloque]) => (
            <div key={grupo} style={{ marginBottom: 4 }}>
              <div className="t-eyebrow" style={{ padding: '8px 16px 4px', fontSize: 10 }}>
                {grupo}
              </div>
              {bloque.map((item) => {
                const index = filtrados.indexOf(item);
                const activo = index === cursor;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      item.onEjecutar();
                      onClose();
                    }}
                    className="row"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      gap: 10,
                      padding: '9px 16px',
                      background: activo ? 'var(--umber-wash)' : 'transparent',
                      borderLeft: `2px solid ${activo ? 'var(--umber)' : 'transparent'}`,
                      cursor: 'pointer',
                      border: 0,
                      borderRadius: 0,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="truncate"
                        style={{
                          fontSize: 13.5,
                          color: activo ? 'var(--umber-ink)' : 'var(--ink-1)',
                          fontWeight: 500,
                        }}
                      >
                        {item.titulo}
                      </div>
                      {item.subtitulo ? (
                        <div className="t-dim truncate" style={{ fontSize: 11.5, marginTop: 1 }}>
                          {item.subtitulo}
                        </div>
                      ) : null}
                    </div>
                    {item.atajo ? (
                      <kbd
                        className="t-mono"
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 5,
                          color: 'var(--ink-3)',
                          background: 'var(--paper-2)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {item.atajo}
                      </kbd>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            padding: '8px 16px',
            fontSize: 11,
            color: 'var(--ink-4)',
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
            fontFamily: 'var(--sans)',
          }}
        >
          <div className="row" style={{ gap: 12 }}>
            <span>↑↓ navegar</span>
            <span>↵ ejecutar</span>
          </div>
          <span className="t-mono">{typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</span>
        </div>
      </div>
    </div>
  );
}
