import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './Dashboard';
import { AppStateProvider } from '@/store/appState';
import { CurrencyProvider } from '@/lib/currency';
import { ThemeProvider } from '@/lib/theme';

function renderDashboard() {
  return render(
    <ThemeProvider>
      <CurrencyProvider>
        <AppStateProvider>
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>
        </AppStateProvider>
      </CurrencyProvider>
    </ThemeProvider>,
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, archiveExists: false, updatedAt: null, revision: 0, aiMode: 'mock_local' }),
      }),
    );
  });

  it('renders the hero strip and KPI grid with no data', () => {
    const { container } = renderDashboard();
    expect(screen.getByText(/Hola/)).toBeInTheDocument();
    // Several tokens repeat across hero/chip/legend — assert presence via getAllByText.
    expect(screen.getAllByText(/Ocupación/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ventas \/ m²/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ventas del mes/i)).toBeInTheDocument();
    expect(screen.getByText(/Renta proyectada/i)).toBeInTheDocument();
    expect(screen.getByText(/Salud promedio/i)).toBeInTheDocument();
    // 5 KPI tiles rendered in the grid
    expect(container.querySelectorAll('.kpi').length).toBe(5);
  });

  it('shows empty-watchlist / empty-top-performers messaging when there are no tenants', () => {
    renderDashboard();
    expect(screen.getByText(/Aún no hay ventas por locatario\./)).toBeInTheDocument();
    expect(screen.getByText(/Ningún locatario por debajo del umbral\./)).toBeInTheDocument();
  });

  it('does not render the portfolio comparison strip when there are no assets', () => {
    renderDashboard();
    expect(screen.queryByText(/Comparador · portafolio/)).not.toBeInTheDocument();
  });
});
