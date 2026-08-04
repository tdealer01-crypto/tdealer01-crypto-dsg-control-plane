-- Initial agent workspace control-plane schema.
-- Schema only: development workspace data must be created explicitly through
-- the admin API or a development-only operational action. Applying migrations
-- to production must not create an active autonomous workspace.

create extension if not exists pgcrypto;

create table if not exists public.agent_workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null unique,
  name text not null,
  environment text not null,
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

create table if not exists public.agent_workspace_capabilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  capability text not null,
  scope text not null,
  access_level text not null,
  requires_runtime_approval boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, capability, scope)
);

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

alter table public.agent_workspaces enable row level security;
alter table public.agent_workspace_capabilities enable row level security;
alter table public.agent_workspace_runs enable row level security;
alter table public.agent_workspace_promotions enable row level security;
