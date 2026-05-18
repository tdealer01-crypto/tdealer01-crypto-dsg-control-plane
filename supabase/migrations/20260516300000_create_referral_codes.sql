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

-- Track referral attribution in lead/signup tables
alter table public.leads add column if not exists ref_code text;
create index if not exists leads_ref_code_idx on public.leads (ref_code) where ref_code is not null;

alter table public.trial_signups add column if not exists ref_code text;
create index if not exists trial_signups_ref_code_idx on public.trial_signups (ref_code) where ref_code is not null;

alter table public.access_requests add column if not exists ref_code text;
create index if not exists access_requests_ref_code_idx on public.access_requests (ref_code) where ref_code is not null;

-- Atomic increment RPCs — avoids read-modify-write race condition in click/signup tracking
create or replace function public.increment_referral_clicks(p_code text)
returns void language sql security definer as $$
  update public.referral_codes set clicks = clicks + 1 where code = p_code;
$$;

create or replace function public.increment_referral_signups(p_code text)
returns void language sql security definer as $$
  update public.referral_codes set signups = signups + 1 where code = p_code;
$$;

create or replace function public.increment_referral_conversions(p_code text)
returns void language sql security definer as $$
  update public.referral_codes set conversions = conversions + 1 where code = p_code;
$$;

-- Restrict RPC execution to service_role only — anon/authenticated clients must go through API
revoke execute on function public.increment_referral_clicks(text) from public;
grant execute on function public.increment_referral_clicks(text) to service_role;

revoke execute on function public.increment_referral_signups(text) from public;
grant execute on function public.increment_referral_signups(text) to service_role;

revoke execute on function public.increment_referral_conversions(text) from public;
grant execute on function public.increment_referral_conversions(text) to service_role;
