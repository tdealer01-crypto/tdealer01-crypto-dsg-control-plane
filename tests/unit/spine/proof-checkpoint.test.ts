import { describe, it, expect } from 'vitest';
import { canonicalHash, canonicalJson } from '../../../lib/runtime/canonical';
import { buildCheckpointHash } from '../../../lib/runtime/checkpoint';
import { buildApprovalKey } from '../../../lib/runtime/approval';

describe('canonical determinism — proof foundation', () => {
  it('produces identical hash regardless of key order', () => {
    const a = canonicalHash({ decision: 'ALLOW', action: 'scan', input: { b: 2, a: 1 } });
    const b = canonicalHash({ action: 'scan', decision: 'ALLOW', input: { a: 1, b: 2 } });
    expect(a).toBe(b);
  });

  it('produces different hash for different values', () => {
    const allow = canonicalHash({ decision: 'ALLOW' });
    const block = canonicalHash({ decision: 'BLOCK' });
    expect(allow).not.toBe(block);
  });

  it('handles nested arrays deterministically', () => {
    const a = canonicalJson({ steps: [{ tool: 'readiness' }, { tool: 'execute' }] });
    const b = canonicalJson({ steps: [{ tool: 'readiness' }, { tool: 'execute' }] });
    expect(a).toBe(b);
  });

  it('handles null and primitive values', () => {
    expect(canonicalHash(null)).toBe(canonicalHash(null));
    expect(canonicalHash('test')).toBe(canonicalHash('test'));
    expect(canonicalHash(42)).toBe(canonicalHash(42));
    expect(canonicalHash(true)).toBe(canonicalHash(true));
  });
});

describe('buildCheckpointHash — runtime checkpoint integrity', () => {
  it('produces deterministic checkpoint hash', () => {
    const input = {
      truthCanonicalHash: 'abc123',
      latestLedgerId: 'ledger_001',
      latestLedgerSequence: 5,
      latestTruthSequence: 3,
    };

    const hash1 = buildCheckpointHash(input);
    const hash2 = buildCheckpointHash(input);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('different truth hash produces different checkpoint', () => {
    const base = {
      latestLedgerId: 'ledger_001',
      latestLedgerSequence: 5,
      latestTruthSequence: 3,
    };

    const a = buildCheckpointHash({ ...base, truthCanonicalHash: 'hash_a' });
    const b = buildCheckpointHash({ ...base, truthCanonicalHash: 'hash_b' });
    expect(a).not.toBe(b);
  });

  it('different ledger sequence produces different checkpoint', () => {
    const base = {
      truthCanonicalHash: 'same',
      latestLedgerId: 'ledger_001',
      latestTruthSequence: 3,
    };

    const a = buildCheckpointHash({ ...base, latestLedgerSequence: 5 });
    const b = buildCheckpointHash({ ...base, latestLedgerSequence: 6 });
    expect(a).not.toBe(b);
  });
});

describe('buildApprovalKey — anti-replay determinism', () => {
  it('same org+agent+request produces same key', () => {
    const a = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'scan', input: { x: 1 } } });
    const b = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'scan', input: { x: 1 } } });
    expect(a).toBe(b);
  });

  it('key order in request does not affect approval key', () => {
    const a = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { input: { b: 2, a: 1 }, action: 'scan' } });
    const b = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'scan', input: { a: 1, b: 2 } } });
    expect(a).toBe(b);
  });

  it('different org/agent/request changes key', () => {
    const base = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'scan' } });
    const orgChanged = buildApprovalKey({ orgId: 'org_2', agentId: 'agt_1', request: { action: 'scan' } });
    const agentChanged = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_2', request: { action: 'scan' } });
    const requestChanged = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'trade' } });

    expect(orgChanged).not.toBe(base);
    expect(agentChanged).not.toBe(base);
    expect(requestChanged).not.toBe(base);
  });
});
