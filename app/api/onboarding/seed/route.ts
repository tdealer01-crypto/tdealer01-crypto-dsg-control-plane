import { randomUUID, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/seed
 *
 * Seeds starter data for a new organization so the dashboard is not empty
 * on first login. Requires a valid authenticated session — the org_id is
 * derived from the caller's profile, not the request body.
 *
 * This is safe to call multiple times — it checks for existing data first.
 */

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

    const orgId = access.orgId;
    const admin = getSupabaseAdmin();

    // Check if this org already has agents (idempotent guard)
    const { data: existingAgents } = await admin
      .from('agents')
      .select('id')
      .eq('org_id', orgId)
      .limit(1);

    if (existingAgents && existingAgents.length > 0) {
      return NextResponse.json({
        ok: true,
        seeded: false,
        message: 'Organization already has data',
      });
    }

    const suffix = randomUUID().slice(0, 8);
    const agentId = `starter-agent-${suffix}`;
    const apiKey = `dsg_${randomUUID().replace(/-/g, '')}`;

    // Ensure default policy exists
    await admin.from('policies').upsert(
      {
        id: 'policy_default',
        name: 'Default DSG Policy',
        version: 'v1',
        status: 'active',
        description: 'Baseline deterministic policy for execution routes.',
        config: { block_risk_score: 0.8, stabilize_risk_score: 0.4 },
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    // Create starter agent
    const { error: agentError } = await admin.from('agents').insert({
      id: agentId,
      org_id: orgId,
      name: 'Starter Agent',
      policy_id: 'policy_default',
      status: 'active',
      api_key_hash: createHash('sha256').update(apiKey).digest('hex'),
      monthly_limit: 1000,
    });

    if (agentError) {
      throw agentError;
    }

    // Create sample execution
    const { data: execution, error: execError } = await admin
      .from('executions')
      .insert({
        org_id: orgId,
        agent_id: agentId,
        decision: 'ALLOW',
        latency_ms: 12,
        request_payload: { action: 'sample_transfer', amount: 50, asset: 'USDC' },
        context_payload: { source: 'onboarding_seed' },
        policy_version: 'v1',
        reason: 'Low-risk action within policy bounds',
      })
      .select('id')
      .single();

    if (execError) {
      console.error('[onboarding-seed] execution insert failed, cleaning up agent:', execError);
      await admin.from('agents').delete().eq('id', agentId);
      throw execError;
    }

    // Create audit log entry
    const { error: auditError } = await admin.from('audit_logs').insert({
      org_id: orgId,
      agent_id: agentId,
      execution_id: execution.id,
      policy_version: 'v1',
      decision: 'ALLOW',
      reason: 'Low-risk action within policy bounds',
      evidence: { risk_score: 0.12, source: 'onboarding_seed' },
    });

    if (auditError) {
      console.error('[onboarding-seed] audit_log insert failed:', auditError);
    }

    // Create usage event
    const { error: usageEventError } = await admin.from('usage_events').insert({
      org_id: orgId,
      agent_id: agentId,
      execution_id: execution.id,
      event_type: 'execution',
      quantity: 1,
      unit: 'execution',
      amount_usd: 0.001,
      metadata: { source: 'onboarding_seed' },
    });

    if (usageEventError) {
      console.error('[onboarding-seed] usage_event insert failed:', usageEventError);
    }

    // Create usage counter for current billing period
    const billingPeriod = new Date().toISOString().slice(0, 7);
    const { error: counterError } = await admin.from('usage_counters').insert({
      org_id: orgId,
      agent_id: agentId,
      billing_period: billingPeriod,
      executions: 1,
    });

    if (counterError) {
      console.error('[onboarding-seed] usage_counter insert failed:', counterError);
    }

    return NextResponse.json({
      ok: true,
      seeded: true,
      agent_id: agentId,
      message: 'Starter data created — your dashboard is ready.',
    });
  } catch (error) {
    console.error('[onboarding-seed] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
