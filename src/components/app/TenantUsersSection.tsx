import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Upload, UserPlus } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useToast } from '@/components/Toast';
import { authFetch, register } from '@/lib/auth';

interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'member' | 'locatario';
  createdAt: string;
  lastLoginAt?: string | null;
  tenantContractId?: string | null;
  assetId?: string | null;
}

const ROLE_LABEL: Record<TenantUser['role'], string> = {
  admin: 'Admin',
  member: 'Miembro',
  locatario: 'Locatario',
};

// Minimal RFC-4180-ish CSV parser: handles quoted fields with commas and
// embedded "" escapes. Returns rows of cells (no trimming).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, '\n');
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      // Skip blank lines.
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

export function TenantUsersSection() {
  const { state, activeAssetId } = useAppState();
  const { toast } = useToast();
  const [users, setUsers] = useState<TenantUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [contractId, setContractId] = useState('');

  // bulk-import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{ created: number; skipped: { row: number; reason: string }[] } | null>(null);

  const apiBase = state.asset?.backendUrl ?? '/api';

  const loadUsers = async () => {
    try {
      const response = await authFetch(`${apiBase.replace(/\/+$/, '')}/auth/users`);
      if (response.status === 403) {
        setLoadError('Solo un admin puede listar usuarios.');
        setUsers([]);
        return;
      }
      if (!response.ok) {
        setLoadError(`Error ${response.status} al listar usuarios.`);
        setUsers([]);
        return;
      }
      const body = (await response.json()) as { users: TenantUser[] };
      setUsers(body.users);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo conectar al backend.');
      setUsers([]);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const createTenantUser = async () => {
    if (!email.trim() || password.length < 8 || !contractId) {
      toast('warning', 'Datos incompletos', 'Email, contraseña (≥ 8) y contrato son obligatorios.');
      return;
    }
    setBusy(true);
    try {
      await register(apiBase, {
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
        role: 'locatario',
        tenantContractId: contractId,
        assetId: activeAssetId ?? null,
      });
      toast('success', 'Usuario locatario creado', `${email} vinculado al contrato.`);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setContractId('');
      await loadUsers();
    } catch (error) {
      toast('error', 'No se pudo crear', error instanceof Error ? error.message : 'desconocido');
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setBulkSummary(null);
    const skipped: { row: number; reason: string }[] = [];
    let created = 0;
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast('warning', 'CSV vacío', 'No se encontraron filas.');
        return;
      }
      // Header detection: if first row contains "email" or "correo", treat as headers.
      const first = rows[0].map((c) => c.toLowerCase());
      const hasHeader = first.some((c) => c === 'email' || c === 'correo');
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const headers = hasHeader ? first : ['email', 'password', 'displayname', 'contractid'];
      const idx = (name: string) => headers.indexOf(name);
      const emailIdx = Math.max(idx('email'), idx('correo'));
      const passwordIdx = Math.max(idx('password'), idx('contraseña'), idx('contrasena'));
      const nameIdx = Math.max(idx('displayname'), idx('nombre'));
      const contractIdx = Math.max(idx('contractid'), idx('contrato'));

      for (let i = 0; i < dataRows.length; i += 1) {
        const row = dataRows[i];
        const lineNumber = hasHeader ? i + 2 : i + 1;
        const cells = row.map((c) => c.trim());
        const rowEmail = emailIdx >= 0 ? cells[emailIdx] : cells[0];
        const rowPassword = passwordIdx >= 0 ? cells[passwordIdx] : cells[1];
        const rowName = nameIdx >= 0 ? cells[nameIdx] : cells[2];
        const rowContract = contractIdx >= 0 ? cells[contractIdx] : cells[3];
        if (!rowEmail || !rowPassword || !rowContract) {
          skipped.push({ row: lineNumber, reason: 'email, password y contractId son obligatorios.' });
          continue;
        }
        if (rowPassword.length < 8) {
          skipped.push({ row: lineNumber, reason: 'password con menos de 8 caracteres.' });
          continue;
        }
        if (!state.contracts.some((c) => c.id === rowContract)) {
          skipped.push({ row: lineNumber, reason: `contrato "${rowContract}" no existe en el activo actual.` });
          continue;
        }
        try {
          await register(apiBase, {
            email: rowEmail,
            password: rowPassword,
            displayName: rowName || undefined,
            role: 'locatario',
            tenantContractId: rowContract,
            assetId: activeAssetId ?? null,
          });
          created += 1;
        } catch (error) {
          skipped.push({ row: lineNumber, reason: error instanceof Error ? error.message : 'error desconocido' });
        }
      }
      setBulkSummary({ created, skipped });
      const message = `Creados: ${created}. Omitidos: ${skipped.length}.`;
      toast(skipped.length === 0 ? 'success' : 'warning', 'Importación CSV', message);
      if (created > 0) {
        await loadUsers();
      }
    } catch (error) {
      toast('error', 'Importación falló', error instanceof Error ? error.message : 'desconocido');
    } finally {
      setBusy(false);
    }
  };

  const updateBinding = async (userId: string, nextContractId: string | null) => {
    try {
      const response = await authFetch(`${apiBase.replace(/\/+$/, '')}/auth/users/${userId}/tenant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantContractId: nextContractId, assetId: activeAssetId ?? null }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      toast('success', 'Vínculo actualizado', nextContractId ? 'Usuario vinculado al contrato seleccionado.' : 'Vínculo retirado.');
      await loadUsers();
    } catch (error) {
      toast('error', 'No se pudo actualizar', error instanceof Error ? error.message : 'desconocido');
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold">Usuarios locatario</h3>
      </div>
      <p className="text-xs text-[var(--sidebar-fg)]">
        Crea cuentas con rol "locatario" vinculadas a un contrato. Cuando esos usuarios entren a MallIQ solo verán su propio
        portal de locatario.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Correo</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-field"
            placeholder="cliente@empresa.cl"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Nombre</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="input-field"
            placeholder="Opcional"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-field"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">Contrato</span>
          <select
            value={contractId}
            onChange={(event) => setContractId(event.target.value)}
            className="input-field"
          >
            <option value="">Selecciona contrato</option>
            {state.contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.storeName} · {contract.companyName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={createTenantUser}
          disabled={busy}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Creando…' : 'Crear locatario'}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          title="CSV con columnas: email, password, displayName, contractId"
        >
          <Upload className="h-4 w-4" />
          Importar CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={importCsv}
        />
        <span className="text-xs text-[var(--sidebar-fg)]">
          Columnas: <code>email,password,displayName,contractId</code>
        </span>
      </div>

      {bulkSummary ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-xs">
          <p className="font-semibold">
            Creados: {bulkSummary.created} · Omitidos: {bulkSummary.skipped.length}
          </p>
          {bulkSummary.skipped.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[var(--sidebar-fg)]">
              {bulkSummary.skipped.slice(0, 8).map((s) => (
                <li key={s.row}>
                  Fila {s.row}: {s.reason}
                </li>
              ))}
              {bulkSummary.skipped.length > 8 ? (
                <li>… {bulkSummary.skipped.length - 8} fila(s) más con error.</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Cuentas existentes</p>
        {loadError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            {loadError}
          </div>
        ) : null}
        {users === null ? (
          <p className="text-xs text-[var(--sidebar-fg)]">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-[var(--sidebar-fg)]">No hay usuarios registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
            <table className="w-full min-w-[720px]">
              <thead className="bg-[var(--hover-bg)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Usuario</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Rol</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Contrato vinculado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Cambiar vínculo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const linked = state.contracts.find((contract) => contract.id === user.tenantContractId);
                  return (
                    <tr key={user.id} className="border-t border-[var(--border-color)]">
                      <td className="px-3 py-2 text-xs">
                        <div className="font-semibold">{user.displayName ?? user.email}</div>
                        <div className="text-[11px] text-[var(--sidebar-fg)]">{user.email}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">{ROLE_LABEL[user.role]}</td>
                      <td className="px-3 py-2 text-xs">
                        {linked ? `${linked.storeName} · ${linked.companyName}` : user.tenantContractId ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={user.tenantContractId ?? ''}
                          onChange={(event) => updateBinding(user.id, event.target.value || null)}
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-2 py-1 text-xs"
                          disabled={user.role === 'admin'}
                        >
                          <option value="">Sin vínculo</option>
                          {state.contracts.map((contract) => (
                            <option key={contract.id} value={contract.id}>
                              {contract.storeName}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
