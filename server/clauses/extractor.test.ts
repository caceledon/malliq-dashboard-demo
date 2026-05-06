// @vitest-environment node
import { describe, expect, it } from 'vitest';
// @ts-expect-error JS module
import { normalizeExtractedClauses, CLAUSE_TYPES_EXPORT } from './extractor.js';

const pages = [
  { num: 1, text: 'Cláusula primera. ARRIENDO. Las partes…' },
  { num: 2, text: 'Cláusula sexta. EXCLUSIVIDAD. Se otorga exclusividad de categoría café en un radio de 200 metros.' },
  { num: 3, text: 'Cláusula octava. RENOVACIÓN. El locatario podrá renovar por tres años con aviso 90 días.' },
];

describe('normalizeExtractedClauses', () => {
  it('clamps unknown types to "otra" and tags the page from evidence', () => {
    const out = normalizeExtractedClauses(
      {
        clauses: [
          {
            type: 'exclusividad',
            text: 'Exclusividad de categoría café radio 200 m.',
            evidence: 'EXCLUSIVIDAD. Se otorga exclusividad de categoría café en un radio de 200 metros.',
          },
          {
            type: 'foo_bar', // unknown → coerced to "otra"
            text: 'Otra cosa relevante',
            evidence: 'Cláusula primera. ARRIENDO. Las partes',
          },
          { text: '', type: 'renovacion' }, // empty text → dropped
        ],
      },
      pages,
    );
    expect(out).toHaveLength(2);
    expect(out[0].type).toBe('exclusividad');
    expect(out[0].evidence?.page).toBe(2);
    expect(out[1].type).toBe('otra');
    expect(out[1].evidence?.page).toBe(1);
  });

  it('returns empty when payload is malformed', () => {
    expect(normalizeExtractedClauses({}, pages)).toEqual([]);
    expect(normalizeExtractedClauses({ clauses: 'no' as unknown as [] }, pages)).toEqual([]);
  });

  it('exposes the canonical type list', () => {
    expect(CLAUSE_TYPES_EXPORT).toEqual([
      'exclusividad',
      'co_arrendamiento',
      'renovacion',
      'kick_out',
      'uso_restringido',
      'gracia',
      'otra',
    ]);
  });
});
