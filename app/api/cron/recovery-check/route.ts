import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { validateRuntimeRecovery } from '../../../../lib/runtime/recovery';

function hasValidCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, org_id')
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: 'Failed to load active agents' }, { status: 500 });
  }

  const checks = await Promise.all(
    (agents || []).map(async (agent) => {
      const result = await validateRuntimeRecovery({ orgId: String(agent.org_id), agentId: String(agent.id) });
      if (!result.pass) {
        console.error('[recovery-check]', {
          org_id: result.org_id,
          agent_id: result.agent_id,
          hash_match: result.hash_match,
          missing_lineage: result.missing_lineage,
        });
      }
      return result;
    }),
  );

  const failed = checks.filter((item) => !item.pass);
  return NextResponse.json({
    ok: failed.length === 0,
    checked_agents: checks.length,
    failed_agents: failed.length,
    failures: failed,
  });
}
