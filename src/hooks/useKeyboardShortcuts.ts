import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CHORD_WINDOW_MS = 1200;

export type ShortcutEntry = {
  keys: string;
  label: string;
  run: () => void;
};

/**
 * Vim-style "g → X" shortcut layer. Pressing `g` then a letter within
 * CHORD_WINDOW_MS navigates. `?` (shift+/) toggles the help sheet.
 * Disabled while an input/textarea/contenteditable has focus so typing
 * keeps working normally.
 */
export function useKeyboardShortcuts(): { helpOpen: boolean; setHelpOpen: (open: boolean) => void; shortcuts: ShortcutEntry[] } {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingGRef = useRef<number | null>(null);

  const shortcuts: ShortcutEntry[] = [
    { keys: 'g d', label: 'Ir al dashboard', run: () => navigate('/admin/dashboard') },
    { keys: 'g a', label: 'Ir a alertas', run: () => navigate('/admin/alertas') },
    { keys: 'g l', label: 'Ir a locatarios', run: () => navigate('/admin/locatarios') },
    { keys: 'g r', label: 'Ir a rentas y contratos', run: () => navigate('/admin/rentas') },
    { keys: 'g p', label: 'Ir al portafolio', run: () => navigate('/admin/activos') },
    { keys: 'g c', label: 'Ir a cargas', run: () => navigate('/admin/cargas') },
    { keys: 'g s', label: 'Ir a configuración', run: () => navigate('/admin/configuracion') },
    { keys: '?', label: 'Mostrar atajos de teclado', run: () => setHelpOpen((v) => !v) },
  ];

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (e.key === 'Escape' && helpOpen) {
        setHelpOpen(false);
        return;
      }

      if (e.key === 'g') {
        if (pendingGRef.current) window.clearTimeout(pendingGRef.current);
        pendingGRef.current = window.setTimeout(() => {
          pendingGRef.current = null;
        }, CHORD_WINDOW_MS);
        return;
      }

      if (pendingGRef.current) {
        const k = e.key.toLowerCase();
        window.clearTimeout(pendingGRef.current);
        pendingGRef.current = null;
        const match = shortcuts.find((s) => s.keys === `g ${k}`);
        if (match) {
          e.preventDefault();
          match.run();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helpOpen]);

  return { helpOpen, setHelpOpen, shortcuts };
}
