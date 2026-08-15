create table if not exists public.agent_workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null unique,
  name text not null,
  environment text not null check (environment in ('development','preview','staging')),
  status text not null default 'active' check (status in ('active','paused','locked','archived')),
  repo_full_name text not null,
  git_branch_pattern text not null default 'agent-workspace/*',
  vercel_team_slug text,
  vercel_project_slug text,
  stripe_mode text not null default 'test' check (stripe_mode in ('test')),
  production_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_workspace_capabilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  capability text not null,
  scope text not null,
  access_level text not null check (access_level in ('read','write','admin')),
  requires_runtime_approval boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(workspace_id, capability, scope)
);

create table if not exists public.agent_workspace_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  agent_id text not null,
  goal text not null,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','verifying','passed','failed','blocked','cancelled')),
  git_branch text,
  preview_url text,
  evidence jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_workspace_promotions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  run_id uuid references public.agent_workspace_runs(id) on delete set null,
  target_environment text not null check (target_environment in ('staging','production')),
  requested_by text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','expired')),
  checks jsonb not null default '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.agent_workspaces enable row level security;
alter table public.agent_workspace_capabilities enable row level security;
alter table public.agent_workspace_runs enable row level security;
alter table public.agent_workspace_promotions enable row level security;

revoke all on public.agent_workspaces from anon, authenticated;
revoke all on public.agent_workspace_capabilities from anon, authenticated;
revoke all on public.agent_workspace_runs from anon, authenticated;
revoke all on public.agent_workspace_promotions from anon, authenticated;

grant all on public.agent_workspaces to service_role;
grant all on public.agent_workspace_capabilities to service_role;
grant all on public.agent_workspace_runs to service_role;
grant all on public.agent_workspace_promotions to service_role;

insert into public.agent_workspaces (
  workspace_key, name, environment, repo_full_name, git_branch_pattern,
  vercel_team_slug, vercel_project_slug, stripe_mode, production_access
) values (
  'dsg-agent-dev',
  'DSG Agent Development Workspace',
  'development',
  'tdealer01-crypto/tdealer01-crypto-dsg-control-plane',
  'agent-workspace/*',
  'tdealer01-crypto-dsg-control-plane',
  'tdealer01-crypto-dsg-control-plane',
  'test',
  false
)
on conflict (workspace_key) do update set
  name = excluded.name,
  environment = excluded.environment,
  repo_full_name = excluded.repo_full_name,
  git_branch_pattern = excluded.git_branch_pattern,
  vercel_team_slug = excluded.vercel_team_slug,
  vercel_project_slug = excluded.vercel_project_slug,
  stripe_mode = excluded.stripe_mode,
  production_access = false,
  updated_at = now();

with w as (
  select id from public.agent_workspaces where workspace_key = 'dsg-agent-dev'
)
insert into public.agent_workspace_capabilities (workspace_id, capability, scope, access_level, requires_runtime_approval)
select w.id, v.capability, v.scope, v.access_level, v.requires_runtime_approval
from w cross join (values
  ('repository','agent-workspace/*','admin',false),
  ('supabase','zeyguilldygozufpgxms','admin',false),
  ('vercel','preview','admin',false),
  ('stripe','test_mode','admin',false),
  ('tooling','workspace-local','admin',false),
  ('production','production','read',true),
  ('promotion','staging-or-production','write',true)
) as v(capability, scope, access_level, requires_runtime_approval)
on conflict (workspace_id, capability, scope) do update set
  access_level = excluded.access_level,
  requires_runtime_approval = excluded.requires_runtime_approval,
  enabled = true;;
