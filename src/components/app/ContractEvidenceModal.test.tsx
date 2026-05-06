// Track 1 v1 — surfaces the cited PDF page when the operator clicks
// "Ver fuente" on an autofilled field.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContractEvidenceModal } from './ContractEvidenceModal';

const mockState = vi.hoisted(() => ({
  current: {
    state: {
      asset: { backendUrl: '/api' as string | undefined },
    },
    insights: { alerts: [], tenantSummaries: [] },
  },
}));

vi.mock('@/store/appState', () => ({
  useAppState: () => mockState.current,
}));

describe('ContractEvidenceModal', () => {
  it('renders the embed with #page=N when a page is provided', () => {
    render(
      <ContractEvidenceModal
        open
        onClose={() => {}}
        fieldLabel="Renta fija mensual"
        snippet="renta mensual UF 60"
        page={3}
        sourceDocumentId="document-abc"
      />,
    );
    const dialog = screen.getByRole('dialog', { name: /Evidencia: Renta fija mensual/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/página 3/i)).toBeInTheDocument();
    const embed = dialog.querySelector('embed');
    expect(embed).not.toBeNull();
    expect(embed?.getAttribute('src')).toBe('/api/documents/document-abc/download#page=3');
    // The "Abrir" link points at the same URL.
    const open = screen.getByRole('link', { name: /Abrir PDF en una nueva pestaña/i });
    expect(open.getAttribute('href')).toContain('#page=3');
  });

  it('falls back to a no-fragment URL when page is undefined', () => {
    render(
      <ContractEvidenceModal
        open
        onClose={() => {}}
        fieldLabel="Razón social"
        snippet="ACME SpA"
        sourceDocumentId="document-xyz"
      />,
    );
    const embed = screen.getByRole('dialog').querySelector('embed');
    expect(embed?.getAttribute('src')).toBe('/api/documents/document-xyz/download');
  });

  it('shows the empty-state copy when no source document is present', () => {
    render(
      <ContractEvidenceModal
        open
        onClose={() => {}}
        fieldLabel="X"
        snippet="snippet"
        sourceDocumentId={null}
      />,
    );
    expect(screen.getByText(/No hay un PDF persistido/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog').querySelector('embed')).toBeNull();
  });

  it('does not render when open=false', () => {
    render(
      <ContractEvidenceModal
        open={false}
        onClose={() => {}}
        fieldLabel="X"
        snippet=""
        sourceDocumentId={null}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('invokes onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ContractEvidenceModal
        open
        onClose={onClose}
        fieldLabel="X"
        snippet=""
        sourceDocumentId="document-abc"
      />,
    );
    fireEvent.click(screen.getByLabelText(/Cerrar evidencia/i));
    expect(onClose).toHaveBeenCalled();
  });
});
