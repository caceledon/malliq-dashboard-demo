// @vitest-environment node
import { describe, expect, it } from 'vitest';
// @ts-expect-error — JS module, no .d.ts but exports are stable.
import { tagFieldEvidence, tagRentStepEvidence, buildPageTaggedEvidence, _normalize } from './pageTagging.js';

describe('pageTagging.normalize', () => {
  it('strips accents, collapses whitespace, lowercases', () => {
    expect(_normalize('Canción\n\tNiño   Año')).toBe('cancion nino ano');
  });

  it('handles empty / non-string input', () => {
    expect(_normalize(null)).toBe('');
    expect(_normalize(undefined)).toBe('');
    expect(_normalize('')).toBe('');
  });
});

describe('tagFieldEvidence', () => {
  const pages = [
    { num: 1, text: 'PARTES: La empresa ACME SpA arrienda al locatario.' },
    { num: 2, text: 'CANON: La renta mensual es de UF 60 reajustable según IPC.' },
    { num: 3, text: 'GARANTÍA: Tres rentas mensuales en boleta.' },
  ];

  it('finds the first page that contains the snippet', () => {
    const tagged = tagFieldEvidence(pages, {
      companyName: 'ACME SpA',
      fixedRent: 'renta mensual es de UF 60',
    });
    expect(tagged.companyName).toEqual({ text: 'ACME SpA', page: 1 });
    expect(tagged.fixedRent).toEqual({ text: 'renta mensual es de UF 60', page: 2 });
  });

  it('matches case- and accent-insensitively', () => {
    const tagged = tagFieldEvidence(pages, { garantia: 'GARANTIA: tres rentas' });
    expect(tagged.garantia.page).toBe(3);
  });

  it('returns the snippet without page when nothing matches', () => {
    const tagged = tagFieldEvidence(pages, { foo: 'no existe en ningún lado' });
    expect(tagged.foo).toEqual({ text: 'no existe en ningún lado' });
  });

  it('first-match wins when the snippet appears on multiple pages', () => {
    const dup = [
      { num: 1, text: 'TÍTULO: ACME SpA' },
      { num: 4, text: 'FIRMA: ACME SpA' },
    ];
    const tagged = tagFieldEvidence(dup, { companyName: 'ACME SpA' });
    expect(tagged.companyName.page).toBe(1);
  });

  it('skips empty / non-string values', () => {
    const tagged = tagFieldEvidence(pages, { a: '', b: '   ', c: null as unknown as string });
    expect(tagged).toEqual({});
  });

  it('falls back to a shorter probe when the long snippet was clipped or rewritten', () => {
    const long = 'CANON: La renta mensual es de UF 60 reajustable según IPC, con escalonamiento al cuarto año.';
    const tagged = tagFieldEvidence(pages, { fixedRent: long });
    expect(tagged.fixedRent.page).toBe(2);
  });
});

describe('tagRentStepEvidence', () => {
  it('tags each step independently', () => {
    const pages = [
      { num: 1, text: 'Plazo: cinco años desde marzo de 2025.' },
      { num: 2, text: 'Año 1: UF 50 / m². Año 2: UF 55 / m².' },
    ];
    const tagged = tagRentStepEvidence(pages, [
      { rentaFijaUfM2: 'Año 1: UF 50 / m²' },
      { rentaFijaUfM2: 'Año 2: UF 55 / m²' },
    ]);
    expect(tagged[0].rentaFijaUfM2.page).toBe(2);
    expect(tagged[1].rentaFijaUfM2.page).toBe(2);
  });

  it('handles missing input', () => {
    expect(tagRentStepEvidence([], null as unknown as [])).toEqual([]);
    expect(tagRentStepEvidence([], undefined as unknown as [])).toEqual([]);
  });
});

describe('buildPageTaggedEvidence', () => {
  it('attaches metadata (extractedAt, source) to the bundle', () => {
    const out = buildPageTaggedEvidence(
      [{ num: 1, text: 'Test page' }],
      { fields: { foo: 'Test page' }, rentSteps: [] },
      'moonshot',
    );
    expect(out.source).toBe('moonshot');
    expect(out.fields.foo.page).toBe(1);
    expect(typeof out.extractedAt).toBe('string');
    expect(out.extractedAt.length).toBeGreaterThan(0);
  });
});
