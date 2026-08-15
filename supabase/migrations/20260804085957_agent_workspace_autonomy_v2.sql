-- DSG Agent Development Workspace v2
-- Goal: plan-authorized autonomy in development/preview, full audit evidence,
-- and a separate promotion gate before any production mutation.

create extension if not exists pgcrypto;

create table if not exists public.agent_workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null,
  name text not null,
  environment text not null default 'development',
  status text not null default 'active',
  repo_full_name text not null,
  git_branch_pattern text not null default 'agent-workspace/*',
  vercel_team_slug text,
  vercel_project_slug text,
  stripe_mode text not null default 'test',
  production_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_workspaces
  add column if not exists org_id text,
  add column if not exists approved_plan jsonb not null default '{}'::jsonb,
  add column if not exists plan_hash text,
  add column if not exists allowed_environments text[] not null default array['development','preview']::text[],
  add column if not exists auto_authorize_plan_actions boolean not null default true,
  add column if not exists allow_tool_creation boolean not null default true,
  add column if not exists production_locked boolean not null default true,
  add column if not exists supabase_project_ref text,
  add column if not exists vercel_project_id text,
  add column if not exists stripe_account_id text,
  add column if not exists created_by text not null default 'system';

create unique index if not exists idx_agent_workspaces_workspace_key
  on public.agent_workspaces (workspace_key);

create table if not exists public.agent_workspace_capabilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  capability text not null,
  scope text not null,
  access_level text not null,
  requires_runtime_approval boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_agent_workspace_capability_unique
  on public.agent_workspace_capabilities (workspace_id, capability, scope);

create table if not exists public.agent_workspace_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  agent_id text not null,
  goal text not null,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  git_branch text,
  preview_url text,
  evidence jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.agent_workspace_runs
  add column if not exists org_id text,
  add column if not exists plan_hash text,
  add column if not exists commit_sha text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.agent_workspace_promotions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  run_id uuid references public.agent_workspace_runs(id) on delete set null,
  target_environment text not null,
  requested_by text not null,
  status text not null default 'pending',
  checks jsonb not null default '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.agent_workspace_promotions
  add column if not exists org_id text,
  add column if not exists commit_sha text,
  add column if not exists evidence_hash text,
  add column if not exists requested_scopes text[] not null default '{}'::text[],
  add column if not exists expires_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.agent_workspace_leases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  agent_id text not null,
  org_id text,
  scopes text[] not null default '{}'::text[],
  environments text[] not null default array['development','preview']::text[],
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  auto_renew boolean not null default true,
  auto_renew_until timestamptz not null default (now() + interval '365 days'),
  issued_by text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_workspace_leases_lookup
  on public.agent_workspace_leases (workspace_id, agent_id, status, expires_at desc);

drop index if exists public.idx_agent_workspace_leases_active_unique;
create unique index if not exists idx_agent_workspace_leases_unique
  on public.agent_workspace_leases (workspace_id, agent_id);

create table if not exists public.agent_workspace_tool_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  org_id text,
  name text not null,
  kind text not null,
  scope text not null,
  risk text not null default 'medium',
  source_path text,
  command_template text,
  endpoint_url text,
  secret_refs text[] not null default '{}'::text[],
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  production_enabled boolean not null default false,
  created_by_agent text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_agent_workspace_tool_unique
  on public.agent_workspace_tool_registry (workspace_id, name);

create table if not exists public.agent_workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.agent_workspaces(id) on delete set null,
  org_id text,
  agent_id text not null,
  action text not null,
  requested_scope text not null,
  environment text not null,
  target text,
  plan_hash text,
  input_hash text,
  authorized boolean not null,
  reason text not null,
  lease_id uuid references public.agent_workspace_leases(id) on delete set null,
  promotion_id uuid references public.agent_workspace_promotions(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_workspace_audit_lookup
  on public.agent_workspace_audit_events (workspace_id, created_at desc);

create or replace function public.agent_workspace_scope_matches(
  p_granted text[],
  p_requested text
)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_requested = any(p_granted), false)
    or coalesce('*' = any(p_granted), false)
    or exists (
      select 1
      from unnest(coalesce(p_granted, '{}'::text[])) as granted(scope)
      where right(granted.scope, 2) = '.*'
        and p_requested like left(granted.scope, length(granted.scope) - 1) || '%'
    );
