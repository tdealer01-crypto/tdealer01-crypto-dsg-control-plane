import { createHash } from 'node:crypto';

export type ControlVerdict = 'PASS' | 'REVIEW' | 'BLOCK';
export type ControlClaim = 'PLANNED_ONLY' | 'IMPLEMENTED_UNVERIFIED' | 'DEPLOYABLE_VERIFIED' | 'READY_VERIFIED';

export type ControlSignal = {
  key: string;
  verified: boolean;
  required: boolean;
  weight: number;
  evidenceRef?: string;
};

export type ControlInput = {
  jobId: string;
  goal: string;
  phase: 'prd' | 'plan' | 'approval' | 'sandbox' | 'build' | 'preview' | 'ready';
  requestedClaim: ControlClaim;
  signals: ControlSignal[];
};

export type ControlResult = {
  ok: boolean;
  verdict: ControlVerdict;
  allowedClaim: ControlClaim;
  score: number;
  requiredPassed: number;
  requiredTotal: number;
  blockedReasons: string[];
  reviewReasons: string[];
  nextAction: string;
  proofHash: string;
};

const claimRank: Record<ControlClaim, number> = {
  PLANNED_ONLY: 0,
  IMPLEMENTED_UNVERIFIED: 1,
  DEPLOYABLE_VERIFIED: 2,
  READY_VERIFIED: 3,
};

const claimByRank: Record<number, ControlClaim> = {
  0: 'PLANNED_ONLY',
  1: 'IMPLEMENTED_UNVERIFIED',
  2: 'DEPLOYABLE_VERIFIED',
  3: 'READY_VERIFIED',
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
}

export function controlHash(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function requiredKeys(claim: ControlClaim): string[] {
  if (claim === 'PLANNED_ONLY') return ['goal_locked', 'plan_visible'];
  if (claim === 'IMPLEMENTED_UNVERIFIED') return ['goal_locked', 'plan_visible', 'approval_recorded', 'branch_or_pr_created'];
  if (claim === 'DEPLOYABLE_VERIFIED') return ['goal_locked', 'plan_visible', 'approval_recorded', 'branch_or_pr_created', 'typecheck_passed', 'build_passed', 'preview_loaded'];
  return ['goal_locked', 'plan_visible', 'approval_recorded', 'branch_or_pr_created', 'typecheck_passed', 'build_passed', 'preview_loaded', 'rbac_checked', 'protected_value_scan_passed', 'flow_proof_passed'];
}

function downgradeClaim(requestedClaim: ControlClaim, verifiedKeys: Set<string>): ControlClaim {
  for (let rank = claimRank[requestedClaim]; rank >= 0; rank -= 1) {
    const candidate = claimByRank[rank];
    if (requiredKeys(candidate).every((key) => verifiedKeys.has(key))) return candidate;
  }
  return 'PLANNED_ONLY';
}

export function evaluateControl(input: ControlInput): ControlResult {
  const signals = [...input.signals].sort((a, b) => a.key.localeCompare(b.key));
  const verifiedKeys = new Set(signals.filter((signal) => signal.verified).map((signal) => signal.key));
  const required = signals.filter((signal) => signal.required);
  const requiredPassed = required.filter((signal) => signal.verified).length;
  const requiredTotal = required.length;
  const totalWeight = signals.reduce((sum, signal) => sum + Math.max(0, signal.weight), 0) || 1;
  const passedWeight = signals.reduce((sum, signal) => sum + (signal.verified ? Math.max(0, signal.weight) : 0), 0);
  const score = Number((passedWeight / totalWeight).toFixed(4));
  const blockedReasons = required.filter((signal) => !signal.verified).map((signal) => `REQUIRED_SIGNAL_MISSING:${signal.key}`);
  const allowedClaim = downgradeClaim(input.requestedClaim, verifiedKeys);

  if (claimRank[allowedClaim] < claimRank[input.requestedClaim]) blockedReasons.push(`CLAIM_DOWNGRADED:${input.requestedClaim}->${allowedClaim}`);

  const reviewReasons = signals.filter((signal) => !signal.required && !signal.verified).map((signal) => `OPTIONAL_SIGNAL_PENDING:${signal.key}`);
  const verdict: ControlVerdict = blockedReasons.length ? 'BLOCK' : reviewReasons.length ? 'REVIEW' : 'PASS';
  const basis = { ...input, signals, allowedClaim, requiredPassed, requiredTotal, score, blockedReasons, reviewReasons };

  return {
    ok: verdict !== 'BLOCK',
    verdict,
    allowedClaim,
    score,
    requiredPassed,
    requiredTotal,
    blockedReasons,
    reviewReasons,
    nextAction: verdict === 'BLOCK' ? 'Collect missing required evidence before promotion.' : verdict === 'REVIEW' ? 'Close optional evidence gaps before ready claim.' : 'Proceed to next gated phase.',
    proofHash: controlHash(basis),
  };
}

export function defaultControlSignals(input: Partial<Record<string, boolean>>): ControlSignal[] {
  const item = (key: string, required: boolean, weight: number): ControlSignal => ({ key, required, weight, verified: Boolean(input[key]) });
  return [
    item('goal_locked', true, 10),
    item('plan_visible', true, 8),
    item('approval_recorded', false, 10),
    item('branch_or_pr_created', false, 10),
    item('typecheck_passed', false, 8),
    item('build_passed', false, 8),
    item('preview_loaded', false, 8),
    item('rbac_checked', false, 10),
    item('protected_value_scan_passed', false, 8),
    item('flow_proof_passed', false, 12),
  ];
}
