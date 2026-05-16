create table if not exists public.webhook_configs (
  id          text primary key,
  org_id      text not null,
  url         text not null,
  description text not null default '',
  events      text[] not null default '{}',
  status      text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED','FAILING')),
  created_at  timestamptz not null default now()
);
create index if not exists webhook_configs_org_id_idx on public.webhook_configs (org_id);
alter table public.webhook_configs enable row level security;
create policy "org members can manage their webhooks"
  on public.webhook_configs
  for all
  using (org_id = (select org_id from public.users where auth_user_id = auth.uid() limit 1));
