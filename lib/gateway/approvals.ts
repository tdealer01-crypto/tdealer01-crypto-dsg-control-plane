import crypto from 'node:crypto';
import { recordGovernanceDecisionEvent } from '@/lib/governance/decision-recorder';
import { getSupabaseAdmin } from '../supabase-server';
import { hashGatewayValue } from './audit';

export type GatewayApprovalStatus = 'pending' | 'approved' | 'rejected';

export type GatewayApprovalDecision = {
  ok: boolean;
  approvalToken?: string;
  approvalHash?: string;
  eventRecorded?: boolean;
  error?: string;
};

export function buildApprovalToken() {
  return `gap_${crypto.randomBytes(24).toString('hex')}`;
}

export function buildApprovalHash(value: unknown) {
  return hashGatewayValue({ type: 'dsg-gateway-approval', value });
}

export async function listPendingGatewayApprovals(orgId: string) {
  if (!orgId) {
    return { ok: false, error: 'missing_org_id', approvals: [] };
  }

  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from('gateway_monitor_events')
    .select('*')
    .eq('org_id', orgId)
    .eq('decision', 'review')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return { ok: false, error: error.message, approvals: [] };
  }

  return { ok: true, approvals: data ?? [] };
}

export async function decideGatewayApproval(input: {
  orgId: string;
  auditToken: string;
  decision: 'approved' | 'rejected';
  reviewerId: string;
  reviewerRole: string;
  note?: string;
}): Promise<GatewayApprovalDecision> {
  if (!input.orgId) return { ok: false, error: 'missing_org_id' };
  if (!input.auditToken) return { ok: false, error: 'missing_audit_token' };
  if (!input.reviewerId) return { ok: false, error: 'missing_reviewer_id' };
  if (!input.reviewerRole) return { ok: false, error: 'missing_reviewer_role' };

  const supabase = getSupabaseAdmin() as any;
  const { data: event, error: readError } = await supabase
    .from('gateway_monitor_events')
    .select('id, org_id, audit_token, decision, request_hash, constraints, input')
    .eq('org_id', input.orgId)
    .eq('audit_token', input.auditToken)
    .maybeSingle();

  if (readError) {
    throw new Error(`failed_to_read_approval_event:${readError.message}`);
  }

  if (!event) {
    return { ok: false, error: 'audit_token_not_found' };
  }

  if (event.decision !== 'review') {
    return { ok: false, error: 'event_not_waiting_for_review' };
  }

  const decidedAt = new Date().toISOString();
  const approvalToken = input.decision === 'approved' ? buildApprovalToken() : undefined;
  const approvalHash = buildApprovalHash({
    orgId: input.orgId,
    auditToken: input.auditToken,
    requestHash: event.request_hash,
    decision: input.decision,
    reviewerId: input.reviewerId,
    reviewerRole: input.reviewerRole,
    note: input.note ?? null,
    approvalToken: approvalToken ?? null,
    decidedAt,
  });

  const eventRecorded = await recordGovernanceDecisionEvent({
    orgId: input.orgId,
    decisionId: String(event.id),
    gateId: String(event.audit_token),
    decision: input.decision === 'approved' ? 'PASS' : 'BLOCK',
    action: input.decision === 'approved' ? 'approve' : 'reject',
    actorId: input.reviewerId,
    actorRole: input.reviewerRole,
    actionAt: decidedAt,
    reason: input.note,
    metadata: {
      requestHash: event.request_hash,
      approvalHash,
      approvalToken: approvalToken ?? null,
    },
  });

  if (!eventRecorded) {
    return { ok: false, error: 'failed_to_record_governance_decision_event' };
  }

  const nextStatus: GatewayApprovalStatus = input.decision;
  const nextConstraints = {
    ...(event.constraints ?? {}),
    approval: {
      status: nextStatus,
      reviewerId: input.reviewerId,
      reviewerRole: input.reviewerRole,
      note: input.note ?? null,
      approvalHash,
      approvalToken: approvalToken ?? null,
      decidedAt,
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
    .eq('id', event.id)
    .eq('org_id', input.orgId);

  if (updateError) {
    throw new Error(`failed_to_update_approval_event:${updateError.message}`);
  }

  return {
    ok: true,
    approvalToken,
    approvalHash,
    eventRecorded,
  };
}
