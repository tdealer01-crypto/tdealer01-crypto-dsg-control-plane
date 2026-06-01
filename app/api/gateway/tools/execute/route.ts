import { NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { executeGatewayTool, normalizeGatewayToolRequest } from '../../../../../lib/gateway/executor';
import { readJsonBody } from '../../../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

function statusForDecision(result: Awaited<ReturnType<typeof executeGatewayTool>>) {
  if (result.ok) {
    return 200;
  }

  if (result.decision === 'review' || result.decision === 'ask_more_info') {
    return 202;
  }

  if (result.reason === 'plan_not_entitled') {
    return 402;
  }

  if (result.reason === 'missing_org_id' || result.reason === 'missing_actor_id' || result.reason === 'missing_actor_role' || result.reason === 'missing_org_plan') {
    return 400;
  }

  if (result.reason === 'role_not_allowed') {
    return 403;
  }

  if (result.reason === 'tool_not_registered' || result.reason === 'tool_action_mismatch') {
    return 404;
  }

  return 502;
}

async function resolveServerSideOrgPlan(orgId: string) {
  const admin = getSupabaseAdmin() as any;

  const { data: subscription } = await admin
    .from('billing_subscriptions')
    .select('plan_key,status,updated_at')
    .eq('org_id', orgId)
    .in('status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription?.plan_key) {
    return String(subscription.plan_key);
  }

  const { data: organization } = await admin
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .maybeSingle();

  return organization?.plan ? String(organization.plan) : 'free';
}

export async function POST(request: Request) {
  try {
    const access = await requireOrgPermission('org.execute');
    if (access.ok !== true) {
      return NextResponse.json({ ok: false, decision: 'block', reason: access.error }, { status: access.status });
    }

    const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 32_768 });
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, decision: 'block', reason: parsed.error }, { status: parsed.status });
    }

    const serverPlan = await resolveServerSideOrgPlan(access.orgId);
    const body = parsed.value ?? {};
    const gatewayRequest = normalizeGatewayToolRequest(
      {
        ...body,
        orgId: access.orgId,
        actorId: access.userId,
        actorRole: access.role,
        orgPlan: serverPlan,
      },
      new Headers(),
    );
    const result = await executeGatewayTool(gatewayRequest);

    return NextResponse.json(result, { status: statusForDecision(result) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        decision: 'block',
        reason: error instanceof Error ? 'Internal server error' : 'gateway_execution_error',
      },
      { status: 500 }
    );
  }
}
