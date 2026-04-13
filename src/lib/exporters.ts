import { getContractDisplayValues, getContractLifecycle, monthKey, type AppState } from '@/lib/domain';

function escapeCsv(value: string | number | undefined): string {
  const normalized = String(value ?? '');
  if (/[",;\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function rowsToCsv(rows: Array<Record<string, string | number | undefined>>): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ].join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function exportContractsCsv(state: AppState): string {
  return rowsToCsv(
    state.contracts.map((contract) => {
      const display = getContractDisplayValues(contract);
      return {
        contract_id: contract.id,
        razon_social: display.companyName,
        tienda_visible: display.storeName,
        categoria: display.category,
        locales: contract.localIds
          .map((unitId) => state.units.find((unit) => unit.id === unitId)?.code ?? unitId)
          .join(' | '),
        inicio: contract.startDate,
        termino: contract.endDate,
        estado_contrato: getContractLifecycle(contract),
        estado_firma: contract.signatureStatus,
        renta_fija: contract.fixedRent,
        renta_variable_pct: contract.variableRentPct,
        base_uf: contract.baseRentUF,
        gastos_comunes: contract.commonExpenses,
        anexos: contract.annexCount,
        reajuste: contract.escalation,
      };
    }),
  );
}

export function exportSalesCsv(state: AppState): string {
  return exportFilteredSalesCsv(state.sales, state);
}

export function exportFilteredSalesCsv(sales: AppState['sales'], state: AppState): string {
  return rowsToCsv(
    sales.map((sale) => ({
      sale_id: sale.id,
      occurred_at: sale.occurredAt,
      month: monthKey(sale.occurredAt),
      store_label: sale.storeLabel,
      contract_id: sale.contractId,
      locales: sale.localIds
        .map((unitId) => state.units.find((unit) => unit.id === unitId)?.code ?? unitId)
        .join(' | '),
      source: sale.source,
      ticket: sale.ticketNumber,
      amount_gross: sale.grossAmount,
      import_reference: sale.importReference,
      imported_at: sale.importedAt,
    })),
  );
}

export function exportPlanningCsv(state: AppState): string {
  return rowsToCsv(
    state.planning.map((entry) => ({
      planning_id: entry.id,
      type: entry.type,
      month: entry.month,
      sales_amount: entry.salesAmount,
      rent_amount: entry.rentAmount,
      generated: entry.generated ? 'si' : 'no',
      contract_id: entry.contractId,
      note: entry.note,
    })),
  );
}

export function exportSuppliersCsv(state: AppState): string {
  return rowsToCsv(
    state.suppliers.map((supplier) => ({
      supplier_id: supplier.id,
      name: supplier.name,
      category: supplier.category,
      contact_name: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      status: supplier.status,
      notes: supplier.notes,
    })),
  );
}

export function exportProspectsCsv(state: AppState): string {
  return rowsToCsv(
    state.prospects.map((prospect) => ({
      prospect_id: prospect.id,
      brand_name: prospect.brandName,
      category: prospect.category,
      target_area_m2: prospect.targetAreaM2,
      stage: prospect.stage,
      contact_name: prospect.contactName,
      email: prospect.email,
      phone: prospect.phone,
      notes: prospect.notes,
    })),
  );
}
