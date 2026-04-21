/**
 * Prompt interpretativo para autofill de contratos de arriendo comercial chilenos.
 *
 * Objetivo vs el prompt anterior:
 *  - Autoriza DERIVACIÓN (no solo extracción literal) cuando el contrato contiene
 *    cláusulas suficientes (ej. fecha inicio + plazo → fecha término).
 *  - Expone vocabulario chileno amplio (UF/m², canon, boleta, guante, reajuste IPC,
 *    escalonado, step-up, gastos comunes, fondo de promoción).
 *  - Pide al modelo leer el contrato completo antes de redactar el JSON.
 *  - Permite evidencia indirecta: fragmento citable incluso aunque no sea la
 *    mención literal del valor numérico (ej. una cláusula con plazo en meses).
 */
export function buildRichExtractionMessages(textContent) {
  const system = [
    'Eres un analista contractual senior especializado en leasing de retail real estate en Chile.',
    'Tu tarea es LEER e INTERPRETAR el contrato completo antes de completar el JSON.',
    '',
    'Reglas generales:',
    '- Responde únicamente con JSON válido. Sin prosa, sin markdown, sin comentarios.',
    '- Moneda: CLP son pesos chilenos enteros; UF es Unidad de Fomento (decimal).',
    '- Formato chileno: 1.500.000 significa 1500000; 12,5 significa 12.5.',
    '- Fechas siempre ISO YYYY-MM-DD.',
    '',
    'Política de campos:',
    '- Si el contrato tiene el dato EXPLÍCITO, usa ese valor y cita el fragmento en "evidence".',
    '- Si el contrato tiene información suficiente para DERIVAR el dato (ejemplos abajo),',
    '  calcúlalo y cita en "evidence" la cláusula que lo justifica (ej. "plazo de 60 meses").',
    '- Si no hay base en el contrato, usa null y omite la evidencia del campo.',
    '- Nunca uses la fecha actual, el nombre del archivo o supuestos externos.',
    '',
    'Ejemplos de derivaciones aceptables:',
    '- Inicio "01-03-2025" + plazo "5 años" → término "2030-02-28". Evidence cita la cláusula de plazo.',
    '- "Renta mínima garantizada" = renta fija. Usa baseRentUF si está en UF/m², fixedRent si está en CLP totales.',
    '- "Canon equivalente al 6% de las ventas" → variableRentPct = 6.',
    '- "Garantía equivalente a tres rentas mensuales" → garantiaMonto = 3 × renta mensual en CLP si la renta está determinada.',
    '- "Reajuste según IPC" → escalation describe la cláusula textualmente.',
    '',
    'Vocabulario chileno común (tratar como equivalentes):',
    '  plazo/vigencia/duración · renta/canon/renta mínima garantizada/mínimo garantizado · ',
    '  boleta de garantía/garantía/depósito en garantía · guante/derecho de llave/fee de ingreso · ',
    '  giro/destino/uso permitido · gasto común/GGCC/gastos comunes · ',
    '  fondo de promoción/FP/publicidad colectiva · escalonado/step-up/reajuste programado.',
  ].join('\n');

  const schema = `{
  "companyName": "string | null",
  "storeName": "string | null",
  "category": "string | null",
  "baseRentUF": "number | null",
  "fixedRent": "number | null",
  "variableRentPct": "number | null",
  "commonExpenses": "number | null",
  "fondoPromocion": "number | null",
  "escalation": "string | null",
  "startDate": "YYYY-MM-DD | null",
  "endDate": "YYYY-MM-DD | null",
  "garantiaMonto": "number | null",
  "garantiaVencimiento": "YYYY-MM-DD | null",
  "feeIngreso": "number | null",
  "rentSteps": [
    {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "rentaFijaUfM2": "number",
      "evidence": {
        "startDate": "fragmento literal",
        "endDate": "fragmento literal",
        "rentaFijaUfM2": "fragmento literal"
      }
    }
  ],
  "evidence": {
    "companyName": "fragmento citable (literal o cláusula base)",
    "storeName": "...",
    "category": "...",
    "baseRentUF": "...",
    "fixedRent": "...",
    "variableRentPct": "...",
    "commonExpenses": "...",
    "fondoPromocion": "...",
    "escalation": "...",
    "startDate": "...",
    "endDate": "...",
    "garantiaMonto": "...",
    "garantiaVencimiento": "...",
    "feeIngreso": "..."
  }
}`;

  const user = [
    'Devuelve este JSON EXACTO (sin campos extra y sin omitir claves; usa null donde corresponda):',
    schema,
    '',
    'Instrucciones de trabajo:',
    '1) Lee el contrato completo mentalmente antes de empezar.',
    '2) Identifica las cláusulas de partes, plazo, renta, garantía, gastos comunes, fondo de promoción, reajuste y escalonados.',
    '3) Por cada campo del JSON evalúa: ¿está explícito? ¿está derivable de otra cláusula?',
    '4) Si un campo es derivado, la evidencia debe ser la cláusula madre usada para el cálculo.',
    '5) Para rentSteps incluye solo escalonados realmente enunciados (fechas + valor UF/m²).',
    '6) Nunca devuelvas 0 por defecto: si no sabes, null.',
    '',
    'Contrato (texto extraído del PDF):',
    '---',
    textContent.slice(0, 60000),
    '---',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
