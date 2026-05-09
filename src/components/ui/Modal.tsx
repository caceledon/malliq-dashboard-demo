import { useEffect, useRef, type ReactNode } from 'react';
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

// Open-modal stack so Esc / Tab handlers only fire on the *topmost* modal.
// Without this, opening a ConfirmDialog over the NotificationDrawer would
// close both at once on Esc — annoying when the inner is a dependent
// confirmation. Each Modal pushes its id when it opens and pops on close.
const modalStack: number[] = [];
let nextModalId = 1;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // offsetParent is null for elements with display:none ancestors. We don't
    // want to count those — Tab would still skip them and we'd cycle to a
    // hidden node. Visibility-by-CSS (`visibility:hidden`) is rare enough in
    // this codebase to ignore.
    (el) => el.offsetParent !== null,
  );
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
  /**
   * Cycles Tab / Shift+Tab inside the modal so background controls stay
   * unreachable. Auto-focuses the first focusable on open if nothing inside
   * is already focused. Default: true.
   */
  trapFocus?: boolean;
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
 * `.overlay-backdrop` utility for the dim layer). The portal wrapper is a
 * structureless `<div>` with no styling — it exists only as a Tab-trap
 * boundary and a focusables query root, and contributes nothing to layout
 * (its only children are `position: fixed`, so the wrapper itself collapses).
 *
 * Lifecycle handled here:
 *  - Escape key → onClose (when closeOnEscape) — only fires on topmost modal.
 *  - Tab / Shift+Tab → cycles within the modal (when trapFocus).
 *  - Auto-focus first focusable on open (when trapFocus and nothing inside
 *    is already focused).
 *  - Body scroll lock with refcount (when lockScroll).
 *  - Focus restore to the trigger element on close.
 *  - Conditional mount: returns null when `open === false` so children never
 *    have to do their own `if (!open) return null`.
 */
export function Modal({
  open,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
  trapFocus = true,
  children,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (lockScroll) lockBody();

    const id = nextModalId++;
    modalStack.push(id);

    // Capture the element that had focus when the modal opens so we can
    // return focus to it on close. For most callers this is the trigger
    // button. Modals that use a child `autoFocus` prop will see the
    // autofocused input here instead — those silently no-op the restore
    // (the input is detached by close time and fails the `body.contains`
    // guard below).
    const previouslyFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    // Auto-focus the first focusable on open if nothing inside the modal
    // is already focused (so we don't fight callers that use autoFocus or
    // their own ref-based focus). Use rAF so any synchronous DOM mutations
    // settle first.
    if (trapFocus && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const root = containerRef.current;
        if (!root) return;
        if (root.contains(document.activeElement)) return;
        getFocusables(root)[0]?.focus({ preventScroll: true });
      });
    }

    const onKey = (event: KeyboardEvent) => {
      // Only the topmost modal handles keyboard. Stack discipline lets us
      // open a confirm dialog over a drawer and have Esc close just the
      // confirm without cascading.
      if (modalStack[modalStack.length - 1] !== id) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'Tab' && trapFocus) {
        const root = containerRef.current;
        if (!root) return;
        const focusables = getFocusables(root);
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (active && !root.contains(active)) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      const idx = modalStack.indexOf(id);
      if (idx >= 0) modalStack.splice(idx, 1);
      if (lockScroll) unlockBody();

      // Restore focus on close. Guard with `body.contains(...)` because
      // the previously-focused element may have unmounted while the
      // modal was open (e.g. a route nav).
      if (
        previouslyFocused &&
        typeof document !== 'undefined' &&
        document.body.contains(previouslyFocused) &&
        typeof previouslyFocused.focus === 'function'
      ) {
        try {
          previouslyFocused.focus({ preventScroll: true });
        } catch {
          // Detached / non-focusable nodes can throw — silently ignore.
        }
      }
    };
  }, [open, closeOnEscape, lockScroll, trapFocus, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={containerRef} data-modal-portal="">
      {children}
    </div>,
    document.body,
  );
}
