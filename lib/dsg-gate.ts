export type DSGDecision = "ALLOW" | "STABILIZE" | "BLOCK";

export type DSGAction = {
  type: string;
  payload?: Record<string, unknown>;
};

export type DSGSignal = {
  source: string;
  value: number;
};

export type DSGEvaluationInput = {
  prevState?: Record<string, unknown> | null;
  nextState: Record<string, unknown>;
  action: DSGAction;
  signals?: DSGSignal[];
};

export type DSGEvaluationResult = {
  decision: DSGDecision;
  reason: string;
  phase: "UNITY" | "TUNING" | "CHAOS";
  drift: number;
  stability: number;
  harmonicCenter: number;
  entropy: number;
};

const DEFAULT_UNITY_THRESHOLD = 0.03;
const DEFAULT_TUNING_THRESHOLD = 0.1;
const DEFAULT_STABILITY_THRESHOLD = 0.8;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function flattenNumericValues(obj?: Record<string, unknown> | null): number[] {
  if (!obj) return [];
  const out: number[] = [];

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(walk);
      return;
    }
    const n = toNumber(value);
    if (n !== null) out.push(n);
  };

  walk(obj);
  return out;
}

function computeDrift(
  prevState?: Record<string, unknown> | null,
  nextState?: Record<string, unknown> | null
): number {
  const prev = flattenNumericValues(prevState);
  const next = flattenNumericValues(nextState);

  const len = Math.max(prev.length, next.length);
  if (len === 0) return 0;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const a = prev[i] ?? 0;
    const b = next[i] ?? 0;
    sum += Math.abs(a - b);
  }

  return sum / len;
}

function computeHarmonic(signals: DSGSignal[] = []) {
  if (!signals.length) {
    return {
      harmonicCenter: 1,
      entropy: 0,
      phase: "UNITY" as const
    };
  }

  const safeValues = signals
    .map((s) => (s.value <= 0 ? 0.000001 : s.value))
    .filter((v) => Number.isFinite(v));

  const n = safeValues.length;
  const harmonicCenter =
    n / safeValues.reduce((acc, value) => acc + 1 / value, 0);

  const entropy =
    safeValues.reduce((acc, value) => acc + Math.abs(value - harmonicCenter), 0) /
    n;

  let phase: "UNITY" | "TUNING" | "CHAOS" = "UNITY";
  if (entropy >= DEFAULT_TUNING_THRESHOLD) phase = "CHAOS";
  else if (entropy >= DEFAULT_UNITY_THRESHOLD) phase = "TUNING";

  return { harmonicCenter, entropy, phase };
}

function violatesInvariant(action: DSGAction, nextState: Record<string, unknown>) {
  const forbiddenActions = new Set([
    "DELETE_DB",
    "DELETE_DATABASE",
    "TRANSFER_FUNDS",
    "REFUND_WITHOUT_APPROVAL",
    "POLICY_CHANGE_PRODUCTION"
  ]);

  if (forbiddenActions.has(action.type)) {
    return `Forbidden action: ${action.type}`;
  }

  const status = String(nextState.status ?? "");
  if (status.toLowerCase() === "deleted") {
    return "Invariant violation: deleted state is not allowed";
  }

  return null;
}

export function evaluateDSG(input: DSGEvaluationInput): DSGEvaluationResult {
  const invariantViolation = violatesInvariant(input.action, input.nextState);
  const drift = computeDrift(input.prevState, input.nextState);
  const stability = 1 / (1 + drift);
  const { harmonicCenter, entropy, phase } = computeHarmonic(input.signals ?? []);

  if (invariantViolation) {
    return {
      decision: "BLOCK",
      reason: invariantViolation,
      phase,
      drift,
      stability,
      harmonicCenter,
      entropy
    };
  }

  if (phase === "CHAOS") {
    return {
      decision: "BLOCK",
      reason: "Phase is CHAOS",
      phase,
      drift,
      stability,
      harmonicCenter,
      entropy
    };
  }

  if (stability < DEFAULT_STABILITY_THRESHOLD || phase === "TUNING") {
    return {
      decision: "STABILIZE",
      reason: "Transition requires stabilization or review",
      phase,
      drift,
      stability,
      harmonicCenter,
      entropy
    };
  }

  return {
    decision: "ALLOW",
    reason: "Transition accepted",
    phase,
    drift,
    stability,
    harmonicCenter,
    entropy
  };
}
