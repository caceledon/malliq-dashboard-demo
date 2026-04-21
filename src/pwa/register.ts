/**
 * Registra el Service Worker generado por vite-plugin-pwa.
 * Expone eventos al resto de la app: onUpdateReady, onOfflineFlushed.
 */
export type PwaEvents = {
  onUpdateReady?: (triggerReload: () => void) => void;
  onOfflineFlushed?: () => void;
};

export async function registerPwa(events: PwaEvents = {}) {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          events.onUpdateReady?.(() => {
            nuevo.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          });
        }
      });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'malliq_sync_flushed') {
        events.onOfflineFlushed?.();
      }
    });
  } catch (err) {
    console.error('[pwa] no se pudo registrar SW', err);
  }
}
