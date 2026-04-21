import { useEffect, useRef, useState } from 'react';

/**
 * Suscribe al SSE del backend para un Activo. Maneja reconexión y reproducción
 * sin pérdidas vía `since` (Last-Event-ID). Persiste el último id en localStorage.
 */
export type DomainEvent = {
  id: number;
  activoId: string;
  tipo: string;
  entidad: string;
  entidadId: string;
  payload?: unknown;
  creadoEn?: string;
};

type Status = 'connecting' | 'online' | 'offline';

export function useRealtimeEvents(activoId: string | null, onEvent: (ev: DomainEvent) => void) {
  const [status, setStatus] = useState<Status>('connecting');
  const sourceRef = useRef<EventSource | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!activoId) {
      setStatus('offline');
      return;
    }

    const key = `malliq:lastEventId:${activoId}`;
    const since = localStorage.getItem(key);

    const url = new URL(`/api/events/${activoId}`, window.location.origin);
    if (since) url.searchParams.set('since', since);

    const es = new EventSource(url.toString(), { withCredentials: true });
    sourceRef.current = es;

    es.addEventListener('open', () => setStatus('online'));
    es.addEventListener('error', () => setStatus('offline'));

    es.addEventListener('hello', () => setStatus('online'));

    es.addEventListener('evento', (raw) => {
      const message = raw as MessageEvent<string>;
      try {
        const ev = JSON.parse(message.data) as DomainEvent;
        if (message.lastEventId) localStorage.setItem(key, message.lastEventId);
        handlerRef.current(ev);
      } catch (err) {
        console.error('[sse] bad event', err);
      }
    });

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [activoId]);

  return { status };
}
