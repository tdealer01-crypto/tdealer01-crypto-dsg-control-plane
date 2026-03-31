import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

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

    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('id, name, version, status, description, config, updated_at')
      .order('updated_at', { ascending: false });

    if (policiesError) {
      return NextResponse.json({ error: policiesError.message }, { status: 500 });
    }

    const { data: approvalHistory, error: approvalsError } = await supabase
      .from('approvals')
      .select('id, action, status, approved_at, used_at, expires_at, metadata')
      .eq('org_id', access.orgId)
      .order('approved_at', { ascending: false })
      .limit(20);

    if (approvalsError) {
      return NextResponse.json({ error: approvalsError.message }, { status: 500 });
    }

    const { data: governanceEvents, error: governanceError } = await supabase
      .from('policy_governance_events')
      .select(
        'id, policy_id, event_type, previous_state, next_state, metadata, actor_auth_user_id, created_at'
      )
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (governanceError) {
      return NextResponse.json({ error: governanceError.message }, { status: 500 });
    }

    return NextResponse.json({
      items: policies || [],
      approval_history: approvalHistory || [],
      governance_events: governanceEvents || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

type GovernancePatchBody = {
  id?: string;
  status?: string;
  description?: string | null;
  config?: {
    block_risk_score?: number;
    stabilize_risk_score?: number;
    [key: string]: unknown;
  } | null;
  reason?: string;
};

function normalizeScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

export async function PATCH(request: Request) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json().catch(() => null)) as GovernancePatchBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: currentPolicy, error: currentError } = await supabase
      .from('policies')
      .select('id, name, version, status, description, config, updated_at')
      .eq('id', body.id)
      .maybeSingle();

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    if (!currentPolicy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const nextStatus = typeof body.status === 'string' ? body.status : currentPolicy.status;
    const blockScore = normalizeScore(body.config?.block_risk_score);
    const stabilizeScore = normalizeScore(body.config?.stabilize_risk_score);
    if (body.config && (blockScore === null || stabilizeScore === null)) {
      return NextResponse.json(
        { error: 'config scores must be finite numbers between 0 and 1' },
        { status: 400 }
      );
    }

    const nextConfig =
      body.config
        ? {
            ...(currentPolicy.config || {}),
            ...body.config,
            block_risk_score: blockScore,
            stabilize_risk_score: stabilizeScore,
          }
        : currentPolicy.config;

    const updatePayload = {
      status: nextStatus,
      description: body.description ?? currentPolicy.description,
      config: nextConfig,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedPolicy, error: updateError } = await supabase
      .from('policies')
      .update(updatePayload)
      .eq('id', body.id)
      .select('id, name, version, status, description, config, updated_at')
      .single();

    if (updateError || !updatedPolicy) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update policy' },
        { status: 500 }
      );
    }

    const { error: governanceError } = await supabase.from('policy_governance_events').insert({
      org_id: access.orgId,
      actor_auth_user_id: user.id,
      policy_id: body.id,
      event_type: 'policy.updated',
      previous_state: currentPolicy,
      next_state: updatedPolicy,
      metadata: {
        reason: body.reason || null,
      },
    });

    if (governanceError) {
      return NextResponse.json({ error: governanceError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: updatedPolicy });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
