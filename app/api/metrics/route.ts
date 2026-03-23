import { NextResponse } from 'next/server';

import { getApiAuthContext } from '../../../lib/auth/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth.ok) {
      return auth.response;
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);

    const { data: executions, error: executionsError } = await supabase
      .from('executions')
      .select('decision, latency_ms, created_at')
      .eq('org_id', auth.profile.org_id);

    if (executionsError) {
      return NextResponse.json({ error: executionsError.message }, { status: 500 });
    }

    const { count: activeAgents, error: agentError } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', auth.profile.org_id)
      .eq('status', 'active');

    if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500 });
    }

    const todayExecutions = (executions || []).filter((row) => String(row.created_at || '').startsWith(today));
    const total = todayExecutions.length;

    const allow = todayExecutions.filter((row) => row.decision === 'ALLOW').length;
    const block = todayExecutions.filter((row) => row.decision === 'BLOCK').length;
    const stabilize = todayExecutions.filter((row) => row.decision === 'STABILIZE').length;

    const avgLatencyMs = total
      ? Math.round(
          todayExecutions.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) / total
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
