-- API Keys
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','REVOKED')),
  expiry timestamptz,
  created_at timestamptz not null default now(),
  last_used timestamptz,
  requests_this_month integer not null default 0
);
alter table public.api_keys enable row level security;
create policy "org members can manage api keys" on public.api_keys
  using (org_id in (select org_id from public.users where auth_user_id = auth.uid()));

-- Webhook configs
create table if not exists public.webhook_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  secret_hash text not null,
  events text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.webhook_configs enable row level security;
create policy "org members can manage webhooks" on public.webhook_configs
  using (org_id in (select org_id from public.users where auth_user_id = auth.uid()));

-- Webhook deliveries (read-only logs)
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhook_configs(id) on delete cascade,
  event text not null,
  status text not null default 'pending' check (status in ('success','failed','pending')),
  response_code integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);
alter table public.webhook_deliveries enable row level security;
create policy "org members can view webhook deliveries" on public.webhook_deliveries
  using (webhook_id in (select id from public.webhook_configs where org_id in (select org_id from public.users where auth_user_id = auth.uid())));

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id),
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "users can view own notifications" on public.notifications
  using (user_id in (select id from public.users where auth_user_id = auth.uid()));

-- Notification settings
create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  email boolean not null default true,
  slack boolean not null default false,
  pagerduty boolean not null default false,
  slack_webhook_url text,
  pagerduty_key text,
  updated_at timestamptz not null default now(),
  unique(user_id)
);
alter table public.notification_settings enable row level security;
create policy "users can manage own notification settings" on public.notification_settings
  using (user_id in (select id from public.users where auth_user_id = auth.uid()));
