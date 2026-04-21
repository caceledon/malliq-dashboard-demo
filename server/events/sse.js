import { eventBus, fetchEventsSince } from './eventBus.js';

const HEARTBEAT_MS = 25_000;

/**
 * GET /api/events/:activoId?since=<id>
 * Server-Sent Events con reconexión sin pérdidas.
 */
export function mountSse(app) {
  app.get('/api/events/:activoId', async (req, res) => {
    const { activoId } = req.params;
    if (!activoId) return res.status(400).end();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const write = (event, data, id) => {
      if (id != null) res.write(`id: ${id}\n`);
      if (event) res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    write('hello', { activoId, ts: Date.now() });

    const since = Number(req.query.since || req.header('last-event-id') || 0);
    if (since > 0) {
      try {
        const atrasados = await fetchEventsSince(activoId, since);
        for (const evt of atrasados) write('evento', evt, evt.id);
      } catch (err) {
        console.error('[sse] replay failed', err);
      }
    }

    await eventBus.start();
    const unsubscribe = eventBus.subscribe(activoId, (payload) => {
      write('evento', payload, payload.id);
    });

    const heartbeat = setInterval(() => {
      res.write(`: keepalive ${Date.now()}\n\n`);
    }, HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });
}
