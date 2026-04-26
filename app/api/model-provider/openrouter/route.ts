import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { planGoal } from '../../../../lib/agent/planner';
import { callOpenRouterProvider } from '../../../../lib/model-provider/openrouter';
import { logApiError } from '../../../../lib/security/api-error';

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim();
  const pageContext = String(body?.pageContext || '').trim();
  const sessionId = String(body?.sessionId || access.orgId);
  const customerApiKey = typeof body?.openrouterApiKey === 'string' ? body.openrouterApiKey : null;

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const sessionKey = `${access.orgId}:${sessionId}`;

  try {
    const providerResult = await callOpenRouterProvider({
      orgId: access.orgId,
      sessionKey,
      message,
      pageContext,
      customerApiKey,
    });

    if (providerResult.provider === 'fallback-skills-planner') {
      return NextResponse.json({
        ...providerResult,
        plan: planGoal(message, pageContext),
        quota: { tracked: true, org_id: access.orgId, source: providerResult.keySource },
        approval: { required_for_write: true, runtime_gate: true },
      });
    }

    return NextResponse.json({
      ...providerResult,
      quota: { tracked: true, org_id: access.orgId, source: providerResult.keySource },
      approval: { required_for_write: true, runtime_gate: true },
    });
  } catch (error) {
    logApiError('api/model-provider/openrouter', error, { stage: 'provider-routing', orgId: access.orgId });
    return NextResponse.json({
      reply: 'Model provider failed, so DSG used the deterministic fallback planner.',
      plan: planGoal(message, pageContext),
      modelUsed: 'fallback-skills-planner',
      provider: 'fallback-skills-planner',
      keySource: 'none',
      quota: { tracked: true, org_id: access.orgId, source: 'none' },
      approval: { required_for_write: true, runtime_gate: true },
    });
  }
}
