// Track 8 — CAM (Common Area Maintenance) reconciliation.
//
// Pure compute over a list of operating-cost line items + the active contracts.
// Distributes the line-item total across tenants by their share basis ("gla" =
// proportional to m², "flat" = equal split). Returns per-tenant expected,
// collected and delta — the "collected" comes straight from
// contract.commonExpenses interpreted at the contract's currency tag. Delta
// surfaces overcharges/undercharges so the operator can defend the statement.
import {
  convertAmountToClpAt,
  getContractLifecycle,
  getUnitArea,
  type AppState,
  type CamLineItem,
  type CamReconciliation,
  type CamReconciliationTenantBreakdown,
  type Contract,
  type UfLookup,
} from '@/lib/domain';

export interface CamComputeOptions {
  basis: 'gla' | 'flat';
  periodLabel: string;
  notes?: string;
  asOf?: Date;
  getUfFor?: UfLookup | number;
}

function activeContractsAt(state: AppState, asOf: Date): Contract[] {
  return state.contracts.filter((contract) => {
    const lifecycle = getContractLifecycle(contract, asOf);
    return lifecycle === 'vigente' || lifecycle === 'por_vencer' || lifecycle === 'en_firma';
  });
}

export function computeCamReconciliation(
  state: AppState,
  lineItems: CamLineItem[],
  options: CamComputeOptions,
): Omit<CamReconciliation, 'id' | 'generatedAt'> {
  const asOf = options.asOf ?? new Date();
  const getUfFor = options.getUfFor ?? 39000;
  const totalActualClp = lineItems.reduce((sum, item) => sum + (item.amountClp || 0), 0);

  const contracts = activeContractsAt(state, asOf);
  const totalArea = contracts.reduce(
    (sum, contract) => sum + getUnitArea(contract.localIds, state.units),
    0,
  );

  const perTenant: CamReconciliationTenantBreakdown[] = contracts.map((contract) => {
    const area = getUnitArea(contract.localIds, state.units);
    const shareValue = options.basis === 'gla' ? area : 1;
    const denominator = options.basis === 'gla' ? totalArea : contracts.length;
    const proportion = denominator > 0 ? shareValue / denominator : 0;
    const expectedClp = Math.round(totalActualClp * proportion);
    const collectedClp = convertAmountToClpAt(
      contract.commonExpenses || 0,
      contract.commonExpensesCurrency ?? 'CLP',
      asOf,
      typeof getUfFor === 'function' ? getUfFor : () => Number(getUfFor) || 0,
    );
    return {
      contractId: contract.id,
      storeName: contract.storeName,
      shareBasis: options.basis,
      shareValue,
      expectedClp,
      collectedClp,
      deltaClp: collectedClp - expectedClp,
    };
  });

  return {
    periodLabel: options.periodLabel,
    basis: options.basis,
    lineItems,
    tenants: perTenant,
    notes: options.notes,
  };
}

export function summarizeCam(reconciliation: Omit<CamReconciliation, 'id' | 'generatedAt'>): {
  totalActualClp: number;
  totalCollectedClp: number;
  totalDeltaClp: number;
  surplusTenants: number;
  shortfallTenants: number;
} {
  const totalActualClp = reconciliation.lineItems.reduce((s, item) => s + (item.amountClp || 0), 0);
  const totalCollectedClp = reconciliation.tenants.reduce((s, t) => s + t.collectedClp, 0);
  const totalDeltaClp = totalCollectedClp - totalActualClp;
  const surplusTenants = reconciliation.tenants.filter((t) => t.deltaClp > 0).length;
  const shortfallTenants = reconciliation.tenants.filter((t) => t.deltaClp < 0).length;
  return { totalActualClp, totalCollectedClp, totalDeltaClp, surplusTenants, shortfallTenants };
}
