import { describe, it, expect } from 'vitest';
import {
  applyPostDerivations,
  parseChileanNumber,
  addMonthsIso,
  extractDurationMonths,
  extractGarantiaMeses,
  extractIpcClause,
  extractDiaPago,
} from './postDerivations.js';

describe('parseChileanNumber', () => {
  it('parsea millones con separador de miles', () => {
    expect(parseChileanNumber('1.500.000')).toBe(1500000);
  });
  it('parsea decimal con coma', () => {
    expect(parseChileanNumber('12,5')).toBe(12.5);
  });
  it('parsea mixto 1.500.000,25', () => {
    expect(parseChileanNumber('1.500.000,25')).toBe(1500000.25);
  });
  it('retorna null ante basura', () => {
    expect(parseChileanNumber('abc')).toBeNull();
    expect(parseChileanNumber('')).toBeNull();
    expect(parseChileanNumber(null)).toBeNull();
  });
});

describe('addMonthsIso', () => {
  it('suma meses manteniendo día', () => {
    expect(addMonthsIso('2025-03-01', 60)).toBe('2030-03-01');
  });
  it('maneja desbordamiento 31 → último día del mes', () => {
    expect(addMonthsIso('2025-01-31', 1)).toBe('2025-02-28');
  });
});

describe('extractDurationMonths', () => {
  it('detecta "plazo de 5 años"', () => {
    const r = extractDurationMonths('El presente contrato tendrá un plazo de 5 años contados desde...');
    expect(r?.meses).toBe(60);
  });
  it('detecta "vigencia de 36 meses"', () => {
    const r = extractDurationMonths('...con una vigencia de 36 meses a partir de...');
    expect(r?.meses).toBe(36);
  });
  it('detecta "por el plazo de 3 años"', () => {
    const r = extractDurationMonths('el arriendo regirá por el plazo de 3 años');
    expect(r?.meses).toBe(36);
  });
});

describe('extractGarantiaMeses', () => {
  it('detecta "garantía equivalente a tres meses de renta"', () => {
    const r = extractGarantiaMeses('El arrendatario deberá entregar una boleta de garantía equivalente a tres meses de renta mensual.');
    expect(r?.meses).toBe(3);
  });
  it('detecta "garantía de 2 rentas mensuales"', () => {
    const r = extractGarantiaMeses('Se constituirá una garantía de 2 rentas mensuales.');
    expect(r?.meses).toBe(2);
  });
});

describe('extractIpcClause', () => {
  it('detecta cláusula IPC', () => {
    const r = extractIpcClause('La renta se reajustará anualmente según la variación del IPC.');
    expect(r).not.toBeNull();
    expect(r?.descripcion).toMatch(/IPC/);
  });
});

describe('extractDiaPago', () => {
  it('detecta día de pago', () => {
    const r = extractDiaPago('El canon será pagadero el día 5 de cada mes.');
    expect(r?.dia).toBe(5);
  });
});

describe('applyPostDerivations — endDate desde plazo', () => {
  it('deriva fecha de término cuando falta', () => {
    const normalized = {
      startDate: '2025-03-01',
      endDate: null,
      fixedRent: null,
      baseRentUF: null,
      garantiaMonto: null,
      garantiaVencimiento: null,
      escalation: null,
      evidence: {},
    };
    const text = 'El contrato tendrá un plazo de 5 años desde el 01 de marzo de 2025.';
    const r = applyPostDerivations(normalized, text);
    expect(r.endDate).toBe('2030-02-28');
    expect(r.evidence.endDate).toMatch(/plazo/i);
    expect(r.derivations).toContainEqual(expect.objectContaining({ campo: 'endDate' }));
  });

  it('no sobreescribe endDate ya presente', () => {
    const normalized = {
      startDate: '2025-03-01',
      endDate: '2028-12-31',
      evidence: { endDate: 'literal del contrato' },
    };
    const text = 'plazo de 5 años';
    const r = applyPostDerivations(normalized, text);
    expect(r.endDate).toBe('2028-12-31');
    expect(r.evidence.endDate).toBe('literal del contrato');
  });
});

describe('applyPostDerivations — garantia desde meses', () => {
  it('calcula garantía cuando conoce la renta fija', () => {
    const normalized = {
      startDate: '2025-03-01',
      endDate: '2030-02-28',
      fixedRent: 2_500_000,
      baseRentUF: null,
      garantiaMonto: null,
      evidence: {},
    };
    const text = 'Se constituirá boleta de garantía equivalente a tres meses de renta mensual.';
    const r = applyPostDerivations(normalized, text);
    expect(r.garantiaMonto).toBe(7_500_000);
  });

  it('no calcula garantía sin renta conocida', () => {
    const normalized = { fixedRent: null, baseRentUF: null, garantiaMonto: null, evidence: {} };
    const text = 'boleta de garantía equivalente a tres meses';
    const r = applyPostDerivations(normalized, text);
    expect(r.garantiaMonto).toBeNull();
  });
});

describe('applyPostDerivations — escalation IPC', () => {
  it('rellena escalation con la cláusula IPC detectada', () => {
    const normalized = { escalation: null, evidence: {} };
    const text = 'La renta se reajustará anualmente según la variación del IPC.';
    const r = applyPostDerivations(normalized, text);
    expect(r.escalation).toMatch(/IPC/);
    expect(r.evidence.escalation).toMatch(/IPC/);
  });
});
