import { getSupabaseAdmin } from '../supabase-server';

export async function validateOrgAgentScope(input: { orgId?: string | null; agentId?: string | null }) {
  const orgId = input.orgId ? String(input.orgId) : '';
  const agentId = input.agentId ? String(input.agentId) : '';

  if (!orgId || !agentId) {
    return { ok: false as const, status: 400, error: 'org_id and agent_id are required' };
  }

  const supabase = getSupabaseAdmin();
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, org_id, status')
    .eq('id', agentId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  if (!agent) {
    return { ok: false as const, status: 404, error: 'Agent not found in org scope' };
  }

  return { ok: true as const, orgId, agentId, agentStatus: String(agent.status || '') };
}
