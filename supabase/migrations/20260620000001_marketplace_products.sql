-- Marketplace Products Table
-- Allows vendors to submit products for sale in the marketplace

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price > 0),
  category text not null,
  image_url text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for common queries
create index if not exists idx_marketplace_products_org_id on public.marketplace_products(org_id);
create index if not exists idx_marketplace_products_created_by on public.marketplace_products(created_by);
create index if not exists idx_marketplace_products_status on public.marketplace_products(status);
create index if not exists idx_marketplace_products_category on public.marketplace_products(category);

-- Row Level Security
alter table public.marketplace_products enable row level security;

-- Policy: Users can view their own org's products
drop policy if exists marketplace_products_select on public.marketplace_products;
create policy marketplace_products_select on public.marketplace_products
  for select
  using (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Users can insert products for their org
drop policy if exists marketplace_products_insert on public.marketplace_products;
create policy marketplace_products_insert on public.marketplace_products
  for insert
  with check (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
    and created_by = (select id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Users can update their own products
drop policy if exists marketplace_products_update on public.marketplace_products;
create policy marketplace_products_update on public.marketplace_products
  for update
  using (
    created_by = (select id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Only org admins can delete
drop policy if exists marketplace_products_delete on public.marketplace_products;
create policy marketplace_products_delete on public.marketplace_products
  for delete
  using (
    created_by = (select id from public.users where auth_user_id = auth.uid())
  );
