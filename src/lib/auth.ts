const TOKEN_STORAGE_KEY = 'malliq-auth-token';
const USER_STORAGE_KEY = 'malliq-auth-user';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'member';
  createdAt: string;
  lastLoginAt?: string | null;
}

type AuthListener = (user: AuthUser | null) => void;
const listeners = new Set<AuthListener>();

function normalizeApiBase(apiBase: string): string {
  const fallback = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
  const source = (apiBase || fallback).trim();
  return source.replace(/\/+$/, '');
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown | null) {
  try {
    if (value == null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // storage may be full or disabled — ignore
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getAuthUser(): AuthUser | null {
  return readStorage<AuthUser>(USER_STORAGE_KEY);
}

export function setAuthUser(user: AuthUser | null) {
  writeStorage(USER_STORAGE_KEY, user);
  listeners.forEach((l) => l(user));
}

export function subscribeAuthUser(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(apiBase: string, email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${normalizeApiBase(apiBase)}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    let message = 'Credenciales inválidas.';
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  const payload = (await response.json()) as LoginResponse;
  setAuthToken(payload.token);
  setAuthUser(payload.user);
  return payload;
}

export async function register(
  apiBase: string,
  payload: { email: string; password: string; displayName?: string; role?: 'admin' | 'member' },
): Promise<LoginResponse> {
  const token = getAuthToken();
  const response = await fetch(`${normalizeApiBase(apiBase)}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = 'Error registrando usuario.';
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const body = (await response.json()) as LoginResponse;
  // First-boot bootstrap: sign the new admin in immediately.
  if (!getAuthToken()) {
    setAuthToken(body.token);
    setAuthUser(body.user);
  }
  return body;
}

export function logout() {
  setAuthToken(null);
  setAuthUser(null);
}

/**
 * Wraps fetch to attach the Bearer token, and clears the local session on 401
 * so the Login screen reappears rather than the app silently breaking.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && getAuthToken()) {
    // Token rejected — wipe it so the user is prompted to re-authenticate.
    setAuthToken(null);
    setAuthUser(null);
  }
  return response;
}
