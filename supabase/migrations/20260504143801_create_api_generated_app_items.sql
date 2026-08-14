create extension if not exists pgcrypto;
create schema if not exists api;

create table if not exists api.generated_app_items (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_app_items_app_id_created_at_idx
  on api.generated_app_items(app_id, created_at desc);

alter table api.generated_app_items enable row level security;

grant usage on schema api to anon, authenticated, service_role;
grant select, insert, update, delete on api.generated_app_items to service_role;

select pg_notify('pgrst', 'reload schema');