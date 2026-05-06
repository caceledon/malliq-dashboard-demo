import { describe, expect, it } from 'vitest';
import { buildScenarioInputFromContract, evaluateScenario } from './scenarios';

const baseContract = {
  baseRentUF: 0,
  rentSteps: [],
  fixedRent: 2_000_000,
  fixedRentCurrency: 'CLP' as const,
  variableRentPct: 5,
  commonExpenses: 200_000,
  commonExpensesCurrency: 'CLP' as const,
  fondoPromocion: 50_000,
  fondoPromocionCurrency: 'CLP' as const,
};

describe('evaluateScenario', () => {
  it('returns baseline equal to scenario when nothing changes', () => {
    const baseline = buildScenarioInputFromContract(baseContract, 10_000_000);
    const result = evaluateScenario(baseContract, baseline, baseline);
    expect(result.delta.rentTotal).toBe(0);
    expect(result.delta.costoOcupacionPct).toBeCloseTo(0);
  });

  it('detects rent shift when fixedRent rises 10%', () => {
    const baseline = buildScenarioInputFromContract(baseContract, 10_000_000);
    const scenario = { ...baseline, fixedRent: baseline.fixedRent * 1.1 };
    const result = evaluateScenario(baseContract, baseline, scenario);
    expect(result.delta.rentTotal).toBeCloseTo(200_000, -1);
    expect(result.rentTotalChangePct).toBeGreaterThan(0);
    expect(result.scenario.rentTotal).toBeGreaterThan(result.baseline.rentTotal);
  });

  it('flags an occupancy-cost rise when sales drop', () => {
    const baseline = buildScenarioInputFromContract(baseContract, 20_000_000);
    const scenario = { ...baseline, monthlySales: 10_000_000 };
    const result = evaluateScenario(baseContract, baseline, scenario);
    expect(result.delta.costoOcupacionPct).toBeGreaterThan(0);
    expect(result.occupancyChangePoints).toBeGreaterThan(0);
  });

  it('handles zero baseline rentTotal without dividing by zero', () => {
    const empty = { ...baseContract, fixedRent: 0, variableRentPct: 0 };
    const baseline = buildScenarioInputFromContract(empty, 0);
    const scenario = { ...baseline, fixedRent: 1_000_000 };
    const result = evaluateScenario(empty, baseline, scenario);
    expect(Number.isFinite(result.rentTotalChangePct)).toBe(true);
  });

  it('handles UF-tagged rent at the supplied UF rate', () => {
    const ufContract = {
      ...baseContract,
      fixedRent: 60,
      fixedRentCurrency: 'UF' as const,
    };
    const baseline = buildScenarioInputFromContract(ufContract, 10_000_000);
    const scenario = { ...baseline, fixedRent: 80 };
    const result = evaluateScenario(ufContract, baseline, scenario, { getUfFor: 40_000 });
    expect(result.scenario.fixedRent).toBe(80 * 40_000);
    expect(result.delta.rentTotal).toBe(20 * 40_000);
  });
});
