import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { requireWorkspaceAgent } from '../../../../lib/agent-workspace/auth';
import {
  AGENT_WORKSPACE_KEY,
  containsSecretMaterial,
  normalizeWorkspaceEnvironment,
} from '../../../../lib/agent-workspace/policy';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'agent-workspace-authorize'),
    limit: 300,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 300);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const body = await request.json().catch(() => ({}));
  const agentAccess = await requireWorkspaceAgent(request, body.agentId);
  if (!agentAccess.ok) {
    return NextResponse.json({ ok: false, error: agentAccess.error }, { status: agentAccess.status, headers });
  }

  const workspaceKey = String(body.workspaceKey || AGENT_WORKSPACE_KEY).trim();
  const scope = String(body.scope || '').trim();
  const environment = normalizeWorkspaceEnvironment(body.environment);
  const planHash = String(body.planHash || '').trim();
  const action = String(body.action || 'execute').trim();
  const target = body.target == null ? null : String(body.target).trim();
  const evidence = body.evidence && typeof body.evidence === 'object' ? body.evidence : {};
  const promotionId = body.promotionId ? String(body.promotionId).trim() : null;
  const commitSha = body.commitSha ? String(body.commitSha).trim() : null;

  if (!scope || !environment || !planHash) {
    return NextResponse.json(
      { ok: false, error: 'scope, environment and planHash are required' },
      { status: 400, headers },
    );
  }

  if (environment === 'production' && (!commitSha || !/^[a-f0-9]{7,64}$/i.test(commitSha))) {
    return NextResponse.json(
      { ok: false, error: 'production_authorization_requires_valid_commit_sha' },
      { status: 400, headers },
    );
  }

  if (containsSecretMaterial({ target, evidence })) {
    return NextResponse.json(
      { ok: false, error: 'secret_material_must_not_be_sent_to_workspace_audit' },
      { status: 400, headers },
    );
  }

  const inputHash = createHash('sha256')
    .update(JSON.stringify({ workspaceKey, scope, environment, action, target, evidence, commitSha }))
    .digest('hex');

  const admin = getSupabaseAdmin() as any;
  const { data, error } = await admin.rpc('authorize_agent_workspace_action', {
    p_workspace_key: workspaceKey,
    p_agent_id: agentAccess.agentId,
    p_org_id: agentAccess.orgId,
    p_scope: scope,
    p_environment: environment,
    p_plan_hash: planHash,
    p_action: action,
    p_target: target,
    p_input_hash: inputHash,
    p_evidence: evidence,
    p_promotion_id: promotionId,
    p_commit_sha: commitSha,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: 'workspace_authorization_failed' }, { status: 500, headers });
  }

  const decision = Array.isArray(data) ? data[0] : data;
  const allowed = Boolean(decision?.allowed);
  return NextResponse.json(
    {
      ok: allowed,
      allowed,
      reason: decision?.reason ?? 'unknown',
      workspaceId: decision?.workspace_id ?? null,
      leaseId: decision?.lease_id ?? null,
      planHash: decision?.effective_plan_hash ?? null,
      productionLocked: decision?.production_locked ?? true,
      commitSha,
      inputHash,
    },
    { status: allowed ? 200 : 403, headers },
  );
}
