import { createHash } from 'crypto';
import { getSupabaseAdmin } from './supabase-server';

export type AgentAccess =
  | {
      ok: true;
      agentId: string;
      orgId: string;
      policyId: string | null;
      agentStatus: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function requireActiveAgentFromBearer(
  request: Request,
  agentIdInput: unknown
): Promise<AgentAccess> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing Bearer token' };
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return { ok: false, status: 401, error: 'Empty API key' };
  }

  if (typeof agentIdInput !== 'string' || !agentIdInput.trim()) {
    return { ok: false, status: 400, error: 'agent_id is required' };
  }

  const agentId = agentIdInput.trim();
  const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

  const supabase = getSupabaseAdmin();
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, org_id, policy_id, status')
    .eq('id', agentId)
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error || !agent) {
    return { ok: false, status: 401, error: 'Invalid agent_id or API key' };
  }

  if (agent.status !== 'active') {
    return { ok: false, status: 403, error: 'Agent is not active' };
  }

  return {
    ok: true,
    agentId: String(agent.id),
    orgId: String(agent.org_id),
    policyId: agent.policy_id ? String(agent.policy_id) : null,
    agentStatus: String(agent.status),
  };
}
