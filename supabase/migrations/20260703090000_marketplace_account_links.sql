-- Link GitHub Marketplace buyer accounts to internal organizations.
-- The marketplace webhook identifies buyers only by github_account_id/login;
-- this table lets subscription sync resolve them to an org_id.

create table if not exists public.marketplace_account_links (
  github_account_id bigint primary key,
  github_login text not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_marketplace_account_links_org_id
  on public.marketplace_account_links(org_id);

alter table public.marketplace_account_links enable row level security;

-- Org members can see their org's link; only org admins/owners manage it.
-- The webhook itself reads via service role (bypasses RLS).
drop policy if exists marketplace_account_links_select on public.marketplace_account_links;
create policy marketplace_account_links_select on public.marketplace_account_links
  for select
  using (public.is_org_member(org_id));

drop policy if exists marketplace_account_links_insert on public.marketplace_account_links;
create policy marketplace_account_links_insert on public.marketplace_account_links
  for insert
  with check (public.is_org_admin(org_id));

drop policy if exists marketplace_account_links_update on public.marketplace_account_links;
create policy marketplace_account_links_update on public.marketplace_account_links
  for update
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists marketplace_account_links_delete on public.marketplace_account_links;
create policy marketplace_account_links_delete on public.marketplace_account_links
  for delete
  using (public.is_org_admin(org_id));

comment on table public.marketplace_account_links is
  'Maps GitHub Marketplace buyer accounts to organizations for subscription sync';
