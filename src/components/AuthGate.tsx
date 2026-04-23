import { useEffect, useState, type ReactNode } from 'react';
import { KeyRound, Lock, Sparkles } from 'lucide-react';
import { getAuthToken, getAuthUser, login, register, subscribeAuthUser } from '@/lib/auth';

interface ServerAuthInfo {
  authRequired: boolean;
  authBootstrapped: boolean;
  apiBase: string;
}

type ProbeState =
  | { status: 'pending' }
  | { status: 'done'; info: ServerAuthInfo | null };

async function probeAuth(apiBase: string): Promise<ServerAuthInfo | null> {
  try {
    const response = await fetch(`${apiBase.replace(/\/+$/, '')}/health`);
    if (!response.ok) return null;
    const body = (await response.json()) as { authRequired?: boolean; authBootstrapped?: boolean };
    return {
      authRequired: Boolean(body.authRequired),
      authBootstrapped: Boolean(body.authBootstrapped),
      apiBase,
    };
  } catch {
    return null;
  }
}

/**
 * Blocks the app behind a sign-in form when the server reports that auth is
 * required and we don't have a valid session. When the server is down or
 * reports auth is not required, renders children as-is so the offline /
 * single-user mode keeps working unchanged.
 */
export function AuthGate({ apiBase, children }: { apiBase: string; children: ReactNode }) {
  const [probe, setProbe] = useState<ProbeState>({ status: 'pending' });
  const [authUser, setAuthUser] = useState(() => getAuthUser());

  useEffect(() => {
    let cancelled = false;
    probeAuth(apiBase).then((result) => {
      if (cancelled) return;
      setProbe({ status: 'done', info: result });
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    const unsubscribe = subscribeAuthUser(setAuthUser);
    return () => {
      unsubscribe();
    };
  }, []);

  if (probe.status === 'pending') {
    return <AuthSplash message="Conectando con el servidor…" />;
  }

  const info = probe.info;

  // Server unreachable or auth not required → pass through.
  if (!info || !info.authRequired) return <>{children}</>;

  // Auth required. If we already have a token, trust it and render.
  if (getAuthToken() && authUser) return <>{children}</>;

  // No session (or session just cleared by a 401): show login form.
  return <AuthForm info={info} />;
}

function AuthSplash({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--paper)',
        color: 'var(--ink-3)',
        fontFamily: 'var(--sans)',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function AuthForm({ info }: { info: ServerAuthInfo }) {
  const [mode, setMode] = useState<'login' | 'register'>(info.authBootstrapped ? 'login' : 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(info.apiBase, email, password);
      } else {
        await register(info.apiBase, { email, password, displayName: displayName || undefined });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--paper)',
        padding: 24,
      }}
    >
      <div
        className="mq-card"
        style={{
          width: 420,
          maxWidth: '100%',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            padding: '28px 28px 18px',
            textAlign: 'center',
            borderBottom: '1px solid var(--line)',
            background: 'linear-gradient(180deg, var(--umber-wash), var(--card))',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--umber)',
              color: '#fff',
              margin: '0 auto 12px',
            }}
          >
            {info.authBootstrapped ? <KeyRound size={18} /> : <Sparkles size={18} />}
          </div>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>
            MallIQ
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.02em',
            }}
          >
            {mode === 'login' ? 'Inicia sesión' : info.authBootstrapped ? 'Crear cuenta' : 'Primer usuario (admin)'}
          </h1>
          <p className="t-muted" style={{ marginTop: 6, fontSize: 13 }}>
            {mode === 'login'
              ? 'Usa tu correo corporativo para continuar.'
              : info.authBootstrapped
                ? 'Un admin existente debe autorizar este registro.'
                : 'El primer usuario queda como administrador y es el único que puede crear nuevos usuarios.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 28px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="t-eyebrow" style={{ fontSize: 10 }}>Nombre</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mq-input"
                placeholder="Tu nombre"
              />
            </label>
          ) : null}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="t-eyebrow" style={{ fontSize: 10 }}>Correo</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mq-input"
              placeholder="tú@empresa.cl"
              autoComplete="email"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="t-eyebrow" style={{ fontSize: 10 }}>Contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mq-input"
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error ? (
            <div className="chip danger" role="alert" style={{ fontSize: 12 }}>
              <span className="dot" />
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            className="mq-btn umber"
            disabled={busy}
            style={{ justifyContent: 'center', marginTop: 6 }}
          >
            <Lock size={14} />
            {busy ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div
          style={{
            padding: '10px 28px 20px',
            textAlign: 'center',
            color: 'var(--ink-3)',
            fontSize: 12,
          }}
        >
          {mode === 'login' ? (
            info.authBootstrapped ? (
              <>
                ¿Primera vez? Pide a un admin que te invite.
              </>
            ) : (
              <button
                type="button"
                className="mq-btn ghost sm"
                onClick={() => setMode('register')}
              >
                Crear el usuario admin inicial
              </button>
            )
          ) : info.authBootstrapped ? (
            <button type="button" className="mq-btn ghost sm" onClick={() => setMode('login')}>
              Ya tengo cuenta · iniciar sesión
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
