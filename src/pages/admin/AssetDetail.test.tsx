// K7 regression: /admin/activos/:id renders the per-asset detail with the
// floor plan (InteractiveMap). The route exists, the page mounts without
// crashing, and a 404-style fallback renders for unknown ids.
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AssetDetail } from './AssetDetail';

const ASSET_SUMMARY = {
  id: 'a-1',
  name: 'Mall Alameda',
  city: 'Santiago',
  region: 'Metropolitana',
  totalUnits: 12,
  occupiedUnits: 10,
  occupancyPct: 83.3,
  monthlySales: 28_500_000,
  alertCount: 4,
  activeContracts: 8,
  prospectCount: 1,
  monthlyRent: 12_400_000,
  totalCost: 14_900_000,
  expiringSoon: 2,
  expired: 0,
};

const switchAssetSpy = vi.fn();

const mockState = vi.hoisted(() => ({
  current: {
    state: { units: [], contracts: [] },
    activeAssetId: 'a-1',
    assetSummaries: [
      // populated below
    ] as unknown[],
    insights: { tenantSummaries: [] as unknown[] },
    actions: { switchAsset: vi.fn() },
    isFeatureEnabled: () => false,
  },
}));

vi.mock('@/store/appState', () => ({
  useAppState: () => mockState.current,
}));

vi.mock('@/lib/currency', () => ({
  useCurrency: () => ({
    formatCurrency: (value: number) =>
      new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value),
  }),
}));

// InteractiveMap pulls a lot of state; substitute a marker so the smoke test
// proves the slot is wired without exercising domain helpers in isolation.
vi.mock('@/components/InteractiveMap', () => ({
  InteractiveMap: () => <div data-testid="floor-plan-marker">Plano</div>,
}));

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/activos/${id}`]}>
      <Routes>
        <Route path="/admin/activos/:id" element={<AssetDetail />} />
        <Route path="/admin/activos" element={<div>portfolio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('K7 — AssetDetail per-asset route', () => {
  it('renders header KPIs + floor plan when the asset id matches a loaded summary', () => {
    mockState.current = {
      state: { units: [], contracts: [] },
      activeAssetId: 'a-1',
      assetSummaries: [ASSET_SUMMARY],
      insights: { tenantSummaries: [] },
      actions: { switchAsset: switchAssetSpy },
      isFeatureEnabled: () => false,
    };
    renderAt('a-1');
    expect(screen.getByText('Mall Alameda', { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId('floor-plan-marker')).toBeInTheDocument();
  });

  it('renders a 404 fallback when the asset id is unknown', () => {
    mockState.current = {
      state: { units: [], contracts: [] },
      activeAssetId: 'a-1',
      assetSummaries: [ASSET_SUMMARY],
      insights: { tenantSummaries: [] },
      actions: { switchAsset: switchAssetSpy },
      isFeatureEnabled: () => false,
    };
    renderAt('zz-not-loaded');
    expect(screen.getByText(/Activo no encontrado/i)).toBeInTheDocument();
    expect(screen.queryByTestId('floor-plan-marker')).toBeNull();
  });

  it('switches the active workspace when navigating directly to a non-active asset id', () => {
    switchAssetSpy.mockClear();
    mockState.current = {
      state: { units: [], contracts: [] },
      activeAssetId: 'a-other',
      assetSummaries: [ASSET_SUMMARY, { ...ASSET_SUMMARY, id: 'a-other', name: 'Other' }],
      insights: { tenantSummaries: [] },
      actions: { switchAsset: switchAssetSpy },
      isFeatureEnabled: () => false,
    };
    renderAt('a-1');
    expect(switchAssetSpy).toHaveBeenCalledWith('a-1');
  });
});
