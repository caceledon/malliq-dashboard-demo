import { createId, type Contract, type PosConnectionProfile, type SaleRecord, type SaleSource } from '@/lib/domain';

export interface ParsedSaleInput {
  storeLabel?: string;
  localCode?: string;
  occurredAt?: string;
  grossAmount: number;
  ticketNumber?: string;
  rawText?: string;
}

export interface ParsedSaleDraft extends ParsedSaleInput {
  id: string;
  source: SaleSource;
  importedAt: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

export function parseAmount(rawValue: string): number {
  const cleaned = rawValue.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) {
    return 0;
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }

  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return Number(normalized) || 0;
  }

  return Number(cleaned.replace(/\./g, '')) || 0;
}

export function extractDate(text: string): string | undefined {
  const isoMatch = text.match(/\b(20\d{2})[-/](0?\d|1[0-2])[-/](0?\d|[12]\d|3[01])\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const latinMatch = text.match(/\b(0?\d|[12]\d|3[01])[/. -](0?\d|1[0-2])[/. -](20\d{2})\b/);
  if (latinMatch) {
    const [, day, month, year] = latinMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return undefined;
}

export function extractLocalCode(text: string): string | undefined {
  const match = text.match(/\bL[- ]?(\d{2,4})\b/i);
  if (!match) {
    return undefined;
  }

  return `L-${match[1]}`;
}

export function extractTicketNumber(text: string): string | undefined {
  const match = text.match(/\b(?:folio|ticket|boleta|doc)\s*[:#-]?\s*(\d{3,})\b/i);
  return match?.[1];
}

function extractNamedValue(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const expression = new RegExp(`${label}\\s*[:$]?\\s*([\\d.,]+)`, 'i');
    const match = text.match(expression);
    if (match) {
      const amount = parseAmount(match[1]);
      if (amount > 0) {
        return amount;
      }
    }
  }

  return undefined;
}

export function extractAmount(text: string): number {
  const normalized = normalizeWhitespace(text);
  const namedAmount =
    extractNamedValue(normalized, ['total', 'monto', 'importe total', 'total venta', 'valor total']) ??
    extractNamedValue(normalized, ['subtotal']);

  if (namedAmount && namedAmount > 0) {
    return Math.round(namedAmount);
  }

  const matches = Array.from(normalized.matchAll(/\$?\s*([\d]{1,3}(?:[.\s][\d]{3})+|\d{4,})(?:,\d{1,2})?/g));
  const amounts = matches
    .map((match) => parseAmount(match[1]))
    .filter((value) => value > 0)
    .sort((left, right) => right - left);

  return Math.round(amounts[0] ?? 0);
}

export function parseReceiptText(text: string, source: SaleSource): ParsedSaleDraft[] {
  const blocks = text
    .split(/\n{2,}|(?:-{3,})|(?:={3,})/g)
    .map((block) => normalizeWhitespace(block))
    .filter((block) => block.length > 0);

  const now = new Date().toISOString();
  const parsed = blocks
    .map((block) => ({
      id: createId('sale'),
      source,
      importedAt: now,
      grossAmount: extractAmount(block),
      occurredAt: extractDate(block),
      localCode: extractLocalCode(block),
      ticketNumber: extractTicketNumber(block),
      rawText: block,
    }))
    .filter((item) => item.grossAmount > 0);

  if (parsed.length > 0) {
    return parsed;
  }

  const fallbackAmount = extractAmount(text);
  if (fallbackAmount === 0) {
    return [];
  }

  return [
    {
      id: createId('sale'),
      source,
      importedAt: now,
      grossAmount: fallbackAmount,
      occurredAt: extractDate(text),
      localCode: extractLocalCode(text),
      ticketNumber: extractTicketNumber(text),
      rawText: normalizeWhitespace(text),
    },
  ];
}

function parseCsvRows(raw: string): Record<string, string>[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((item) => item.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((item) => item.trim());
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  });
}

export function parsePosPayload(raw: string, profile: PosConnectionProfile): ParsedSaleDraft[] {
  const now = new Date().toISOString();
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const records =
    profile.dataFormat === 'json'
      ? JSON.parse(trimmed)
      : parseCsvRows(trimmed);
  const arrayRecords = Array.isArray(records) ? records : [records];

  return arrayRecords
    .map((record) => {
      const amount = parseAmount(String(record?.[profile.amountField] ?? '0'));
      return {
        id: createId('sale'),
        source: 'pos_connection' as const,
        importedAt: now,
        grossAmount: Math.round(amount),
        occurredAt: extractDate(String(record?.[profile.dateField] ?? '')) ?? String(record?.[profile.dateField] ?? ''),
        storeLabel: String(record?.[profile.storeField] ?? '').trim(),
        localCode: String(record?.[profile.localField] ?? '').trim(),
        rawText: JSON.stringify(record),
      };
    })
    .filter((entry) => entry.grossAmount > 0);
}

function inferContractId(localCode: string | undefined, contracts: Contract[], unitsByCode: Map<string, string>): string | undefined {
  if (!localCode) {
    return undefined;
  }

  const unitId = unitsByCode.get(localCode.toUpperCase());
  if (!unitId) {
    return undefined;
  }

  return contracts.find((contract) => contract.localIds.includes(unitId))?.id;
}

export function materializeSales(
  drafts: ParsedSaleDraft[],
  contracts: Contract[],
  unitsByCode: Map<string, string>,
): SaleRecord[] {
  return drafts.map((draft) => {
    const contractId = inferContractId(draft.localCode, contracts, unitsByCode);
    const localId = draft.localCode ? unitsByCode.get(draft.localCode.toUpperCase()) : undefined;

    return {
      id: draft.id,
      contractId,
      localIds: localId ? [localId] : [],
      storeLabel: draft.storeLabel ?? draft.localCode ?? 'Sin identificar',
      source: draft.source,
      occurredAt: draft.occurredAt
        ? draft.occurredAt.length === 10
          ? `${draft.occurredAt}T12:00:00`
          : draft.occurredAt
        : new Date().toISOString(),
      grossAmount: Math.round(draft.grossAmount),
      ticketNumber: draft.ticketNumber,
      rawText: draft.rawText,
      importReference: draft.localCode,
      importedAt: draft.importedAt,
    };
  });
}
