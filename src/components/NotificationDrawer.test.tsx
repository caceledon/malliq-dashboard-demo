// K6 regression: panel groups alerts, persists "seen" state in localStorage,
// renders a hydration skeleton when state.asset is null, and surfaces the
// most recent failed ImportLog as an error block.
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDrawer } from './NotificationDrawer';

// Mock useAppState so we can vary insights/state per test without spinning up
// the full provider stack. The store module exports `useAppState` as a hook.
const mockState = vi.hoisted(() => ({
  current: {
    insights: { alerts: [] as Array<{ id: string; type: string; title: string; description: string; createdAt: string }> },
    state: {
      asset: { syncStatus: 'idle' as 'idle' | 'conflict' | 'offline' | 'syncing', syncMessage: '' },
      importLogs: [] as Array<{ id: string; status: 'success' | 'error'; note: string; createdAt: string; source: string; importedCount: number }>,
    },
    authUser: { role: 'admin' },
  },
}));

vi.mock('@/store/appState', () => ({
  useAppState: () => mockState.current,
}));

function open() {
  fireEvent.click(screen.getByTitle(/Notificaciones/));
}

beforeEach(() => {
  localStorage.clear();
  mockState.current = {
    insights: { alerts: [] },
    state: {
      asset: { syncStatus: 'idle', syncMessage: '' },
      importLogs: [],
    },
    authUser: { role: 'admin' },
  };
});

describe('K6 — NotificationDrawer', () => {
  it('renders a hydration skeleton when state.asset is null (still hydrating)', () => {
    mockState.current.state.asset = null as never;
    render(
      <MemoryRouter>
        <NotificationDrawer />
      </MemoryRouter>,
    );
    open();
    expect(screen.getByLabelText(/Cargando notificaciones/i)).toBeInTheDocument();
  });

  it('groups alerts by category using id prefix', () => {
    mockState.current.insights.alerts = [
      { id: 'expiring-c1', type: 'warning', title: 'Por vencer', description: '', createdAt: 'x' },
      { id: 'expired-c2', type: 'critical', title: 'Vencido', description: '', createdAt: 'x' },
      { id: 'sales-missing-c3', type: 'info', title: 'Sin ventas', description: '', createdAt: 'x' },
      { id: 'overlap-u4', type: 'critical', title: 'Conflicto', description: '', createdAt: 'x' },
    ];
    render(
      <MemoryRouter>
        <NotificationDrawer />
      </MemoryRouter>,
    );
    open();
    expect(screen.getByText(/Vencimientos · 2/)).toBeInTheDocument();
    expect(screen.getByText(/Ingesta · 1/)).toBeInTheDocument();
    expect(screen.getByText(/Riesgo de pago · 1/)).toBeInTheDocument();
  });

  it('shows an explicit error block when the latest import failed', () => {
    mockState.current.state.importLogs = [
      { id: 'l1', status: 'error', note: 'CSV columna 4 no parseable', createdAt: 'x', source: 'manual', importedCount: 0 },
    ];
    render(
      <MemoryRouter>
        <NotificationDrawer />
      </MemoryRouter>,
    );
    open();
    expect(screen.getByText(/Última ingesta falló/i)).toBeInTheDocument();
    expect(screen.getByText(/CSV columna 4 no parseable/)).toBeInTheDocument();
  });

  it('badge reflects unread count, decrements after "marcar leídas"', () => {
    mockState.current.insights.alerts = [
      { id: 'expiring-c1', type: 'warning', title: 'A', description: '', createdAt: 'x' },
      { id: 'expired-c2', type: 'critical', title: 'B', description: '', createdAt: 'x' },
    ];
    const { container } = render(
      <MemoryRouter>
        <NotificationDrawer />
      </MemoryRouter>,
    );
    // Closed: badge shows "2"
    expect(container.querySelector('button[title="Notificaciones"] span')?.textContent).toBe('2');
    open();
    fireEvent.click(screen.getByLabelText(/Marcar todas/i));
    // Closed badge now hidden — re-query inside the trigger button only.
    fireEvent.click(screen.getByLabelText(/Cerrar notificaciones/i));
    const badge = container.querySelector('button[title="Notificaciones"] > span');
    expect(badge).toBeNull();
    // Persistence: localStorage key now contains the seen ids.
    const stored = JSON.parse(localStorage.getItem('malliq:notif:seen-v1') || '[]');
    expect(stored).toContain('expiring-c1');
    expect(stored).toContain('expired-c2');
  });

  it('panel uses aria-modal + aria-live on the body', () => {
    render(
      <MemoryRouter>
        <NotificationDrawer />
      </MemoryRouter>,
    );
    open();
    const dialog = screen.getByRole('dialog', { name: /Notificaciones/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The scrolling body announces incoming alerts.
    const liveRegion = dialog.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('GCs stale ids from the seen set when alerts disappear', () => {
    localStorage.setItem('malliq:notif:seen-v1', JSON.stringify(['stale-id', 'expiring-c1']));
    mockState.current.insights.alerts = [
      { id: 'expiring-c1', type: 'warning', title: 'Live', description: '', createdAt: 'x' },
    ];
    render(
      <MemoryRouter>
        <NotificationDrawer />
      </MemoryRouter>,
    );
    // Effect runs after render — flush.
    act(() => {
      // no-op; React 19 will have already flushed the effect.
    });
    const stored = JSON.parse(localStorage.getItem('malliq:notif:seen-v1') || '[]');
    expect(stored).toContain('expiring-c1');
    expect(stored).not.toContain('stale-id');
  });
});
