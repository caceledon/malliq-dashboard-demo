import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Asistente } from './Asistente';

const mockState = vi.hoisted(() => ({
  current: {
    state: { contracts: [], asset: null, documents: [] },
    insights: { tenantSummaries: [], alerts: [] },
    portfolioStats: { assetCount: 0, totalUnits: 0 },
    assetSummaries: [] as Array<{ id: string; name: string }>,
    authUser: null as null | { displayName: string | null; email: string; role: string },
    isFeatureEnabled: () => false,
  },
}));

vi.mock('@/store/appState', () => ({
  useAppState: () => mockState.current,
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

beforeEach(() => {
  mockState.current = {
    state: { contracts: [], asset: null, documents: [] },
    insights: { tenantSummaries: [], alerts: [] },
    portfolioStats: { assetCount: 0, totalUnits: 0 },
    assetSummaries: [],
    authUser: null,
    isFeatureEnabled: () => false,
  };
});

describe('Asistente — greeting + honest copy', () => {
  it('greets with the auth user displayName first name', () => {
    mockState.current.authUser = {
      displayName: 'Christian Celedón',
      email: 'celedonchristian@gmail.com',
      role: 'admin',
    };
    render(
      <MemoryRouter>
        <Asistente />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Hola Christian\./)).toBeInTheDocument();
  });

  it('falls back to the email local-part when displayName is missing', () => {
    mockState.current.authUser = {
      displayName: null,
      email: 'ada@malliq.cl',
      role: 'admin',
    };
    render(
      <MemoryRouter>
        <Asistente />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Hola ada\./)).toBeInTheDocument();
  });

  it('does not advertise live-IA chat (honest copy about local mode)', () => {
    render(
      <MemoryRouter>
        <Asistente />
      </MemoryRouter>,
    );
    // The intro + topbar must not promise "tiempo real" IA chat.
    expect(screen.queryByText(/tiempo real/i)).not.toBeInTheDocument();
    // The intro names the actual mode the page operates in.
    expect(screen.getByText(/Modo local/)).toBeInTheDocument();
  });
});
