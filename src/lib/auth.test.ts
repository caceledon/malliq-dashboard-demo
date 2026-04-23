import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authFetch,
  getAuthToken,
  getAuthUser,
  login,
  logout,
  setAuthToken,
  setAuthUser,
  subscribeAuthUser,
} from './auth';

const API_BASE = '/api';

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('auth token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips the token through localStorage', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('abc.def.ghi');
    expect(getAuthToken()).toBe('abc.def.ghi');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });

  it('round-trips the user and notifies subscribers', () => {
    expect(getAuthUser()).toBeNull();
    const user = {
      id: 'u_1',
      email: 'a@b.c',
      displayName: null,
      role: 'admin' as const,
      createdAt: '2026-04-22T00:00:00Z',
    };
    const spy = vi.fn();
    const unsubscribe = subscribeAuthUser(spy);
    setAuthUser(user);
    expect(getAuthUser()).toEqual(user);
    expect(spy).toHaveBeenCalledWith(user);

    setAuthUser(null);
    expect(getAuthUser()).toBeNull();
    expect(spy).toHaveBeenLastCalledWith(null);

    unsubscribe();
    setAuthUser(user);
    // No further call after unsubscribe.
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('login', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stores the token + user on success', async () => {
    const user = {
      id: 'u_1',
      email: 'a@b.c',
      displayName: 'Ana',
      role: 'admin' as const,
      createdAt: '2026-04-22T00:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ token: 'tok', user })));

    const result = await login(API_BASE, 'a@b.c', 'secret123');
    expect(result.token).toBe('tok');
    expect(getAuthToken()).toBe('tok');
    expect(getAuthUser()).toEqual(user);
  });

  it('surfaces the server error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Credenciales inválidas.' }, { status: 401 })),
    );
    await expect(login(API_BASE, 'a@b.c', 'wrong')).rejects.toThrow('Credenciales inválidas.');
    expect(getAuthToken()).toBeNull();
  });
});

describe('logout', () => {
  it('clears token and user', () => {
    setAuthToken('tok');
    setAuthUser({
      id: 'u', email: 'a@b.c', displayName: null, role: 'member', createdAt: '2026-01-01',
    });
    logout();
    expect(getAuthToken()).toBeNull();
    expect(getAuthUser()).toBeNull();
  });
});

describe('authFetch', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('attaches Bearer token when one is present', async () => {
    setAuthToken('my-token');
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchSpy);

    await authFetch('/api/archive');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('does not attach a header when no token is stored', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchSpy);

    await authFetch('/api/health');

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('wipes the session on 401 so the gate reappears', async () => {
    setAuthToken('stale');
    setAuthUser({
      id: 'u_1',
      email: 'a@b.c',
      displayName: null,
      role: 'admin',
      createdAt: '2026-01-01',
    });
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'Token inválido' }, { status: 401 }));
    vi.stubGlobal('fetch', fetchSpy);

    const response = await authFetch('/api/archive');

    expect(response.status).toBe(401);
    expect(getAuthToken()).toBeNull();
    expect(getAuthUser()).toBeNull();
  });

  it('leaves the session alone on non-401 errors', async () => {
    setAuthToken('ok');
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'server error' }, { status: 500 }));
    vi.stubGlobal('fetch', fetchSpy);

    const response = await authFetch('/api/archive');

    expect(response.status).toBe(500);
    expect(getAuthToken()).toBe('ok');
  });
});
