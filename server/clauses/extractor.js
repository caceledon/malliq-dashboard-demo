// Track 3 — clause classifier.
//
// Second-pass extraction over an already-ingested contract PDF. Reads the
// per-page text and asks the AI to surface six clause families that operators
// keep on a side spreadsheet today: exclusividad, co-arrendamiento, opción de
// renovación, kick-out, uso restringido y períodos de gracia.
import { buildPageTaggedEvidence } from '../autofill/pageTagging.js';

const CLAUSE_TYPES = [
  'exclusividad',
  'co_arrendamiento',
  'renovacion',
  'kick_out',
  'uso_restringido',
  'gracia',
  'otra',
];

export function buildClauseExtractionMessages(textContent) {
  const system = [
    'Eres un analista contractual senior especializado en leasing de retail real estate en Chile.',
    'Lee el contrato completo y devuelve solo cláusulas relevantes a la gestión operativa.',
    '',
    'Categorías válidas (usa esta etiqueta exacta en "type"):',
    '  exclusividad — exclusividad de categoría con radio o sin radio.',
    '  co_arrendamiento — co-tenancy / cláusulas ancla.',
    '  renovacion — derechos de renovación, condiciones y plazos.',
    '  kick_out — derecho a salida anticipada con triggers (ventas, ocupación, etc.).',
    '  uso_restringido — restricciones de uso, giro o destino.',
    '  gracia — períodos de gracia (renta, reajuste, etc.).',
    '  otra — sólo cuando ninguna de las anteriores aplica.',
    '',
    'Reglas:',
    '- Devuelve sólo JSON válido, nada más.',
    '- Si una categoría no aparece en el contrato, OMÍTELA — no inventes.',
    '- "text" es la cita literal de la cláusula (máx 600 caracteres).',
    '- "evidence" es opcional y debe ser un fragmento del contrato; el server lo mapea a página.',
  ].join('\n');

  const schema = `{
  "clauses": [
    {
      "type": "exclusividad | co_arrendamiento | renovacion | kick_out | uso_restringido | gracia | otra",
      "text": "string (máx 600 chars)",
      "evidence": "string opcional"
    }
  ]
}`;

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `${schema}\n\nTEXTO DEL CONTRATO:\n---\n${textContent}\n---`,
    },
  ];
}

export function normalizeExtractedClauses(rawPayload, pages) {
  const items = Array.isArray(rawPayload?.clauses) ? rawPayload.clauses : [];
  const evidenceFields = {};
  const out = [];
  let counter = 0;
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue;
    const type = CLAUSE_TYPES.includes(entry.type) ? entry.type : 'otra';
    const text = typeof entry.text === 'string' ? entry.text.trim().slice(0, 600) : '';
    if (!text) continue;
    counter += 1;
    const id = `clause-${counter}`;
    const evidenceSnippet = typeof entry.evidence === 'string' && entry.evidence.trim()
      ? entry.evidence.trim()
      : text;
    evidenceFields[id] = evidenceSnippet;
    out.push({ id, type, text });
  }
  const tagged = buildPageTaggedEvidence(pages || [], { fields: evidenceFields, rentSteps: [] }, 'clauses');
  return out.map((entry) => ({
    id: entry.id,
    type: entry.type,
    text: entry.text,
    evidence: tagged.fields[entry.id] || undefined,
    createdAt: new Date().toISOString(),
  }));
}

export const CLAUSE_TYPES_EXPORT = CLAUSE_TYPES;
