// Track 2 — read-only tool implementations for the Asistente IA.
//
// Each tool gets the live state and returns a JSON-serializable result. Tools
// never mutate. Their schemas are exposed as OpenAI-style tool definitions so
// the chat completion can pick which to call.
import { detectSalesAnomalies } from '../anomalies.js';

function monthKey(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function diffInDays(from, to) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((to.getTime() - from.getTime()) / oneDay);
}

function unitArea(unitIds, units) {
  return unitIds.reduce((sum, id) => sum + (units.find((u) => u.id === id)?.areaM2 || 0), 0);
}

function summarizeContract(contract, units) {
  return {
    id: contract.id,
    storeName: contract.storeName,
    companyName: contract.companyName,
    category: contract.category,
    startDate: contract.startDate,
    endDate: contract.endDate,
    fixedRentClp: contract.fixedRentCurrency === 'UF' ? null : contract.fixedRent,
    fixedRentUf: contract.fixedRentCurrency === 'UF' ? contract.fixedRent : null,
    variableRentPct: contract.variableRentPct,
    areaM2: unitArea(contract.localIds, units),
    locales: contract.localIds,
    signatureStatus: contract.signatureStatus,
  };
}

function getContractsExpiringIn({ months = 6 }, state, referenceDate) {
  const today = new Date(referenceDate);
  const horizon = new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
  return state.contracts
    .filter((contract) => {
      const end = new Date(contract.endDate);
      if (Number.isNaN(end.getTime())) return false;
      return end >= today && end <= horizon;
    })
    .map((contract) => ({
      ...summarizeContract(contract, state.units),
      daysToEnd: diffInDays(today, new Date(contract.endDate)),
    }))
    .sort((l, r) => l.daysToEnd - r.daysToEnd);
}

function getTenantsWithSalesDropAbove({ percent = 20 }, state, referenceDate) {
  const refDate = new Date(referenceDate);
  const currentMonth = monthKey(refDate);
  const previousMonth = monthKey(new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1));
  const sumByContract = (month) => {
    const map = new Map();
    for (const sale of state.sales) {
      if (!sale.contractId) continue;
      if (monthKey(sale.occurredAt) !== month) continue;
      map.set(sale.contractId, (map.get(sale.contractId) || 0) + sale.grossAmount);
    }
    return map;
  };
  const cur = sumByContract(currentMonth);
  const prev = sumByContract(previousMonth);
  const out = [];
  for (const contract of state.contracts) {
    const c = cur.get(contract.id) || 0;
    const p = prev.get(contract.id) || 0;
    if (p <= 0) continue;
    const drop = ((c - p) / p) * 100;
    if (drop <= -Math.abs(percent)) {
      out.push({
        ...summarizeContract(contract, state.units),
        salesCurrent: c,
        salesPrevious: p,
        dropPct: Number(drop.toFixed(1)),
      });
    }
  }
  return out.sort((l, r) => l.dropPct - r.dropPct);
}

function getContractByStore({ storeName }, state) {
  if (!storeName) return null;
  const needle = String(storeName).trim().toLowerCase();
  if (!needle) return null;
  const match = state.contracts.find(
    (contract) =>
      contract.storeName?.toLowerCase().includes(needle) ||
      contract.companyName?.toLowerCase().includes(needle),
  );
  return match ? summarizeContract(match, state.units) : null;
}

function getOccupationCostOver({ percent = 20 }, state, referenceDate) {
  const refDate = new Date(referenceDate);
  const currentMonth = monthKey(refDate);
  const out = [];
  for (const contract of state.contracts) {
    const sales = state.sales
      .filter((s) => s.contractId === contract.id && monthKey(s.occurredAt) === currentMonth)
      .reduce((sum, s) => sum + s.grossAmount, 0);
    if (sales <= 0) continue;
    const totalCharge =
      (contract.fixedRentCurrency === 'UF' ? 0 : contract.fixedRent || 0) +
      ((contract.variableRentPct || 0) * sales) / 100 +
      (contract.commonExpensesCurrency === 'UF' ? 0 : contract.commonExpenses || 0) +
      (contract.fondoPromocionCurrency === 'UF' ? 0 : contract.fondoPromocion || 0);
    const occupancy = (totalCharge / sales) * 100;
    if (occupancy >= percent) {
      out.push({
        ...summarizeContract(contract, state.units),
        salesCurrent: sales,
        occupancyCostPct: Number(occupancy.toFixed(1)),
      });
    }
  }
  return out.sort((l, r) => r.occupancyCostPct - l.occupancyCostPct);
}

function getRankingByCategory({ category, month }, state) {
  const targetMonth = month || monthKey(new Date());
  const matches = state.contracts.filter((contract) =>
    !category || contract.category?.toLowerCase().includes(String(category).toLowerCase()),
  );
  return matches
    .map((contract) => {
      const sales = state.sales
        .filter((s) => s.contractId === contract.id && monthKey(s.occurredAt) === targetMonth)
        .reduce((sum, s) => sum + s.grossAmount, 0);
      const area = unitArea(contract.localIds, state.units);
      return {
        ...summarizeContract(contract, state.units),
        sales,
        salesPerM2: area > 0 ? Math.round(sales / area) : 0,
      };
    })
    .filter((row) => row.sales > 0)
    .sort((l, r) => r.salesPerM2 - l.salesPerM2);
}

function getDailyDigest({}, state, referenceDate) {
  const today = new Date(referenceDate);
  const anomalies = detectSalesAnomalies(state, today);
  return {
    referenceDate: today.toISOString(),
    anomalyCount: anomalies.length,
    anomalies: anomalies.slice(0, 5),
  };
}

export const ASISTENTE_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'getContractsExpiringIn',
      description: 'Lista los contratos que vencen en los próximos N meses (default 6).',
      parameters: {
        type: 'object',
        properties: {
          months: { type: 'number', description: 'Horizonte en meses', default: 6 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTenantsWithSalesDropAbove',
      description: 'Locatarios cuyas ventas cayeron al menos N% mes contra mes.',
      parameters: {
        type: 'object',
        properties: {
          percent: { type: 'number', description: 'Umbral de caída (positivo)', default: 20 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getContractByStore',
      description: 'Encuentra un contrato por nombre de tienda o razón social.',
      parameters: {
        type: 'object',
        required: ['storeName'],
        properties: { storeName: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getOccupationCostOver',
      description: 'Locatarios con costo de ocupación sobre el umbral en el mes actual.',
      parameters: {
        type: 'object',
        properties: { percent: { type: 'number', default: 20 } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRankingByCategory',
      description: 'Ranking de ventas/m² por categoría para un mes dado (YYYY-MM).',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          month: { type: 'string', description: 'YYYY-MM (default mes actual)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getDailyDigest',
      description: 'Resumen del día: anomalías de ventas detectadas y conteos.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const TOOL_IMPL = {
  getContractsExpiringIn,
  getTenantsWithSalesDropAbove,
  getContractByStore,
  getOccupationCostOver,
  getRankingByCategory,
  getDailyDigest,
};

export function executeAsistenteTool(name, args, state, referenceDate = new Date()) {
  const fn = TOOL_IMPL[name];
  if (!fn) throw new Error(`Unknown tool: ${name}`);
  return fn(args || {}, state, referenceDate);
}

export const _internals = { summarizeContract, monthKey };
