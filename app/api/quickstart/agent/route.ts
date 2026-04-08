import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { resolveQuickstartPolicyId } from '../../../../lib/supabase/resolve-policy';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

const TRIAL_EXECUTION_LIMIT = 1000;
const QUICKSTART_AGENT_RATE_LIMIT = 10;
const QUICKSTART_AGENT_RATE_WINDOW_MS = 60 * 1000;

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function buildPreview(apiKey: string) {
  return `${apiKey.slice(0, 12)}...`;
}

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'quickstart-agent'),
    limit: QUICKSTART_AGENT_RATE_LIMIT,
    windowMs: QUICKSTART_AGENT_RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, QUICKSTART_AGENT_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers });
    }

    const admin = getSupabaseAdmin();

    const { data: existingAgent, error: existingAgentError } = await admin
      .from('agents')
      .select('id, name, policy_id, status, monthly_limit')
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingAgentError) {
      logApiError('api/quickstart/agent', existingAgentError, { stage: 'existing-agent-query' });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500, headers });
    }

    const apiKey = buildApiKey();
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    if (existingAgent) {
      if (existingAgent.status === 'disabled') {
        return NextResponse.json(
          { error: 'Starter agent is disabled. Create a new one.' },
          { status: 400, headers }
        );
      }

      const { error: rotateError } = await admin
        .from('agents')
        .update({ api_key_hash: apiKeyHash, updated_at: new Date().toISOString() })
        .eq('id', existingAgent.id)
        .eq('org_id', access.orgId);

      if (rotateError) {
        logApiError('api/quickstart/agent', rotateError, { stage: 'rotate-api-key', agentId: existingAgent.id });
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500, headers });
      }

      return NextResponse.json({
        agent_id: existingAgent.id,
        name: existingAgent.name,
        policy_id: existingAgent.policy_id,
        status: existingAgent.status,
        monthly_limit: existingAgent.monthly_limit,
        api_key: apiKey,
        api_key_preview: buildPreview(apiKey),
        created: false,
      }, { headers });
    }

    const resolvedPolicyId = await resolveQuickstartPolicyId(access.orgId);
    if (!resolvedPolicyId) {
      return NextResponse.json(
        { error: 'No policy available. Create a policy before creating an agent.' },
        { status: 400, headers }
      );
    }

    const agentId = `agt_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await admin
      .from('agents')
      .insert({
        id: agentId,
        org_id: access.orgId,
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
      logApiError('api/quickstart/agent', insertError, { stage: 'insert-agent' });
      return NextResponse.json(
        { error: internalErrorMessage() },
        { status: 500, headers }
      );
    }

    return NextResponse.json({
      agent_id: inserted.id,
      name: inserted.name,
      policy_id: inserted.policy_id,
      status: inserted.status,
      monthly_limit: inserted.monthly_limit,
      api_key: apiKey,
      api_key_preview: buildPreview(apiKey),
      created: true,
    }, { headers });
  } catch (error) {
    logApiError('api/quickstart/agent', error, { stage: 'unhandled' });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers }
    );
  }
}
