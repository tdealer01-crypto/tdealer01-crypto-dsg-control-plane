import { requireOrgPermission } from '../auth/require-org-permission';
import { recordGovernanceDecisionEvent } from '../governance/decision-recorder';
import { getSupabaseAdmin } from '../supabase-server';
import { buildApprovalHash, buildApprovalToken } from './approvals';

export type HardenedApprovalDecisionInput = {
  auditToken: string;
  decision: 'approved' | 'rejected';
  note?: string;
};

export type HardenedApprovalDecisionResult = {
  ok: boolean;
  approvalToken?: string;
  approvalHash?: string;
  eventRecorded?: boolean;
  error?: string;
};

/**
 * Process hardened approval decision using authenticated context.
 * 
 * Flow:
 * 1. Verify org permission (requireOrgPermission with org.manage_agents)
 * 2. Lookup audit event in gateway_monitor_events
 * 3. Verify decision is 'review' and matches org_id
 * 4. Build approval hash
 * 5. Record decision event (approve/reject action)
 * 6. Update gateway_monitor_events with approval metadata
 * 7. Return approval token + hash
 * 
 * CRITICAL:
 * - reviewerId and reviewerRole come from auth context, NOT request body
 * - All actions scoped to orgId from session
 * - Decision events are append-only
 * - No fallback to fake identities
 */
export async function decideGatewayApprovalHardened(
  input: HardenedApprovalDecisionInput
): Promise<HardenedApprovalDecisionResult> {
  // Step 1: Verify org permission (requires strong permission: org.manage_agents)
  const permCtx = await requireOrgPermission('org.manage_agents');
  
  if (!permCtx.ok) {
    return {
      ok: false,
      error: `Unauthorized: ${permCtx.error}`,
    };
  }

  const { orgId, userId, email, role } = permCtx;

  // Step 2: Lookup audit event
  const supabase = getSupabaseAdmin();
  const { data: event, error: readError } = await supabase
    .from('gateway_monitor_events')
    .select('id, org_id, audit_token, decision, request_hash, constraints, input')
    .eq('org_id', orgId)
    .eq('audit_token', input.auditToken)
    .maybeSingle();

  if (readError) {
    console.error('Failed to read approval event:', readError.message, { orgId, auditToken: input.auditToken });
    return {
      ok: false,
      error: `Failed to read event: ${readError.message}`,
    };
  }

  if (!event) {
    return {
      ok: false,
      error: 'Audit token not found (may be wrong org or already decided)',
    };
  }

  // Step 3: Verify decision is 'review'
  if (event.decision !== 'review') {
    return {
      ok: false,
      error: `Event is not in review state (current: ${event.decision})`,
    };
  }

  // Step 4: Build approval hash
  const approvalToken = input.decision === 'approved' ? buildApprovalToken() : undefined;
  const approvalHash = buildApprovalHash({
    orgId,
    auditToken: input.auditToken,
    requestHash: event.request_hash,
    decision: input.decision,
    reviewerId: userId, // From auth, not body
    reviewerRole: role, // From auth, not body
    note: input.note ?? null,
    approvalToken: approvalToken ?? null,
  });

  // Step 5: Record decision event (append-only)
  const eventRecorded = await recordGovernanceDecisionEvent({
    orgId,
    decisionId: event.id,
    gateId: event.audit_token,
    decision: input.decision === 'approved' ? 'PASS' : 'BLOCK',
    action: input.decision === 'approved' ? 'approve' : 'reject',
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
    reason: input.note,
  });

  if (!eventRecorded) {
    console.error('Failed to record decision event', { orgId, decisionId: event.id });
    // Continue anyway - decision event is nice-to-have audit trail
  }

  // Step 6: Update gateway_monitor_events
  const nextStatus = input.decision;
  const nextConstraints = {
    ...(event.constraints ?? {}),
    approval: {
      status: nextStatus,
      reviewerId: userId,
      reviewerRole: role,
      note: input.note ?? null,
      approvalHash,
      approvalToken: approvalToken ?? null,
      decidedAt: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase
    .from('gateway_monitor_events')
    .update({
      status: nextStatus,
      decision: input.decision === 'approved' ? 'allow' : 'block',
      constraints: nextConstraints,
      decision_hash: approvalHash,
    })
    .eq('id', event.id);

  if (updateError) {
    console.error('Failed to update approval event:', updateError.message, { eventId: event.id });
    return {
      ok: false,
      error: `Failed to commit decision: ${updateError.message}`,
    };
  }

  // Step 7: Return success
  return {
    ok: true,
    approvalToken,
    approvalHash,
    eventRecorded,
  };
}
