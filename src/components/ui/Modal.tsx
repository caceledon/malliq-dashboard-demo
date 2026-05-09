import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Refcounted body scroll lock. Multiple modals open simultaneously share one
// lock — the body unlocks only after the last modal closes. The scrollbar
// gutter is preserved via padding-right so the layout doesn't shift when
// `overflow:hidden` removes the document scrollbar.
let openCount = 0;
let savedPaddingRight = '';
let savedOverflow = '';

function lockBody() {
  if (typeof document === 'undefined') return;
  if (openCount === 0) {
    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }
  openCount += 1;
}

function unlockBody() {
  if (typeof document === 'undefined') return;
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
    savedOverflow = '';
    savedPaddingRight = '';
  }
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Closes the modal when the user presses Escape. Default: true.
   * Set false for non-dismissable flows (e.g. setup wizard, blocking confirms).
   */
  closeOnEscape?: boolean;
  /** Locks `<body>` scroll while open. Default: true. */
  lockScroll?: boolean;
  children: ReactNode;
}

/**
 * Renders children in a portal to `document.body` so that their
 * `position: fixed` resolves against the viewport — not against any ancestor
 * with `backdrop-filter`, `transform`, `filter`, `perspective`, `contain`, or
 * `will-change` set. Also escapes nested stacking contexts so a modal's
 * z-index resolves at the document root, not under the parent's z-cap.
 *
 * Children render their own backdrop and card layout (use the
 * `.overlay-backdrop` utility for the dim layer). The wrapper is intentionally
 * structureless — no role/aria — because callers attach role="dialog" +
 * aria-modal + aria-label to their own card element.
 *
 * Lifecycle handled here:
 *  - Escape key → onClose (when closeOnEscape).
 *  - Body scroll lock with refcount (when lockScroll).
 *  - Conditional mount: returns null when `open === false` so children never
 *    have to do their own `if (!open) return null`.
 */
export function Modal({
  open,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    if (lockScroll) lockBody();

    const onKey = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') onClose();
    };
    if (closeOnEscape) window.addEventListener('keydown', onKey);

    return () => {
      if (closeOnEscape) window.removeEventListener('keydown', onKey);
      if (lockScroll) unlockBody();
    };
  }, [open, closeOnEscape, lockScroll, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(<>{children}</>, document.body);
}
