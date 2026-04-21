/**
 * Esqueleto del API enterprise. Reemplaza al monolito `index.js` durante la migración.
 * Gobierna: Postgres pool con RLS, SSE real-time, upload firmado a S3, queue de autofill,
 * audit log, health checks compatibles con ECS.
 *
 * TODO migration: portar los endpoints legacy de index.js a este archivo por ruta,
 * validando que cada mutación invoque publishEvent() para que SSE propague el cambio.
 */
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import './env.js';
import { getPool, closePool } from './db/postgres.js';
import { rlsMiddleware } from './middleware/rls.js';
import { authMiddleware } from './middleware/auth.js';
import { publishEvent } from './events/eventBus.js';
import { mountSse } from './events/sse.js';
import { recordAudit } from './audit/recorder.js';

const app = express();
const s3 = new S3Client({});
const sqs = new SQSClient({});

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.use(rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.query('SELECT 1');
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

mountSse(app);

app.use(authMiddleware);
app.use(rlsMiddleware);

app.post('/api/documents/upload-url', async (req, res) => {
  const { filename, mimeType, entidad, entidadId } = req.body ?? {};
  if (!filename || !mimeType) return res.status(400).json({ error: 'missing_fields' });

  const key = `contratos/${req.activoId}/${Date.now()}-${encodeURIComponent(filename)}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.RAW_BUCKET,
      Key: key,
      ContentType: mimeType,
      Metadata: {
        activoId: req.activoId,
        actor: req.user.sub,
        entidad: entidad ?? '',
        entidadId: entidadId ?? '',
      },
    }),
    { expiresIn: 300 },
  );
  res.json({ url, key, expiresIn: 300 });
});

app.post('/api/contratos', async (req, res, next) => {
  try {
    const result = await req.withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO contratos (
           activo_id, locatario_id, fecha_inicio, fecha_termino,
           renta_fija_clp, renta_base_uf_m2, porcentaje_variable,
           gastos_comunes, fondo_promocion, garantia_monto, vencimiento_garantia,
           escalonados, condiciones, signature_status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          req.activoId,
          req.body.locatarioId,
          req.body.fechaInicio,
          req.body.fechaTermino,
          req.body.rentaFijaClp ?? 0,
          req.body.rentaBaseUfM2 ?? 0,
          req.body.porcentajeVariable ?? 0,
          req.body.gastosComunes ?? 0,
          req.body.fondoPromocion ?? 0,
          req.body.garantiaMonto ?? 0,
          req.body.vencimientoGarantia ?? null,
          JSON.stringify(req.body.escalonados ?? []),
          req.body.condiciones ?? '',
          req.body.signatureStatus ?? 'pendiente',
        ],
      );
      const contrato = rows[0];
      await publishEvent(client, {
        activoId: req.activoId,
        tipo: 'contrato_creado',
        entidad: 'contrato',
        entidadId: contrato.id,
        actor: req.user.sub,
        payload: contrato,
      });
      await recordAudit(client, {
        activoId: req.activoId,
        actor: req.user.sub,
        actorIp: req.ip,
        userAgent: req.get('user-agent'),
        accion: 'create',
        entidad: 'contrato',
        entidadId: contrato.id,
        diff: contrato,
      });
      return contrato;
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/autofill/jobs', async (req, res, next) => {
  try {
    const { s3Key, documentoId } = req.body;
    const result = await req.withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO autofill_jobs (activo_id, documento_id, s3_key, estado)
         VALUES ($1, $2, $3, 'pending') RETURNING *`,
        [req.activoId, documentoId ?? null, s3Key],
      );
      return rows[0];
    });

    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.AUTOFILL_QUEUE_URL,
      MessageBody: JSON.stringify({
        jobId: result.id,
        activoId: req.activoId,
        s3Key,
      }),
    }));

    res.status(202).json(result);
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error('[api] unhandled', err);
  res.status(500).json({ error: 'internal_error' });
});

const PORT = Number(process.env.PORT || 3001);
const server = app.listen(PORT, () => {
  console.log(`[malliq-api] listening on ${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`[malliq-api] ${signal}, closing`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
