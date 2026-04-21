import { useEffect, useState } from 'react';

/**
 * Registra Cmd+K / Ctrl+K globalmente y expone estado abierto/cerrado.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const esCmd = e.metaKey || e.ctrlKey;
      if (esCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
