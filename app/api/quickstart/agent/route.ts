import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';

const TRIAL_EXECUTION_LIMIT = 1000;

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function buildPreview(apiKey: string) {
  return `${apiKey.slice(0, 12)}...`;
}

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

export async function POST() {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (existingAgent) {
      return NextResponse.json({
        agent_id: existingAgent.id,
        name: existingAgent.name,
        policy_id: existingAgent.policy_id,
        status: existingAgent.status,
        monthly_limit: existingAgent.monthly_limit,
        api_key: null,
        api_key_preview: null,
        created: false,
      });
    }

    const apiKey = buildApiKey();
    const agentId = `agt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await admin
      .from('agents')
      .insert({
        id: agentId,
        org_id: access.orgId,
        name: 'Starter Agent',
        policy_id: 'policy_default',
        status: 'active',
        monthly_limit: TRIAL_EXECUTION_LIMIT,
        api_key_hash: createHash('sha256').update(apiKey).digest('hex'),
        created_at: now,
        updated_at: now,
      })
      .select('id, name, policy_id, status, monthly_limit')
      .single();

    if (insertError || !inserted) {
      logApiError('api/quickstart/agent', insertError, { stage: 'insert-agent' });
      return NextResponse.json(
        { error: internalErrorMessage() },
        { status: 500 }
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
    });
  } catch (error) {
    logApiError('api/quickstart/agent', error, { stage: 'unhandled' });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 }
    );
  }
}
