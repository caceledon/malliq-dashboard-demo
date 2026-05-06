// Track 7 — service worker registration + push subscription helpers.
//
// Registration is gated on the runtime: `tenantPwa` flag must be on, and we
// only register inside the locatario portal (the SW is harmless on /admin
// but registering it from /admin would be a surprise side-effect).
import { authFetch } from '@/lib/auth';
import { resolveApiBase } from '@/lib/api';

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function registerLocatarioServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    if (typeof console !== 'undefined') console.warn('SW registration failed', error);
    return null;
  }
}

export async function unregisterLocatarioServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSubscriptionToPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint || '',
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
  };
}

export async function fetchVapidPublicKey(apiBase: string): Promise<string | null> {
  try {
    const response = await authFetch(`${resolveApiBase(apiBase)}/notifications/push/vapid-public`);
    if (!response.ok) return null;
    const payload = await response.json();
    const key = typeof payload.publicKey === 'string' ? payload.publicKey.trim() : '';
    return key || null;
  } catch {
    return null;
  }
}

export async function ensurePushSubscription(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  if (!('PushManager' in window)) return null;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  if (Notification.permission === 'denied') return null;
  if (Notification.permission === 'default') {
    const granted = await Notification.requestPermission();
    if (granted !== 'granted') return null;
  }
  // PushManager's typings expect a BufferSource backed by ArrayBuffer, not the
  // generic ArrayBufferLike that Uint8Array can produce. Slice into a fresh
  // ArrayBuffer so TS is satisfied and the runtime contract holds.
  const bytes = urlBase64ToUint8Array(vapidPublicKey);
  const applicationServerKey = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

export async function postSubscription(apiBase: string, payload: PushSubscriptionPayload): Promise<void> {
  await authFetch(`${resolveApiBase(apiBase)}/notifications/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteSubscription(apiBase: string, endpoint: string): Promise<void> {
  await authFetch(`${resolveApiBase(apiBase)}/notifications/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}
