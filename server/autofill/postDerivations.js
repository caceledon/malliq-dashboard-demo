/**
 * Motor de derivaciones para completar campos faltantes del autofill de contratos.
 *
 * Se ejecuta DESPUÉS del normalizador defensivo: solo rellena campos que quedaron
 * null, nunca sobreescribe valores ya aceptados con evidencia. Cada derivación
 * anota la cláusula base en `result.evidence[campo]` para que el usuario vea el
 * fundamento en la UI de revisión.
 */

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
};

// --------- Utilidades numéricas / fechas chilenas ---------

export function parseChileanNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).replace(/\s+/g, '').replace(/\$/g, '').replace(/UF/gi, '');
  if (!s) return null;
  // "1.500.000,25" → 1500000.25 · "12,5" → 12.5 · "1500000" → 1500000
  const comaDecimal = s.lastIndexOf(',');
  const puntoDecimal = s.lastIndexOf('.');
  let normalizado;
  if (comaDecimal > puntoDecimal) {
    normalizado = s.replace(/\./g, '').replace(',', '.');
  } else if (puntoDecimal > comaDecimal && s.length - puntoDecimal <= 3 && /\d{1,2}$/.test(s.slice(puntoDecimal + 1))) {
    normalizado = s.replace(/,/g, '');
  } else {
    normalizado = s.replace(/[.,]/g, '');
  }
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

export function addMonthsIso(isoDate, meses) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, d.getUTCDate()));
  // Si el día quedó desbordado (ej. 31 + 1 mes → 3 mar), retroceder al último día del mes objetivo.
  if (target.getUTCDate() !== d.getUTCDate()) {
    target.setUTCDate(0);
  }
  return target.toISOString().slice(0, 10);
}

export function subtractDaysIso(isoDate, dias = 1) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

// --------- Detectores de cláusulas ---------

const DURACION_REGEXES = [
  /(?:plazo|vigencia|duraci[oó]n|per[ií]odo)[^.;\n]{0,60}?(\d{1,3})\s*(a[nñ]os?|meses?)/i,
  /(\d{1,3})\s*(a[nñ]os?|meses?)[^.;\n]{0,60}?(?:plazo|vigencia|duraci[oó]n)/i,
  /por\s+el\s+plazo\s+de\s+(\d{1,3})\s*(a[nñ]os?|meses?)/i,
  /se\s+extender[áa]\s+por\s+(\d{1,3})\s*(a[nñ]os?|meses?)/i,
];

export function extractDurationMonths(text) {
  if (!text) return null;
  for (const rx of DURACION_REGEXES) {
    const m = text.match(rx);
    if (m) {
      const valor = Number(m[1]);
      const unidad = m[2].toLowerCase();
      const meses = unidad.startsWith('a') ? valor * 12 : valor;
      const sentence = text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + m[0].length + 40)).trim();
      return { meses, evidencia: sentence };
    }
  }
  return null;
}

const GARANTIA_MESES_REGEX =
  /(?:boleta\s+de\s+garant[ií]a|garant[ií]a|dep[oó]sito\s+en\s+garant[ií]a)[^.;\n]{0,80}?(?:equivalente|por\s+el\s+valor\s+de|igual\s+a|de)?\s*(\d{1,2}|una|dos|tres|cuatro|cinco|seis|doce)\s*(?:\([^)]*\))?\s*(?:meses|rentas?|canones|cuotas?\s+mensuales?)/i;

const PALABRAS_MESES = {
  una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

export function extractGarantiaMeses(text) {
  if (!text) return null;
  const m = text.match(GARANTIA_MESES_REGEX);
  if (!m) return null;
  const token = m[1].toLowerCase();
  const meses = PALABRAS_MESES[token] ?? Number(token);
  if (!Number.isFinite(meses) || meses <= 0 || meses > 24) return null;
  const sentence = text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + m[0].length + 40)).trim();
  return { meses, evidencia: sentence };
}

const IPC_REGEX = /reajust\w*[^.;\n]{0,80}?(?:I\.?P\.?C\.?|[ií]ndice\s+de\s+precios|variaci[oó]n\s+de\s+la\s+UF)/i;

export function extractIpcClause(text) {
  const m = text?.match(IPC_REGEX);
  if (!m) return null;
  const sentence = text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + m[0].length + 40)).trim();
  return { descripcion: 'Reajuste por IPC según cláusula', evidencia: sentence };
}

const DIA_PAGO_REGEX = /(?:pagader[ao]|pago|canon)[^.;\n]{0,40}?d[ií]a\s+(\d{1,2})\s*(?:de\s+cada\s+mes|de\s+los?\s+meses)/i;

export function extractDiaPago(text) {
  const m = text?.match(DIA_PAGO_REGEX);
  if (!m) return null;
  const dia = Number(m[1]);
  if (!dia || dia < 1 || dia > 31) return null;
  const sentence = text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + m[0].length + 40)).trim();
  return { dia, evidencia: sentence };
}

// --------- Orquestador ---------

