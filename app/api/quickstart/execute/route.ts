import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { executeSpineIntent, issueSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';

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

export async function POST(request: Request) {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    const apiKey = String(body?.api_key || '').trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'api_key is required. Create or reissue starter agent key first.' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: starterAgent, error: agentError } = await admin
      .from('agents')
      .select('id')
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (agentError) {
      logApiError('api/quickstart/execute', agentError, { stage: 'load-starter-agent' });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (!starterAgent?.id) {
      return NextResponse.json(
        { error: 'Create starter agent first via /api/quickstart/agent' },
        { status: 400 }
      );
    }

    const payload = normalizeSpinePayload({
      agent_id: starterAgent.id,
      action: 'quickstart-demo',
      input: {
        prompt: 'run quickstart deterministic safety validation',
        risk_score: 0.25,
      },
      context: {
        source: 'quickstart',
        audience: 'trial-user',
      },
    });

    const issueResult = await issueSpineIntent({
      orgId: access.orgId,
      apiKey,
      payload,
    });

    if (!issueResult.ok) {
      return NextResponse.json(issueResult.body, { status: issueResult.status });
    }

    const executeResult = await executeSpineIntent({
      orgId: access.orgId,
      apiKey,
      payload,
    });

    if (!executeResult.ok) {
      return NextResponse.json(executeResult.body, { status: executeResult.status });
    }

    return NextResponse.json({
      request_id: executeResult.body.request_id,
      decision: executeResult.body.decision,
      reason: executeResult.body.reason,
      latency_ms: executeResult.body.latency_ms,
      audit_id: null,
    });
  } catch (error) {
    logApiError('api/quickstart/execute', error, { stage: 'unhandled' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
