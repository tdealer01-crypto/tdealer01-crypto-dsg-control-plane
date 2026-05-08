import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { recordGovernanceDecisionEvent } from '../../../../lib/governance/decision-recorder';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

interface PauseGovernanceDecisionRequest {
  decisionId: string;
  reason?: string;
}

/**
 * POST /api/dsg/governance/pause/:decisionId
 * 
 * Pause a governance decision during execution.
 * 
 * Requirements:
 * - User must have org.manage_agents permission
 * - decisionId must belong to user's org
 * - Records pause event to append-only ledger
 * 
 * This is a placeholder for future execution pause logic.
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
    const body = (await request.json()) as PauseGovernanceDecisionRequest;
    if (!body.decisionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing decisionId' },
        { status: 400 }
      );
    }

    // Verify decisionId belongs to orgId
    const supabase = getSupabaseAdmin();
    const { data: event, error } = await supabase
      .from('dsg_governance_decision_events')
      .select('id, org_id')
      .eq('decision_id', body.decisionId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (error || !event) {
      return NextResponse.json(
        { ok: false, error: 'Decision not found or unauthorized' },
        { status: 404 }
      );
    }

    // Record pause event
    const recorded = await recordGovernanceDecisionEvent({
      orgId,
      decisionId: body.decisionId,
      action: 'pause',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      reason: body.reason,
    });

    if (!recorded) {
      return NextResponse.json(
        { ok: false, error: 'Failed to record pause event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      decisionId: body.decisionId,
      action: 'pause',
      pausedAt: new Date().toISOString(),
      pausedBy: userId,
    });
  } catch (error) {
    console.error('POST /api/dsg/governance/pause failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