/**
 * Aplica derivaciones sobre el resultado normalizado. No muta entradas aceptadas
 * (solo rellena nulls). Enriquece `evidence` con la cláusula base usada.
 *
 * @param {object} result  Salida de normalizeContractAutofillResult.
 * @param {string} sourceText  Texto original del contrato.
 * @param {object} [opts]  { ufActual?: number, areaM2?: number }
 * @returns {object} result enriquecido con derivaciones.
 */
export function applyPostDerivations(result, sourceText, opts = {}) {
  if (!result || typeof result !== 'object' || !sourceText) return result;
  const out = { ...result, evidence: { ...(result.evidence ?? {}) } };
  const derivations = [];
  const text = String(sourceText);

  const duracion = extractDurationMonths(text);

  // 1) endDate desde startDate + plazo
  if (!out.endDate && out.startDate && duracion) {
    const calc = addMonthsIso(out.startDate, duracion.meses);
    const termino = calc ? subtractDaysIso(calc, 1) : null;
    if (termino) {
      out.endDate = termino;
      out.evidence.endDate = out.evidence.endDate ?? duracion.evidencia;
      derivations.push({ campo: 'endDate', desde: 'startDate + plazo' });
    }
  }

  // 2) startDate desde endDate + plazo
  if (!out.startDate && out.endDate && duracion) {
    const terminoMas1 = addMonthsIso(out.endDate, 0);
    const inicio = terminoMas1 ? addMonthsIso(subtractDaysIso(out.endDate, 0), -duracion.meses) : null;
    const inicioAjustado = inicio ? addMonthsIso(inicio, 0) : null;
    if (inicioAjustado) {
      out.startDate = subtractDaysIso(addMonthsIso(inicioAjustado, 0), -1) ?? inicioAjustado;
      out.evidence.startDate = out.evidence.startDate ?? duracion.evidencia;
      derivations.push({ campo: 'startDate', desde: 'endDate - plazo' });
    }
  }

  // 3) garantiaMonto desde "N meses de renta" si hay renta fija conocida.
  if (!out.garantiaMonto) {
    const garantiaMeses = extractGarantiaMeses(text);
    if (garantiaMeses) {
      let rentaMensualClp = null;
      if (out.fixedRent && out.fixedRent > 0) {
        rentaMensualClp = out.fixedRent;
      } else if (out.baseRentUF && opts.areaM2 && opts.ufActual) {
        rentaMensualClp = Math.round(out.baseRentUF * opts.areaM2 * opts.ufActual);
      }
      if (rentaMensualClp != null) {
        out.garantiaMonto = Math.round(rentaMensualClp * garantiaMeses.meses);
        out.evidence.garantiaMonto = out.evidence.garantiaMonto ?? garantiaMeses.evidencia;
        derivations.push({ campo: 'garantiaMonto', desde: `${garantiaMeses.meses} meses × renta fija` });
      }
    }
  }

  // 4) garantiaVencimiento por defecto = endDate + 90 días (práctica común) si el contrato lo sugiere.
  if (!out.garantiaVencimiento && out.endDate) {
    const sugerenciaGarantia =
      /garant[ií]a[^.;\n]{0,120}?(?:vigente|vigencia|mantenerse|vencer)[^.;\n]{0,80}?(?:t[eé]rmino|final|fin)\s+(?:del\s+)?contrato/i;
    const m = text.match(sugerenciaGarantia);
    if (m) {
      const calc = addMonthsIso(out.endDate, 3);
      if (calc) {
        out.garantiaVencimiento = calc;
        out.evidence.garantiaVencimiento = out.evidence.garantiaVencimiento ?? m[0].trim();
        derivations.push({ campo: 'garantiaVencimiento', desde: 'endDate + 90 días (cláusula de vigencia)' });
      }
    }
  }

  // 5) escalation si no está y hay cláusula IPC.
  if (!out.escalation) {
    const ipc = extractIpcClause(text);
    if (ipc) {
      out.escalation = ipc.descripcion;
      out.evidence.escalation = out.evidence.escalation ?? ipc.evidencia;
      derivations.push({ campo: 'escalation', desde: 'cláusula IPC detectada' });
    }
  }

  // 6) fixedRent desde baseRentUF × area × UF actual, si hay datos.
  if (!out.fixedRent && out.baseRentUF && opts.areaM2 && opts.ufActual) {
    out.fixedRent = Math.round(out.baseRentUF * opts.areaM2 * opts.ufActual);
    out.evidence.fixedRent = out.evidence.fixedRent ?? `Calculado: ${out.baseRentUF} UF/m² × ${opts.areaM2} m² × UF ${opts.ufActual}`;
    derivations.push({ campo: 'fixedRent', desde: 'baseRentUF × area × UF' });
  }

  // 7) Actualizar missingFields tras las derivaciones.
  const REVIEW_FIELDS = [
    'companyName', 'storeName', 'category', 'baseRentUF', 'fixedRent', 'variableRentPct',
    'commonExpenses', 'fondoPromocion', 'escalation', 'startDate', 'endDate',
    'garantiaMonto', 'garantiaVencimiento', 'feeIngreso',
  ];
  out.missingFields = REVIEW_FIELDS.filter((f) => out[f] == null);

  if (derivations.length) {
    out.derivations = derivations;
  }

  return out;
}
