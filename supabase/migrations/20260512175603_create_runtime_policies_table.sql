create table if not exists public.runtime_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  version text not null default 'v1',
  status text not null default 'draft',
  thresholds jsonb not null default '{}'::jsonb,
  governance_state text not null default 'proposed',
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_runtime_policies_org_updated on public.runtime_policies(org_id, updated_at desc);

notify pgrst, 'reload schema';