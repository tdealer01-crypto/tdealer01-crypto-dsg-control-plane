-- Marketplace Checkout Sessions (optional - for audit trail)
-- Tracks Stripe checkout sessions for products

create table if not exists public.marketplace_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketplace_products(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Marketplace Payment Audit (for compliance/auditing)
create table if not exists public.marketplace_payment_audit (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.marketplace_products(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  stripe_session_id text,
  event_type text not null,
  amount_cents integer,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_checkout_sessions_product_id on public.marketplace_checkout_sessions(product_id);
create index if not exists idx_checkout_sessions_org_id on public.marketplace_checkout_sessions(org_id);
create index if not exists idx_checkout_sessions_stripe_session_id on public.marketplace_checkout_sessions(stripe_session_id);
create index if not exists idx_payment_audit_event_type on public.marketplace_payment_audit(event_type);
create index if not exists idx_payment_audit_org_id on public.marketplace_payment_audit(org_id);

-- RLS
alter table public.marketplace_checkout_sessions enable row level security;
alter table public.marketplace_payment_audit enable row level security;

-- Policy: Users can view their own checkout sessions
drop policy if exists checkout_sessions_select on public.marketplace_checkout_sessions;
create policy checkout_sessions_select on public.marketplace_checkout_sessions
  for select
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

-- Policy: Users can view audit logs for their org
drop policy if exists payment_audit_select on public.marketplace_payment_audit;
create policy payment_audit_select on public.marketplace_payment_audit
  for select
  using (org_id = (select org_id from public.users where auth_user_id = auth.uid()));
