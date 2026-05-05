import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppState } from '@/store/appState';

export function AdminOnly({ children }: { children: ReactNode }) {
  const { authUser } = useAppState();
  if (authUser?.role === 'locatario') {
    return <Navigate to="/locatario/dashboard" replace />;
  }
  return <>{children}</>;
}

export function LocatarioOnly({ children }: { children: ReactNode }) {
  const { authUser } = useAppState();
  // Mirror of AdminOnly. If a non-locatario lands on a /locatario URL while
  // signed in, send them to the admin home; unauthenticated users still see
  // the route (AuthGate has already gated the app at this point).
  if (authUser && authUser.role !== 'locatario') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}
