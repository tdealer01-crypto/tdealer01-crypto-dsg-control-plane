import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import {
  PRODUCTION_PROMOTION_SCOPES,
  containsSecretMaterial,
  scopeMatches,
} from '../../../../lib/agent-workspace/policy';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { readJsonBody } from '../../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const access = await requireOrgRole(['org_admin'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `agent-workspace-promotions:${access.orgId}`),
    limit: 20,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 20);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 16_000 });
  if (!parsed.ok || !parsed.value) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers });
  }

  const body = parsed.value;
  const action = String(body.action || 'request').trim();
  const admin = getSupabaseAdmin() as any;

  if (action === 'request') {
    const workspaceId = String(body.workspaceId || '').trim();
    const commitSha = String(body.commitSha || '').trim();
    const requestReason = String(body.reason || 'production_release_candidate').trim();
    const requestedScopes: string[] = Array.isArray(body.requestedScopes)
      ? Array.from(new Set<string>(
          body.requestedScopes
            .map((value: unknown) => String(value).trim())
            .filter((value: string) => value.length > 0),
        ))
      : [];

    if (!workspaceId || !/^[a-f0-9]{7,64}$/i.test(commitSha) || requestedScopes.length === 0) {
      return NextResponse.json(
        { error: 'workspaceId, commitSha and requestedScopes are required' },
        { status: 400, headers },
      );
    }
    if (containsSecretMaterial(requestReason)) {
      return NextResponse.json({ error: 'promotion_reason_must_not_contain_secret_material' }, { status: 400, headers });
    }
    if (requestedScopes.some((scope) => !scopeMatches(PRODUCTION_PROMOTION_SCOPES, scope))) {
      return NextResponse.json(
        { error: 'requested_scope_is_not_a_production_promotion_scope' },
        { status: 400, headers },
      );
    }

    const { data: workspace, error: workspaceError } = await admin
      .from('agent_workspaces')
      .select('id, org_id, status, production_locked')
      .eq('id', workspaceId)
      .eq('org_id', access.orgId)
      .eq('status', 'active')
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'workspace_not_found_in_organization' }, { status: 404, headers });
    }

    const { data, error } = await admin
      .from('agent_workspace_promotions')
      .insert({
        workspace_id: workspace.id,
        org_id: access.orgId,
        target_environment: 'production',
        requested_by: access.userId,
        status: 'pending',
        checks: {
          requested_reason: requestReason,
          approval_mode: 'trusted_release_ci',
        },
        commit_sha: commitSha,
        evidence_hash: null,
        requested_scopes: requestedScopes,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, workspace_id, status, commit_sha, evidence_hash, requested_scopes, checks, expires_at')
      .single();

    if (error) return NextResponse.json({ error: 'failed_to_request_promotion' }, { status: 500, headers });
    return NextResponse.json({
      ok: true,
      promotion: data,
      nextAction: 'Run the Promoted Production Deployment workflow with this promotion ID and exact commit SHA.',
    }, { status: 201, headers });
  }

  if (action === 'approve') {
    return NextResponse.json(
      { error: 'promotion_approval_is_managed_by_trusted_release_ci' },
      { status: 403, headers },
    );
  }

  if (action === 'reject') {
    const promotionId = String(body.promotionId || '').trim();
    if (!promotionId) {
      return NextResponse.json({ error: 'promotionId is required' }, { status: 400, headers });
    }

    const { data, error } = await admin
      .from('agent_workspace_promotions')
      .update({
        status: 'rejected',
        rejection_reason: String(body.reason || 'rejected_by_org_admin'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', promotionId)
      .eq('org_id', access.orgId)
      .in('status', ['pending', 'approved'])
      .select('id, workspace_id, status, commit_sha, requested_scopes, rejection_reason')
      .single();

    if (error) return NextResponse.json({ error: 'failed_to_reject_promotion' }, { status: 409, headers });
    return NextResponse.json({ ok: true, promotion: data }, { headers });
  }

  return NextResponse.json({ error: 'action must be request or reject' }, { status: 400, headers });
}
