create table if not exists public.runtime_policy_governance_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid references public.runtime_policies(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_runtime_policy_events_org_created on public.runtime_policy_governance_events(org_id, created_at desc);

notify pgrst, 'reload schema';