-- DSG One: app builds (history + analytics) and notifications
-- Migration: 20260516000002_dsg_one_tables.sql

-- App builds (used by history + analytics pages)
create table if not exists public.dsg_app_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  app_name text not null,
  status text not null default 'draft' check (status in ('deployed','building','draft','failed')),
  template text,
  description text,
  lines_added integer not null default 0,
  lines_removed integer not null default 0,
  created_at timestamptz not null default now(),
  deployed_at timestamptz
);

alter table public.dsg_app_builds enable row level security;

create policy "users can manage own builds" on public.dsg_app_builds
  using (user_id = auth.uid());

-- DSG notifications
create table if not exists public.dsg_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.dsg_notifications enable row level security;

create policy "users can manage own notifications" on public.dsg_notifications
  using (user_id = auth.uid());
