export type CospinDecision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

export type CospinTruthState = {
  epoch: number;
  truthSequence: number;
  state: Record<string, unknown>;
  logicalTime: number;
  location: string;
  networkIdentity: string;
  stableAnchorHash: string;
  recentDirections?: number[];
};

export type CospinMemoryPacket = {
  memoryId: string;
  sourceSystem: string;
  snapshotHash: string;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  ttlSeconds?: number;
  policyVersion?: string;
  context?: Record<string, unknown>;
};

export type CospinActionEnvelope = {
  requestId: string;
  agentId: string;
  action: string;
  nextState: Record<string, unknown>;
  nextLogicalTime: number;
  nextLocation: string;
  nextNetworkIdentity: string;
  memory?: CospinMemoryPacket;
};

export type CospinGateResult = {
  decision: CospinDecision;
  reason: string;
  metrics: {
    velocity: number;
    drift: number;
    oscillation: number;
  };
  failedInvariant?: string;
};

export type CospinGatePolicy = {
  maxVelocity: number;
  maxDrift: number;
  maxOscillation: number;
  allowedInvariantTags: readonly string[];
  deniedNetworkIdentities: readonly string[];
};

export const DEFAULT_COSPIN_GATE_POLICY: CospinGatePolicy = {
  maxVelocity: 300,
  maxDrift: 0.35,
  maxOscillation: 3,
  allowedInvariantTags: ['transfer', 'ledger_safe', 'monotonic_time'],
  deniedNetworkIdentities: ['quarantined-network', 'denied-network'],
};

function locationDistance(a: string, b: string): number {
  return a === b ? 0 : 1000;
}

function inferInvariantTag(nextState: Record<string, unknown>): string {
  return String(nextState.invariant_tag || 'transfer');
}

function numericField(input: Record<string, unknown>, key: string, fallback = 0): number {
  const value = input[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function driftMagnitude(current: CospinTruthState, nextState: Record<string, unknown>): number {
  const currentBalance = numericField(current.state, 'balance', 0);
  const nextBalance = numericField(nextState, 'balance', currentBalance);
  const denominator = Math.max(1, Math.abs(currentBalance));
  return Math.abs(nextBalance - currentBalance) / denominator;
}

function oscillationScore(current: CospinTruthState, nextState: Record<string, unknown>): number {
  const currentBalance = numericField(current.state, 'balance', 0);
  const nextBalance = numericField(nextState, 'balance', currentBalance);
  const nextDirection = Math.sign(nextBalance - currentBalance);
  const window = [...(current.recentDirections || []), nextDirection].slice(-5);

  let flips = 0;
  for (let i = 1; i < window.length; i += 1) {
    if (window[i] !== 0 && window[i - 1] !== 0 && window[i] !== window[i - 1]) {
      flips += 1;
    }
  }
  return flips;
}

function validateMemoryPacket(memory?: CospinMemoryPacket): string | null {
  if (!memory) return null;
  if (!memory.memoryId) return 'MEMORY_ID_MISSING';
  if (!memory.sourceSystem) return 'MEMORY_SOURCE_MISSING';
  if (!memory.snapshotHash) return 'MEMORY_SNAPSHOT_HASH_MISSING';
  if (memory.ttlSeconds !== undefined && memory.ttlSeconds <= 0) return 'MEMORY_TTL_INVALID';
  return null;
}

export function evaluateCospinUDGGate(
  current: CospinTruthState,
  envelope: CospinActionEnvelope,
  policy: CospinGatePolicy = DEFAULT_COSPIN_GATE_POLICY,
): CospinGateResult {
  if (!envelope.requestId || !envelope.agentId || !envelope.action) {
    return { decision: 'BLOCK', reason: 'MALFORMED_ACTION_ENVELOPE', metrics: { velocity: 0, drift: 0, oscillation: 0 } };
  }

  const memoryError = validateMemoryPacket(envelope.memory);
  if (memoryError) {
    return { decision: 'BLOCK', reason: memoryError, metrics: { velocity: 0, drift: 0, oscillation: 0 } };
  }

  if (envelope.nextLogicalTime <= current.logicalTime) {
    return { decision: 'BLOCK', reason: 'TEMPORAL_REGRESSION', metrics: { velocity: 0, drift: 0, oscillation: 0 } };
  }

  const dt = envelope.nextLogicalTime - current.logicalTime;
  const velocity = locationDistance(current.location, envelope.nextLocation) / dt;
  if (velocity > policy.maxVelocity) {
    return { decision: 'BLOCK', reason: 'SPATIOTEMPORAL_VELOCITY_BREACH', metrics: { velocity, drift: 0, oscillation: 0 } };
  }

  if (policy.deniedNetworkIdentities.includes(envelope.nextNetworkIdentity)) {
    return { decision: 'BLOCK', reason: 'NETWORK_IDENTITY_DENIED', metrics: { velocity, drift: 0, oscillation: 0 } };
  }

  const invariantTag = inferInvariantTag(envelope.nextState);
  if (!policy.allowedInvariantTags.includes(invariantTag)) {
    return { decision: 'BLOCK', reason: 'INVARIANT_BREACH', failedInvariant: invariantTag, metrics: { velocity, drift: 0, oscillation: 0 } };
  }

  const drift = driftMagnitude(current, envelope.nextState);
  if (drift > policy.maxDrift) {
    return { decision: 'STABILIZE', reason: 'DRIFT_MAGNITUDE_EXCEEDED', metrics: { velocity, drift, oscillation: 0 } };
  }

  const oscillation = oscillationScore(current, envelope.nextState);
  if (oscillation > policy.maxOscillation) {
    return { decision: 'STABILIZE', reason: 'OSCILLATION_FREQUENCY_EXCEEDED', metrics: { velocity, drift, oscillation } };
  }

  return { decision: 'ALLOW', reason: 'GATE_PASSED', metrics: { velocity, drift, oscillation } };
}
