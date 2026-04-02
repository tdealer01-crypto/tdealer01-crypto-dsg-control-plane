import { randomUUID, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/seed
 *
 * Seeds starter data for a new organization so the dashboard is not empty
 * on first login. Called automatically after trial signup completes.
 *
 * Body: { org_id: string }
 *
 * This is safe to call multiple times — it checks for existing data first.
 * Requires a valid session (cookie-based auth via middleware).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const orgId = body?.org_id ? String(body.org_id) : '';

    if (!orgId) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

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
      { onConflict: 'id' },
    );

    // Create starter agent
    await admin.from('agents').insert({
      id: agentId,
      org_id: orgId,
      name: 'Starter Agent',
      policy_id: 'policy_default',
      status: 'active',
      api_key_hash: createHash('sha256').update(apiKey).digest('hex'),
      monthly_limit: 1000,
    });

    // Create sample execution
    const { data: execution } = await admin
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

    // Create audit log entry
    if (execution) {
      await admin.from('audit_logs').insert({
        org_id: orgId,
        agent_id: agentId,
        execution_id: execution.id,
        policy_version: 'v1',
        decision: 'ALLOW',
        reason: 'Low-risk action within policy bounds',
        evidence: { risk_score: 0.12, source: 'onboarding_seed' },
      });

      // Create usage event
      await admin.from('usage_events').insert({
        org_id: orgId,
        agent_id: agentId,
        execution_id: execution.id,
        event_type: 'execution',
        quantity: 1,
        unit: 'execution',
        amount_usd: 0.001,
        metadata: { source: 'onboarding_seed' },
      });
    }

    // Create usage counter for current billing period
    const billingPeriod = new Date().toISOString().slice(0, 7);
    await admin.from('usage_counters').insert({
      org_id: orgId,
      agent_id: agentId,
      billing_period: billingPeriod,
      executions: 1,
    });

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
