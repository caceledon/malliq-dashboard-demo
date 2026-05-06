import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  emptyPortfolioState,
  normalizePortfolioState,
  parseStoredPortfolio,
  resolveFeatureFlag,
  type FeatureFlagKey,
  type PortfolioState,
} from './portfolio';

function makeAsset(id = 'asset-1') {
  return {
    id,
    name: 'Activo Demo',
    city: 'Santiago',
    region: 'Metropolitana',
    notes: '',
    themePreference: 'auto' as const,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function makeWorkspace(id = 'asset-1') {
  return {
    asset: makeAsset(id),
    units: [],
    contracts: [],
    sales: [],
    planning: [],
    documents: [],
    suppliers: [],
    prospects: [],
    posConnections: [],
    importLogs: [],
  };
}

describe('PortfolioState migration v2 → v3 + feature flags', () => {
  it('emptyPortfolioState is v3 and opts into sourceLinkedAbstracts by default', () => {
    const empty = emptyPortfolioState();
    expect(empty.version).toBe(3);
    expect(empty.featureFlags?.sourceLinkedAbstracts).toBe(true);
  });

  it('normalizes a v2 state into v3 with the default-on flags', () => {
    const v2 = {
      version: 2 as unknown as 3,
      activeAssetId: 'asset-1',
      workspaces: [makeWorkspace('asset-1')],
    } as PortfolioState;
    const next = normalizePortfolioState(v2);
    expect(next.version).toBe(3);
    expect(next.featureFlags?.sourceLinkedAbstracts).toBe(true);
    // No other tracks ship default-on yet.
    expect(next.featureFlags?.asistenteIA ?? false).toBe(false);
  });

  it('preserves the operator opt-out when migrating', () => {
    const v2 = {
      version: 2 as unknown as 3,
      activeAssetId: null,
      workspaces: [],
      featureFlags: { sourceLinkedAbstracts: false },
    } as PortfolioState;
    const next = normalizePortfolioState(v2);
    expect(next.featureFlags?.sourceLinkedAbstracts).toBe(false);
  });

  it('parseStoredPortfolio accepts a stored v2 blob and emits v3', () => {
    const raw = {
      version: 2,
      activeAssetId: 'asset-1',
      workspaces: [makeWorkspace('asset-1')],
    };
    const parsed = parseStoredPortfolio(raw);
    expect(parsed.version).toBe(3);
    expect(parsed.activeAssetId).toBe('asset-1');
  });

  it('drops unknown / non-boolean flag values silently (defensive)', () => {
    const raw = {
      version: 3,
      activeAssetId: null,
      workspaces: [],
      featureFlags: {
        sourceLinkedAbstracts: 'yes', // wrong type
        asistenteIA: true,
        bogus: true,
      },
    };
    const parsed = parseStoredPortfolio(raw);
    expect(parsed.featureFlags?.asistenteIA).toBe(true);
    // Wrong-type is dropped; default reasserts itself via the migration path.
    expect(parsed.featureFlags?.sourceLinkedAbstracts).toBe(true);
    // Unknown keys are dropped entirely.
    expect((parsed.featureFlags as Record<string, unknown>).bogus).toBeUndefined();
  });

  it('resolveFeatureFlag falls back to DEFAULT_FEATURE_FLAGS when slot is missing', () => {
    expect(resolveFeatureFlag(null, 'sourceLinkedAbstracts')).toBe(
      DEFAULT_FEATURE_FLAGS.sourceLinkedAbstracts,
    );
    expect(resolveFeatureFlag(undefined, 'asistenteIA')).toBe(false);
  });

  it('every track has a DEFAULT_FEATURE_FLAGS entry', () => {
    const expected: FeatureFlagKey[] = [
      'sourceLinkedAbstracts',
      'asistenteIA',
      'clausulasLedger',
      'stackingPlan',
      'renewalScoring',
      'casualLicensing',
      'tenantPwa',
      'camReconciliation',
      'crossShopping',
      'crisisBroadcast',
      'mallqIndex',
      'scenarioModeling',
    ];
    for (const key of expected) {
      expect(DEFAULT_FEATURE_FLAGS).toHaveProperty(key);
    }
  });
});
