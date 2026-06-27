-- Billing Meter Outbox: RLS policies + monitoring view
-- Migration: 20260613000001_billing_meter_outbox_rls_and_monitoring.sql

-- ─── Row Level Security Policies ────────────────────────────────────────────

-- Allow service role full access (used by server-side billing code)
create policy "service_role_full_access"
  on public.billing_meter_outbox
  for all
  to service_role
  using (true)
  with check (true);

-- Authenticated users can only read their own org's billing rows
create policy "org_members_read_own"
  on public.billing_meter_outbox
  for select
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid()
    )
  );

-- ─── Indexes for flush performance ──────────────────────────────────────────

-- Index for flush cron: scan pending rows older than N minutes
create index if not exists idx_billing_meter_outbox_flush_candidate
  on public.billing_meter_outbox (status, created_at)
  where status in ('pending', 'failed');

-- Index for org billing stats (dashboard queries)
create index if not exists idx_billing_meter_outbox_org_created
  on public.billing_meter_outbox (org_id, created_at desc);

-- ─── Monitoring view ─────────────────────────────────────────────────────────

-- Real-time billing meter health: used by admin dashboard + alerts
create or replace view public.billing_meter_health as
select
  date_trunc('hour', created_at) as hour_bucket,
  count(*) filter (where status = 'pending')            as pending_count,
  count(*) filter (where status = 'sent')               as sent_count,
  count(*) filter (where status = 'failed')             as failed_count,
  count(*) filter (
    where status = 'pending'
      and created_at < now() - interval '10 minutes'
  )                                                      as stuck_count,
  sum(quantity)                                          as total_quantity,
  sum(quantity) filter (where status = 'sent')           as delivered_quantity,
  round(
    100.0 * count(*) filter (where status = 'sent')
    / nullif(count(*), 0),
    2
  )                                                      as delivery_rate_pct,
  avg(
    extract(epoch from (flushed_at - created_at))
    / 60
  ) filter (where status = 'sent' and flushed_at is not null)
                                                         as avg_flush_lag_minutes
from public.billing_meter_outbox
where created_at >= now() - interval '7 days'
group by 1
order by 1 desc;

-- Grant read access to authenticated users (admin only via RLS or separate role)
grant select on public.billing_meter_health to authenticated;

-- ─── Reconciliation summary view ─────────────────────────────────────────────

create or replace view public.billing_meter_reconciliation_summary as
select
  org_id,
  count(*)                                                        as total_events,
  count(*) filter (where status = 'sent')                         as delivered,
  count(*) filter (where status = 'pending')                      as pending,
  count(*) filter (where status = 'failed')                       as failed,
  count(*) filter (
    where status = 'pending'
      and created_at < now() - interval '10 minutes'
  )                                                               as stuck,
  sum(quantity)                                                    as total_executions_billed,
  max(flushed_at)                                                  as last_delivery_at,
  round(
    100.0 * count(*) filter (where status = 'sent')
    / nullif(count(*), 0),
    2
  )                                                               as delivery_rate_pct
from public.billing_meter_outbox
where created_at >= now() - interval '30 days'
group by org_id
order by total_events desc;

grant select on public.billing_meter_reconciliation_summary to authenticated;

-- ─── Dead letter alert function ───────────────────────────────────────────────

-- Returns rows that have been stuck > 1 hour (needs human review)
create or replace function public.get_billing_dead_letters(
  threshold_minutes int default 60
)
returns table (
  id uuid,
  execution_id text,
  org_id text,
  stripe_customer_id text,
  quantity int,
  status text,
  error text,
  created_at timestamptz,
  stuck_minutes numeric
)
language sql
security definer
as $$
  select
    id,
    execution_id,
    org_id,
    stripe_customer_id,
    quantity,
    status,
    error,
    created_at,
    round(extract(epoch from now() - created_at) / 60, 1) as stuck_minutes
  from public.billing_meter_outbox
  where
    status in ('pending', 'failed')
    and created_at < now() - (threshold_minutes || ' minutes')::interval
  order by created_at asc;
$$;

grant execute on function public.get_billing_dead_letters to authenticated;

comment on function public.get_billing_dead_letters is
  'Returns billing events stuck for longer than threshold_minutes. '
  'Used by admin dashboard and on-call alerts.';
