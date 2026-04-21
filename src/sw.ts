/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

cleanupOutdatedCaches();

// App shell: Vite injecta el manifest con precacheAndRoute.
precacheAndRoute(self.__WB_MANIFEST);

// Navegación offline: retorna index.html cuando falla la red.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'malliq-navigations',
      networkTimeoutSeconds: 3,
    })
  )
);

// Dashboards y listas: network-first con fallback a cache.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/dashboards/') ||
              url.pathname.startsWith('/api/locatarios/') ||
              url.pathname.startsWith('/api/contratos/'),
  new NetworkFirst({
    cacheName: 'malliq-api-reads',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 6 }),
    ],
  })
);

// Activos + contexto estable: stale-while-revalidate.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/activos'),
  new StaleWhileRevalidate({ cacheName: 'malliq-activos' })
);

// Assets estáticos (fonts, imágenes): cache-first largo.
registerRoute(
  ({ request }) => ['font', 'image', 'style'].includes(request.destination),
  new CacheFirst({
    cacheName: 'malliq-static',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// Mutaciones: Background Sync queue cuando no hay red.
const mutationsQueue = new BackgroundSyncPlugin('malliq-mutations', {
  maxRetentionTime: 24 * 60, // minutos
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
      } catch {
        await queue.unshiftRequest(entry);
        throw new Error('Sync fallido, reintentando');
      }
    }
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'malliq_sync_flushed' }));
  },
});

registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method !== 'GET',
  async ({ request }) => {
    try {
      return await fetch(request.clone());
    } catch {
      await mutationsQueue.onBackgroundSync({ queueName: 'malliq-mutations' } as any);
      throw new Error('offline_queued');
    }
  },
  'POST'
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
