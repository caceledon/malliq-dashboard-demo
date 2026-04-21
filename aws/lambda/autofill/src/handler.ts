import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import pdf from 'pdf-parse';
import OpenAI from 'openai';
import { z } from 'zod';
import { Readable } from 'node:stream';

const s3 = new S3Client({});
const sns = new SNSClient({});
const sm = new SecretsManagerClient({});

const ContratoSchema = z.object({
  companyName: z.string().nullable().optional(),
  storeName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  baseRentUF: z.number().nullable().optional(),
  variableRentPct: z.number().nullable().optional(),
  commonExpenses: z.number().nullable().optional(),
  fondoPromocion: z.number().nullable().optional(),
  garantiaMonto: z.number().nullable().optional(),
  garantiaVencimiento: z.string().nullable().optional(),
  feeIngreso: z.number().nullable().optional(),
});

type FieldResult = {
  clave: string;
  valor: string | number | null;
  confianza: number;
  fragmento: string | null;
};

async function openaiClient(): Promise<OpenAI> {
  const secretName = process.env.OPENAI_SECRET_NAME!;
  const out = await sm.send(new GetSecretValueCommand({ SecretId: secretName }));
  const parsed = JSON.parse(out.SecretString!);
  return new OpenAI({ apiKey: parsed.apiKey, baseURL: parsed.baseURL });
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function pgClient(): Promise<Client> {
  const out = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN! }));
  const parsed = JSON.parse(out.SecretString!);
  const client = new Client({
    host: process.env.DB_PROXY_ENDPOINT!,
    port: parsed.port ?? 5432,
    database: parsed.dbname ?? 'malliq',
    user: parsed.username,
    password: parsed.password,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function extraerConLlm(openai: OpenAI, texto: string): Promise<FieldResult[]> {
  const prompt = `Eres un asistente que extrae datos estructurados de contratos de arriendo comercial chilenos en CLP y UF.
Devuelve SOLO JSON con este formato por campo:
[{"clave":"companyName","valor":"...","confianza":0-1,"fragmento":"texto citado"}, ...]

Campos requeridos: companyName, storeName, category, startDate (ISO), endDate (ISO),
baseRentUF (número), variableRentPct (número), commonExpenses (CLP número),
fondoPromocion (CLP número), garantiaMonto (CLP número), garantiaVencimiento (ISO),
feeIngreso (CLP número).

Si no encuentras un campo, usa valor: null y confianza: 0.
Texto del contrato:
---
${texto.slice(0, 18_000)}
---`;

  const resp = await openai.chat.completions.create({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Responde únicamente con JSON válido.' },
      { role: 'user', content: prompt },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? '[]';
  const parsed = JSON.parse(raw);
  const array = Array.isArray(parsed) ? parsed : Array.isArray(parsed.campos) ? parsed.campos : [];
  return array.map((item: any): FieldResult => ({
    clave: String(item.clave),
    valor: item.valor ?? null,
    confianza: Number(item.confianza ?? 0),
    fragmento: item.fragmento ?? null,
  }));
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const openai = await openaiClient();
  const db = await pgClient();

  try {
    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      const { jobId, activoId, s3Key } = extraerReferencia(body);
      if (!jobId || !activoId || !s3Key) {
        console.warn('[autofill] payload incompleto', body);
        continue;
      }

      await db.query(`UPDATE autofill_jobs SET estado = 'running' WHERE id = $1`, [jobId]);

      try {
        const obj = await s3.send(new GetObjectCommand({
          Bucket: process.env.RAW_BUCKET || inferBucket(body),
          Key: s3Key,
        }));
        const buf = await streamToBuffer(obj.Body as Readable);
        const texto = (await pdf(buf)).text;

        const campos = await extraerConLlm(openai, texto);

        await db.query(
          `UPDATE autofill_jobs
           SET estado = 'done', campos = $2, raw_text = $3, completado_en = NOW()
           WHERE id = $1`,
          [jobId, JSON.stringify(campos), texto.slice(0, 50_000)],
        );

        await db.query(
          `INSERT INTO eventos_dominio (activo_id, tipo, entidad, entidad_id, actor, payload)
           VALUES ($1, 'autofill_done', 'autofill_job', $2, 'lambda:autofill', $3)`,
          [activoId, jobId, JSON.stringify({ jobId, campos })],
        );

        if (process.env.BROADCAST_TOPIC_ARN) {
          await sns.send(new PublishCommand({
            TopicArn: process.env.BROADCAST_TOPIC_ARN,
            Message: JSON.stringify({ tipo: 'autofill_done', activoId, jobId }),
          }));
        }
      } catch (err: any) {
        console.error('[autofill] error', err);
        await db.query(
          `UPDATE autofill_jobs SET estado = 'failed', error = $2, completado_en = NOW() WHERE id = $1`,
          [jobId, String(err?.message ?? err)],
        );
      }
    }
  } finally {
    await db.end();
  }
};

function extraerReferencia(body: any): { jobId?: string; activoId?: string; s3Key?: string } {
  if (body.Records?.[0]?.s3) {
    const r = body.Records[0];
    const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, ' '));
    const parts = key.split('/');
    return {
      jobId: parts[parts.length - 1].split('-')[0],
      activoId: parts[1],
      s3Key: key,
    };
  }
  return { jobId: body.jobId, activoId: body.activoId, s3Key: body.s3Key };
}

function inferBucket(body: any): string {
  return body.Records?.[0]?.s3?.bucket?.name ?? process.env.RAW_BUCKET ?? '';
}
