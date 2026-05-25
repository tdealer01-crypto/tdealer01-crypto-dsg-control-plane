import { describe, expect, it } from 'vitest';
import { buildCheckpointHash } from '../../../lib/runtime/checkpoint';

const baseInput = {
  truthCanonicalHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd',
  latestLedgerId: 'ledger-001',
  latestLedgerSequence: 42,
  latestTruthSequence: 7,
};

describe('buildCheckpointHash', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    expect(buildCheckpointHash(baseInput)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical inputs', () => {
    const h1 = buildCheckpointHash(baseInput);
    const h2 = buildCheckpointHash(baseInput);
    expect(h1).toBe(h2);
  });

  it('changes when truthCanonicalHash changes', () => {
    const h1 = buildCheckpointHash(baseInput);
    const h2 = buildCheckpointHash({ ...baseInput, truthCanonicalHash: 'deadbeef' + 'a'.repeat(56) });
    expect(h1).not.toBe(h2);
  });

  it('changes when latestLedgerId changes', () => {
    const h1 = buildCheckpointHash(baseInput);
    const h2 = buildCheckpointHash({ ...baseInput, latestLedgerId: 'ledger-002' });
    expect(h1).not.toBe(h2);
  });

  it('changes when latestLedgerSequence changes', () => {
    const h1 = buildCheckpointHash(baseInput);
    const h2 = buildCheckpointHash({ ...baseInput, latestLedgerSequence: 43 });
    expect(h1).not.toBe(h2);
  });

  it('changes when latestTruthSequence changes', () => {
    const h1 = buildCheckpointHash(baseInput);
    const h2 = buildCheckpointHash({ ...baseInput, latestTruthSequence: 8 });
    expect(h1).not.toBe(h2);
  });

  it('sequence 0 and sequence 1 produce different hashes', () => {
    const h1 = buildCheckpointHash({ ...baseInput, latestLedgerSequence: 0 });
    const h2 = buildCheckpointHash({ ...baseInput, latestLedgerSequence: 1 });
    expect(h1).not.toBe(h2);
  });
});
