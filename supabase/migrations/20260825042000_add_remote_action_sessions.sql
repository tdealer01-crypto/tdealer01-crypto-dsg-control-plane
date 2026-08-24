create table if not exists public.remote_action_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  user_id text not null,
  endpoint_ciphertext text not null,
  endpoint_iv text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED', 'EXPIRED')),
  plan_hash text not null,
  execution_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_remote_action_sessions_owner
  on public.remote_action_sessions (user_id, org_id, status);
create index if not exists idx_remote_action_sessions_execution
  on public.remote_action_sessions (execution_id, plan_hash);
create index if not exists idx_remote_action_sessions_expiry
  on public.remote_action_sessions (expires_at);

alter table public.remote_action_sessions enable row level security;

create policy "remote sessions select own"
  on public.remote_action_sessions for select
  to authenticated
  using (user_id = auth.uid()::text);

create policy "remote sessions insert own"
  on public.remote_action_sessions for insert
  to authenticated
  with check (user_id = auth.uid()::text);

create policy "remote sessions update own"
  on public.remote_action_sessions for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

comment on table public.remote_action_sessions is
  'Durable user-delegated Remote Action Endpoint sessions. Endpoint URLs are encrypted at rest; disabling remote does not terminate the user browser.';
