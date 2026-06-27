import { describe, expect, it } from 'vitest';
import {
  evaluateCospinUDGGate,
  type CospinActionEnvelope,
  type CospinTruthState,
} from '../../../lib/runtime/udg-gate';

const baseState: CospinTruthState = {
  epoch: 1,
  truthSequence: 0,
  state: { balance: 1000, invariant_tag: 'transfer' },
  logicalTime: 10,
  location: 'zone:origin',
  networkIdentity: 'net:trusted',
  stableAnchorHash: 'anchor-hash',
  recentDirections: [1, 1, 1],
};

const baseEnvelope: CospinActionEnvelope = {
  requestId: 'req-1',
  agentId: 'agent-1',
  action: 'transfer',
  nextState: { balance: 1010, invariant_tag: 'transfer' },
  nextLogicalTime: 11,
  nextLocation: 'zone:origin',
  nextNetworkIdentity: 'net:trusted',
  memory: {
    memoryId: 'mem-1',
    sourceSystem: 'customer-agent',
    snapshotHash: 'memory-snapshot-hash',
    dataClassification: 'internal',
    ttlSeconds: 600,
  },
};

describe('evaluateCospinUDGGate', () => {
  it('allows a deterministic safe transition', () => {
    const result = evaluateCospinUDGGate(baseState, baseEnvelope);

    expect(result.decision).toBe('ALLOW');
    expect(result.reason).toBe('GATE_PASSED');
  });

  it('blocks temporal regression', () => {
    const result = evaluateCospinUDGGate(baseState, {
      ...baseEnvelope,
      nextLogicalTime: 10,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toBe('TEMPORAL_REGRESSION');
  });

  it('blocks denied network identity', () => {
    const result = evaluateCospinUDGGate(baseState, {
      ...baseEnvelope,
      nextNetworkIdentity: 'blackholed-asn',
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toBe('NETWORK_IDENTITY_DENIED');
  });

  it('blocks unknown invariant tag', () => {
    const result = evaluateCospinUDGGate(baseState, {
      ...baseEnvelope,
      nextState: { balance: 1010, invariant_tag: 'unknown_action' },
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toBe('INVARIANT_BREACH');
    expect(result.failedInvariant).toBe('unknown_action');
  });

  it('stabilizes high drift transitions', () => {
    const result = evaluateCospinUDGGate(baseState, {
      ...baseEnvelope,
      nextState: { balance: 1600, invariant_tag: 'transfer' },
    });

    expect(result.decision).toBe('STABILIZE');
    expect(result.reason).toBe('DRIFT_MAGNITUDE_EXCEEDED');
  });

  it('stabilizes oscillating transitions', () => {
    const result = evaluateCospinUDGGate(
      {
        ...baseState,
        recentDirections: [1, -1, 1, -1],
      },
      {
        ...baseEnvelope,
        nextState: { balance: 990, invariant_tag: 'transfer' },
      },
    );

    expect(result.decision).toBe('STABILIZE');
    expect(result.reason).toBe('OSCILLATION_FREQUENCY_EXCEEDED');
  });

  it('blocks malformed action envelopes', () => {
    const result = evaluateCospinUDGGate(baseState, {
      ...baseEnvelope,
      requestId: '',
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toBe('MALFORMED_ACTION_ENVELOPE');
  });

  it('blocks invalid memory packets', () => {
    const result = evaluateCospinUDGGate(baseState, {
      ...baseEnvelope,
      memory: {
        memoryId: 'mem-1',
        sourceSystem: 'customer-agent',
        snapshotHash: '',
      },
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toBe('MEMORY_SNAPSHOT_HASH_MISSING');
  });
});
