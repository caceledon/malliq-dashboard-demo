// Track 9 — surfaces tenant-pair correlations and lead/lag relationships
// derived from monthly sales. Read-only insight; no actions or persistence.
import { useMemo } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { buildCrossShoppingReport, STRONG_THRESHOLD, summarizeCrossShoppingPair } from '@/lib/crossShopping';

export function CrossShoppingPanel() {
  const { state, isFeatureEnabled } = useAppState();
  const enabled = isFeatureEnabled('crossShopping');

  const report = useMemo(
    () => (enabled ? buildCrossShoppingReport(state) : null),
    [enabled, state],
  );

  if (!enabled || !report) return null;

  if (report.contractCount < 2) {
    return (
      <section className="glass-card p-5">
        <header className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--violet-deep)]" />
          <h3 className="text-sm font-semibold">Cross-shopping</h3>
        </header>
        <p className="mt-2 text-sm text-[var(--sidebar-fg)]">
          Necesitas al menos dos locatarios con ventas para derivar correlaciones.
        </p>
      </section>
    );
  }

  if (report.insufficient) {
    return (
      <section className="glass-card p-5">
        <header className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--violet-deep)]" />
          <h3 className="text-sm font-semibold">Cross-shopping</h3>
        </header>
        <p className="mt-2 text-sm text-[var(--sidebar-fg)]">
          Aún no hay suficiente historial mensual para derivar señales confiables. Carga al
          menos cuatro meses de ventas con solapamiento por locatario.
        </p>
      </section>
    );
  }

  const topPositive = report.pairs.filter((p) => p.pearson > 0).slice(0, 3);
  const topNegative = report.pairs.filter((p) => p.pearson < 0).slice(0, 3);
  const leaders = report.leadLag.filter((entry) => entry.laggingFollowers.length > 0).slice(0, 3);

  return (
    <section className="glass-card p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--violet-deep)]" />
          <h3 className="text-sm font-semibold">Cross-shopping · ventana {report.windowMonths} meses</h3>
        </div>
        <span className="text-xs text-[var(--sidebar-fg)]">
          {report.pairs.length} pares · |r| ≥ {STRONG_THRESHOLD} es señal fuerte
        </span>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">
            Mueven juntos
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {topPositive.length === 0 ? (
              <li className="text-xs text-[var(--sidebar-fg)]">Sin pares positivos relevantes.</li>
            ) : (
              topPositive.map((pair) => (
                <li key={`${pair.contractA}-${pair.contractB}`}>{summarizeCrossShoppingPair(pair)}</li>
              ))
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">
            Movimiento opuesto
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {topNegative.length === 0 ? (
              <li className="text-xs text-[var(--sidebar-fg)]">Sin pares anticorrelacionados.</li>
            ) : (
              topNegative.map((pair) => (
                <li key={`${pair.contractA}-${pair.contractB}`}>{summarizeCrossShoppingPair(pair)}</li>
              ))
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">
            Posibles tractores
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {leaders.length === 0 ? (
              <li className="text-xs text-[var(--sidebar-fg)]">
                Aún no hay locatarios que adelanten consistentemente las ventas de otros.
              </li>
            ) : (
              leaders.map((entry) => (
                <li key={entry.contractId} className="flex items-center gap-1.5">
                  <span className="font-medium">{entry.storeName}</span>
                  <ArrowRight className="h-3 w-3 text-[var(--sidebar-fg)]" />
                  <span className="text-xs text-[var(--sidebar-fg)]">
                    {entry.laggingFollowers.length} seguidores ({entry.laggingFollowers
                      .slice(0, 2)
                      .map((p) => p.storeB)
                      .join(', ')}
                    {entry.laggingFollowers.length > 2 ? '…' : ''})
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[var(--sidebar-fg)]">
        Señal aproximada derivada solo de ventas mensuales (sin device panel). Útil como hipótesis
        para decisiones de tenant-mix; no la trates como evidencia causal.
      </p>
    </section>
  );
}
