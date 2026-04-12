import { describe, it, expect } from 'vitest';
import { canonicalHash, canonicalJson } from '../../../lib/runtime/canonical';
import { buildCheckpointHash } from '../../../lib/runtime/checkpoint';
import { buildApprovalKey, isReusableApprovalStatus } from '../../../lib/runtime/approval';

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

  it('canonicalJson sorts keys recursively', () => {
    const json = canonicalJson({ z: 1, a: { y: 2, b: 3 } });
    expect(json).toBe('{"a":{"b":3,"y":2},"z":1}');
  });

  it('handles nested arrays deterministically', () => {
    const a = canonicalJson({ steps: [{ tool: 'readiness' }, { tool: 'execute' }] });
    const b = canonicalJson({ steps: [{ tool: 'readiness' }, { tool: 'execute' }] });
    expect(a).toBe(b);
  });

  it('strips undefined values from objects', () => {
    const a = canonicalJson({ x: 1, y: undefined });
    const b = canonicalJson({ x: 1 });
    expect(a).toBe(b);
  });

  it('handles null and primitive values', () => {
    expect(canonicalHash(null)).toBe(canonicalHash(null));
    expect(canonicalHash('test')).toBe(canonicalHash('test'));
    expect(canonicalHash(42)).toBe(canonicalHash(42));
    expect(canonicalHash(true)).toBe(canonicalHash(true));
  });

  it('hash is 64-char hex (SHA-256)', () => {
    const hash = canonicalHash({ action: 'scan' });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
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
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
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

  it('different truth sequence produces different checkpoint', () => {
    const base = {
      truthCanonicalHash: 'same',
      latestLedgerId: 'ledger_001',
      latestLedgerSequence: 5,
    };

    const a = buildCheckpointHash({ ...base, latestTruthSequence: 3 });
    const b = buildCheckpointHash({ ...base, latestTruthSequence: 4 });
    expect(a).not.toBe(b);
  });
});

describe('buildApprovalKey — anti-replay determinism', () => {
  it('same org+agent+request produces same key', () => {
    const a = buildApprovalKey({
      orgId: 'org_1',
      agentId: 'agt_1',
      request: { action: 'scan', input: { x: 1 } },
    });
    const b = buildApprovalKey({
      orgId: 'org_1',
      agentId: 'agt_1',
      request: { action: 'scan', input: { x: 1 } },
    });
    expect(a).toBe(b);
  });

  it('key order in request does not affect approval key', () => {
    const a = buildApprovalKey({
      orgId: 'org_1',
      agentId: 'agt_1',
      request: { input: { x: 1 }, action: 'scan' },
    });
    const b = buildApprovalKey({
      orgId: 'org_1',
      agentId: 'agt_1',
      request: { action: 'scan', input: { x: 1 } },
    });
    expect(a).toBe(b);
  });

  it('different org produces different key', () => {
    const req = { action: 'scan', input: {} };
    const a = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: req });
    const b = buildApprovalKey({ orgId: 'org_2', agentId: 'agt_1', request: req });
    expect(a).not.toBe(b);
  });

  it('different agent produces different key', () => {
    const req = { action: 'scan', input: {} };
    const a = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: req });
    const b = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_2', request: req });
    expect(a).not.toBe(b);
  });

  it('different action produces different key', () => {
    const a = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'scan' } });
    const b = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'trade' } });
    expect(a).not.toBe(b);
  });

  it('approval key is 64-char hex', () => {
    const key = buildApprovalKey({ orgId: 'org_1', agentId: 'agt_1', request: { action: 'scan' } });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('isReusableApprovalStatus', () => {
  it('pending is reusable', () => {
    expect(isReusableApprovalStatus('pending')).toBe(true);
  });

  it('consumed is not reusable', () => {
    expect(isReusableApprovalStatus('consumed')).toBe(false);
  });

  it('revoked is not reusable', () => {
    expect(isReusableApprovalStatus('revoked')).toBe(false);
  });

  it('expired is not reusable', () => {
    expect(isReusableApprovalStatus('expired')).toBe(false);
  });

  it('rejected is not reusable', () => {
    expect(isReusableApprovalStatus('rejected')).toBe(false);
  });
});
