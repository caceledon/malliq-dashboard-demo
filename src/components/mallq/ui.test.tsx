import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Delta, Donut, HealthRing, Kpi, LifeChip, TenantLogo } from './ui';

describe('Delta', () => {
  it('renders +X% with .up styling for positive values', () => {
    const { container } = render(<Delta v={0.125} />);
    const span = container.querySelector('.delta');
    expect(span).not.toBeNull();
    expect(span).toHaveClass('up');
    expect(container.textContent).toMatch(/12\.5%/);
    expect(container.textContent).toContain('▲');
  });

  it('renders -X% with .down styling for negative values', () => {
    const { container } = render(<Delta v={-0.08} />);
    const span = container.querySelector('.delta');
    expect(span).toHaveClass('down');
    expect(container.textContent).toMatch(/8\.0%/);
    expect(container.textContent).toContain('▼');
  });

  it('renders ±0% for exact zero without direction', () => {
    const { container } = render(<Delta v={0} />);
    expect(container.textContent).toContain('±0%');
    expect(container.querySelector('.delta')).toBeNull();
  });
});

describe('Kpi', () => {
  it('renders label, value and unit', () => {
    render(<Kpi label="Ocupación" value="82.3%" unit="GLA" />);
    expect(screen.getByText('Ocupación')).toBeInTheDocument();
    expect(screen.getByText('82.3%')).toBeInTheDocument();
    expect(screen.getByText('GLA')).toBeInTheDocument();
  });

  it('renders a sparkline when sparkData is provided', () => {
    const { container } = render(<Kpi label="Ventas" value="$1M" sparkData={[1, 2, 3, 4]} />);
    expect(container.querySelector('.spark svg')).not.toBeNull();
  });
});

describe('Donut', () => {
  it('renders an SVG circle with matching stroke-dasharray/offset for the given value', () => {
    const { container } = render(<Donut value={0.5} size={100} stroke={10} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
    const progress = circles[1];
    const r = (100 - 10) / 2;
    const c = 2 * Math.PI * r;
    const expectedOffset = c * (1 - 0.5);
    expect(Number(progress.getAttribute('stroke-dasharray'))).toBeCloseTo(c, 3);
    expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(expectedOffset, 3);
  });
});

describe('HealthRing', () => {
  it('colors the ring with --ok above 85', () => {
    const { container } = render(<HealthRing value={90} />);
    const circles = container.querySelectorAll('circle');
    expect(circles[1].getAttribute('stroke')).toBe('var(--ok)');
    expect(container.textContent).toContain('90');
  });

  it('colors the ring with --warn between 70 and 84', () => {
    const { container } = render(<HealthRing value={75} />);
    const circles = container.querySelectorAll('circle');
    expect(circles[1].getAttribute('stroke')).toBe('var(--warn)');
  });

  it('colors the ring with --danger below 70', () => {
    const { container } = render(<HealthRing value={40} />);
    const circles = container.querySelectorAll('circle');
    expect(circles[1].getAttribute('stroke')).toBe('var(--danger)');
  });
});

describe('LifeChip', () => {
  it.each([
    ['vigente', 'ok', 'Vigente'],
    ['por_vencer', 'warn', 'Por vencer'],
    ['vencido', 'danger', 'Vencido'],
    ['en_firma', 'info', 'En firma'],
    ['borrador', 'ghost', 'Borrador'],
  ])('maps lifecycle %s to chip.%s with label %s', (status, cls, label) => {
    const { container } = render(<LifeChip status={status} />);
    const chip = container.querySelector('.chip');
    expect(chip).toHaveClass(cls);
    expect(container.textContent).toContain(label);
  });

  it('falls back to borrador styling for unknown statuses', () => {
    const { container } = render(<LifeChip status="zzz_invalid" />);
    const chip = container.querySelector('.chip');
    expect(chip).toHaveClass('ghost');
    expect(container.textContent).toContain('Borrador');
  });
});

describe('TenantLogo', () => {
  it('renders the first two initials uppercased', () => {
    const { container } = render(<TenantLogo name="Starbucks Coffee" />);
    expect(container.textContent).toBe('SC');
  });

  it('produces a deterministic color class from the seed', () => {
    const { container: a } = render(<TenantLogo name="ACME" seed="tenant-123" />);
    const { container: b } = render(<TenantLogo name="ACME" seed="tenant-123" />);
    const clsA = Array.from(a.firstElementChild!.classList).find((c) => c.startsWith('lc-'));
    const clsB = Array.from(b.firstElementChild!.classList).find((c) => c.startsWith('lc-'));
    expect(clsA).toBeDefined();
    expect(clsA).toBe(clsB);
  });

  it('applies the sm size class', () => {
    const { container } = render(<TenantLogo name="ACME" size="sm" />);
    expect(container.firstElementChild).toHaveClass('sm');
  });
});
