import { LinkIcon } from 'lucide-react';

export function LocatarioPendingBinding() {
  return (
    <div className="page-enter p-4 md:p-6">
      <div className="glass-card flex flex-col items-start gap-3 p-6">
        <div className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-950/40">
          <LinkIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold">Esperando vinculación de contrato</h1>
        <p className="text-sm text-[var(--sidebar-fg)]">
          Tu usuario aún no está vinculado a un contrato del activo. Pídele al administrador que entre a
          {' '}<strong>Configuración → Usuarios locatario</strong> y te asigne tu tienda.
        </p>
      </div>
    </div>
  );
}
