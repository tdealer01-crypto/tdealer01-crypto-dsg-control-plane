import { createHash, randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../supabase-server';
import { resolveQuickstartPolicyId } from '../supabase/resolve-policy';

const TRIAL_EXECUTION_LIMIT = 1000;

export type StarterAgentResult = {
  agent_id: string;
  name: string;
  policy_id: string;
  status: string;
  monthly_limit: number;
  api_key: string;
  api_key_preview: string;
  created: boolean;
};

type StarterAgentErrorCode = 'starter-agent-disabled' | 'policy-missing' | 'db-error';

export class StarterAgentError extends Error {
  constructor(
    message: string,
    public readonly code: StarterAgentErrorCode,
  ) {
    super(message);
    this.name = 'StarterAgentError';
  }
}

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function buildPreview(apiKey: string) {
  return `${apiKey.slice(0, 12)}...`;
}

export async function ensureStarterAgent(orgId: string): Promise<StarterAgentResult> {
  const admin = getSupabaseAdmin();
  const { data: existingAgent, error: existingAgentError } = await admin
    .from('agents')
    .select('id, name, policy_id, status, monthly_limit')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingAgentError) {
    throw new StarterAgentError('Failed to load starter agent', 'db-error');
  }

  const apiKey = buildApiKey();
  const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

  if (existingAgent) {
    if (existingAgent.status === 'disabled') {
      throw new StarterAgentError('Starter agent is disabled. Create a new one.', 'starter-agent-disabled');
    }

    const { error: rotateError } = await admin
      .from('agents')
      .update({ api_key_hash: apiKeyHash, updated_at: new Date().toISOString() })
      .eq('id', existingAgent.id)
      .eq('org_id', orgId);

    if (rotateError) {
      throw new StarterAgentError('Failed to rotate starter agent key', 'db-error');
    }

    return {
      agent_id: existingAgent.id,
      name: existingAgent.name,
      policy_id: existingAgent.policy_id,
      status: existingAgent.status,
      monthly_limit: existingAgent.monthly_limit,
      api_key: apiKey,
      api_key_preview: buildPreview(apiKey),
      created: false,
    };
  }

  const resolvedPolicyId = await resolveQuickstartPolicyId(orgId);
  if (!resolvedPolicyId) {
    throw new StarterAgentError('No policy available. Create a policy before creating an agent.', 'policy-missing');
  }

  const agentId = `agt_${randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await admin
    .from('agents')
    .insert({
      id: agentId,
      org_id: orgId,
      name: 'Starter Agent',
      policy_id: resolvedPolicyId,
      status: 'active',
      monthly_limit: TRIAL_EXECUTION_LIMIT,
      api_key_hash: apiKeyHash,
      created_at: now,
      updated_at: now,
    })
    .select('id, name, policy_id, status, monthly_limit')
    .single();

  if (insertError || !inserted) {
    throw new StarterAgentError('Failed to create starter agent', 'db-error');
  }

  return {
    agent_id: inserted.id,
    name: inserted.name,
    policy_id: inserted.policy_id,
    status: inserted.status,
    monthly_limit: inserted.monthly_limit,
    api_key: apiKey,
    api_key_preview: buildPreview(apiKey),
    created: true,
  };
}
