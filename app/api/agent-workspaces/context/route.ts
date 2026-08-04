import { NextResponse } from 'next/server';
import { requireWorkspaceAgent } from '../../../../lib/agent-workspace/auth';
import { AGENT_WORKSPACE_KEY } from '../../../../lib/agent-workspace/policy';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'agent-workspace-context'),
    limit: 120,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 120);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const body = await request.json().catch(() => ({}));
  const agentAccess = await requireWorkspaceAgent(request, body.agentId);
  if (!agentAccess.ok) {
    return NextResponse.json({ ok: false, error: agentAccess.error }, { status: agentAccess.status, headers });
  }

  const workspaceKey = String(body.workspaceKey || AGENT_WORKSPACE_KEY).trim();
  const admin = getSupabaseAdmin() as any;
  const { data: workspace, error: workspaceError } = await admin
    .from('agent_workspaces')
    .select('id, workspace_key, name, org_id, environment, status, repo_full_name, git_branch_pattern, vercel_team_slug, vercel_project_slug, vercel_project_id, supabase_project_ref, stripe_account_id, stripe_mode, approved_plan, plan_hash, allowed_environments, auto_authorize_plan_actions, allow_tool_creation, production_access, production_locked, updated_at')
    .eq('workspace_key', workspaceKey)
    .eq('org_id', agentAccess.orgId)
    .eq('status', 'active')
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json({ ok: false, error: 'workspace_not_found_for_agent_organization' }, { status: 404, headers });
  }

  const { data: authorization, error: authorizationError } = await admin.rpc('authorize_agent_workspace_action', {
    p_workspace_key: workspace.workspace_key,
    p_agent_id: agentAccess.agentId,
    p_org_id: agentAccess.orgId,
    p_scope: 'workspace.read',
    p_environment: 'development',
    p_plan_hash: workspace.plan_hash,
    p_action: 'load_context',
    p_target: workspace.workspace_key,
    p_input_hash: null,
    p_evidence: { source: 'agent-workspaces/context' },
    p_promotion_id: null,
    p_commit_sha: null,
  });

  const decision = Array.isArray(authorization) ? authorization[0] : authorization;
  if (authorizationError || !decision?.allowed) {
    return NextResponse.json(
      { ok: false, error: decision?.reason || 'workspace_context_not_authorized' },
      { status: authorizationError ? 500 : 403, headers },
    );
  }

  const [{ data: lease, error: leaseError }, { data: tools, error: toolsError }] = await Promise.all([
    admin
      .from('agent_workspace_leases')
      .select('id, scopes, environments, status, starts_at, expires_at, auto_renew, auto_renew_until, metadata, updated_at')
      .eq('workspace_id', workspace.id)
      .eq('agent_id', agentAccess.agentId)
      .eq('org_id', agentAccess.orgId)
      .eq('status', 'active')
      .single(),
    admin
      .from('agent_workspace_tool_registry')
      .select('id, name, kind, scope, risk, source_path, command_template, endpoint_url, secret_refs, configuration, status, production_enabled, created_by_agent, updated_at')
      .eq('workspace_id', workspace.id)
      .eq('org_id', agentAccess.orgId)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ]);

  if (leaseError || !lease) {
    return NextResponse.json({ ok: false, error: 'active_workspace_lease_not_found' }, { status: 403, headers });
  }
  if (toolsError) {
    return NextResponse.json({ ok: false, error: 'failed_to_load_workspace_tools' }, { status: 500, headers });
  }

  return NextResponse.json({
    ok: true,
    agent: {
      id: agentAccess.agentId,
      orgId: agentAccess.orgId,
      policyId: agentAccess.policyId,
    },
    workspace: {
      id: workspace.id,
      key: workspace.workspace_key,
      name: workspace.name,
      environment: workspace.environment,
      repository: workspace.repo_full_name,
      branchPattern: workspace.git_branch_pattern,
      supabaseProjectRef: workspace.supabase_project_ref,
      vercelTeamSlug: workspace.vercel_team_slug,
      vercelProjectSlug: workspace.vercel_project_slug,
      vercelProjectId: workspace.vercel_project_id,
      stripeAccountId: workspace.stripe_account_id,
      stripeMode: workspace.stripe_mode,
      approvedPlan: workspace.approved_plan,
      planHash: workspace.plan_hash,
      allowedEnvironments: workspace.allowed_environments,
      autoAuthorizePlanActions: workspace.auto_authorize_plan_actions,
      allowToolCreation: workspace.allow_tool_creation,
      productionAccess: workspace.production_access,
      productionLocked: workspace.production_locked,
      updatedAt: workspace.updated_at,
    },
    lease,
    tools: tools ?? [],
  }, { headers });
}
