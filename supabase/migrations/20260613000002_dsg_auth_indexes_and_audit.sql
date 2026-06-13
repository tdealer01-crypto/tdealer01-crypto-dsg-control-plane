-- =============================================================================
-- Migration: 20260613000002_dsg_auth_indexes_and_audit.sql
--
-- Purpose: Harden api_keys table for DSG route authentication
--   1. Index on key_hash (currently unindexed — every DSG auth does a full scan)
--   2. Auto-update last_used timestamp on key lookup
--   3. Auto-expire keys past their expiry date
--   4. DSG API call audit log (who called which route, when, with which key)
--   5. Service role policy for server-side key lookup
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Index on key_hash
--    requireDsgAuth() does: SELECT * FROM api_keys WHERE key_hash = $1
--    Without this index, every DSG API call does a full table scan.
-- -----------------------------------------------------------------------------

create unique index if not exists idx_api_keys_key_hash
  on public.api_keys (key_hash);

-- Index for org dashboard: list keys by org
create index if not exists idx_api_keys_org_id
  on public.api_keys (org_id, created_at desc);

-- Index for expired-key cleanup job
create index if not exists idx_api_keys_expiry
  on public.api_keys (expiry)
  where expiry is not null and status = 'ACTIVE';


-- -----------------------------------------------------------------------------
-- 2. Service role policy for server-side key lookup
--    The existing policy only allows authenticated users via auth.uid().
--    Server-side code (requireDsgAuth) runs as service_role and needs SELECT.
-- -----------------------------------------------------------------------------

create policy "service_role_full_access"
  on public.api_keys
  for all
  to service_role
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 3. Function: update last_used on key lookup
--    Call this from requireDsgAuth after successful resolution.
--    Kept as a DB function so it's an atomic UPDATE without an extra round-trip.
-- -----------------------------------------------------------------------------

create or replace function public.touch_api_key_last_used(p_key_hash text)
returns void
language sql
security definer
as $$
  update public.api_keys
  set
    last_used            = now(),
    requests_this_month  = requests_this_month + 1
  where key_hash = p_key_hash
    and status   = 'ACTIVE';
$$;

grant execute on function public.touch_api_key_last_used to service_role;

comment on function public.touch_api_key_last_used is
  'Atomically bump last_used + requests_this_month for an active API key. '
  'Called by requireDsgAuth after successful resolution.';


-- -----------------------------------------------------------------------------
-- 4. Function: expire keys past their expiry date
--    Run via a cron job (e.g. nightly). Safe to call multiple times.
-- -----------------------------------------------------------------------------

create or replace function public.expire_api_keys()
returns integer
language sql
security definer
as $$
  with expired as (
    update public.api_keys
    set status = 'EXPIRED'
    where status = 'ACTIVE'
      and expiry is not null
      and expiry < now()
    returning id
  )
  select count(*)::integer from expired;
$$;

grant execute on function public.expire_api_keys to service_role;

comment on function public.expire_api_keys is
  'Marks API keys as EXPIRED when their expiry date has passed. '
  'Returns the number of keys expired. Run nightly via cron.';


-- -----------------------------------------------------------------------------
-- 5. DSG API audit log
--    Records every authenticated call to /api/dsg/v1/* routes.
--    Used for: billing attribution, security review, rate-limit debugging.
-- -----------------------------------------------------------------------------

create table if not exists public.dsg_api_calls (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references public.organizations(id) on delete cascade,
  -- Actor
  actor_type      text        not null check (actor_type in ('user', 'api_key')),
  user_id         uuid        references public.users(id) on delete set null,
  api_key_id      uuid        references public.api_keys(id) on delete set null,
  -- Request
  route           text        not null,   -- e.g. 'gates/evaluate'
  method          text        not null default 'POST',
  -- Result
  status_code     integer,
  gate_status     text,                   -- PASS / BLOCK / REVIEW (from proof)
  proof_id        text,                   -- dpf_xxx
  -- Timing
  duration_ms     integer,
  -- Timestamp
  called_at       timestamptz not null default now()
);

-- RLS: service role writes, org members read their own
alter table public.dsg_api_calls enable row level security;

create policy "service_role_full_access"
  on public.dsg_api_calls
  for all
  to service_role
  using (true)
  with check (true);

create policy "org_members_read_own"
  on public.dsg_api_calls
  for select
  to authenticated
  using (
    org_id in (
      select org_id from public.users
      where auth_user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_dsg_api_calls_org_called
  on public.dsg_api_calls (org_id, called_at desc);

create index if not exists idx_dsg_api_calls_api_key
  on public.dsg_api_calls (api_key_id, called_at desc)
  where api_key_id is not null;

create index if not exists idx_dsg_api_calls_route
  on public.dsg_api_calls (route, called_at desc);

comment on table public.dsg_api_calls is
  'Audit log for every authenticated call to /api/dsg/v1/* routes. '
  'Written by requireDsgAuth middleware.';


-- -----------------------------------------------------------------------------
-- 6. View: API key usage summary for dashboard
-- -----------------------------------------------------------------------------

create or replace view public.api_key_usage_summary as
select
  k.id                                                  as key_id,
  k.org_id,
  k.name,
  k.prefix,
  k.scopes,
  k.status,
  k.expiry,
  k.last_used,
  k.requests_this_month,
  k.created_at,
  count(c.id)                                           as total_dsg_calls,
  count(c.id) filter (where c.called_at >= now() - interval '24 hours')
                                                        as calls_last_24h,
  count(c.id) filter (where c.gate_status = 'PASS')    as gate_pass_count,
  count(c.id) filter (where c.gate_status = 'BLOCK')   as gate_block_count,
  max(c.called_at)                                      as last_dsg_call_at
from public.api_keys k
left join public.dsg_api_calls c on c.api_key_id = k.id
group by k.id, k.org_id, k.name, k.prefix, k.scopes, k.status,
         k.expiry, k.last_used, k.requests_this_month, k.created_at;

grant select on public.api_key_usage_summary to authenticated;

comment on view public.api_key_usage_summary is
  'API key usage stats joined with dsg_api_calls. '
  'Used by Settings > API Keys dashboard page.';
