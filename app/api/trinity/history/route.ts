import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, parseActorContext } from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

function mapStatus(status: string): 'success' | 'failed' | 'pending' {
  if (status === 'paid' || status === 'verified') return 'success';
  if (status === 'rejected' || status === 'settlement_failed') return 'failed';
  return 'pending';
}

export async function GET(request: NextRequest) {
  try {
    const actor = parseActorContext(request.headers);
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || '20'), 1), 100);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true, executions: [], count: 0, profile: null, warning: 'Supabase not configured' });
    }

    const [jobsRes, profileRes] = await Promise.all([
      supabase
        .from('trinity_jobs')
        .select('id, title, status, updated_at, claimed_at, submitted_at')
        .eq('org_id', actor.orgId)
        .order('updated_at', { ascending: false })
        .limit(limit),
      supabase
        .from('agent_profiles')
        .select('agent_id, reputation, completed_jobs, tier')
        .eq('agent_id', actor.actorId)
        .maybeSingle(),
    ]);

    const executions = (jobsRes.data ?? []).map((row) => ({
      id: row.id,
      job_title: row.title,
      status: mapStatus(row.status),
      execution_time:
        row.claimed_at && row.submitted_at
          ? Math.max(0, new Date(row.submitted_at).getTime() - new Date(row.claimed_at).getTime())
          : 0,
      created_at: row.updated_at,
      plan_hash: `${row.id}-plan`,
      raw_status: row.status,
    }));

    return NextResponse.json({
      ok: true,
      executions,
      history: executions,
      count: executions.length,
      profile: profileRes.data
        ? {
            agentId: profileRes.data.agent_id,
            reputation: profileRes.data.reputation,
            completedJobs: profileRes.data.completed_jobs,
            tier: profileRes.data.tier,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to load execution history',
      },
      { status: 500 },
    );
  }
}
