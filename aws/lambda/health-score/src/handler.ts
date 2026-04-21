import type { ScheduledHandler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

/**
 * Recalcula la salud predictiva de cada locatario con señales objetivas
 * (puntualidad, varianza de ventas, ratio venta/renta, reporte a tiempo).
 * Persiste en locatario_salud_predicho; los consumidores se actualizan vía SSE.
 */

type Factor = { codigo: string; descripcion: string; peso: number };

const sm = new SecretsManagerClient({});

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

export const handler: ScheduledHandler = async () => {
  const db = await pgClient();
  try {
    const { rows: locatarios } = await db.query(`
      SELECT l.id, l.activo_id, l.razon_social
      FROM locatarios l
    `);

    for (const loc of locatarios) {
      const features = await computeFeatures(db, loc.id, loc.activo_id);
      const puntaje = scoreFrom(features);
      const tendencia = tendenciaFrom(features.serie);
      const probDefault = probabilidadDefault(puntaje, features);
      const factores = detectarFactores(features);

      await db.query(
        `INSERT INTO locatario_salud_predicho
          (locatario_id, activo_id, puntaje, tendencia, prob_default_90d, factores_riesgo, calculado_en)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
         ON CONFLICT (locatario_id) DO UPDATE SET
           puntaje = EXCLUDED.puntaje,
           tendencia = EXCLUDED.tendencia,
           prob_default_90d = EXCLUDED.prob_default_90d,
           factores_riesgo = EXCLUDED.factores_riesgo,
           calculado_en = NOW()`,
        [loc.id, loc.activo_id, puntaje, tendencia, probDefault, JSON.stringify(factores)],
      );

      await db.query(
        `INSERT INTO eventos_dominio (activo_id, tipo, entidad, entidad_id, actor, payload)
         VALUES ($1, 'salud_actualizada', 'locatario', $2, 'lambda:health-score', $3::jsonb)`,
        [loc.activo_id, loc.id, JSON.stringify({ puntaje, tendencia, probDefault })],
      );
    }
  } finally {
    await db.end();
  }
};

type Features = {
  puntualidadPago: number;
  varianzaRel: number;
  ratioVentaRenta: number;
  reporteATiempo: number;
  serie: number[];
};

async function computeFeatures(db: Client, locatarioId: string, activoId: string): Promise<Features> {
  const { rows: contratos } = await db.query(
    `SELECT id, renta_fija_clp, fecha_inicio, fecha_termino,
            health_pago_al_dia, health_entrega_ventas, health_nivel_venta,
            health_nivel_renta, health_percepcion_admin
     FROM contratos
     WHERE locatario_id = $1 AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_termino`,
    [locatarioId],
  );
  const contrato = contratos[0];
  if (!contrato) {
    return { puntualidadPago: 0.5, varianzaRel: 1, ratioVentaRenta: 0, reporteATiempo: 0.5, serie: [] };
  }

  const { rows: ventas } = await db.query(
    `SELECT TO_CHAR(ocurrido_en, 'YYYY-MM') AS mes,
            SUM(monto_bruto) AS total,
            AVG(EXTRACT(EPOCH FROM (importado_en - ocurrido_en)) / 86400) AS dias_promedio
     FROM ventas
     WHERE contrato_id = $1 AND ocurrido_en > CURRENT_DATE - INTERVAL '12 months'
     GROUP BY 1 ORDER BY 1 ASC`,
    [contrato.id],
  );

  const serie = ventas.map(v => Number(v.total));
  const promedio = serie.length ? serie.reduce((s, v) => s + v, 0) / serie.length : 0;
  const varianza = serie.length ? Math.sqrt(serie.reduce((s, v) => s + (v - promedio) ** 2, 0) / serie.length) : 0;
  const varianzaRel = promedio > 0 ? Math.min(varianza / promedio, 2) : 1;

  const rentaFija = Number(contrato.renta_fija_clp) || 1;
  const ratioVentaRenta = serie.length ? (serie[serie.length - 1] / rentaFija) : 0;

  const diasPromedio = ventas.length ? ventas.reduce((s, v) => s + Number(v.dias_promedio ?? 10), 0) / ventas.length : 10;
  const reporteATiempo = Math.max(0, Math.min(1, 1 - (diasPromedio - 5) / 25));

  const healthFlags = [
    contrato.health_pago_al_dia,
    contrato.health_entrega_ventas,
    contrato.health_nivel_venta,
    contrato.health_nivel_renta,
    contrato.health_percepcion_admin,
  ];
  const puntualidadPago = healthFlags.filter(Boolean).length / healthFlags.length;

  return { puntualidadPago, varianzaRel, ratioVentaRenta, reporteATiempo, serie };
}

function scoreFrom(f: Features): number {
  const score =
    f.puntualidadPago * 35 +
    (1 - f.varianzaRel / 2) * 20 +
    Math.min(f.ratioVentaRenta, 10) / 10 * 25 +
    f.reporteATiempo * 20;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function tendenciaFrom(serie: number[]): 'subiendo' | 'estable' | 'bajando' {
  if (serie.length < 3) return 'estable';
  const tercio = Math.max(1, Math.floor(serie.length / 3));
  const inicio = serie.slice(0, tercio);
  const fin = serie.slice(-tercio);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const delta = (avg(fin) - avg(inicio)) / (avg(inicio) || 1);
  if (delta > 0.08) return 'subiendo';
  if (delta < -0.08) return 'bajando';
  return 'estable';
}

function probabilidadDefault(puntaje: number, f: Features): number {
  const base = (100 - puntaje) / 100;
  const ajustado = base * (1 + f.varianzaRel * 0.15);
  return Math.round(Math.max(0, Math.min(1, ajustado)) * 1000) / 1000;
}

function detectarFactores(f: Features): Factor[] {
  const out: Factor[] = [];
  if (f.varianzaRel > 0.6) out.push({ codigo: 'varianza_alta', descripcion: 'Ventas muy irregulares mes a mes', peso: 0.25 });
  if (f.ratioVentaRenta < 5) out.push({ codigo: 'ratio_bajo', descripcion: 'Ventas cubren poco la renta fija', peso: 0.35 });
  if (f.puntualidadPago < 0.6) out.push({ codigo: 'pagos_atrasados', descripcion: 'Historial de pagos con atraso', peso: 0.2 });
  if (f.reporteATiempo < 0.5) out.push({ codigo: 'sin_reportes', descripcion: 'Pocos reportes de ventas a tiempo', peso: 0.2 });
  return out;
}
