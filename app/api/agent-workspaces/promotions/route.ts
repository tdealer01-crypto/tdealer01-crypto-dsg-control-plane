import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import {
  containsSecretMaterial,
  PRODUCTION_PROMOTION_SCOPES,
  scopeMatches,
} from '../../../../lib/agent-workspace/policy';

export const dynamic = 'force-dynamic';

const REQUIRED_PROMOTION_CHECKS = [
  'typecheck',
  'unit_tests',
  'build',
  'preview_smoke',
  'migration_check',
  'security_check',
  'rollback_ready',
] as const;

function checkPassed(value: unknown): boolean {
  if (value === true) return true;
  return ['true', 'pass', 'passed', 'success', 'green'].includes(String(value ?? '').trim().toLowerCase());
}

function missingPromotionChecks(checks: Record<string, unknown>): string[] {
  return REQUIRED_PROMOTION_CHECKS.filter((check) => !checkPassed(checks[check]));
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['org_admin'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'request').trim();
  const admin = getSupabaseAdmin() as any;

  if (action === 'request') {
    const workspaceId = String(body.workspaceId || '').trim();
    const commitSha = String(body.commitSha || '').trim();
    const checks = body.checks && typeof body.checks === 'object'
      ? body.checks as Record<string, unknown>
      : {};
    const requestedScopes = Array.isArray(body.requestedScopes)
      ? Array.from(new Set(body.requestedScopes.map((value: unknown) => String(value).trim()).filter(Boolean)))
      : [];

    if (!workspaceId || !/^[a-f0-9]{7,64}$/i.test(commitSha) || requestedScopes.length === 0) {
      return NextResponse.json({ error: 'workspaceId, commitSha and requestedScopes are required' }, { status: 400 });
    }
    if (containsSecretMaterial(checks)) {
      return NextResponse.json({ error: 'promotion_checks_must_not_contain_secret_values' }, { status: 400 });
    }
    if (requestedScopes.some((scope) => !scopeMatches(PRODUCTION_PROMOTION_SCOPES, scope))) {
      return NextResponse.json({ error: 'requested_scope_is_not_a_production_promotion_scope' }, { status: 400 });
    }

    const missingChecks = missingPromotionChecks(checks);
    if (missingChecks.length > 0) {
      return NextResponse.json(
        { error: 'promotion_required_checks_not_passed', missingChecks },
        { status: 422 },
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
      return NextResponse.json({ error: 'workspace_not_found_in_organization' }, { status: 404 });
    }

    const evidenceHash = createHash('sha256')
      .update(JSON.stringify({ workspaceId, commitSha, checks, requestedScopes }))
      .digest('hex');

    const { data, error } = await admin
      .from('agent_workspace_promotions')
      .insert({
        workspace_id: workspace.id,
        org_id: access.orgId,
        target_environment: 'production',
        requested_by: access.userId,
        status: 'pending',
        checks,
        commit_sha: commitSha,
        evidence_hash: evidenceHash,
        requested_scopes: requestedScopes,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, workspace_id, status, commit_sha, evidence_hash, requested_scopes, checks, expires_at')
      .single();

    if (error) return NextResponse.json({ error: 'failed_to_request_promotion' }, { status: 500 });
    return NextResponse.json({ ok: true, promotion: data }, { status: 201 });
  }

  if (action === 'approve' || action === 'reject') {
    const promotionId = String(body.promotionId || '').trim();
    if (!promotionId) return NextResponse.json({ error: 'promotionId is required' }, { status: 400 });

    if (action === 'approve') {
      const { data: pending, error: pendingError } = await admin
        .from('agent_workspace_promotions')
        .select('id, checks, expires_at, commit_sha, evidence_hash, requested_scopes')
        .eq('id', promotionId)
        .eq('org_id', access.orgId)
        .eq('status', 'pending')
        .single();

      if (pendingError || !pending) {
        return NextResponse.json({ error: 'pending_promotion_not_found' }, { status: 404 });
      }

      const missingChecks = missingPromotionChecks((pending.checks ?? {}) as Record<string, unknown>);
      if (missingChecks.length > 0) {
        return NextResponse.json(
          { error: 'promotion_required_checks_not_passed', missingChecks },
          { status: 422 },
        );
      }
      if (!pending.expires_at || new Date(pending.expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ error: 'promotion_expired' }, { status: 410 });
      }
    }

    const update = action === 'approve'
      ? {
          status: 'approved',
          approved_by: access.userId,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        }
      : {
          status: 'rejected',
          rejection_reason: String(body.reason || 'rejected_by_org_admin'),
          updated_at: new Date().toISOString(),
        };

    const { data, error } = await admin
      .from('agent_workspace_promotions')
      .update(update)
      .eq('id', promotionId)
      .eq('org_id', access.orgId)
      .eq('status', 'pending')
      .select('id, workspace_id, status, commit_sha, evidence_hash, requested_scopes, checks, approved_by, approved_at, rejection_reason')
      .single();

    if (error) return NextResponse.json({ error: 'failed_to_update_promotion' }, { status: 409 });
    return NextResponse.json({ ok: true, promotion: data });
  }

  return NextResponse.json({ error: 'action must be request, approve or reject' }, { status: 400 });
}
