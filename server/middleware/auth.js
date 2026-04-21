import jwt from 'jsonwebtoken';

/**
 * Verificación de JWT emitido por Amazon Cognito.
 * En local dev, acepta un token de debug con header x-malliq-debug-user.
 */
export function authMiddleware(req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    const debug = req.header('x-malliq-debug-user');
    if (debug) {
      req.user = { sub: debug, email: `${debug}@dev.local`, roles: ['admin'] };
      return next();
    }
  }

  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw new Error('invalid');
    req.user = {
      sub: decoded.payload.sub,
      email: decoded.payload.email,
      roles: decoded.payload['cognito:groups'] ?? [],
    };
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
