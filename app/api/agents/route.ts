import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function buildPreview(apiKey: string) {
  return `${apiKey.slice(0, 12)}...`;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString().slice(0, 7);

    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name, policy_id, status, monthly_limit');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = await Promise.all(
      (agents || []).map(async (agent) => {
        const { data: usageCounter } = await supabase
          .from('usage_counters')
          .select('executions')
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

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const { data: existingOrg } = await supabase
      .from('agents')
      .select('org_id')
      .limit(1)
      .maybeSingle();

    const orgId = existingOrg?.org_id || 'org_demo';

    const { data: inserted, error } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        org_id: orgId,
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
