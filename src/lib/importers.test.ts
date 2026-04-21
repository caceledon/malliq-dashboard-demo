import { describe, expect, it } from 'vitest';
import { materializeSales, parseAmount, parseCsvRows, type ParsedSaleDraft } from '@/lib/importers';
import type { Contract } from '@/lib/domain';

const baseContract: Contract = {
  id: 'contract-1',
  companyName: 'Marca Test SpA',
  storeName: 'Marca Test',
  category: 'Retail',
  localIds: ['unit-1'],
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  fixedRent: 1200000,
  variableRentPct: 4,
  baseRentUF: 0,
  commonExpenses: 150000,
  fondoPromocion: 0,
  salesParticipationPct: 4,
  escalation: 'IPC anual',
  conditions: '',
  signatureStatus: 'firmado',
  annexCount: 0,
  autoFillUnits: true,
  garantiaMonto: 0,
  garantiaVencimiento: '',
  feeIngreso: 0,
  rentSteps: [],
  healthPagoAlDia: true,
  healthEntregaVentas: true,
  healthNivelVenta: true,
  healthNivelRenta: true,
  healthPercepcionAdmin: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('importers', () => {
  it('parses amounts in CLP formats', () => {
    expect(parseAmount('$1.234.567')).toBe(1234567);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1234')).toBe(1234);
  });

  it('parses CSV rows with semicolon separator', () => {
    const rows = parseCsvRows('fecha;monto;tienda\n2026-04-01;450000;Marca Test');
    expect(rows).toEqual([
      {
        fecha: '2026-04-01',
        monto: '450000',
        tienda: 'Marca Test',
      },
    ]);
  });

  it('materializes sales matching local code to a contract', () => {
    const drafts: ParsedSaleDraft[] = [
      {
        id: 'sale-1',
        source: 'manual',
        importedAt: '2026-04-01T10:00:00.000Z',
        grossAmount: 450000,
        occurredAt: '2026-04-01',
        storeLabel: 'Marca Test',
        localCode: 'L-101',
        ticketNumber: '12345',
      },
    ];

    const records = materializeSales(drafts, [baseContract], new Map([['L-101', 'unit-1']]));

    expect(records).toEqual([
      expect.objectContaining({
        id: 'sale-1',
        contractId: 'contract-1',
        localIds: ['unit-1'],
        storeLabel: 'Marca Test',
        occurredAt: '2026-04-01T12:00:00',
        grossAmount: 450000,
        ticketNumber: '12345',
      }),
    ]);
  });

  it('keeps unmatched rows identifiable for manual review', () => {
    const drafts: ParsedSaleDraft[] = [
      {
        id: 'sale-2',
        source: 'manual',
        importedAt: '2026-04-01T10:00:00.000Z',
        grossAmount: 320000,
        storeLabel: 'Sin identificar',
      },
    ];

    const [record] = materializeSales(drafts, [baseContract], new Map([['L-101', 'unit-1']]));

    expect(record.contractId).toBeUndefined();
    expect(record.localIds).toEqual([]);
    expect(record.storeLabel).toBe('Sin identificar');
  });
});
