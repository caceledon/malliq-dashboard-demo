import { EventEmitter } from 'node:events';
import { getEventListener, getPool } from '../db/postgres.js';

/**
 * Bus global in-process alimentado por LISTEN/NOTIFY de Postgres.
 * Cada conexión SSE se suscribe por activoId.
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(10_000);
    this.ready = false;
  }

  async start() {
    if (this.ready) return;
    const listener = await getEventListener();
    listener.on('notification', (msg) => {
      if (msg.channel !== 'malliq_events') return;
      try {
        const payload = JSON.parse(msg.payload);
        this.emit(`activo:${payload.activoId}`, payload);
        this.emit('all', payload);
      } catch (err) {
        console.error('[eventBus] bad payload', err);
      }
    });
    this.ready = true;
  }

  subscribe(activoId, handler) {
    const channel = `activo:${activoId}`;
    this.on(channel, handler);
    return () => this.off(channel, handler);
  }
}

export const eventBus = new EventBus();

/**
 * Inserta un evento de dominio en la tabla append-only.
 * El trigger pg_notify lo broadcastea a todos los suscriptores SSE.
 */
export async function publishEvent(client, { activoId, tipo, entidad, entidadId, actor, payload, version }) {
  const { rows } = await client.query(
    `INSERT INTO eventos_dominio (activo_id, tipo, entidad, entidad_id, actor, payload, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, creado_en`,
    [activoId, tipo, entidad, entidadId, actor, JSON.stringify(payload ?? {}), version ?? 1],
  );
  return rows[0];
}

/**
 * Recupera eventos posteriores a `sinceId` (para reconexión sin pérdidas).
 */
export async function fetchEventsSince(activoId, sinceId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT id, activo_id AS "activoId", tipo, entidad, entidad_id AS "entidadId",
            actor, payload, version, creado_en AS "creadoEn"
     FROM eventos_dominio
     WHERE activo_id = $1 AND id > $2
     ORDER BY id ASC
     LIMIT 500`,
    [activoId, sinceId || 0],
  );
  return rows;
}
