import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdminOnly, LocatarioOnly } from './RoleGuards';
import { AppStateProvider } from '@/store/appState';
import { CurrencyProvider } from '@/lib/currency';
import { ThemeProvider } from '@/lib/theme';

function setUser(user: Record<string, unknown> | null) {
  if (user) {
    localStorage.setItem('malliq-auth-user', JSON.stringify(user));
  } else {
    localStorage.removeItem('malliq-auth-user');
  }
}

function renderAt(path: string, ui: React.ReactNode) {
  return render(
    <ThemeProvider>
      <CurrencyProvider>
        <AppStateProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/admin/dashboard" element={<div>ADMIN_HOME</div>} />
              <Route path="/locatario/dashboard" element={<div>LOCATARIO_HOME</div>} />
              <Route path="/admin/secret" element={<AdminOnly>{ui}</AdminOnly>} />
              <Route path="/locatario/secret" element={<LocatarioOnly>{ui}</LocatarioOnly>} />
            </Routes>
          </MemoryRouter>
        </AppStateProvider>
      </CurrencyProvider>
    </ThemeProvider>,
  );
}

describe('RoleGuards', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('AdminOnly redirects locatario to /locatario/dashboard', () => {
    setUser({
      id: 'u1',
      email: 'tenant@test.cl',
      displayName: 'Tenant',
      role: 'locatario',
      tenantContractId: 'contract-1',
      createdAt: '2026-01-01T00:00:00Z',
    });
    renderAt('/admin/secret', <div>ADMIN_SECRET</div>);
    expect(screen.queryByText('ADMIN_SECRET')).toBeNull();
    expect(screen.getByText('LOCATARIO_HOME')).toBeInTheDocument();
  });

  it('AdminOnly renders children for admin', () => {
    setUser({
      id: 'u2',
      email: 'admin@test.cl',
      displayName: 'Admin',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00Z',
    });
    renderAt('/admin/secret', <div>ADMIN_SECRET</div>);
    expect(screen.getByText('ADMIN_SECRET')).toBeInTheDocument();
  });

  it('LocatarioOnly redirects member to /admin/dashboard', () => {
    setUser({
      id: 'u3',
      email: 'member@test.cl',
      displayName: 'Member',
      role: 'member',
      createdAt: '2026-01-01T00:00:00Z',
    });
    renderAt('/locatario/secret', <div>TENANT_SECRET</div>);
    expect(screen.queryByText('TENANT_SECRET')).toBeNull();
    expect(screen.getByText('ADMIN_HOME')).toBeInTheDocument();
  });

  it('LocatarioOnly renders children for locatario', () => {
    setUser({
      id: 'u4',
      email: 'tenant@test.cl',
      displayName: 'Tenant',
      role: 'locatario',
      tenantContractId: 'contract-1',
      createdAt: '2026-01-01T00:00:00Z',
    });
    renderAt('/locatario/secret', <div>TENANT_SECRET</div>);
    expect(screen.getByText('TENANT_SECRET')).toBeInTheDocument();
  });
});
