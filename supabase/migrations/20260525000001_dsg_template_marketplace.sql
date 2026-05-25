-- Extend dsg_templates with marketplace fields
alter table public.dsg_templates
  add column if not exists price_satang  integer  not null default 0,
  add column if not exists seller_id     uuid     references auth.users(id),
  add column if not exists version       text     not null default '1.0.0',
  add column if not exists sharing_mode text     not null default 'public';

-- Sales ledger: one row per completed or pending purchase
create table if not exists public.dsg_template_sales (
  sale_id                 uuid        primary key default gen_random_uuid(),
  template_id             uuid        not null references public.dsg_templates(id),
  seller_id               uuid        not null,
  buyer_id                uuid        not null,
  price_satang            integer     not null,
  commission_rate_bps     integer     not null default 2000,
  platform_fee_satang     integer     not null,
  creator_payout_satang   integer     not null,
  status                  text        not null default 'PENDING'
                            check (status in ('PENDING', 'CLEARED', 'REFUNDED')),
  stripe_payment_intent_id text,
  created_at              timestamptz not null default now()
);

alter table public.dsg_template_sales enable row level security;

-- Sellers see their own sales; buyers see their own purchases
create policy "sellers and buyers see own sales"
  on public.dsg_template_sales for select
  using (seller_id = auth.uid() or buyer_id = auth.uid());

-- Only service role can insert/update sales (no direct client writes)
