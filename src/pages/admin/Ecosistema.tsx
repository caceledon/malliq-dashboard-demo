import { useDeferredValue, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileUp, Pencil, Search, Trash2 } from 'lucide-react';
import { buildProspectContractTemplate, createId, getContractLifecycle, type Prospect, type ProspectStage, type Supplier, type SupplierStatus } from '@/lib/domain';
import { useAppState } from '@/store/appState';

const supplierStatuses: SupplierStatus[] = ['activo', 'inactivo'];
const prospectStages: ProspectStage[] = ['nuevo', 'contactado', 'negociacion', 'oferta', 'cerrado', 'descartado'];

function newSupplier(): Supplier {
  return {
    id: createId('supplier'),
    name: '',
    category: '',
    contactName: '',
    email: '',
    phone: '',
    status: 'activo',
    notes: '',
  };
}

function newProspect(): Prospect {
  return {
    id: createId('prospect'),
    brandName: '',
    category: '',
    targetAreaM2: 0,
    stage: 'nuevo',
    contactName: '',
    email: '',
    phone: '',
    notes: '',
  };
}

const stageRank: Record<ProspectStage, number> = {
  nuevo: 5,
  contactado: 4,
  negociacion: 3,
  oferta: 2,
  cerrado: 1,
  descartado: 6,
};

interface EcosistemaRouteState {
  focusUnitId?: string;
}

