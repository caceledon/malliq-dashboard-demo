import { useEffect, useState } from 'react';

/**
 * Returns true when the user has requested reduced motion. Subscribes to
 * media-query changes so a runtime preference flip flushes through.
 *
 * Use this to gate SVG SMIL animations (<animate>) — those are declarative
 * and don't honor CSS animation properties, so a CSS-only reduced-motion
 * media query can't stop them. Components must conditionally not render
 * the animation when this returns true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
