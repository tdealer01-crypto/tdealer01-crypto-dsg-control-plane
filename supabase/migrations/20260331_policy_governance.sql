create table if not exists policy_governance_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  actor_auth_user_id uuid not null,
  policy_id text not null references policies(id) on delete cascade,
  event_type text not null,
  previous_state jsonb not null default '{}'::jsonb,
  next_state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_policy_governance_events_org_created
  on policy_governance_events(org_id, created_at desc);

create index if not exists idx_policy_governance_events_policy_created
  on policy_governance_events(policy_id, created_at desc);
