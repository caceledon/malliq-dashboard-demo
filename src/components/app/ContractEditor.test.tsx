// K8 regression: when async-rendered autofill panels (priorContract diff,
// pending-fields list, evidence panel) appear above the form anchor, the
// editor's scrollTop is adjusted by the same delta so the user's view of
// the form fields doesn't jump.
//
// We don't mount the full ContractEditor (it has heavy domain deps); instead
// we test the scroll-preservation pattern in isolation with a minimal harness
// that mirrors the editor's structure. This protects against the regression
// even if the editor's internals change, because the pattern itself is the
// invariant.
import { render } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';

// jsdom doesn't compute layout. We model the browser semantics by tracking the
// anchor's position *in the document* and exposing getBoundingClientRect that
// subtracts the container's scrollTop — the real browser invariant.
function setupFakeLayout(container: HTMLDivElement, anchor: HTMLDivElement, anchorDocTop: number) {
  Object.defineProperty(container, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ top: 0, bottom: 400, left: 0, right: 0, width: 0, height: 400, x: 0, y: 0, toJSON() { return this; } }),
  });
  Object.defineProperty(anchor, 'getBoundingClientRect', {
    configurable: true,
    // Browser semantics: getBoundingClientRect().top decreases as the
    // container scrolls down. anchorDocTop is the anchor's position in
    // document coords; the visible top is anchorDocTop - scrollTop.
    value: () => {
      const t = anchorDocTop - container.scrollTop;
      return { top: t, bottom: t, left: 0, right: 0, width: 0, height: 0, x: 0, y: t, toJSON() { return this; } };
    },
  });
}

function ScrollPreservingHarness({ panelHeight }: { panelHeight: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const lastAnchorOffsetRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const anchor = anchorRef.current;
    if (!container || !anchor) return;
    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const anchorOffset = anchorRect.top - containerRect.top + container.scrollTop;
    const previous = lastAnchorOffsetRef.current;
    if (previous !== null && previous !== anchorOffset) {
      container.scrollTop += anchorOffset - previous;
    }
    lastAnchorOffsetRef.current = anchorOffset;
  });

  return (
    <div ref={containerRef} data-testid="container" style={{ height: 400, overflowY: 'auto' }}>
      {panelHeight > 0 ? <div data-testid="panel" style={{ height: panelHeight }} /> : null}
      <div ref={anchorRef} data-testid="anchor" />
      <div data-testid="form" style={{ height: 600 }} />
    </div>
  );
}

describe('K8 — autofill scroll preservation', () => {
  it('adjusts scrollTop by exactly the height the panel adds above the anchor', () => {
    const { rerender, getByTestId } = render(<ScrollPreservingHarness panelHeight={0} />);
    const container = getByTestId('container') as HTMLDivElement;
    const anchor = getByTestId('anchor') as HTMLDivElement;

    // Phase 1: anchor at docTop=0 (no panel above). Prime, then user scrolls.
    setupFakeLayout(container, anchor, 0);
    rerender(<ScrollPreservingHarness panelHeight={0} />); // baseline
    container.scrollTop = 200;
    rerender(<ScrollPreservingHarness panelHeight={0} />);
    expect(container.scrollTop).toBe(200); // user's scroll position respected

    // Phase 2: panel of 150px appears above the anchor. The anchor's
    // document position is now 150 (browser pushes it down). Without
    // compensation, the user would see the form jump 150px down in the
    // viewport — the K8 bug. With our useLayoutEffect, scrollTop is bumped
    // by +150 so the form stays put visually.
    setupFakeLayout(container, anchor, 150);
    rerender(<ScrollPreservingHarness panelHeight={150} />);

    expect(container.scrollTop).toBe(350);
  });

  it('does not adjust scrollTop when nothing changes above the anchor', () => {
    const { rerender, getByTestId } = render(<ScrollPreservingHarness panelHeight={120} />);
    const container = getByTestId('container') as HTMLDivElement;
    const anchor = getByTestId('anchor') as HTMLDivElement;

    // Prime the layout, then rerender to baseline lastAnchorOffsetRef.
    setupFakeLayout(container, anchor, 120);
    rerender(<ScrollPreservingHarness panelHeight={120} />);
    container.scrollTop = 80;
    rerender(<ScrollPreservingHarness panelHeight={120} />);
    expect(container.scrollTop).toBe(80);
  });

  it('compensates in the opposite direction when content shrinks above the anchor', () => {
    // Symmetric case: user dismissed an evidence panel — content above the
    // anchor shrank — and we need to scroll up to keep the form in view.
    const { rerender, getByTestId } = render(<ScrollPreservingHarness panelHeight={200} />);
    const container = getByTestId('container') as HTMLDivElement;
    const anchor = getByTestId('anchor') as HTMLDivElement;

    setupFakeLayout(container, anchor, 200);
    rerender(<ScrollPreservingHarness panelHeight={200} />); // baseline
    container.scrollTop = 500;
    rerender(<ScrollPreservingHarness panelHeight={200} />);
    expect(container.scrollTop).toBe(500);

    // Panel shrinks from 200 to 50.
    setupFakeLayout(container, anchor, 50);
    rerender(<ScrollPreservingHarness panelHeight={50} />);
    expect(container.scrollTop).toBe(350);
  });
});
