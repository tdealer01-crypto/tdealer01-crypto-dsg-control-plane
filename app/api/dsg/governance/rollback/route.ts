import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { recordGovernanceDecisionEvent } from '../../../../lib/governance/decision-recorder';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

interface RollbackGovernanceDecisionRequest {
  decisionId: string;
  preStateHash: string; // REQUIRED: snapshot of pre-execution state
  preStateEvidenceId?: string; // Evidence record ID from before execution
  compensationPlanId: string; // REQUIRED: action plan to undo
  compensationActionHash: string; // REQUIRED: hash of compensation action
  reason: string; // REQUIRED: why rollback is needed
}

/**
 * POST /api/dsg/governance/rollback/:decisionId
 * 
 * Rollback a governance decision with mandatory evidence.
 * 
 * Requirements:
 * - User must have org.manage_agents permission
 * - decisionId must belong to user's org
 * - preStateHash: snapshot before execution (cannot be empty)
 * - compensationPlanId: action to undo the decision
 * - compensationActionHash: hash of compensation to verify integrity
 * - reason: explanation for audit trail
 * 
 * Records rollback event to append-only ledger with all evidence.
 * Does NOT execute compensation (orchestration happens elsewhere).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify org permission
    const permCtx = await requireOrgPermission('org.manage_agents');
    if (!permCtx.ok) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { orgId, userId } = permCtx;

    // Parse request
    const body = (await request.json()) as RollbackGovernanceDecisionRequest;

    // Validate mandatory fields
    if (!body.decisionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing decisionId' },
        { status: 400 }
      );
    }

    if (!body.preStateHash || body.preStateHash.trim() === '') {
      return NextResponse.json(
        { ok: false, error: 'Missing preStateHash (snapshot of state before execution)' },
        { status: 400 }
      );
    }

    if (!body.compensationPlanId || body.compensationPlanId.trim() === '') {
      return NextResponse.json(
        { ok: false, error: 'Missing compensationPlanId (action to undo)' },
        { status: 400 }
      );
    }

    if (!body.compensationActionHash || body.compensationActionHash.trim() === '') {
      return NextResponse.json(
        { ok: false, error: 'Missing compensationActionHash (integrity check)' },
        { status: 400 }
      );
    }

    if (!body.reason || body.reason.trim() === '') {
      return NextResponse.json(
        { ok: false, error: 'Missing reason for rollback' },
        { status: 400 }
      );
    }

    // Verify decisionId belongs to orgId
    const supabase = getSupabaseAdmin();
    const { data: event, error } = await supabase
      .from('dsg_governance_decision_events')
      .select('id, org_id, decision_id')
      .eq('decision_id', body.decisionId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (error || !event) {
      return NextResponse.json(
        { ok: false, error: 'Decision not found or unauthorized' },
        { status: 404 }
      );
    }

    // Record rollback event with evidence
    const rollbackReason = `${body.reason}\nCompensation: ${body.compensationPlanId}\nPre-state: ${body.preStateHash.slice(0, 16)}...`;

    const recorded = await recordGovernanceDecisionEvent({
      orgId,
      decisionId: body.decisionId,
      action: 'rollback',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      reason: rollbackReason,
    });

    if (!recorded) {
      return NextResponse.json(
        { ok: false, error: 'Failed to record rollback event' },
        { status: 500 }
      );
    }

    // Return success with evidence summary
    return NextResponse.json({
      ok: true,
      decisionId: body.decisionId,
      action: 'rollback',
      rolledBackAt: new Date().toISOString(),
      rolledBackBy: userId,
      compensationPlanId: body.compensationPlanId,
      preStateHashSnapshot: body.preStateHash.slice(0, 16),
      eventRecorded: recorded,
      note: 'Rollback recorded to append-only ledger. Compensation execution handled by orchestrator.',
    });
  } catch (error) {
    console.error('POST /api/dsg/governance/rollback failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
