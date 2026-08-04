import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import {
  AGENT_WORKSPACE_KEY,
  DEFAULT_LEASE_SCOPES,
  DEFAULT_WORKSPACE_PLAN,
  containsSecretMaterial,
  scopeMatches,
} from '../../../lib/agent-workspace/policy';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';
import { maxObjectDepth, readJsonBody } from '../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

const DEFAULT_REPOSITORY = 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';
const DEFAULT_SUPABASE_PROJECT_REF = 'zeyguilldygozufpgxms';
const DEFAULT_VERCEL_PROJECT_ID = 'prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW';
const DEFAULT_STRIPE_ACCOUNT_ID = 'acct_1Tft0OAZNzhgTUPV';

export async function GET(request: Request) {
  const access = await requireOrgRole(['org_admin', 'operator', 'runtime_auditor'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const admin = getSupabaseAdmin() as any;
  const { data, error } = await admin
    .from('agent_workspaces')
    .select('id, workspace_key, name, environment, status, repo_full_name, git_branch_pattern, vercel_team_slug, vercel_project_slug, vercel_project_id, supabase_project_ref, stripe_mode, production_access, production_locked, allowed_environments, plan_hash, auto_authorize_plan_actions, allow_tool_creation, updated_at')
    .eq('org_id', access.orgId)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'failed_to_read_agent_workspaces' }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['org_admin'], request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `agent-workspace-admin:${access.orgId}`),
    limit: 20,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 20);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 64_000 });
  if (!parsed.ok || !parsed.value) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers });
  }
  const body = parsed.value;
  const workspaceKey = String(body.workspaceKey || AGENT_WORKSPACE_KEY).trim();
  const name = String(body.name || 'DSG Agent Development Workspace').trim();
  const plan = body.plan && typeof body.plan === 'object' ? body.plan : DEFAULT_WORKSPACE_PLAN;
  const requestedAgentIds = Array.isArray(body.agentIds)
    ? body.agentIds.map((value: unknown) => String(value).trim()).filter(Boolean)
    : [];
  const leaseDays = Math.min(Math.max(Number(body.leaseDays || 30), 1), 365);
  const autoRenewDays = Math.min(Math.max(Number(body.autoRenewDays || 365), leaseDays), 730);
  const repository = String(body.repoFullName || DEFAULT_REPOSITORY).trim();
  const branchPattern = String(body.gitBranchPattern || 'agent-workspace/*').trim();
  const supabaseProjectRef = String(
    body.supabaseProjectRef
      || process.env.DSG_AGENT_WORKSPACE_SUPABASE_PROJECT_REF
      || DEFAULT_SUPABASE_PROJECT_REF,
  ).trim();
  const vercelProjectId = String(
    body.vercelProjectId
      || process.env.DSG_AGENT_WORKSPACE_VERCEL_PROJECT_ID
      || DEFAULT_VERCEL_PROJECT_ID,
  ).trim();
  const stripeAccountId = String(
    body.stripeAccountId
      || process.env.DSG_AGENT_WORKSPACE_STRIPE_ACCOUNT_ID
      || DEFAULT_STRIPE_ACCOUNT_ID,
  ).trim();
  const scopes: string[] = Array.isArray(body.scopes)
    ? Array.from(new Set<string>(
        body.scopes
          .map((value: unknown) => String(value).trim())
          .filter((value: string) => value.length > 0),
      ))
    : [...DEFAULT_LEASE_SCOPES];

  if (!workspaceKey || !name || !/^[a-z0-9][a-z0-9_-]{2,63}$/i.test(workspaceKey)) {
    return NextResponse.json({ error: 'invalid_workspace_key_or_name' }, { status: 400, headers });
  }
  if (!/^agent-workspace\/[A-Za-z0-9._/-]*\*$/.test(branchPattern)) {
    return NextResponse.json({ error: 'git_branch_pattern_must_be_agent_workspace_wildcard' }, { status: 400, headers });
  }
  if (repository !== DEFAULT_REPOSITORY) {
    return NextResponse.json({ error: 'repository_not_allowed_for_this_workspace' }, { status: 400, headers });
  }
  if (supabaseProjectRef !== (process.env.DSG_AGENT_WORKSPACE_SUPABASE_PROJECT_REF || DEFAULT_SUPABASE_PROJECT_REF)) {
    return NextResponse.json({ error: 'supabase_project_is_not_the_configured_development_project' }, { status: 400, headers });
  }
  if (vercelProjectId !== (process.env.DSG_AGENT_WORKSPACE_VERCEL_PROJECT_ID || DEFAULT_VERCEL_PROJECT_ID)) {
    return NextResponse.json({ error: 'vercel_project_is_not_the_configured_workspace_project' }, { status: 400, headers });
  }
  if (stripeAccountId !== (process.env.DSG_AGENT_WORKSPACE_STRIPE_ACCOUNT_ID || DEFAULT_STRIPE_ACCOUNT_ID)) {
    return NextResponse.json({ error: 'stripe_account_is_not_the_configured_workspace_account' }, { status: 400, headers });
  }
  if (!maxObjectDepth(plan, 12) || containsSecretMaterial(plan)) {
    return NextResponse.json({ error: 'plan_is_too_deep_or_contains_secret_material' }, { status: 400, headers });
  }
  if (scopes.length === 0 || scopes.some((scope) => !scopeMatches(DEFAULT_LEASE_SCOPES, scope))) {
    return NextResponse.json({ error: 'one_or_more_scopes_are_outside_the_workspace_policy' }, { status: 400, headers });
  }

  const admin = getSupabaseAdmin() as any;
  const { data: existingWorkspace, error: existingError } = await admin
    .from('agent_workspaces')
    .select('id, org_id')
    .eq('workspace_key', workspaceKey)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: 'failed_to_check_workspace_ownership' }, { status: 500, headers });
  }
  if (existingWorkspace && String(existingWorkspace.org_id) !== access.orgId) {
    return NextResponse.json({ error: 'workspace_key_owned_by_another_organization' }, { status: 409, headers });
  }

  let agentQuery = admin
    .from('agents')
    .select('id')
    .eq('org_id', access.orgId)
    .eq('status', 'active');

  if (requestedAgentIds.length > 0) {
    agentQuery = agentQuery.in('id', requestedAgentIds);
  }

  const { data: activeAgents, error: agentsError } = await agentQuery;
  if (agentsError) {
    return NextResponse.json({ error: 'failed_to_resolve_workspace_agents' }, { status: 500, headers });
  }

  const agentIds = (activeAgents ?? []).map((agent: { id: string }) => String(agent.id));
  if (agentIds.length === 0) {
    return NextResponse.json({ error: 'no_active_agents_in_organization' }, { status: 409, headers });
  }
  if (requestedAgentIds.length > 0 && agentIds.length !== new Set(requestedAgentIds).size) {
    return NextResponse.json({ error: 'one_or_more_agents_are_not_active_in_organization' }, { status: 403, headers });
  }

  const now = new Date();
  const { data: workspace, error: workspaceError } = await admin
    .from('agent_workspaces')
    .upsert({
      workspace_key: workspaceKey,
      name,
      org_id: access.orgId,
      environment: 'development',
      status: 'active',
      repo_full_name: repository,
      git_branch_pattern: branchPattern,
      vercel_team_slug: String(body.vercelTeamSlug || 'tdealer01-crypto-dsg-control-plane'),
      vercel_project_slug: String(body.vercelProjectSlug || 'tdealer01-crypto-dsg-control-plane'),
      vercel_project_id: vercelProjectId,
      supabase_project_ref: supabaseProjectRef,
      stripe_account_id: stripeAccountId,
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
    return NextResponse.json({ error: 'failed_to_create_agent_workspace' }, { status: 500, headers });
  }

  const leaseRows = agentIds.map((agentId) => ({
    workspace_id: workspace.id,
    agent_id: agentId,
    org_id: access.orgId,
    scopes,
    environments: ['development', 'preview', 'production'],
    status: 'active',
    starts_at: now.toISOString(),
    expires_at: new Date(now.getTime() + leaseDays * 86_400_000).toISOString(),
    auto_renew: true,
    auto_renew_until: new Date(now.getTime() + autoRenewDays * 86_400_000).toISOString(),
    issued_by: access.userId,
    metadata: { planHash: workspace.plan_hash, userApproved: true, membership: 'explicit_org_agent' },
    updated_at: now.toISOString(),
  }));

  const { error: leaseError } = await admin
    .from('agent_workspace_leases')
    .upsert(leaseRows, { onConflict: 'workspace_id,agent_id' });

  if (leaseError) {
    return NextResponse.json({ error: 'workspace_created_but_lease_failed', workspace }, { status: 500, headers });
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
  }, { status: 201, headers });
}