function parseDelimitedRows(raw: string): Record<string, string>[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((value) => value.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((value) => value.trim());
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

export function Ecosistema() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, actions } = useAppState();
  const [supplier, setSupplier] = useState<Supplier>(newSupplier());
  const [prospect, setProspect] = useState<Prospect>(newProspect());
  const [search, setSearch] = useState('');
  const [focusedUnitId, setFocusedUnitId] = useState('');
  const [message, setMessage] = useState('');
  const deferredSearch = useDeferredValue(search);

  const occupiedUnits = new Set(
    state.contracts
      .filter((contract) => getContractLifecycle(contract) !== 'vencido')
      .flatMap((contract) => contract.localIds),
  );
  const vacantUnits = state.units.filter((unit) => !occupiedUnits.has(unit.id));
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredSuppliers = state.suppliers.filter((item) =>
    `${item.name} ${item.category} ${item.contactName} ${item.email}`.toLowerCase().includes(normalizedSearch),
  );
  const filteredProspects = state.prospects.filter((item) =>
    `${item.brandName} ${item.category} ${item.contactName} ${item.email}`.toLowerCase().includes(normalizedSearch),
  );

  const matchesByVacancy = vacantUnits.map((unit) => ({
    unit,
    matches: [...state.prospects]
      .filter((item) => item.stage !== 'cerrado' && item.stage !== 'descartado' && item.targetAreaM2 > 0)
      .sort((left, right) => {
        const leftScore = Math.abs(left.targetAreaM2 - unit.areaM2) + stageRank[left.stage] * 5;
        const rightScore = Math.abs(right.targetAreaM2 - unit.areaM2) + stageRank[right.stage] * 5;
        return leftScore - rightScore;
      })
      .slice(0, 3),
  }));

  useEffect(() => {
    const routeState = location.state as EcosistemaRouteState | null;
    if (!routeState?.focusUnitId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setFocusedUnitId(routeState.focusUnitId ?? '');
      navigate(location.pathname, { replace: true, state: null });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.state, navigate]);

  const createDraftFromProspect = (item: Prospect, localIds: string[] = []) => {
    navigate('/admin/locatarios', {
      state: {
        contractTemplate: buildProspectContractTemplate(item, localIds),
        flashMessage: `Borrador contractual generado desde prospecto ${item.brandName}.`,
      },
    });
  };

  const saveSupplier = () => {
    if (!supplier.name.trim()) {
      return;
    }
    actions.upsertSupplier(supplier);
    setSupplier(newSupplier());
    setMessage('Proveedor guardado correctamente.');
  };

  const saveProspect = () => {
    if (!prospect.brandName.trim()) {
      return;
    }
    actions.upsertProspect(prospect);
    setProspect(newProspect());
    setMessage('Prospecto guardado correctamente.');
  };

  const importSuppliers = async (file: File) => {
    const rows = parseDelimitedRows(await file.text());
    rows.forEach((row) => {
      actions.upsertSupplier({
        id: row.id?.trim() || createId('supplier'),
        name: row.name ?? row.nombre ?? '',
        category: row.category ?? row.categoria ?? '',
        contactName: row.contactName ?? row.contacto ?? '',
        email: row.email ?? '',
        phone: row.phone ?? row.telefono ?? '',
        status: (row.status as SupplierStatus) || 'activo',
        notes: row.notes ?? row.notas ?? '',
      });
    });
    setMessage(`${rows.length} proveedor(es) importado(s) desde ${file.name}.`);
  };

  const importProspects = async (file: File) => {
    const rows = parseDelimitedRows(await file.text());
    rows.forEach((row) => {
      actions.upsertProspect({
        id: row.id?.trim() || createId('prospect'),
        brandName: row.brandName ?? row.marca ?? '',
        category: row.category ?? row.categoria ?? '',
        targetAreaM2: Number(row.targetAreaM2 ?? row.m2 ?? 0),
        stage: (row.stage as ProspectStage) || 'nuevo',
        contactName: row.contactName ?? row.contacto ?? '',
        email: row.email ?? '',
        phone: row.phone ?? row.telefono ?? '',
        notes: row.notes ?? row.notas ?? '',
      });
    });
    setMessage(`${rows.length} prospecto(s) importado(s) desde ${file.name}.`);
  };

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Proveedores y prospectos</h1>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            Base comercial y operativa con edición completa y sugerencias de encaje para vacancias del mall.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--sidebar-fg)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar proveedor o prospecto"
            className="w-[260px] bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Proveedores" value={String(state.suppliers.length)} subtitle="Base operativa" />
        <Metric title="Prospectos" value={String(state.prospects.length)} subtitle="Pipeline comercial" />
        <Metric title="Vacancias" value={String(vacantUnits.length)} subtitle="Locales sin contrato vigente" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">{supplier.id.startsWith('supplier-') && state.suppliers.some((item) => item.id === supplier.id) ? 'Editar proveedor' : 'Proveedor'}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Nombre">
              <input value={supplier.name} onChange={(event) => setSupplier((current) => ({ ...current, name: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Categoría">
              <input value={supplier.category} onChange={(event) => setSupplier((current) => ({ ...current, category: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Contacto">
              <input value={supplier.contactName} onChange={(event) => setSupplier((current) => ({ ...current, contactName: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Estado">
              <select value={supplier.status} onChange={(event) => setSupplier((current) => ({ ...current, status: event.target.value as SupplierStatus }))} className="input-field">
                {supplierStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input value={supplier.email} onChange={(event) => setSupplier((current) => ({ ...current, email: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Teléfono">
              <input value={supplier.phone} onChange={(event) => setSupplier((current) => ({ ...current, phone: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Notas">
              <textarea rows={3} value={supplier.notes} onChange={(event) => setSupplier((current) => ({ ...current, notes: event.target.value }))} className="input-field" />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={saveSupplier} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              Guardar proveedor
            </button>
            <button onClick={() => setSupplier(newSupplier())} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
              Nuevo
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
              <FileUp className="h-4 w-4" />
              Importar CSV
              <input type="file" accept=".csv,.txt" className="hidden" onChange={(event) => event.target.files?.[0] && importSuppliers(event.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">{prospect.id.startsWith('prospect-') && state.prospects.some((item) => item.id === prospect.id) ? 'Editar prospecto' : 'Prospecto'}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Marca">
              <input value={prospect.brandName} onChange={(event) => setProspect((current) => ({ ...current, brandName: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Categoría">
              <input value={prospect.category} onChange={(event) => setProspect((current) => ({ ...current, category: event.target.value }))} className="input-field" />
            </Field>
            <Field label="m2 objetivo">
              <input type="number" value={prospect.targetAreaM2} onChange={(event) => setProspect((current) => ({ ...current, targetAreaM2: Number(event.target.value) }))} className="input-field" />
            </Field>
            <Field label="Etapa">
              <select value={prospect.stage} onChange={(event) => setProspect((current) => ({ ...current, stage: event.target.value as ProspectStage }))} className="input-field">
                {prospectStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contacto">
              <input value={prospect.contactName} onChange={(event) => setProspect((current) => ({ ...current, contactName: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Email">
              <input value={prospect.email} onChange={(event) => setProspect((current) => ({ ...current, email: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Teléfono">
              <input value={prospect.phone} onChange={(event) => setProspect((current) => ({ ...current, phone: event.target.value }))} className="input-field" />
            </Field>
            <Field label="Notas">
              <textarea rows={3} value={prospect.notes} onChange={(event) => setProspect((current) => ({ ...current, notes: event.target.value }))} className="input-field" />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={saveProspect} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
              Guardar prospecto
            </button>
            <button onClick={() => setProspect(newProspect())} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
              Nuevo
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold">
              <FileUp className="h-4 w-4" />
              Importar CSV
              <input type="file" accept=".csv,.txt" className="hidden" onChange={(event) => event.target.files?.[0] && importProspects(event.target.files[0])} />
            </label>
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--sidebar-fg)]">
          {message}
        </div>
      ) : null}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">Sugerencias de prospectos para vacancias</h3>
        <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
          Ranking simple por cercanía de m2 objetivo y madurez comercial del prospecto.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {matchesByVacancy.length === 0 ? (
            <p className="text-sm text-[var(--sidebar-fg)]">No hay locales vacantes o no existen prospectos activos para sugerir.</p>
          ) : (
            matchesByVacancy.map(({ unit, matches }) => (
              <div
                key={unit.id}
                className={`rounded-2xl border p-4 ${focusedUnitId === unit.id ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20' : 'border-[var(--border-color)]'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{unit.code}</p>
                    <p className="text-xs text-[var(--sidebar-fg)]">{unit.label} · {unit.areaM2} m2</p>
                  </div>
                  <span className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-medium text-[var(--sidebar-fg)]">{unit.level}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {matches.length === 0 ? (
                    <p className="text-xs text-[var(--sidebar-fg)]">Sin prospectos compatibles todavía.</p>
                  ) : (
                    matches.map((match) => (
                      <div key={match.id} className="rounded-xl bg-[var(--hover-bg)] px-3 py-2">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold">{match.brandName}</p>
                            <p className="text-xs text-[var(--sidebar-fg)]">
                              {match.category} · objetivo {match.targetAreaM2} m2 · etapa {match.stage}
                            </p>
                          </div>
                          <button
                            onClick={() => createDraftFromProspect(match, [unit.id])}
                            className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold"
                          >
                            Crear borrador
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DatabaseList
          title="Proveedores"
          items={filteredSuppliers.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.category} · ${item.contactName}`,
            meta: `${item.status} · ${item.email || 'sin email'}`,
            extra: item.phone || item.notes || '',
            onEdit: () => setSupplier(item),
            onDelete: () => actions.deleteSupplier(item.id),
          }))}
        />
        <DatabaseList
          title="Prospectos"
          items={filteredProspects.map((item) => ({
            id: item.id,
            title: item.brandName,
            subtitle: `${item.category} · ${item.targetAreaM2} m2`,
            meta: `${item.stage} · ${item.contactName}`,
            extra: item.email || item.notes || '',
            onEdit: () => setProspect(item),
            onDelete: () => actions.deleteProspect(item.id),
            onConvert: () => createDraftFromProspect(item),
          }))}
        />
      </div>
    </div>
  );
}

function Metric({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      {children}
    </label>
  );
}

function DatabaseList({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    extra: string;
    onEdit: () => void;
    onDelete: () => void;
    onConvert?: () => void;
  }>;
}) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--sidebar-fg)]">Sin registros cargados.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[var(--border-color)] p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">{item.subtitle}</p>
                  <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{item.meta}</p>
                  {item.extra ? <p className="mt-1 text-xs text-[var(--sidebar-fg)]">{item.extra}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.onConvert ? (
                    <button onClick={item.onConvert} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                      Crear borrador
                    </button>
                  ) : null}
                  <button onClick={item.onEdit} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button onClick={item.onDelete} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
