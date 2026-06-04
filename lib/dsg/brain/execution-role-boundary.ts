/**
 * Deterministic Hermes / Nango / DSG execution boundary.
 *
 * Invariants:
 * - Hermes is the worker: plans, uses skills, and executes only plan-authorized work.
 * - Nango is the credential/API authority: it holds credentials and performs real API connection work.
 * - DSG is the control plane: it locks scope, verifies alignment, handles approval, audit, and evidence.
 * - DSG must not block execution that is already plan-authorized, scope-aligned, approval-satisfied,
 *   and evidence-writable; it only denies unsupported claims or actions outside the approved plan.
 */

export type ExecutionBoundaryActor = 'hermes' | 'nango' | 'dsg';

export type ExecutionBoundaryAction =
  | 'plan'
  | 'use_skill'
  | 'execute_authorized_plan'
  | 'hold_credentials'
  | 'connect_real_api'
  | 'verify_plan_alignment'
  | 'lock_scope'
  | 'approve'
  | 'record_audit'
  | 'record_evidence'
  | 'deny_unsupported_claim';

export type ExecutionBoundaryDecision = 'allow' | 'needs_user_takeover' | 'deny';

export interface ExecutionBoundaryInput {
  actor: ExecutionBoundaryActor;
  action: ExecutionBoundaryAction;
  planAuthorized: boolean;
  scopeAligned: boolean;
  approvalSatisfied: boolean;
  auditWritable: boolean;
  evidenceWritable: boolean;
  unsupportedClaim?: boolean;
  outsideApprovedPlan?: boolean;
  requiresRealCredential?: boolean;
}

export interface ExecutionBoundaryVerdict {
  decision: ExecutionBoundaryDecision;
  reasons: string[];
}

const HERMES_ACTIONS = new Set<ExecutionBoundaryAction>([
  'plan',
  'use_skill',
  'execute_authorized_plan',
]);

const NANGO_ACTIONS = new Set<ExecutionBoundaryAction>([
  'hold_credentials',
  'connect_real_api',
]);

const DSG_ACTIONS = new Set<ExecutionBoundaryAction>([
  'verify_plan_alignment',
  'lock_scope',
  'approve',
  'record_audit',
  'record_evidence',
  'deny_unsupported_claim',
]);

export function decideExecutionBoundary(input: ExecutionBoundaryInput): ExecutionBoundaryVerdict {
  const reasons: string[] = [];

  if (input.unsupportedClaim) reasons.push('unsupported_claim');
  if (input.outsideApprovedPlan) reasons.push('outside_approved_plan');
  if (!input.scopeAligned) reasons.push('scope_not_aligned');
  if (!input.auditWritable) reasons.push('audit_not_writable');
  if (!input.evidenceWritable) reasons.push('evidence_not_writable');

  if (input.actor === 'hermes') {
    if (!HERMES_ACTIONS.has(input.action)) reasons.push('hermes_must_not_hold_credentials_or_approve');
    if (input.action === 'execute_authorized_plan' && !input.planAuthorized) reasons.push('plan_not_authorized');
    if (input.requiresRealCredential) reasons.push('route_real_credentials_through_nango');
  }

  if (input.actor === 'nango' && !NANGO_ACTIONS.has(input.action)) {
    reasons.push('nango_is_not_planner_or_approval_authority');
  }

  if (input.actor === 'dsg' && !DSG_ACTIONS.has(input.action)) {
    reasons.push('dsg_is_control_plane_not_worker_or_credential_holder');
  }

  if (input.action === 'approve' && !input.approvalSatisfied) {
    return { decision: 'needs_user_takeover', reasons: [...reasons, 'approval_required'] };
  }

  if (reasons.length > 0) return { decision: 'deny', reasons };

  return { decision: 'allow', reasons: ['plan_aligned_and_evidence_bound'] };
}
