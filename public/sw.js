// Track 7 — minimal service worker shell for the locatario PWA.
//
// Strategy: cache-first for the app shell (root + manifest + favicon), and
// network-passthrough for everything else. Critical web push notifications are
// rendered via the `push` event handler.
const CACHE_NAME = 'malliq-shell-v2';
const SHELL_ASSETS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // We only handle navigations from the same origin via cache-first; API calls
  // and other resources go to the network so live data isn't served stale.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate' || SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          })
          .catch(() => cached || Response.error()),
      ),
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'MallIQ', body: '' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }
  const options = {
    body: payload.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || 'malliq-broadcast',
    data: { url: payload.url || '/#/locatario/dashboard', severity: payload.severity },
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'MallIQ', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/#/locatario/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return null;
    }),
  );
});
