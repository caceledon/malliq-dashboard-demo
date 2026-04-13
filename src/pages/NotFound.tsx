import { useNavigate } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center page-enter">
      <div className="mb-6 rounded-full bg-[var(--hover-bg)] p-6 dark:bg-slate-800">
        <SearchX className="h-16 w-16 text-[var(--sidebar-fg)]" strokeWidth={1.5} />
      </div>
      <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-[var(--fg)] md:text-5xl">
        404
      </h1>
      <h2 className="mb-4 text-xl font-semibold text-[var(--fg)] md:text-2xl">
        Página no encontrada
      </h2>
      <p className="mb-8 max-w-md text-[var(--sidebar-fg)]">
        Lo sentimos, la ruta a la que intentas acceder ha sido borrada, no existe o requiere permisos de los cuales no dispones en tu rol actual.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-500/30"
        >
          <Home className="h-5 w-5" />
          Ir al Inicio
        </button>
      </div>
    </div>
  );
}
