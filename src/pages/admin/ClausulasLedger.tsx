// Track 3 — portfolio-wide clause ledger.
//
// Lists every classified clause across the active Activo, with filters for
// type and search by store. "Reanalizar" triggers the second-pass extractor
// for the selected contract; the result lands in contract.clauses and
// auto-syncs.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { TopBar } from '@/components/mallq/ui';
import { useAppState } from '@/store/appState';
import type { ContractClauseType } from '@/lib/domain';
import { extractContractClauses, resolveApiBase } from '@/lib/api';

const TYPE_LABEL: Record<ContractClauseType, string> = {
  exclusividad: 'Exclusividad',
  co_arrendamiento: 'Co-arrendamiento',
  renovacion: 'Renovación',
  kick_out: 'Salida anticipada',
  uso_restringido: 'Uso restringido',
  gracia: 'Período de gracia',
  otra: 'Otra',
};

export function ClausulasLedger() {
  const { state, isFeatureEnabled } = useAppState();
  const enabled = isFeatureEnabled('clausulasLedger');
  const apiBase = state.asset?.backendUrl ?? resolveApiBase();

  const [filterType, setFilterType] = useState<ContractClauseType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const out: Array<{
      contractId: string;
      storeName: string;
      sourceDocumentId?: string;
      clauseId: string;
      type: ContractClauseType;
      text: string;
      page?: number;
    }> = [];
    for (const contract of state.contracts) {
      for (const clause of contract.clauses ?? []) {
        out.push({
          contractId: contract.id,
          storeName: contract.storeName,
          sourceDocumentId: contract.sourceDocumentId,
          clauseId: clause.id,
          type: clause.type as ContractClauseType,
          text: clause.text,
          page: clause.evidence?.page,
        });
      }
    }
    return out
      .filter((row) => filterType === 'all' || row.type === filterType)
      .filter((row) =>
        search.trim()
          ? `${row.storeName} ${row.text}`.toLowerCase().includes(search.trim().toLowerCase())
          : true,
      );
  }, [state.contracts, filterType, search]);

  const reanalize = async (contractId: string) => {
    setBusyId(contractId);
    setError(null);
    try {
      await extractContractClauses(apiBase, contractId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la extracción de cláusulas.');
    } finally {
      setBusyId(null);
    }
  };

  if (!enabled) {
    return (
      <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
        <TopBar
          eyebrow="Cláusulas"
          title={<>Próximamente.</>}
          sub="Activa la etiqueta experimental 'Cláusulas y derechos' en Configuración para empezar a usar este módulo."
        />
      </div>
    );
  }

  const contractsWithSource = state.contracts.filter((contract) => contract.sourceDocumentId);

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4, paddingTop: 16 }}>
        <Link to="/admin/dashboard" style={{ color: 'var(--ink-3)' }}>Cockpit</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>Cláusulas</span>
      </nav>

      <TopBar
        eyebrow="Cláusulas y derechos"
        title={<>El spreadsheet del operador, indexado.</>}
        sub="Extracción de segundo pase sobre los contratos que ya tienen PDF persistido. Cada cláusula trae cita y página."
      />

      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--sidebar-fg)]">Tipo</span>
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as ContractClauseType | 'all')}
              className="input-field"
            >
              <option value="all">Todas</option>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por tienda o texto"
            className="input-field flex-1 min-w-[200px]"
          />
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-700">{error}</div>
        ) : null}
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-[2fr_1fr]">
        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold">Ledger · {rows.length} cláusulas</h3>
          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--sidebar-fg)]">
              Sin cláusulas registradas. Reanaliza algún contrato con PDF fuente para empezar.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border-color)]">
              {rows.map((row) => (
                <li key={`${row.contractId}-${row.clauseId}`} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {row.storeName}
                        <span className="ml-2 inline-flex items-center rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--sidebar-fg)]">
                          {TYPE_LABEL[row.type]}
                        </span>
                        {row.page ? (
                          <span className="ml-1 font-mono text-[11px] text-[var(--sidebar-fg)]">
                            p. {row.page}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-[var(--sidebar-fg)] line-clamp-3">{row.text}</p>
                    </div>
                    {row.sourceDocumentId ? (
                      <a
                        href={`${apiBase.replace(/\/+$/, '')}/documents/${row.sourceDocumentId}/download${row.page ? `#page=${row.page}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-[var(--violet-deep)]"
                      >
                        Ver fuente
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="glass-card p-5">
          <h3 className="text-sm font-semibold">Reanalizar contratos</h3>
          <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
            La extracción reemplaza las cláusulas existentes del contrato.
          </p>
          {contractsWithSource.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--sidebar-fg)]">
              Aún no hay contratos con PDF fuente persistido. Sube un contrato vía autofill para habilitar la extracción.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {contractsWithSource.map((contract) => (
                <li key={contract.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{contract.storeName}</span>
                  <button
                    type="button"
                    disabled={busyId === contract.id}
                    onClick={() => reanalize(contract.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
                  >
                    {busyId === contract.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {busyId === contract.id ? 'Procesando…' : 'Extraer'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