$$;

create or replace function public.agent_workspace_audit_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'agent_workspace_audit_events is append-only';
end;
$$;

drop trigger if exists trg_agent_workspace_audit_immutable on public.agent_workspace_audit_events;
create trigger trg_agent_workspace_audit_immutable
before update or delete on public.agent_workspace_audit_events
for each row execute function public.agent_workspace_audit_immutable();

create or replace function public.authorize_agent_workspace_action(
  p_workspace_key text,
  p_agent_id text,
  p_org_id text,
  p_scope text,
  p_environment text,
  p_plan_hash text,
  p_action text default 'execute',
  p_target text default null,
  p_input_hash text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_promotion_id uuid default null
)
returns table (
  allowed boolean,
  reason text,
  workspace_id uuid,
  lease_id uuid,
  effective_plan_hash text,
  production_locked boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.agent_workspaces;
  v_lease public.agent_workspace_leases;
  v_promotion public.agent_workspace_promotions;
  v_allowed boolean := false;
  v_reason text := 'denied';
begin
  select * into v_workspace
  from public.agent_workspaces
  where workspace_key = p_workspace_key
    and status = 'active'
  limit 1;

  if v_workspace.id is null then
    v_reason := 'workspace_not_found_or_inactive';
  elsif v_workspace.org_id is not null
    and v_workspace.org_id not in ('', 'system')
    and coalesce(p_org_id, '') <> v_workspace.org_id then
    v_reason := 'org_scope_mismatch';
  elsif p_environment <> all(v_workspace.allowed_environments)
    and p_environment <> 'production' then
    v_reason := 'environment_not_allowed';
  elsif coalesce(v_workspace.plan_hash, '') <> ''
    and coalesce(p_plan_hash, '') <> v_workspace.plan_hash then
    v_reason := 'plan_hash_mismatch';
  else
    select * into v_lease
    from public.agent_workspace_leases
    where workspace_id = v_workspace.id
      and status = 'active'
      and agent_id in (p_agent_id, '*')
      and starts_at <= now()
      and now() <= auto_renew_until
      and p_environment = any(environments)
      and public.agent_workspace_scope_matches(scopes, p_scope)
    order by case when agent_id = p_agent_id then 0 else 1 end, expires_at desc
    limit 1;

    if v_lease.id is null then
      v_reason := 'no_active_lease_for_scope';
    else
      if v_lease.expires_at < now() then
        if v_lease.auto_renew and v_lease.auto_renew_until > now() then
          update public.agent_workspace_leases
          set expires_at = least(now() + interval '30 days', auto_renew_until),
              updated_at = now()
          where id = v_lease.id
          returning * into v_lease;
        else
          v_reason := 'lease_expired';
        end if;
      end if;

      if v_reason = 'denied' then
        if p_environment = 'production' then
          if not v_workspace.production_access or v_workspace.production_locked then
            if p_promotion_id is null then
              v_reason := 'production_requires_approved_promotion';
            else
              select * into v_promotion
              from public.agent_workspace_promotions
              where id = p_promotion_id
                and workspace_id = v_workspace.id
                and target_environment = 'production'
                and status = 'approved'
                and commit_sha is not null
                and evidence_hash is not null
                and (expires_at is null or expires_at > now())
                and (org_id is null or org_id in ('', 'system') or org_id = p_org_id)
              limit 1;

              if v_promotion.id is null then
                v_reason := 'promotion_missing_expired_or_not_approved';
              elsif not public.agent_workspace_scope_matches(v_promotion.requested_scopes, p_scope) then
                v_reason := 'promotion_scope_mismatch';
              else
                v_allowed := true;
                v_reason := 'approved_production_promotion';
              end if;
            end if;
          else
            v_allowed := true;
            v_reason := 'workspace_production_access_enabled';
          end if;
        else
          v_allowed := true;
          v_reason := 'plan_authorized_development_action';
        end if;
      end if;
    end if;
  end if;

  insert into public.agent_workspace_audit_events (
    workspace_id,
    org_id,
    agent_id,
    action,
    requested_scope,
    environment,
    target,
    plan_hash,
    input_hash,
    authorized,
    reason,
    lease_id,
    promotion_id,
    evidence
  ) values (
    v_workspace.id,
    p_org_id,
    p_agent_id,
    p_action,
    p_scope,
    p_environment,
    p_target,
    p_plan_hash,
    p_input_hash,
    v_allowed,
    v_reason,
    v_lease.id,
    p_promotion_id,
    coalesce(p_evidence, '{}'::jsonb)
  );

  return query select
    v_allowed,
    v_reason,
    v_workspace.id,
    v_lease.id,
    v_workspace.plan_hash,
    coalesce(v_workspace.production_locked, true);
end;
$$;

revoke all on function public.authorize_agent_workspace_action(
  text, text, text, text, text, text, text, text, text, jsonb, uuid
) from public;
grant execute on function public.authorize_agent_workspace_action(
  text, text, text, text, text, text, text, text, text, jsonb, uuid
) to service_role;

alter table public.agent_workspaces enable row level security;
alter table public.agent_workspace_capabilities enable row level security;
alter table public.agent_workspace_runs enable row level security;
alter table public.agent_workspace_promotions enable row level security;
alter table public.agent_workspace_leases enable row level security;
alter table public.agent_workspace_tool_registry enable row level security;
alter table public.agent_workspace_audit_events enable row level security;

drop policy if exists agent_workspaces_org_select on public.agent_workspaces;
create policy agent_workspaces_org_select
on public.agent_workspaces for select to authenticated
using (
  org_id is null
  or org_id in ('', 'system')
  or org_id = (auth.jwt() ->> 'org_id')
);

drop policy if exists agent_workspace_capabilities_select on public.agent_workspace_capabilities;
create policy agent_workspace_capabilities_select
on public.agent_workspace_capabilities for select to authenticated
using (exists (
  select 1 from public.agent_workspaces w
  where w.id = workspace_id
    and (w.org_id is null or w.org_id in ('', 'system') or w.org_id = (auth.jwt() ->> 'org_id'))
));

drop policy if exists agent_workspace_runs_select on public.agent_workspace_runs;
create policy agent_workspace_runs_select
on public.agent_workspace_runs for select to authenticated
using (org_id is null or org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists agent_workspace_promotions_select on public.agent_workspace_promotions;
create policy agent_workspace_promotions_select
on public.agent_workspace_promotions for select to authenticated
using (org_id is null or org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists agent_workspace_leases_select on public.agent_workspace_leases;
create policy agent_workspace_leases_select
on public.agent_workspace_leases for select to authenticated
using (org_id is null or org_id in ('', 'system') or org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists agent_workspace_tools_select on public.agent_workspace_tool_registry;
create policy agent_workspace_tools_select
on public.agent_workspace_tool_registry for select to authenticated
using (org_id is null or org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists agent_workspace_audit_select on public.agent_workspace_audit_events;
create policy agent_workspace_audit_select
on public.agent_workspace_audit_events for select to authenticated
using (org_id is null or org_id = (auth.jwt() ->> 'org_id'));

insert into public.agent_workspaces (
  workspace_key,
  name,
  org_id,
  environment,
  status,
  repo_full_name,
  git_branch_pattern,
  vercel_team_slug,
  vercel_project_slug,
  vercel_project_id,
  supabase_project_ref,
  stripe_account_id,
  stripe_mode,
  production_access,
  production_locked,
  allowed_environments,
  approved_plan,
  plan_hash,
  auto_authorize_plan_actions,
  allow_tool_creation,
  created_by,
  updated_at
) values (
  'dsg-agent-dev',
  'DSG Agent Development Workspace',
  'system',
  'development',
  'active',
  'tdealer01-crypto/tdealer01-crypto-dsg-control-plane',
  'agent-workspace/*',
  'tdealer01-crypto-dsg-control-plane',
  'tdealer01-crypto-dsg-control-plane',
  'prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW',
  'zeyguilldygozufpgxms',
  'acct_1Tft0OAZNzhgTUPV',
  'test',
  false,
  true,
  array['development','preview']::text[],
  jsonb_build_object(
    'goal', 'Complete DSG ONE development without repeated per-action approval inside isolated development and preview environments.',
    'allowed', jsonb_build_array(
      'inspect and modify repository branches',
      'create tests, scripts, MCP tools and development utilities',
      'read and mutate the development Supabase project including migrations',
      'create and inspect Vercel preview deployments',
      'read and mutate Stripe test-mode resources',
      'run builds, tests, security checks and evidence collection'
    ),
    'excluded', jsonb_build_array(
      'production deployment without an approved promotion',
      'production database mutation without an approved promotion',
      'Stripe live-mode write without an approved promotion',
      'secret value export or logging',
      'claims not supported by recorded evidence'
    )
  ),
  null,
  true,
  true,
  'user-approved-plan-2026-08-04',
  now()
)
on conflict (workspace_key) do update set
  name = excluded.name,
  org_id = excluded.org_id,
  repo_full_name = excluded.repo_full_name,
  git_branch_pattern = excluded.git_branch_pattern,
  vercel_team_slug = excluded.vercel_team_slug,
  vercel_project_slug = excluded.vercel_project_slug,
  vercel_project_id = excluded.vercel_project_id,
  supabase_project_ref = excluded.supabase_project_ref,
  stripe_account_id = excluded.stripe_account_id,
  stripe_mode = 'test',
  production_access = false,
  production_locked = true,
  allowed_environments = excluded.allowed_environments,
  approved_plan = excluded.approved_plan,
  plan_hash = excluded.plan_hash,
  auto_authorize_plan_actions = true,
  allow_tool_creation = true,
  status = 'active',
  updated_at = now();

update public.agent_workspaces
set plan_hash = encode(digest(convert_to(approved_plan::text, 'UTF8'), 'sha256'), 'hex'),
    updated_at = now()
where workspace_key = 'dsg-agent-dev';

insert into public.agent_workspace_leases (
  workspace_id,
  agent_id,
  org_id,
  scopes,
  environments,
  status,
  expires_at,
  auto_renew,
  auto_renew_until,
  issued_by,
  metadata
)
select
  w.id,
  '*',
  'system',
  array[
    'repo.*',
    'database.*',
    'deploy.preview.*',
    'stripe.test.*',
    'tool.*',
    'test.*',
    'build.*',
    'browser.*',
    'logs.read',
    'evidence.*',
    'workspace.*'
  ]::text[],
  array['development','preview','production']::text[],
  'active',
  now() + interval '30 days',
  true,
  now() + interval '365 days',
  'user-approved-plan-2026-08-04',
  jsonb_build_object('purpose', 'No repeated per-action approvals inside the approved development plan')
from public.agent_workspaces w
where w.workspace_key = 'dsg-agent-dev'
on conflict (workspace_id, agent_id)
do update set
  scopes = excluded.scopes,
  environments = excluded.environments,
  expires_at = excluded.expires_at,
  auto_renew = true,
  auto_renew_until = excluded.auto_renew_until,
  issued_by = excluded.issued_by,
  metadata = excluded.metadata,
  updated_at = now();;
