// Track 8 — CAM (gastos comunes) reconciliation page.
//
// Audit-ready statement per tenant. The operator builds a list of operating
// line items, the engine distributes them by GLA or flat across active
// contracts, and the result is saved as a CamReconciliation record on the
// AssetWorkspace.
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/mallq/ui';
import { useAppState } from '@/store/appState';
import { computeCamReconciliation, summarizeCam } from '@/lib/cam';
import { createId, type CamLineItem } from '@/lib/domain';
import { useCurrency } from '@/lib/currency';

function emptyLineItem(): CamLineItem {
  return { id: createId('cam'), description: '', amountClp: 0 };
}

export function CamReconciliation() {
  const { state, actions, isFeatureEnabled } = useAppState();
  const { formatCurrency, getUfFor } = useCurrency();
  const enabled = isFeatureEnabled('camReconciliation');

  const [periodLabel, setPeriodLabel] = useState(`${new Date().getFullYear()}`);
  const [basis, setBasis] = useState<'gla' | 'flat'>('gla');
  const [lineItems, setLineItems] = useState<CamLineItem[]>([emptyLineItem()]);
  const [notes, setNotes] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  const reconciliations = state.camReconciliations ?? [];

  const preview = useMemo(
    () => computeCamReconciliation(state, lineItems, { basis, periodLabel, getUfFor }),
    [state, lineItems, basis, periodLabel, getUfFor],
  );
  const summary = useMemo(() => summarizeCam(preview), [preview]);

  if (!enabled) {
    return (
      <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
        <TopBar
          eyebrow="CAM"
          title={<>Próximamente.</>}
          sub="Activa la etiqueta experimental 'Reconciliación de GC' en Configuración para empezar a usar este módulo."
        />
      </div>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const sanitized = lineItems.filter((item) => item.description.trim() && item.amountClp > 0);
    if (sanitized.length === 0) return;
    const id = createId('cam-recon');
    actions.upsertCamReconciliation({
      id,
      generatedAt: new Date().toISOString(),
      ...computeCamReconciliation(state, sanitized, { basis, periodLabel, notes, getUfFor }),
    });
    setSavedId(id);
    setLineItems([emptyLineItem()]);
    setNotes('');
  };

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4, paddingTop: 16 }}>
        <Link to="/admin/dashboard" style={{ color: 'var(--ink-3)' }}>Cockpit</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>Reconciliación de gastos comunes</span>
      </nav>

      <TopBar
        eyebrow="Gastos comunes"
        title={<>Reconciliación auditable.</>}
        sub="Cada partida operativa se distribuye por GLA o de forma plana entre los contratos vigentes. La diferencia con lo cobrado queda registrada por locatario."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="glass-card p-5 space-y-4" onSubmit={onSubmit}>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Nueva reconciliación</h3>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Período (etiqueta)">
              <input
                value={periodLabel}
                onChange={(event) => setPeriodLabel(event.target.value)}
                placeholder="2026, 2026-Q1, etc."
                className="input-field"
              />
            </Field>
            <Field label="Base de distribución">
              <select
                value={basis}
                onChange={(event) => setBasis(event.target.value as 'gla' | 'flat')}
                className="input-field"
              >
                <option value="gla">Por GLA (m²)</option>
                <option value="flat">Plana (igual por contrato)</option>
              </select>
            </Field>
          </div>

          <div>
            <header className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">
                Partidas operativas
              </p>
              <button
                type="button"
                onClick={() => setLineItems((items) => [...items, emptyLineItem()])}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--violet-deep)]"
              >
                <Plus className="h-3 w-3" /> Agregar
              </button>
            </header>
            <ul className="mt-2 space-y-2">
              {lineItems.map((item, index) => (
                <li key={item.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    value={item.description}
                    onChange={(event) =>
                      setLineItems((items) =>
                        items.map((entry, i) =>
                          i === index ? { ...entry, description: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="Aseo, seguridad, mantenimiento, etc."
                    className="input-field"
                  />
                  <input
                    type="number"
                    value={item.amountClp || ''}
                    onChange={(event) =>
                      setLineItems((items) =>
                        items.map((entry, i) =>
                          i === index ? { ...entry, amountClp: Number(event.target.value) } : entry,
                        ),
                      )
                    }
                    placeholder="Monto CLP"
                    className="input-field w-[160px]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems((items) => (items.length === 1 ? items : items.filter((_, i) => i !== index)))
                    }
                    className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                    aria-label={`Eliminar partida ${index + 1}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Field label="Notas / contexto">
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="input-field"
            />
          </Field>

          <div className="rounded-2xl border border-[var(--border-color)] p-3 text-xs">
            <p className="font-semibold">Vista previa</p>
            <p className="mt-1 text-[var(--sidebar-fg)]">
              Total partidas: {formatCurrency(summary.totalActualClp)} · Total cobrado:{' '}
              {formatCurrency(summary.totalCollectedClp)} · Δ {formatCurrency(summary.totalDeltaClp)}
            </p>
            <p className="text-[var(--sidebar-fg)]">
              {summary.surplusTenants} locatarios pagaron de más, {summary.shortfallTenants} pagaron de menos.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <FileText className="h-4 w-4" />
            Guardar reconciliación
          </button>
        </form>

        <section className="space-y-4">
          {savedId ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              Reconciliación guardada. ID: <span className="font-mono">{savedId}</span>
            </div>
          ) : null}

          {reconciliations.length === 0 ? (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold">Histórico</h3>
              <p className="mt-2 text-sm text-[var(--sidebar-fg)]">Sin reconciliaciones guardadas todavía.</p>
            </div>
          ) : (
            reconciliations.map((reconciliation) => {
              const localSummary = summarizeCam(reconciliation);
              return (
                <div key={reconciliation.id} className="glass-card p-5">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {reconciliation.periodLabel} · {reconciliation.basis === 'gla' ? 'Por GLA' : 'Plana'}
                      </h3>
                      <p className="text-xs text-[var(--sidebar-fg)]">
                        Generada {new Date(reconciliation.generatedAt).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => actions.deleteCamReconciliation(reconciliation.id)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                    >
                      Eliminar
                    </button>
                  </header>
                  <p className="mt-2 text-xs text-[var(--sidebar-fg)]">
                    Total partidas {formatCurrency(localSummary.totalActualClp)} · Cobrado{' '}
                    {formatCurrency(localSummary.totalCollectedClp)} · Δ {formatCurrency(localSummary.totalDeltaClp)}
                  </p>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-[var(--violet-deep)]">Ver desglose por locatario</summary>
                    <ul className="mt-2 space-y-1 font-mono">
                      {reconciliation.tenants.map((tenant) => (
                        <li key={tenant.contractId} className="flex items-baseline justify-between gap-3">
                          <span>{tenant.storeName}</span>
                          <span>
                            {formatCurrency(tenant.expectedClp)} esperado · {formatCurrency(tenant.collectedClp)} cobrado
                            ·{' '}
                            <span style={{ color: tenant.deltaClp < 0 ? 'var(--danger)' : 'var(--mint-deep)' }}>
                              Δ {formatCurrency(tenant.deltaClp)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      {children}
    </label>
  );
}
