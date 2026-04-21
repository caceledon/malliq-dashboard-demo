import { useNavigate } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import type { ImportLog } from '@/lib/domain';

interface RecentImportsPanelProps {
  recentImports: ImportLog[];
}

export function RecentImportsPanel({ recentImports }: RecentImportsPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold">Últimas importaciones</h3>
      <div className="mt-4 space-y-3">
        {recentImports.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <ReceiptText className="h-8 w-8 text-[var(--border-color)]" />
            <p className="text-sm text-[var(--sidebar-fg)]">Aún no hay movimientos de carga.</p>
            <button
              onClick={() => navigate('/admin/cargas')}
              className="mt-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Cargar datos
            </button>
          </div>
        ) : (
          recentImports.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--hover-bg)] p-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-1.5 ${item.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                  <ReceiptText className={`h-3.5 w-3.5 ${item.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize">{item.source.replace('_', ' ')}</p>
                  <p className="text-xs text-[var(--sidebar-fg)]">{item.note}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{item.importedCount}</p>
                <p className="text-[10px] text-[var(--sidebar-fg)]">{new Date(item.createdAt).toLocaleDateString('es-CL')}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
