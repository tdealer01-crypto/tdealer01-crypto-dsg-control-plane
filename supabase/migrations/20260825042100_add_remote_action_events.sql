create table if not exists public.remote_action_events (
  id uuid primary key default gen_random_uuid(),
  remote_session_id uuid not null references public.remote_action_sessions(id) on delete cascade,
  org_id text not null,
  user_id text not null,
  request_id uuid not null unique,
  agent_id text not null,
  action_kind text not null,
  decision text not null check (decision in ('ALLOW', 'BLOCK')),
  decision_hash text not null,
  result_json jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_remote_action_events_session
  on public.remote_action_events (remote_session_id, created_at desc);
create index if not exists idx_remote_action_events_owner
  on public.remote_action_events (user_id, org_id, created_at desc);

alter table public.remote_action_events enable row level security;

create policy "remote events select own"
  on public.remote_action_events for select
  to authenticated
  using (user_id = auth.uid()::text);

create policy "remote events insert own"
  on public.remote_action_events for insert
  to authenticated
  with check (user_id = auth.uid()::text);

comment on table public.remote_action_events is
  'Immutable evidence records for actions relayed through user-owned Remote Action Endpoint sessions.';
