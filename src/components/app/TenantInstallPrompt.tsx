// Track 7 — install + push-subscription prompt for the locatario portal.
//
// Renders only when the tenantPwa feature flag is on and the browser exposes
// a beforeinstallprompt event (Chromium) or supports Notifications. Quietly
// becomes a no-op on browsers that don't.
import { useEffect, useState } from 'react';
import { Bell, Smartphone } from 'lucide-react';
import {
  ensurePushSubscription,
  fetchVapidPublicKey,
  postSubscription,
  pushSubscriptionToPayload,
  registerLocatarioServiceWorker,
} from '@/lib/pwa';
import { resolveApiBase } from '@/lib/api';
import { useAppState } from '@/store/appState';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function TenantInstallPrompt() {
  const { state, isFeatureEnabled, authUser } = useAppState();
  const enabled = isFeatureEnabled('tenantPwa') && authUser?.role === 'locatario';
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unconfigured'>(
    'idle',
  );

  // Capture the install prompt as soon as the browser fires it.
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [enabled]);

  // Register the service worker once per session so caching kicks in even
  // before the user accepts the install prompt.
  useEffect(() => {
    if (!enabled) return;
    void registerLocatarioServiceWorker();
  }, [enabled]);

  if (!enabled) return null;

  const apiBase = state.asset?.backendUrl ?? resolveApiBase();

  const onInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const onEnablePush = async () => {
    setPushStatus('subscribing');
    const registration = await registerLocatarioServiceWorker();
    if (!registration) {
      setPushStatus('denied');
      return;
    }
    const publicKey = await fetchVapidPublicKey(apiBase);
    if (!publicKey) {
      setPushStatus('unconfigured');
      return;
    }
    const subscription = await ensurePushSubscription(registration, publicKey).catch(() => null);
    if (!subscription) {
      setPushStatus('denied');
      return;
    }
    try {
      await postSubscription(apiBase, pushSubscriptionToPayload(subscription));
      setPushStatus('subscribed');
    } catch {
      setPushStatus('denied');
    }
  };

  return (
    <section className="glass-card p-4">
      <h3 className="text-sm font-semibold">App locatario</h3>
      <p className="mt-1 text-xs text-[var(--sidebar-fg)]">
        Instala MallIQ en tu celular para abrirla como una app y recibir notificaciones del activo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!installEvent}
          onClick={onInstall}
          title={installEvent ? 'Instalar MallIQ' : 'Tu navegador instalará la app cuando ofrezca el botón.'}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Smartphone className="h-4 w-4" />
          {installEvent ? 'Instalar app' : 'Instalación disponible desde el menú del navegador'}
        </button>
        <button
          type="button"
          disabled={pushStatus === 'subscribing' || pushStatus === 'subscribed'}
          onClick={onEnablePush}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
        >
          <Bell className="h-4 w-4" />
          {pushStatus === 'subscribed'
            ? 'Notificaciones activas'
            : pushStatus === 'subscribing'
              ? 'Suscribiendo…'
              : 'Activar notificaciones'}
        </button>
      </div>
      {pushStatus === 'denied' ? (
        <p className="mt-2 text-[11px] text-[var(--danger)]">
          No se pudo activar las notificaciones. Revisa los permisos del navegador.
        </p>
      ) : null}
      {pushStatus === 'unconfigured' ? (
        <p className="mt-2 text-[11px] text-[var(--sidebar-fg)]">
          El backend aún no tiene VAPID configurado. Contacta a tu administrador del activo.
        </p>
      ) : null}
    </section>
  );
}
