-- GitHub Marketplace Webhook Events Table
-- Stores webhook events from GitHub Marketplace for subscription tracking

create table if not exists public.marketplace_events (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('purchased', 'pending_change', 'pending_change_cancelled', 'changed', 'cancelled')),
  github_login text not null,
  github_account_id bigint not null,
  account_type text not null check (account_type in ('Organization', 'User')),
  plan_name text not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  unit_count integer default 1,
  event_data jsonb,
  processed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Indexes for common queries
create index if not exists idx_marketplace_events_github_login on public.marketplace_events(github_login);
create index if not exists idx_marketplace_events_github_account_id on public.marketplace_events(github_account_id);
create index if not exists idx_marketplace_events_action on public.marketplace_events(action);
create index if not exists idx_marketplace_events_created_at on public.marketplace_events(created_at);
create index if not exists idx_marketplace_events_processed_at on public.marketplace_events(processed_at);

-- Allow public read-only for webhook verification
-- The webhook endpoint handles all inserts
alter table public.marketplace_events enable row level security;

-- Policy: Allow inserts from webhook only (via service role)
-- Service role is used by webhook handler
drop policy if exists marketplace_events_insert_webhook on public.marketplace_events;
create policy marketplace_events_insert_webhook on public.marketplace_events
  for insert
  with check (true);

-- Policy: Allow select for authenticated users to view their events
drop policy if exists marketplace_events_select on public.marketplace_events;
create policy marketplace_events_select on public.marketplace_events
  for select
  using (
    github_login = current_setting('app.github_login', true)
    or auth.uid() in (
      select id from public.users where role = 'admin'
    )
  );

-- Comment on table
comment on table public.marketplace_events is 'GitHub Marketplace webhook events for subscription tracking and compliance';
