// Track 12 v1 — local-only what-if calculator. Pure function over a contract
// snapshot so the editor can show "what would happen if ..." without
// persistence. v1 supports three levers:
//   - Renta fija mensual: rent shifts (UF or CLP).
//   - Renta variable: % de ventas.
//   - Ventas proyectadas mensuales.
// Returns the same shape as ContractCommercialSnapshot so the UI can reuse
// the existing tile components.
import {
  buildContractCommercialSnapshot,
  type Contract,
  type ContractCommercialSnapshot,
  type CurrencyTag,
  type UfLookup,
} from '@/lib/domain';

export interface ScenarioInput {
  fixedRent: number;
  fixedRentCurrency: CurrencyTag;
  variableRentPct: number;
  monthlySales: number;
}

export interface ScenarioResult {
  baseline: ContractCommercialSnapshot;
  scenario: ContractCommercialSnapshot;
  delta: {
    rentTotal: number;
    totalOccupancyCost: number;
    costoOcupacionPct: number;
  };
  rentTotalChangePct: number;
  occupancyChangePoints: number;
}

export function buildScenarioInputFromContract(
  contract: Pick<Contract, 'fixedRent' | 'fixedRentCurrency' | 'variableRentPct'>,
  monthlySales: number,
): ScenarioInput {
  return {
    fixedRent: contract.fixedRent || 0,
    fixedRentCurrency: contract.fixedRentCurrency ?? 'CLP',
    variableRentPct: contract.variableRentPct || 0,
    monthlySales,
  };
}

export function evaluateScenario(
  contract: Pick<
    Contract,
    | 'baseRentUF'
    | 'rentSteps'
    | 'fixedRent'
    | 'variableRentPct'
    | 'commonExpenses'
    | 'fondoPromocion'
    | 'fixedRentCurrency'
    | 'commonExpensesCurrency'
    | 'fondoPromocionCurrency'
  >,
  baseline: ScenarioInput,
  scenario: ScenarioInput,
  options: {
    referenceDate?: Date | string;
    getUfFor?: UfLookup | number;
  } = {},
): ScenarioResult {
  const referenceDate = options.referenceDate ?? new Date();
  const getUfFor = options.getUfFor ?? 39000;

  const baselineSnapshot = buildContractCommercialSnapshot(
    {
      ...contract,
      fixedRent: baseline.fixedRent,
      fixedRentCurrency: baseline.fixedRentCurrency,
      variableRentPct: baseline.variableRentPct,
    },
    0,
    baseline.monthlySales,
    referenceDate,
    getUfFor,
  );
  const scenarioSnapshot = buildContractCommercialSnapshot(
    {
      ...contract,
      fixedRent: scenario.fixedRent,
      fixedRentCurrency: scenario.fixedRentCurrency,
      variableRentPct: scenario.variableRentPct,
    },
    0,
    scenario.monthlySales,
    referenceDate,
    getUfFor,
  );

  const rentDelta = scenarioSnapshot.rentTotal - baselineSnapshot.rentTotal;
  const totalDelta = scenarioSnapshot.totalOccupancyCost - baselineSnapshot.totalOccupancyCost;
  const occDelta = scenarioSnapshot.costoOcupacionPct - baselineSnapshot.costoOcupacionPct;

  return {
    baseline: baselineSnapshot,
    scenario: scenarioSnapshot,
    delta: {
      rentTotal: rentDelta,
      totalOccupancyCost: totalDelta,
      costoOcupacionPct: occDelta,
    },
    rentTotalChangePct:
      baselineSnapshot.rentTotal > 0 ? (rentDelta / baselineSnapshot.rentTotal) * 100 : 0,
    occupancyChangePoints: occDelta,
  };
}
