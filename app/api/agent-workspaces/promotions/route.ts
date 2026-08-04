import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { containsSecretMaterial } from '../../../../lib/agent-workspace/policy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const access = await requireOrgRole(['org_admin'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'request').trim();
  const admin = getSupabaseAdmin() as any;

  if (action === 'request') {
    const workspaceId = String(body.workspaceId || '').trim();
    const commitSha = String(body.commitSha || '').trim();
    const checks = body.checks && typeof body.checks === 'object' ? body.checks : {};
    const requestedScopes = Array.isArray(body.requestedScopes)
      ? body.requestedScopes.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];

    if (!workspaceId || !/^[a-f0-9]{7,64}$/i.test(commitSha) || requestedScopes.length === 0) {
      return NextResponse.json({ error: 'workspaceId, commitSha and requestedScopes are required' }, { status: 400 });
    }
    if (containsSecretMaterial(checks)) {
      return NextResponse.json({ error: 'promotion_checks_must_not_contain_secret_values' }, { status: 400 });
    }

    const evidenceHash = createHash('sha256')
      .update(JSON.stringify({ workspaceId, commitSha, checks, requestedScopes }))
      .digest('hex');

    const { data, error } = await admin
      .from('agent_workspace_promotions')
      .insert({
        workspace_id: workspaceId,
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
      .select('id, workspace_id, status, commit_sha, evidence_hash, requested_scopes, expires_at')
      .single();

    if (error) return NextResponse.json({ error: 'failed_to_request_promotion' }, { status: 500 });
    return NextResponse.json({ ok: true, promotion: data }, { status: 201 });
  }

  if (action === 'approve' || action === 'reject') {
    const promotionId = String(body.promotionId || '').trim();
    if (!promotionId) return NextResponse.json({ error: 'promotionId is required' }, { status: 400 });

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
      .select('id, workspace_id, status, commit_sha, evidence_hash, requested_scopes, approved_by, approved_at, rejection_reason')
      .single();

    if (error) return NextResponse.json({ error: 'failed_to_update_promotion' }, { status: 409 });
    return NextResponse.json({ ok: true, promotion: data });
  }

  return NextResponse.json({ error: 'action must be request, approve or reject' }, { status: 400 });
}
