// K5 regression: the wordmark image has explicit dimensions (intrinsic-aware
// width + height attributes) and flex-shrink: 0 so it stops compressing under
// flex pressure on narrow viewports. A renamed asset, a stripped style
// attribute, or a removed flexShrink:0 will fail this test.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MkLogo } from '@/components/marketing/Shell';
import { MemoryRouter } from 'react-router-dom';

describe('K5 — logo intrinsic sizing', () => {
  it('marketing MkLogo: both imgs carry explicit width/height + flexShrink:0', () => {
    const { container } = render(
      <MemoryRouter>
        <MkLogo />
      </MemoryRouter>,
    );

    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2); // mark + wordmark

    imgs.forEach((img) => {
      // Explicit width/height HTML attrs reserve layout space pre-decode.
      expect(img.getAttribute('width')).not.toBeNull();
      expect(img.getAttribute('height')).not.toBeNull();
      // Defend against flex-row compression squishing the asset.
      expect(img.style.flexShrink).toBe('0');
      // objectFit:contain prevents stretch when width/height don't match aspect.
      expect(img.style.objectFit).toBe('contain');
    });
  });

  it('marketing MkLogo respects monoOnly (renders mark only)', () => {
    const { container } = render(
      <MemoryRouter>
        <MkLogo monoOnly />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('img').length).toBe(1);
  });

  it('wordmark width is intrinsic-aware (height × aspect, not 100%)', () => {
    const { container } = render(
      <MemoryRouter>
        <MkLogo size="md" />
      </MemoryRouter>,
    );
    const wordmark = container.querySelectorAll('img')[1];
    // For wordH=28 + aspect 218/88 ≈ 2.477 → ~69px. Not a full-width string.
    const widthAttr = wordmark.getAttribute('width');
    expect(widthAttr).not.toBe('100%');
    expect(Number(widthAttr)).toBeGreaterThan(40);
    expect(Number(widthAttr)).toBeLessThan(120);
  });
});
