import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Paleta de comandos tipo Linear/Raycast.
 * Busca cross-entidad: activos, locatarios, contratos, acciones, atajos.
 */
export type CommandItem = {
  id: string;
  grupo: 'Activos' | 'Locatarios' | 'Contratos' | 'Alertas' | 'Acciones';
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
    return items.filter((item) => {
      const haystack = `${item.titulo} ${item.subtitulo ?? ''} ${item.grupo}`.toLowerCase();
      return q.split(' ').every((t) => haystack.includes(t));
    }).slice(0, 50);
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
      className="fixed inset-0 z-[200] flex items-start justify-center pt-28"
      onMouseDown={onClose}
      style={{ backgroundColor: 'rgba(8,10,18,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[640px] max-w-[92vw] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #131826 0%, #0F1422 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C92A6" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar activos, locatarios, contratos…"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: '#ECEEF3', fontFamily: '"Söhne", "Inter", system-ui, sans-serif' }}
          />
          <kbd
            className="text-[11px] px-2 py-1 rounded"
            style={{
              color: '#8C92A6',
              fontFamily: '"JetBrains Mono", ui-monospace',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {filtrados.length === 0 && (
            <div className="px-5 py-10 text-center" style={{ color: '#5A6075' }}>
              Sin resultados para "{query}"
            </div>
          )}
          {Object.entries(agrupado).map(([grupo, bloque]) => (
            <div key={grupo} className="mb-2">
              <div
                className="px-5 pt-3 pb-1 text-[11px] tracking-[0.12em] uppercase"
                style={{ color: '#5A6075', fontFamily: '"Söhne", "Inter", system-ui, sans-serif' }}
              >
                {grupo}
              </div>
              {bloque.map((item) => {
                const index = filtrados.indexOf(item);
                const activo = index === cursor;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => { item.onEjecutar(); onClose(); }}
                    className="w-full text-left flex items-center gap-3 px-5 py-2.5"
                    style={{
                      background: activo ? 'rgba(245,165,36,0.08)' : 'transparent',
                      borderLeft: `2px solid ${activo ? '#F5A524' : 'transparent'}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[14px] truncate"
                        style={{ color: activo ? '#F5A524' : '#ECEEF3' }}
                      >
                        {item.titulo}
                      </div>
                      {item.subtitulo && (
                        <div className="text-[12px] truncate" style={{ color: '#8C92A6' }}>
                          {item.subtitulo}
                        </div>
                      )}
                    </div>
                    {item.atajo && (
                      <kbd
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          color: '#8C92A6',
                          fontFamily: '"JetBrains Mono", ui-monospace',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {item.atajo}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between px-5 py-2.5 text-[11px] border-t"
          style={{
            color: '#5A6075',
            borderColor: 'rgba(255,255,255,0.06)',
            fontFamily: '"Söhne", "Inter", system-ui, sans-serif',
          }}
        >
          <div className="flex items-center gap-3">
            <span>↑↓ navegar</span>
            <span>↵ ejecutar</span>
          </div>
          <span>Cmd+K</span>
        </div>
      </div>
    </div>
  );
}
