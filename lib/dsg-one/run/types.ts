/**
 * DSG ONE — Verified Execution run model.
 *
 * One run is one user intent carried through the five product layers:
 * PLAN LOCK -> VERIFY -> EXECUTE -> OBSERVE -> PROVE.
 *
 * See docs/product/DSG_ONE_VERIFIED_EXECUTION.md for the locked product spec.
 *
 * Boundary: DSG orchestrates, the caller's runtime executes. Nothing in this
 * module runs a customer command; it decides what may run and judges what was
 * reported back.
 */

import type { VerifiedActionSurface } from '../verified-action-receipt';

export const DSG_ONE_RUN_SCHEMA = 'dsg-one-run/1.0';

/** Risk ordering is shared with lib/dsg/plan-scope-contract.ts. */
export type RunRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const RISK_ORDER: readonly RunRiskLevel[] = ['low', 'medium', 'high', 'critical'];

/**
 * Run lifecycle.
 *
 * DRAFT        plan proposed, awaiting the single Approve & Run
 * LOCKED       approved; planHash frozen; no step dispatched yet
 * RUNNING      at least one step verified/dispatched, none terminal-failing
 * VERIFIED     every step passed and a receipt was issued
 * NEEDS_REVIEW at least one step landed on REVIEW and none on BLOCK
 * BLOCKED      at least one step was blocked
 * CANCELLED    the user rejected the plan, or the run was abandoned
 */
export type RunStatus =
  | 'DRAFT'
  | 'LOCKED'
  | 'RUNNING'
  | 'VERIFIED'
  | 'NEEDS_REVIEW'
  | 'BLOCKED'
  | 'CANCELLED';

export const TERMINAL_RUN_STATUSES: readonly RunStatus[] = [
  'VERIFIED',
  'NEEDS_REVIEW',
  'BLOCKED',
  'CANCELLED',
];

/**
 * Step lifecycle within a locked plan.
 *
 * PENDING     not yet reached
 * VERIFIED    the compiler passed it; safe to dispatch
 * DISPATCHED  handed to the client executor; awaiting observation
 * PASSED      observation conformed to the plan
 * REVIEW      indeterminate; a human must look (never treated as success)
 * BLOCKED     gate said no, or the observation left the plan
 * SKIPPED     an earlier step ended the run before this one ran
 */
export type StepStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'DISPATCHED'
  | 'PASSED'
  | 'REVIEW'
  | 'BLOCKED'
  | 'SKIPPED';

/**
 * The user-facing phase label for Live Verification (layer 4). This is the only
 * progress vocabulary the UI is allowed to show — no log tails, no internal
 * stage names.
 */
export type StepPhase =
  | 'Planning'
  | 'Verifying'
  | 'Executing'
  | 'Checking'
  | 'Verified'
  | 'Needs review'
  | 'Blocked';

/**
 * Gate verdicts as produced by the deterministic gate adapter. This is the raw
 * proof status from lib/dsg/deterministic — carried through unchanged so the
 * risk mapping happens in exactly one place (verdictToStepStatus).
 */
export type GateVerdict = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

/** A single planned action inside a locked plan. */
export interface RunPlanStep {
  stepId: string;
  /** 1-based position; also the execution order. */
  ordinal: number;
  /** Plain-language description shown in the Plan Lock card. */
  summary: string;
  /** Machine action type, checked against the plan scope contract. */
  actionType: string;
  /** Integration the step touches, e.g. "github", "vercel", "supabase". */
  targetSystem: string;
  /** Named operation within the target system, e.g. "deployment.create". */
  operation: string;
  riskLevel: RunRiskLevel;
  /** User-facing phase to show while this step is in flight. */
  phase: Exclude<StepPhase, 'Verified' | 'Needs review' | 'Blocked'>;
}

/**
 * The immutable plan the user approves. Hashing this object produces the
 * planHash that every later action must carry.
 */
export interface RunPlan {
  /** Plain-language restatement of what the user asked for. */
  intent: string;
  steps: RunPlanStep[];
  /** Systems the plan is allowed to touch. Anything else is out of plan. */
  allowedTargetSystems: string[];
  /** Operations the plan is allowed to perform. Empty means "any within scope". */
  allowedOperations: string[];
  /** Highest risk the plan may reach. A step above this is out of plan. */
  maxRiskLevel: RunRiskLevel;
  /**
   * What the agent explicitly will NOT do. Shown to the user at approval time;
   * this is the half of the plan that makes approval meaningful.
   */
  exclusions: string[];
  /** Policy manifest version in force when the plan was compiled. */
  policyVersion: string;
}

