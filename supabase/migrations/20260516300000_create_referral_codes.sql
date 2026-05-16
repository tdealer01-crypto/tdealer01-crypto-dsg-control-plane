create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  org_id text not null,
  referrer_email text,
  clicks integer not null default 0,
  signups integer not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists referral_codes_org_idx on public.referral_codes (org_id);
create index if not exists referral_codes_code_idx on public.referral_codes (code);

alter table public.referral_codes enable row level security;
-- No direct access for anon/authenticated clients — all mutations go through service-role API routes

-- Track referral clicks/signups via leads table ref_code column
alter table public.leads add column if not exists ref_code text;
create index if not exists leads_ref_code_idx on public.leads (ref_code) where ref_code is not null;

-- Atomic increment RPC — avoids read-modify-write race condition in click tracking
create or replace function public.increment_referral_clicks(p_code text)
returns void language sql security definer as $$
  update public.referral_codes set clicks = clicks + 1 where code = p_code;
$$;
