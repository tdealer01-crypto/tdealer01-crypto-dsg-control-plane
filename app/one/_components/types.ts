/**
 * Client-side view of the run API payloads.
 *
 * Structurally mirrors lib/dsg-one/run/types.ts but is declared separately so
 * the browser bundle never pulls in the server module (which reaches into
 * node:crypto and the Supabase admin client).
 */

export interface RunPlanStepView {
  stepId: string;
  ordinal: number;
  summary: string;
  actionType: string;
  targetSystem: string;
  operation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  phase: string;
}

export interface RunStepView extends RunPlanStepView {
  status: 'PENDING' | 'VERIFIED' | 'DISPATCHED' | 'PASSED' | 'REVIEW' | 'BLOCKED' | 'SKIPPED';
  gateVerdict: 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED' | null;
  judgement: { status: string; reasons: string[]; message: string | null } | null;
  dispatchedAt: string | null;
  settledAt: string | null;
}

export interface RunPlanView {
  intent: string;
  steps: RunPlanStepView[];
  allowedTargetSystems: string[];
  allowedOperations: string[];
  maxRiskLevel: string;
  exclusions: string[];
  policyVersion: string;
}

export interface RunView {
  runId: string;
  status: 'DRAFT' | 'LOCKED' | 'RUNNING' | 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED' | 'CANCELLED';
  plan: RunPlanView;
  planHash: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  steps: RunStepView[];
  receiptId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunSummaryView {
  runId: string;
  status: RunView['status'];
  phase: string;
  intent: string;
  planHash: string | null;
  receiptId: string | null;
  stepCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptCheckView {
  label: string;
  status: 'PASS' | 'REVIEW' | 'BLOCK' | 'SKIPPED';
  detail: string | null;
}

export interface RunReceiptView {
  receiptId: string;
  runId: string;
  issuedAt: string;
  result: 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED';
  requestedAction: string;
  checks: ReceiptCheckView[];
  evidenceCount: number;
  chain: {
    planHash: string;
    outcomeHash: string;
    evidenceHash: string;
    receiptHash: string;
  };
  boundary: {
    executedByDsg: boolean;
    externalZ3SolverInvoked: boolean;
    certificationClaim: boolean;
    independentAuditClaim: boolean;
    note: string;
  };
}

export interface ReplayView {
  replayMatch: boolean;
  receiptIntact: boolean;
  verdictMatch: boolean;
  mismatchedFields: Array<{ field: string; receipt: string; replay: string; match: boolean }>;
  reason: string;
}

/** Short hash for display: 7f28...91ac */
export function shortHash(value: string | null | undefined): string {
  if (!value) return '—';
  return value.length <= 12 ? value : `${value.slice(0, 4)}...${value.slice(-4)}`;
}
