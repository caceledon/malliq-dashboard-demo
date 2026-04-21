// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

let normalizeContractAutofillResult: typeof import('./index.js').normalizeContractAutofillResult;
let buildContractAutofillCompletionRequest: typeof import('./index.js').buildContractAutofillCompletionRequest;

beforeAll(async () => {
  process.env.MALLIQ_SKIP_ENV_FILE = '1';
  ({ normalizeContractAutofillResult, buildContractAutofillCompletionRequest } = await import('./index.js'));
});

describe('contract autofill normalization', () => {
  it('uses moonshot-compatible request parameters for kimi-k2.5', () => {
    const request = buildContractAutofillCompletionRequest(
      {
        provider: 'moonshot',
        apiKey: 'test-key',
        baseURL: 'https://api.moonshot.ai/v1',
        model: 'kimi-k2.5',
      },
      [{ role: 'user', content: 'hola' }],
    );

    expect(request.temperature).toBeUndefined();
    expect(request.extra_body).toEqual({
      thinking: { type: 'disabled' },
    });
  });

  it('keeps deterministic temperature for non-moonshot providers', () => {
    const request = buildContractAutofillCompletionRequest(
      {
        provider: 'openai',
        apiKey: 'test-key',
        baseURL: undefined,
        model: 'gpt-4o-mini',
      },
      [{ role: 'user', content: 'hola' }],
    );

    expect(request.temperature).toBe(0);
    expect(request.extra_body).toBeUndefined();
  });

  it('keeps only values that are explicit in the extracted document text', () => {
    const contractText = `
      CONTRATO DE ARRENDAMIENTO
      Razón social: Comercial Aurora SpA
      Nombre tienda: Aurora Kids
      Categoría: Moda infantil
      Vigencia desde el 15/03/2026 hasta el 14/03/2029.
      Renta base: 12,5 UF/m2.
      Renta variable: 4,5%.
      Gastos comunes: $180.000.
      Fondo de promoción mensual: $45.000.
      Garantía: $3.000.000 con vencimiento 14/03/2029.
      Fee de ingreso: $500.000.
      Reajuste: IPC anual.
      Escalonado adicional desde 15/03/2027 hasta 14/03/2028 con 13,5 UF/m2.
    `;

    const result = normalizeContractAutofillResult({
      companyName: 'Comercial Aurora SpA',
      storeName: 'Aurora Kids',
      category: 'Moda infantil',
      baseRentUF: 12.5,
      fixedRent: 1250000,
      variableRentPct: 4.5,
      commonExpenses: 180000,
      fondoPromocion: 45000,
      escalation: 'IPC anual',
      startDate: '2026-03-15',
      endDate: '2029-03-14',
      garantiaMonto: 3000000,
      garantiaVencimiento: '2029-03-14',
      feeIngreso: 500000,
      rentSteps: [
        {
          startDate: '2027-03-15',
          endDate: '2028-03-14',
          rentaFijaUfM2: 13.5,
        },
      ],
    }, contractText, 'openai');

    expect(result.companyName).toBe('Comercial Aurora SpA');
    expect(result.storeName).toBe('Aurora Kids');
    expect(result.category).toBe('Moda infantil');
    expect(result.baseRentUF).toBe(12.5);
    expect(result.fixedRent).toBeNull();
    expect(result.variableRentPct).toBe(4.5);
    expect(result.commonExpenses).toBe(180000);
    expect(result.fondoPromocion).toBe(45000);
    expect(result.escalation).toBe('IPC anual');
    expect(result.startDate).toBe('2026-03-15');
    expect(result.endDate).toBe('2029-03-14');
    expect(result.garantiaMonto).toBe(3000000);
    expect(result.garantiaVencimiento).toBe('2029-03-14');
    expect(result.feeIngreso).toBe(500000);
    expect(result.rentSteps).toHaveLength(1);
    expect(result.missingFields).toContain('fixedRent');
    expect(result.missingFields).not.toContain('companyName');
    expect(result.missingFields).not.toContain('startDate');
    expect(result.evidence).toMatchObject({
      companyName: 'Comercial Aurora SpA',
      storeName: 'Aurora Kids',
      category: 'Moda infantil',
    });
    expect(result.rentSteps[0]).toMatchObject({
      startDate: '2027-03-15',
      endDate: '2028-03-14',
      rentaFijaUfM2: 13.5,
      evidence: {
        startDate: '15/03/2027',
        endDate: '14/03/2028',
        rentaFijaUfM2: '13,5 UF/m2',
      },
    });
  });

  it('accepts semantically mapped fields when explicit evidence is provided', () => {
    const contractText = `
      La vigencia del presente arrendamiento será desde el 15 de marzo de 2026 y hasta el 14 de marzo de 2029.
      El canon mensual mínimo garantizado asciende a 12,5 UF por m2.
      La renta variable será de un 4,5% sobre ventas.
      Los gastos comunes ordinarios ascienden a $180.000 mensuales.
      Se exige boleta bancaria en garantía por la suma de $3.000.000, con vencimiento al 14 de marzo de 2029.
      El uso permitido del local será la venta de vestuario infantil y accesorios.
      La renta se reajustará anualmente conforme a la variación del IPC.
    `;

    const result = normalizeContractAutofillResult({
      companyName: 'Comercial Aurora SpA',
      storeName: 'Aurora Kids',
      category: 'Moda infantil',
      baseRentUF: 12.5,
      variableRentPct: 4.5,
      commonExpenses: 180000,
      garantiaMonto: 3000000,
      garantiaVencimiento: '2029-03-14',
      startDate: '2026-03-15',
      endDate: '2029-03-14',
      escalation: 'IPC anual',
      evidence: {
        category: 'uso permitido del local será la venta de vestuario infantil y accesorios',
        baseRentUF: 'canon mensual mínimo garantizado asciende a 12,5 UF por m2',
        variableRentPct: 'renta variable será de un 4,5% sobre ventas',
        commonExpenses: 'gastos comunes ordinarios ascienden a $180.000 mensuales',
        garantiaMonto: 'boleta bancaria en garantía por la suma de $3.000.000',
        garantiaVencimiento: 'vencimiento al 14 de marzo de 2029',
        startDate: 'desde el 15 de marzo de 2026',
        endDate: 'hasta el 14 de marzo de 2029',
        escalation: 'La renta se reajustará anualmente conforme a la variación del IPC',
      },
    }, contractText, 'moonshot');

    expect(result.category).toBe('Moda infantil');
    expect(result.baseRentUF).toBe(12.5);
    expect(result.variableRentPct).toBe(4.5);
    expect(result.commonExpenses).toBe(180000);
    expect(result.garantiaMonto).toBe(3000000);
    expect(result.garantiaVencimiento).toBe('2029-03-14');
    expect(result.startDate).toBe('2026-03-15');
    expect(result.endDate).toBe('2029-03-14');
    expect(result.escalation).toBe('IPC anual');
    expect(result.evidence).toMatchObject({
      category: 'uso permitido del local será la venta de vestuario infantil y accesorios',
      baseRentUF: 'canon mensual mínimo garantizado asciende a 12,5 UF por m2',
      variableRentPct: 'renta variable será de un 4,5% sobre ventas',
      garantiaMonto: 'boleta bancaria en garantía por la suma de $3.000.000',
    });
  });

  it('remaps minimum guaranteed rent in UF/m2 to baseRentUF even if the model mislabels it as fixedRent', () => {
    const contractText = `
      El canon mínimo garantizado mensual será de 12,5 UF/m2 para el local arrendado.
    `;

    const result = normalizeContractAutofillResult({
      fixedRent: 12.5,
      evidence: {
        fixedRent: 'canon mínimo garantizado mensual será de 12,5 UF/m2',
      },
    }, contractText, 'moonshot');

    expect(result.baseRentUF).toBe(12.5);
    expect(result.fixedRent).toBeNull();
    expect(result.evidence).toMatchObject({
      baseRentUF: 'canon mínimo garantizado mensual será de 12,5 UF/m2',
    });
  });

  it('derives endDate from explicit duration clauses when startDate is present', () => {
    const contractText = `
      La vigencia del presente contrato será por un plazo de 36 meses contados desde el 15 de marzo de 2026.
    `;

    const result = normalizeContractAutofillResult({
      startDate: '2026-03-15',
      evidence: {
        startDate: '15 de marzo de 2026',
      },
    }, contractText, 'moonshot');

    expect(result.startDate).toBe('2026-03-15');
    expect(result.endDate).toBe('2029-03-14');
    expect(result.evidence).toMatchObject({
      startDate: '15 de marzo de 2026',
      endDate: 'vigencia del presente contrato será por un plazo de 36 meses',
    });
  });

  it('drops invented or unsupported values', () => {
    const contractText = 'Contrato sin fechas de vigencia ni garantías explícitas.';

    const result = normalizeContractAutofillResult({
      companyName: 'Marca Inventada',
      startDate: '2026-04-17',
      endDate: '2029-04-17',
      garantiaMonto: 1000000,
      garantiaVencimiento: '2029-04-17',
      variableRentPct: 7,
    }, contractText, 'openai');

    expect(result.companyName).toBeNull();
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.garantiaMonto).toBeNull();
    expect(result.garantiaVencimiento).toBeNull();
    expect(result.variableRentPct).toBeNull();
    expect(result.missingFields).toEqual(expect.arrayContaining([
      'companyName',
      'startDate',
      'endDate',
      'garantiaMonto',
      'garantiaVencimiento',
      'variableRentPct',
    ]));
  });
});
