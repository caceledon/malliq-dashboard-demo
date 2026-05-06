// Track 6 — casual / short-term licensing.
//
// Replaces the kiosk-spreadsheet most operators carry. Light-touch CRUD over
// AssetWorkspace.casualLicenses[]. No POS connections, no occupancy-cost math
// — just dates, daily rate and contact metadata.
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/mallq/ui';
import { useAppState } from '@/store/appState';
import { createId, type CasualLicense, type CasualLicenseKind, type CurrencyTag } from '@/lib/domain';
import { useCurrency } from '@/lib/currency';

const KIND_LABEL: Record<CasualLicenseKind, string> = {
  kiosko: 'Kiosko',
  atm: 'ATM',
  pop_up: 'Pop-up',
  evento: 'Evento',
  otro: 'Otro',
};

function emptyLicense(): CasualLicense {
  return {
    id: createId('casual'),
    name: '',
    kind: 'kiosko',
    category: '',
    startDate: '',
    endDate: '',
    dailyRate: 0,
    dailyRateCurrency: 'CLP',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

export function CasualLicenses() {
  const { state, actions, isFeatureEnabled } = useAppState();
  const { formatCurrency } = useCurrency();
  const enabled = isFeatureEnabled('casualLicensing');
  const [draft, setDraft] = useState<CasualLicense>(emptyLicense);
  const [editingId, setEditingId] = useState<string | null>(null);

  const items = state.casualLicenses ?? [];

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const active = items.filter((entry) => entry.startDate <= today && entry.endDate >= today);
  const upcoming = items.filter((entry) => entry.startDate > today);
  const expired = items.filter((entry) => entry.endDate < today);

  if (!enabled) {
    return (
      <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
        <TopBar
          eyebrow="Licencias corto plazo"
          title={<>Próximamente.</>}
          sub="Activa la etiqueta experimental 'Licencias corto plazo' en Configuración para empezar a usar este módulo."
        />
      </div>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    actions.upsertCasualLicense(draft);
    setDraft(emptyLicense());
    setEditingId(null);
  };

  const onEdit = (license: CasualLicense) => {
    setDraft({ ...license });
    setEditingId(license.id);
  };

  const onCancel = () => {
    setDraft(emptyLicense());
    setEditingId(null);
  };

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4, paddingTop: 16 }}>
        <Link to="/admin/dashboard" style={{ color: 'var(--ink-3)' }}>Cockpit</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>Licencias corto plazo</span>
      </nav>

      <TopBar
        eyebrow="Licencias corto plazo"
        title={<>Kioscos, ATMs, pop-ups y eventos.</>}
        sub="Entidad ligera, separada del contrato de arriendo. Carga la fecha de inicio, el plazo y la tarifa diaria; el resto se deriva."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          {[
            { label: 'Vigentes', list: active, tone: 'mint' },
            { label: 'Próximas', list: upcoming, tone: 'sky' },
            { label: 'Cerradas', list: expired, tone: 'ink' },
          ].map((group) => (
            <div key={group.label} className="glass-card p-5">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{group.label} · {group.list.length}</h3>
              </header>
              {group.list.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--sidebar-fg)]">Sin entradas.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--border-color)]">
                  {group.list.map((license) => {
                    const days = Math.max(
                      1,
                      Math.ceil(
                        (new Date(license.endDate).getTime() - new Date(license.startDate).getTime()) /
                          86_400_000,
                      ),
                    );
                    const dailyClp =
                      license.dailyRateCurrency === 'CLP'
                        ? license.dailyRate
                        : license.dailyRate;
                    return (
                      <li key={license.id} className="grid gap-2 py-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-baseline">
                        <div>
                          <p className="text-sm font-semibold">{license.name}</p>
                          <p className="text-xs text-[var(--sidebar-fg)]">
                            {KIND_LABEL[license.kind]} · {license.category || 'Sin categoría'}
                          </p>
                        </div>
                        <div className="text-xs text-[var(--sidebar-fg)]">
                          {license.startDate} → {license.endDate}
                          <span className="ml-1 font-mono">({days} días)</span>
                        </div>
                        <div className="text-xs text-[var(--sidebar-fg)]">
                          {license.dailyRateCurrency === 'CLP'
                            ? formatCurrency(dailyClp)
                            : `${license.dailyRate.toFixed(2)} UF`}
                          /día
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(license)}
                            className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-[11px] font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => actions.deleteCasualLicense(license.id)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                            aria-label={`Eliminar licencia ${license.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </section>

        <aside className="glass-card p-5">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingId ? 'Editar licencia' : 'Nueva licencia'}</h3>
            {editingId ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-[11px] text-[var(--sidebar-fg)] hover:text-[var(--ink-1)]"
              >
                Descartar
              </button>
            ) : null}
          </header>
          <form className="mt-3 space-y-3" onSubmit={onSubmit}>
            <Field label="Nombre / razón social">
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Ej: Kiosko Empanadas Don Pedro"
                className="input-field"
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft({ ...draft, kind: event.target.value as CasualLicenseKind })
                  }
                  className="input-field"
                >
                  {(Object.keys(KIND_LABEL) as CasualLicenseKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Categoría">
                <input
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  placeholder="Comida, financiero, etc."
                  className="input-field"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                  className="input-field"
                  required
                />
              </Field>
              <Field label="Término">
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                  className="input-field"
                  required
                />
              </Field>
            </div>
            <Field label="Tarifa diaria">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={Number.isFinite(draft.dailyRate) ? draft.dailyRate : ''}
                  onChange={(event) => setDraft({ ...draft, dailyRate: Number(event.target.value) })}
                  className="input-field flex-1"
                />
                <select
                  value={draft.dailyRateCurrency}
                  onChange={(event) =>
                    setDraft({ ...draft, dailyRateCurrency: event.target.value as CurrencyTag })
                  }
                  className="input-field w-[90px] shrink-0"
                  aria-label="Moneda tarifa diaria"
                >
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                </select>
              </div>
            </Field>
            <Field label="Contacto">
              <input
                value={draft.contactName ?? ''}
                onChange={(event) => setDraft({ ...draft, contactName: event.target.value })}
                placeholder="Nombre"
                className="input-field"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email">
                <input
                  type="email"
                  value={draft.contactEmail ?? ''}
                  onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })}
                  placeholder="contacto@empresa.cl"
                  className="input-field"
                />
              </Field>
              <Field label="Teléfono">
                <input
                  value={draft.contactPhone ?? ''}
                  onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })}
                  placeholder="+56 9 ..."
                  className="input-field"
                />
              </Field>
            </div>
            <Field label="Notas">
              <textarea
                rows={3}
                value={draft.notes ?? ''}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                className="input-field"
              />
            </Field>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              {editingId ? 'Guardar cambios' : 'Agregar licencia'}
            </button>
          </form>
        </aside>
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
