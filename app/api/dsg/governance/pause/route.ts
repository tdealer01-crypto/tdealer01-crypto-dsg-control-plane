import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { recordGovernanceDecisionEvent } from '@/lib/governance/decision-recorder';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface PauseGovernanceDecisionRequest {
  decisionId: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOrgPermission('org.manage_agents');
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as PauseGovernanceDecisionRequest;
    const decisionId = body.decisionId?.trim();

    if (!decisionId) {
      return NextResponse.json({ ok: false, error: 'missing_decision_id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
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

    const pausedAt = new Date().toISOString();
    const recorded = await recordGovernanceDecisionEvent({
      orgId: auth.orgId,
      decisionId,
      action: 'pause',
      actorId: auth.userId,
      actorRole: auth.role,
      actionAt: pausedAt,
      reason: body.reason,
    });

    if (!recorded) {
      return NextResponse.json({ ok: false, error: 'failed_to_record_pause_event' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      decisionId,
      action: 'pause',
      pausedAt,
      actor: {
        userId: auth.userId,
        role: auth.role,
      },
      boundary: {
        statement: 'Pause was recorded as internal governance evidence. This is not a certification claim.',
        certificationClaim: false,
      },
    });
  } catch (error) {
    console.error('POST /api/dsg/governance/pause failed:', error);
    return NextResponse.json({ ok: false, error: 'internal_server_error' }, { status: 500 });
  }
}
