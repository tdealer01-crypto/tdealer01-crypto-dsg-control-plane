import { resolveAgentFromApiKey } from '../agent-auth';

export function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

export async function requireWorkspaceAgent(request: Request, requestedAgentId: unknown) {
  const agentId = String(requestedAgentId ?? '').trim();
  const apiKey = extractBearerToken(request);

  if (!agentId || !apiKey) {
    return { ok: false as const, status: 401, error: 'missing_agent_credentials' };
  }

  const agent = await resolveAgentFromApiKey(agentId, apiKey);
  if (!agent || agent.status !== 'active') {
    return { ok: false as const, status: 401, error: 'invalid_or_inactive_agent' };
  }

  return {
    ok: true as const,
    agentId: String(agent.id),
    orgId: String(agent.org_id),
    policyId: agent.policy_id ? String(agent.policy_id) : null,
  };
}
