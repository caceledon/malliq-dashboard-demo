/**
 * Audit log inmutable para compliance. Graba cada mutación con diff, actor, IP.
 */
export async function recordAudit(client, {
  activoId,
  actor,
  actorIp,
  userAgent,
  accion,
  entidad,
  entidadId,
  diff,
  razon,
}) {
  await client.query(
    `INSERT INTO audit_log (activo_id, actor, actor_ip, user_agent, accion, entidad, entidad_id, diff, razon)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [activoId, actor, actorIp, userAgent, accion, entidad, entidadId, diff ? JSON.stringify(diff) : null, razon],
  );
}
