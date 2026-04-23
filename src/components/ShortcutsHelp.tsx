import { X } from 'lucide-react';
import type { ShortcutEntry } from '@/hooks/useKeyboardShortcuts';

export function ShortcutsHelp({
  open,
  onClose,
  shortcuts,
}: {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutEntry[];
}) {
  if (!open) return null;

  const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
  const paletteLabel = IS_MAC ? '⌘K' : 'Ctrl K';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atajos de teclado"
      className="fixed inset-0 z-[200]"
      onMouseDown={onClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="overlay-backdrop absolute inset-0" />
      <div
        className="mq-card"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 420,
          maxWidth: '92vw',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div className="mq-card-hd" style={{ padding: '14px 18px' }}>
          <div>
            <div className="t-eyebrow">Atajos</div>
            <h3 style={{ margin: '2px 0 0', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
              Teclado
            </h3>
          </div>
          <button type="button" onClick={onClose} className="iconbtn" title="Cerrar">
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '4px 0 8px' }}>
          <ShortcutRow keys={paletteLabel} label="Abrir paleta de comandos" />
          {shortcuts.map((s) => (
            <ShortcutRow key={s.keys} keys={s.keys} label={s.label} />
          ))}
        </div>
        <div className="t-dim" style={{ fontSize: 11, padding: '10px 18px 14px', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
          Los chord "g + letra" se desactivan cuando un campo de texto tiene foco.
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div
      className="row"
      style={{
        padding: '8px 18px',
        gap: 10,
        justifyContent: 'space-between',
        borderTop: '1px solid var(--line)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
      <kbd
        className="t-mono"
        style={{
          fontSize: 10.5,
          padding: '2px 7px',
          borderRadius: 5,
          color: 'var(--ink-3)',
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          whiteSpace: 'nowrap',
        }}
      >
        {keys}
      </kbd>
    </div>
  );
}