/** Per-step observation submitted by the client executor. */
export interface StepObservation {
  /** planHash the executor believed it was acting under. */
  planHash: string;
  /** Commands the executor actually ran. */
  executedCommands: string[];
  /** Paths the executor actually changed. */
  changedPaths: string[];
  /** Evidence artifact ids produced by this step. */
  evidenceIds: string[];
  /** Executor's own outcome report. Never trusted on its own. */
  outcome: 'SUCCEEDED' | 'FAILED';
  /** Free-text detail surfaced verbatim when a step is blocked. */
  detail?: string;
}

/** Result of judging one observation against the locked plan. */
export interface StepJudgement {
  status: Extract<StepStatus, 'PASSED' | 'REVIEW' | 'BLOCKED'>;
  /** Machine-readable reasons; the UI renders the first one. */
  reasons: string[];
  /** One plain sentence for the user. Required when not PASSED. */
  message: string | null;
}

/** A step as persisted, i.e. plan + live state. */
export interface RunStep extends RunPlanStep {
  status: StepStatus;
  gateVerdict: GateVerdict | null;
  observation: StepObservation | null;
  judgement: StepJudgement | null;
  dispatchedAt: string | null;
  settledAt: string | null;
}

/** A run as persisted. */
export interface Run {
  schema: typeof DSG_ONE_RUN_SCHEMA;
  runId: string;
  orgId: string;
  /** Who created the run. */
  actorId: string;
  surface: VerifiedActionSurface;
  status: RunStatus;
  plan: RunPlan;
  /**
   * Frozen at approval. Null while DRAFT — a run with no planHash has nothing
   * to enforce, which is why nothing may be dispatched before approval.
   */
  planHash: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  steps: RunStep[];
  /**
   * Systems the client executor declared it can reach, captured at creation.
   * Executor-declared and not verified by DSG — it feeds the gate's permission
   * constraints so an unreachable target fails closed. The security boundary is
   * planHash conformance on each observation, not this list.
   */
  connectedSystems: string[];
  auditAvailable: boolean;
  /** Receipt id once PROVE has run. */
  receiptId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Events that advance a run. The state machine accepts nothing else. */
export type RunEvent =
  | { type: 'APPROVE'; approvedBy: string; at: string; ttlMs?: number }
  | { type: 'REJECT'; at: string }
  | { type: 'STEP_VERIFIED'; stepId: string; verdict: GateVerdict; at: string }
  | { type: 'STEP_DISPATCHED'; stepId: string; at: string }
  | { type: 'STEP_OBSERVED'; stepId: string; judgement: StepJudgement; at: string }
  | { type: 'RECEIPT_ISSUED'; receiptId: string; at: string };

/** Rejected transition. Runs are never mutated on a rejected event. */
export interface RunTransitionError {
  ok: false;
  code:
    | 'run_terminal'
    | 'invalid_transition'
    | 'unknown_step'
    | 'step_not_dispatchable'
    | 'step_already_settled'
    | 'plan_not_locked'
    | 'plan_expired';
  message: string;
}

export interface RunTransitionOk {
  ok: true;
  run: Run;
  /** Step the orchestrator should act on next, if any. */
  nextStepId: string | null;
}

export type RunTransitionResult = RunTransitionOk | RunTransitionError;

/**
 * Explicit type guards.
 *
 * The repo compiles with `strict: false`, so `strictNullChecks` is off and
 * TypeScript will not narrow this union from `if (!result.ok)` alone. These
 * predicates give callers the narrowing without changing the project-wide
 * compiler settings.
 */
export function isRunTransitionError(
  result: RunTransitionResult,
): result is RunTransitionError {
  return result.ok === false;
}

export function isRunTransitionOk(result: RunTransitionResult): result is RunTransitionOk {
  return result.ok === true;
}

export function riskExceeds(actual: RunRiskLevel, max: RunRiskLevel): boolean {
  return RISK_ORDER.indexOf(actual) > RISK_ORDER.indexOf(max);
}

export function isTerminal(status: RunStatus): boolean {
  return TERMINAL_RUN_STATUSES.includes(status);
}

/**
 * Map a run to the single phase word shown in Live Verification.
 * Terminal statuses win; otherwise the in-flight step decides.
 */
export function runPhase(run: Run): StepPhase {
  switch (run.status) {
    case 'VERIFIED':
      return 'Verified';
    case 'NEEDS_REVIEW':
      return 'Needs review';
    case 'BLOCKED':
    case 'CANCELLED':
      return 'Blocked';
    case 'DRAFT':
      return 'Planning';
    default:
      break;
  }

  const active = run.steps.find(
    (step) => step.status === 'VERIFIED' || step.status === 'DISPATCHED',
  );
  if (!active) return 'Verifying';
  return active.status === 'DISPATCHED' ? active.phase : 'Verifying';
}
