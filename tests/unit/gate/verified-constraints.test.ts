import { describe, it, expect } from 'vitest';
import constraints from '../../../lib/gateway/verified-constraints.json';

const REQUIRED_THEOREMS = [
  'role_safety', 'plan_safety', 'approval_safety',
  'audit_completeness', 'non_triviality',
  'amount_bound', 'slippage_bound', 'constraint_consistency',
];
const WRITE_ROLES = ['owner', 'admin', 'finance_admin', 'finance_approver', 'agent_operator'];
const EXECUTION_PLANS = ['enterprise', 'business', 'pro'];

describe('verified-constraints.json — structural invariants', () => {
  it('has semver version', () => expect(constraints.version).toMatch(/^\d+\.\d+\.\d+$/));
  it('lists all 8 required theorems', () => {
    for (const t of REQUIRED_THEOREMS) expect(constraints.theorems).toContain(t);
  });
  it('writeRoles matches policy.ts WRITE_ROLES', () => {
    expect([...constraints.writeRoles].sort()).toEqual([...WRITE_ROLES].sort());
  });
  it('executionPlans matches policy.ts EXECUTION_PLANS', () => {
    expect([...constraints.executionPlans].sort()).toEqual([...EXECUTION_PLANS].sort());
  });
});

describe('verified-constraints.json — DeFi bounds', () => {
  it('maxSingleTxUSD is positive', () => expect(constraints.defi.maxSingleTxUSD).toBeGreaterThan(0));
  it('maxDailyUSD > maxSingleTxUSD', () => expect(constraints.defi.maxDailyUSD).toBeGreaterThan(constraints.defi.maxSingleTxUSD));
  it('maxSlippageBps is 0 < x <= 10000', () => {
    expect(constraints.defi.maxSlippageBps).toBeGreaterThan(0);
    expect(constraints.defi.maxSlippageBps).toBeLessThanOrEqual(10000);
  });
  it('allowedTokens non-empty, includes KUB', () => {
    expect(constraints.defi.allowedTokens.length).toBeGreaterThan(0);
    expect(constraints.defi.allowedTokens).toContain('KUB');
  });
  it('allowedProtocols non-empty, includes kubswap', () => {
    expect(constraints.defi.allowedProtocols.length).toBeGreaterThan(0);
    expect(constraints.defi.allowedProtocols).toContain('kubswap');
  });
  it('no duplicate tokens', () => expect(new Set(constraints.defi.allowedTokens).size).toBe(constraints.defi.allowedTokens.length));
  it('no duplicate protocols', () => expect(new Set(constraints.defi.allowedProtocols).size).toBe(constraints.defi.allowedProtocols.length));
});
