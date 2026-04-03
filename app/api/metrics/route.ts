import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

async function requireActiveProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const, orgId: String(profile.org_id) };
}

export async function GET() {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: executions, error: executionsError } = await supabase
      .from('executions')
      .select('decision, latency_ms, created_at')
      .eq('org_id', access.orgId)
      .gte('created_at', todayStart.toISOString());

    if (executionsError) {
      logApiError('api/metrics', executionsError, { stage: 'executions-query' });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    const { count: activeAgents, error: agentError } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', access.orgId)
      .eq('status', 'active');

    if (agentError) {
      logApiError('api/metrics', agentError, { stage: 'agents-query' });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    const total = (executions || []).length;
    const allow = (executions || []).filter((row) => row.decision === 'ALLOW').length;
    const block = (executions || []).filter((row) => row.decision === 'BLOCK').length;
    const stabilize = (executions || []).filter((row) => row.decision === 'STABILIZE').length;

    const avgLatencyMs = total
      ? Math.round(
          (executions || []).reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) / total
        )
      : 0;

    return NextResponse.json({
      requests_today: total,
      allow_rate: total ? allow / total : 0,
      block_rate: total ? block / total : 0,
      stabilize_rate: total ? stabilize / total : 0,
      active_agents: Number(activeAgents || 0),
      avg_latency_ms: avgLatencyMs,
    });
  } catch (error) {
    logApiError('api/metrics', error, { stage: 'unhandled' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
