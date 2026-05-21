import { describe, it, expect } from 'vitest';
import constraints from '../../../lib/gateway/verified-constraints.json';

const REQUIRED_THEOREMS = [
  'role_safety',
  'plan_safety',
  'approval_safety',
  'audit_completeness',
  'non_triviality',
  'amount_bound',
  'slippage_bound',
  'constraint_consistency',
];

const POLICY_WRITE_ROLES = ['owner', 'admin', 'finance_admin', 'finance_approver', 'agent_operator'];
const POLICY_EXECUTION_PLANS = ['enterprise', 'business', 'pro'];

describe('verified-constraints.json — structural invariants', () => {
  it('has a semver version field', () => {
    expect(constraints.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('lists all 8 required theorems', () => {
    for (const theorem of REQUIRED_THEOREMS) {
      expect(constraints.theorems).toContain(theorem);
    }
  });

  it('writeRoles matches policy.ts WRITE_ROLES exactly', () => {
    expect([...constraints.writeRoles].sort()).toEqual([...POLICY_WRITE_ROLES].sort());
  });

  it('executionPlans matches policy.ts EXECUTION_PLANS exactly', () => {
    expect([...constraints.executionPlans].sort()).toEqual([...POLICY_EXECUTION_PLANS].sort());
  });
});

describe('verified-constraints.json — DeFi bound invariants', () => {
  it('maxSingleTxUSD is positive', () => {
    expect(constraints.defi.maxSingleTxUSD).toBeGreaterThan(0);
  });

  it('maxDailyUSD is strictly greater than maxSingleTxUSD', () => {
    expect(constraints.defi.maxDailyUSD).toBeGreaterThan(constraints.defi.maxSingleTxUSD);
  });

  it('maxSlippageBps is positive and at most 10000 (100%)', () => {
    expect(constraints.defi.maxSlippageBps).toBeGreaterThan(0);
    expect(constraints.defi.maxSlippageBps).toBeLessThanOrEqual(10000);
  });

  it('allowedTokens is non-empty and includes KUB', () => {
    expect(constraints.defi.allowedTokens.length).toBeGreaterThan(0);
    expect(constraints.defi.allowedTokens).toContain('KUB');
  });

  it('allowedProtocols is non-empty and includes kubswap', () => {
    expect(constraints.defi.allowedProtocols.length).toBeGreaterThan(0);
    expect(constraints.defi.allowedProtocols).toContain('kubswap');
  });

  it('no duplicate tokens in allowedTokens', () => {
    const set = new Set(constraints.defi.allowedTokens);
    expect(set.size).toBe(constraints.defi.allowedTokens.length);
  });

  it('no duplicate protocols in allowedProtocols', () => {
    const set = new Set(constraints.defi.allowedProtocols);
    expect(set.size).toBe(constraints.defi.allowedProtocols.length);
  });
});
