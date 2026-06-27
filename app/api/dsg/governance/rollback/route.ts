import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { recordGovernanceDecisionEvent } from '@/lib/governance/decision-recorder';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { fireWebhook } from '@/lib/webhooks/deliver';

export const dynamic = 'force-dynamic';

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

interface RollbackGovernanceDecisionRequest {
  decisionId: string;
  preStateHash: string;
  preStateEvidenceId?: string;
  preStateEvidenceHash?: string;
  compensationPlanId: string;
  compensationActionHash: string;
  reason: string;
}

function missing(value: unknown) {
  return typeof value !== 'string' || value.trim() === '';
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOrgPermission('org.manage_agents');
    if (auth.ok === false) {
      const denied = auth as DeniedAuth;
      return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
    }

    const body = (await request.json()) as RollbackGovernanceDecisionRequest;
    const decisionId = body.decisionId?.trim();

    if (!decisionId) {
      return NextResponse.json({ ok: false, error: 'missing_decision_id' }, { status: 400 });
    }

    if (missing(body.preStateHash)) {
      return NextResponse.json({ ok: false, error: 'missing_pre_state_hash' }, { status: 400 });
    }

    if (missing(body.preStateEvidenceId) && missing(body.preStateEvidenceHash)) {
      return NextResponse.json({ ok: false, error: 'missing_pre_state_evidence' }, { status: 400 });
    }

    if (missing(body.compensationPlanId)) {
      return NextResponse.json({ ok: false, error: 'missing_compensation_plan_id' }, { status: 400 });
    }

    if (missing(body.compensationActionHash)) {
      return NextResponse.json({ ok: false, error: 'missing_compensation_action_hash' }, { status: 400 });
    }

    if (missing(body.reason)) {
      return NextResponse.json({ ok: false, error: 'missing_rollback_reason' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin() as any;
    const { data: event, error } = await supabase
      .from('dsg_governance_decision_events')
      .select('id, org_id, decision_id')
      .eq('decision_id', decisionId)
      .eq('org_id', auth.orgId)
      .limit(1)
      .maybeSingle();

    if (error || !event) {
      return NextResponse.json({ ok: false, error: 'decision_not_found_or_unauthorized' }, { status: 404 });
    }

    const rolledBackAt = new Date().toISOString();
    const recorded = await recordGovernanceDecisionEvent({
      orgId: auth.orgId,
      decisionId,
      action: 'rollback',
      actorId: auth.userId,
      actorRole: auth.role,
      actionAt: rolledBackAt,
      reason: body.reason.trim(),
      metadata: {
        preStateHash: body.preStateHash.trim(),
        preStateEvidenceId: body.preStateEvidenceId?.trim() || null,
        preStateEvidenceHash: body.preStateEvidenceHash?.trim() || null,
        compensationPlanId: body.compensationPlanId.trim(),
        compensationActionHash: body.compensationActionHash.trim(),
      },
    });

    if (!recorded) {
      return NextResponse.json({ ok: false, error: 'failed_to_record_rollback_event' }, { status: 500 });
    }

    void fireWebhook(auth.orgId, 'governance.decision_rollback', {
      decision_id: decisionId,
      rolled_back_at: rolledBackAt,
      actor_role: auth.role,
      compensation_plan_id: body.compensationPlanId.trim(),
    });

    return NextResponse.json({
      ok: true,
      decisionId,
      action: 'rollback',
      rolledBackAt,
      actor: {
        userId: auth.userId,
        role: auth.role,
      },
      compensationPlanId: body.compensationPlanId.trim(),
      eventRecorded: true,
      boundary: {
        statement: 'Rollback request was recorded as internal governance evidence. Compensation execution must be verified separately.',
        certificationClaim: false,
      },
    });
  } catch (error) {
    console.error('POST /api/dsg/governance/rollback failed:', error);
    return NextResponse.json({ ok: false, error: 'internal_server_error' }, { status: 500 });
  }
}
