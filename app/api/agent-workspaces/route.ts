import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import {
  AGENT_WORKSPACE_KEY,
  DEFAULT_LEASE_SCOPES,
  DEFAULT_WORKSPACE_PLAN,
} from '../../../lib/agent-workspace/policy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireOrgRole(['org_admin', 'operator', 'runtime_auditor'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const admin = getSupabaseAdmin() as any;
  const { data, error } = await admin
    .from('agent_workspaces')
    .select('id, workspace_key, name, environment, status, repo_full_name, git_branch_pattern, vercel_team_slug, vercel_project_slug, vercel_project_id, supabase_project_ref, stripe_mode, production_access, production_locked, allowed_environments, plan_hash, auto_authorize_plan_actions, allow_tool_creation, updated_at')
    .or(`org_id.eq.${access.orgId},org_id.eq.system,org_id.is.null`)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'failed_to_read_agent_workspaces' }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['org_admin'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => ({}));
  const workspaceKey = String(body.workspaceKey || AGENT_WORKSPACE_KEY).trim();
  const name = String(body.name || 'DSG Agent Development Workspace').trim();
  const plan = body.plan && typeof body.plan === 'object' ? body.plan : DEFAULT_WORKSPACE_PLAN;
  const explicitAgentIds = Array.isArray(body.agentIds)
    ? body.agentIds.map((value: unknown) => String(value).trim()).filter(Boolean)
    : ['*'];
  const agentIds = explicitAgentIds.length > 0 ? explicitAgentIds : ['*'];
  const leaseDays = Math.min(Math.max(Number(body.leaseDays || 30), 1), 365);
  const autoRenewDays = Math.min(Math.max(Number(body.autoRenewDays || 365), leaseDays), 730);

  if (!workspaceKey || !name) {
    return NextResponse.json({ error: 'workspaceKey and name are required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin() as any;
  const now = new Date();
  const { data: workspace, error: workspaceError } = await admin
    .from('agent_workspaces')
    .upsert({
      workspace_key: workspaceKey,
      name,
      org_id: body.systemWide === false ? access.orgId : 'system',
      environment: 'development',
      status: 'active',
      repo_full_name: String(body.repoFullName || 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane'),
      git_branch_pattern: String(body.gitBranchPattern || 'agent-workspace/*'),
      vercel_team_slug: String(body.vercelTeamSlug || 'tdealer01-crypto-dsg-control-plane'),
      vercel_project_slug: String(body.vercelProjectSlug || 'tdealer01-crypto-dsg-control-plane'),
      vercel_project_id: String(body.vercelProjectId || 'prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW'),
      supabase_project_ref: String(body.supabaseProjectRef || 'zeyguilldygozufpgxms'),
      stripe_account_id: String(body.stripeAccountId || 'acct_1Tft0OAZNzhgTUPV'),
      stripe_mode: 'test',
      production_access: false,
      production_locked: true,
      allowed_environments: ['development', 'preview'],
      approved_plan: plan,
      auto_authorize_plan_actions: true,
      allow_tool_creation: true,
      created_by: access.userId,
      updated_at: now.toISOString(),
    }, { onConflict: 'workspace_key' })
    .select('id, workspace_key, plan_hash, production_locked')
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'failed_to_create_agent_workspace' }, { status: 500 });
  }

  const scopes = Array.isArray(body.scopes)
    ? body.scopes.map((value: unknown) => String(value).trim()).filter(Boolean)
    : [...DEFAULT_LEASE_SCOPES];

  for (const agentId of agentIds) {
    const { error: leaseError } = await admin
      .from('agent_workspace_leases')
      .upsert({
        workspace_id: workspace.id,
        agent_id: agentId,
        org_id: body.systemWide === false ? access.orgId : 'system',
        scopes,
        environments: ['development', 'preview', 'production'],
        status: 'active',
        starts_at: now.toISOString(),
        expires_at: new Date(now.getTime() + leaseDays * 86_400_000).toISOString(),
        auto_renew: true,
        auto_renew_until: new Date(now.getTime() + autoRenewDays * 86_400_000).toISOString(),
        issued_by: access.userId,
        metadata: { planHash: workspace.plan_hash, userApproved: true },
        updated_at: now.toISOString(),
      }, { onConflict: 'workspace_id,agent_id' });

    if (leaseError) {
      return NextResponse.json({ error: 'workspace_created_but_lease_failed', workspace }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    workspace,
    lease: {
      agentIds,
      scopes,
      environments: ['development', 'preview', 'production'],
      autoRenew: true,
      productionLocked: true,
    },
  }, { status: 201 });
}
