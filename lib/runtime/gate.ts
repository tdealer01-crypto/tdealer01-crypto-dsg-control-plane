export type DSGDecision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

export type TruthState = {
  epoch: number;
  sequence: number;
  v_t: Record<string, unknown>;
  t_t: number;
  g_t: string;
  i_t: string;
  s_star_hash: string;
};

export type CandidateTransition = {
  action: string;
  next_v: Record<string, unknown>;
  next_t: number;
  next_g: string;
  next_i: string;
};

export type GateResult = {
  decision: DSGDecision;
  reason: string;
  metrics: {
    velocity: number;
    drift: number;
    oscillation: number;
  };
};

const FORBIDDEN_NETWORKS = new Set(['blackholed-asn', 'forbidden-ip-range']);
const VALID_INVARIANTS = new Set(['transfer', 'ledger_safe', 'monotonic_time']);
const V_MAX = 300;
const DELTA = 0.35;
const OMEGA = 3;

function distance(a: string, b: string): number {
  return a === b ? 0 : 1000;
}

function inferInvariant(v: Record<string, unknown>): string {
  return String(v.invariant_tag || 'transfer');
}

function driftMagnitude(current: TruthState, nextV: Record<string, unknown>): number {
  const currentBalance = Number(current.v_t.balance || 0);
  const nextBalance = Number(nextV.balance ?? currentBalance);
  const denom = Math.max(1, Math.abs(currentBalance));
  return Math.abs(nextBalance - currentBalance) / denom;
}

function oscillationScore(current: TruthState, nextV: Record<string, unknown>): number {
  const previousDirection = Number(current.v_t.last_direction || 0);
  const currentBalance = Number(current.v_t.balance || 0);
  const nextBalance = Number(nextV.balance ?? currentBalance);
  const nextDirection = Math.sign(nextBalance - currentBalance);

  if (previousDirection !== 0 && nextDirection !== 0 && previousDirection !== nextDirection) {
    return 1;
  }
  return 0;
}

export function evaluateUDGGate(current: TruthState, candidate: CandidateTransition): GateResult {
  if (candidate.next_t <= current.t_t) {
    return {
      decision: 'BLOCK',
      reason: 'TEMPORAL_REGRESSION',
      metrics: { velocity: 0, drift: 0, oscillation: 0 },
    };
  }

  const dt = candidate.next_t - current.t_t;
  const velocity = distance(current.g_t, candidate.next_g) / dt;
  if (velocity > V_MAX) {
    return {
      decision: 'BLOCK',
      reason: 'SPATIOTEMPORAL_VELOCITY_BREACH',
      metrics: { velocity, drift: 0, oscillation: 0 },
    };
  }

  if (FORBIDDEN_NETWORKS.has(candidate.next_i)) {
    return {
      decision: 'BLOCK',
      reason: 'NETWORK_IDENTITY_VIOLATION',
      metrics: { velocity, drift: 0, oscillation: 0 },
    };
  }

  const invariant = inferInvariant(candidate.next_v);
  if (!VALID_INVARIANTS.has(invariant)) {
    return {
      decision: 'BLOCK',
      reason: 'INVARIANT_BREACH',
      metrics: { velocity, drift: 0, oscillation: 0 },
    };
  }

  const drift = driftMagnitude(current, candidate.next_v);
  if (drift > DELTA) {
    return {
      decision: 'STABILIZE',
      reason: 'DRIFT_MAGNITUDE_EXCEEDED',
      metrics: { velocity, drift, oscillation: 0 },
    };
  }

  const oscillation = oscillationScore(current, candidate.next_v);
  if (oscillation > OMEGA) {
    return {
      decision: 'STABILIZE',
      reason: 'OSCILLATION_FREQUENCY_EXCEEDED',
      metrics: { velocity, drift, oscillation },
    };
  }

  return {
    decision: 'ALLOW',
    reason: 'GATE_PASSED',
    metrics: { velocity, drift, oscillation },
  };
}
