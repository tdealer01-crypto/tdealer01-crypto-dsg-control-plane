import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString().slice(0, 7);

    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name, policy_id, status, monthly_limit')
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = await Promise.all(
      (agents || []).map(async (agent) => {
        const { data: usageCounter } = await supabase
          .from('usage_counters')
          .select('executions')
          .eq('org_id', access.orgId)
          .eq('agent_id', agent.id)
          .eq('billing_period', now)
          .maybeSingle();

        return {
          agent_id: agent.id,
          name: agent.name,
          policy_id: agent.policy_id,
          status: agent.status,
          monthly_limit: agent.monthly_limit,
          usage_this_month: Number(usageCounter?.executions || 0),
          api_key_preview: 'hidden',
        };
      })
    );

    return NextResponse.json({
      items,
      agents: items,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    if (!body?.name || !body?.policy_id) {
      return NextResponse.json(
        { error: 'name and policy_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const apiKey = buildApiKey();
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    const agentId = `agt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        org_id: access.orgId,
        name: String(body.name),
        policy_id: String(body.policy_id),
        status: 'active',
        monthly_limit: Number(body.monthly_limit || 10000),
        api_key_hash: apiKeyHash,
        created_at: now,
        updated_at: now,
      })
      .select('id, name, policy_id, status, monthly_limit')
      .single();

    if (error || !inserted) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create agent' },
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
