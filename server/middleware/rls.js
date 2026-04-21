import { withActivo } from '../db/postgres.js';

/**
 * Middleware: extrae activoId del header, query o subpath
 * y lo inyecta como contexto RLS en req.db (cliente transactional).
 */
export function rlsMiddleware(req, res, next) {
  const activoId =
    req.header('x-malliq-activo') ||
    req.query.activoId ||
    req.params?.activoId ||
    null;

  req.activoId = activoId;
  req.withDb = (fn) => withActivo(activoId, fn);
  next();
}
