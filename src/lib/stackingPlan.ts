// Track 4 — pure helpers used by the StackingPlan component. Kept in /lib so
// the component file only exports components (Vite fast-refresh hygiene).
import {
  getContractLifecycle,
  type AssetUnit,
  type Contract,
  type ContractLifecycle,
} from '@/lib/domain';

export interface UnitCellState {
  unit: AssetUnit;
  contract: Contract | null;
  status: ContractLifecycle | 'vacante';
}

function stagePriority(stage: ContractLifecycle): number {
  switch (stage) {
    case 'vigente':
      return 0;
    case 'por_vencer':
      return 1;
    case 'en_firma':
      return 2;
    case 'borrador':
      return 3;
    case 'vencido':
      return 4;
  }
}

export function buildUnitStates(
  units: AssetUnit[],
  contracts: Contract[],
  referenceDate: Date,
): UnitCellState[] {
  return units.map((unit) => {
    const matching = contracts
      .filter((contract) => contract.localIds.includes(unit.id))
      .map((contract) => ({ contract, lifecycle: getContractLifecycle(contract, referenceDate) }))
      .filter(({ lifecycle }) => lifecycle !== 'vencido');
    if (matching.length === 0) {
      return { unit, contract: null, status: 'vacante' as const };
    }
    const ordered = matching.sort((a, b) => stagePriority(a.lifecycle) - stagePriority(b.lifecycle));
    return {
      unit,
      contract: ordered[0].contract,
      status: ordered[0].lifecycle,
    };
  });
}
