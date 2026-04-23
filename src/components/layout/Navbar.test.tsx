import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import { AppStateProvider } from '@/store/appState';
import { CurrencyProvider } from '@/lib/currency';
import { ThemeProvider } from '@/lib/theme';

function renderNavbar(extra?: { initialRoute?: string; onOpen?: () => void; onMenu?: () => void }) {
  const onMenu = extra?.onMenu ?? vi.fn();
  const onOpen = extra?.onOpen ?? vi.fn();
  return {
    onMenu,
    onOpen,
    ...render(
      <ThemeProvider>
        <CurrencyProvider>
          <AppStateProvider>
            <MemoryRouter initialEntries={[extra?.initialRoute ?? '/admin/dashboard']}>
              <Navbar onMenuClick={onMenu} onOpenCommandPalette={onOpen} />
            </MemoryRouter>
          </AppStateProvider>
        </CurrencyProvider>
      </ThemeProvider>,
    ),
  };
}

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the breadcrumb title for the active admin route', () => {
    renderNavbar({ initialRoute: '/admin/dashboard' });
    expect(screen.getByText(/Dashboard operativo/)).toBeInTheDocument();
    expect(screen.getByText(/Sin activo/)).toBeInTheDocument();
  });

  it('opens the command palette when the search trigger is clicked', () => {
    const onOpen = vi.fn();
    renderNavbar({ onOpen });
    const trigger = screen.getByTitle(/Buscar/);
    fireEvent.click(trigger);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders a single bell trigger (no duplicate bell regression)', () => {
    const { container } = renderNavbar();
    const bells = container.querySelectorAll('.iconbtn');
    // iconbtn collection includes the bell + theme + maybe mobile menu & logout;
    // ensure the Bell svg appears exactly once across the nav.
    const bellIcons = container.querySelectorAll('svg.lucide-bell');
    expect(bellIcons.length).toBe(1);
    // Sanity: there are still multiple icon buttons so we're counting the right set.
    expect(bells.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the OS-appropriate palette shortcut hint', () => {
    const { container } = renderNavbar();
    // Either "⌘K" or "Ctrl K" depending on navigator.platform at test time
    const hint = container.textContent ?? '';
    expect(/(?:⌘K|Ctrl K)/.test(hint)).toBe(true);
  });

  it('does not render user chip when logged out', () => {
    const { container } = renderNavbar();
    // LogOut icon should not be present
    const logout = container.querySelector('svg.lucide-log-out');
    expect(logout).toBeNull();
  });

  it('renders user chip + logout button when an auth user is stored', async () => {
    localStorage.setItem(
      'malliq-auth-user',
      JSON.stringify({
        id: 'u_1',
        email: 'ana@malliq.test',
        displayName: 'Ana',
        role: 'admin',
        createdAt: '2026-04-22T00:00:00Z',
      }),
    );
    const { container } = renderNavbar();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    const logout = container.querySelector('svg.lucide-log-out');
    expect(logout).not.toBeNull();
  });
});
