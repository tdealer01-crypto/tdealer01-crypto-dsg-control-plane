-- DSG ONE dashboard: real-data contracts only. No sample/demo metric rows are inserted.

create or replace view public.dashboard_agent_status
with (security_invoker = on)
as
select
  a.org_id,
  a.id as agent_id,
  a.name,
  a.status as configured_status,
  a.last_used_at,
  max(e.created_at) as last_execution_at,
  count(e.id) filter (where e.created_at >= date_trunc('day', now()))::bigint as actions_today,
  count(e.id) filter (where e.created_at >= date_trunc('month', now()))::bigint as actions_this_month,
  a.monthly_limit,
  round(avg(e.latency_ms::numeric) filter (where e.created_at >= now() - interval '24 hours'), 2) as avg_latency_ms_24h,
  a.metadata
from public.agents a
left join public.executions e
  on e.agent_id = a.id
 and e.org_id = a.org_id
group by a.org_id, a.id, a.name, a.status, a.last_used_at, a.monthly_limit, a.metadata;

create or replace view public.dashboard_policy_decisions
with (security_invoker = on)
as
select
  e.org_id,
  e.id,
  e.created_at as decision_at,
  e.agent_id,
  a.name as source,
  coalesce(nullif(e.metadata->>'provider', ''), nullif(e.request_payload->>'provider', '')) as provider,
  e.policy_version as policy,
  upper(e.decision) as decision,
  e.latency_ms,
  coalesce(
    nullif(e.metadata->>'proof_id', ''),
    nullif(e.metadata->>'proof_hash', ''),
    nullif(e.metadata->>'z3_proof_id', '')
  ) as proof_id,
  e.reason,
  e.metadata
from public.executions e
left join public.agents a
  on a.id = e.agent_id
 and a.org_id = e.org_id;

create or replace view public.dashboard_activity_feed
with (security_invoker = on)
as
select
  al.org_id,
  al.id,
  al.created_at,
  al.agent_id,
  coalesce(a.name, nullif(al.metadata->>'agent_name', ''), 'System') as agent,
  coalesce(nullif(al.metadata->>'action', ''), nullif(al.reason, ''), al.decision) as action,
  upper(al.decision) as result,
  nullif(al.metadata->>'duration_ms', '') as duration_ms,
  al.reason as detail,
  coalesce(
    nullif(al.evidence->>'sha256_hash', ''),
    nullif(al.evidence->>'proof_hash', ''),
    nullif(al.metadata->>'sha256_hash', ''),
    nullif(al.metadata->>'proof_hash', '')
  ) as evidence_hash,
  al.policy_version,
  al.metadata
from public.audit_logs al
left join public.agents a
  on a.id = al.agent_id
 and a.org_id = al.org_id;

create or replace view public.dashboard_overview_kpis
with (security_invoker = on)
as
with agent_agg as (
  select
    org_id,
    count(*)::bigint as total_agents,
    count(*) filter (where status = 'active')::bigint as configured_active_agents,
    coalesce(sum(monthly_limit), 0)::bigint as configured_monthly_limit
  from public.agents
  where org_id is not null
  group by org_id
),
exec_agg as (
  select
    org_id,
    count(*) filter (where created_at >= date_trunc('day', now()))::bigint as executions_today,
    count(*) filter (where created_at >= date_trunc('month', now()))::bigint as executions_this_month,
    count(*) filter (where created_at >= date_trunc('day', now()) and upper(decision) = 'ALLOW')::bigint as allow_today,
    count(*) filter (where created_at >= date_trunc('day', now()) and upper(decision) = 'BLOCK')::bigint as block_today,
    round(avg(latency_ms::numeric) filter (where created_at >= date_trunc('day', now())), 2) as avg_latency_ms_today
  from public.executions
  where org_id is not null
  group by org_id
),
usage_agg as (
  select
    org_id,
    max(billing_period) as latest_billing_period,
    coalesce(sum(executions), 0)::bigint as metered_executions,
    coalesce(sum(amount_usd), 0)::numeric as metered_amount_usd
  from public.usage_counters
  where org_id is not null
  group by org_id
),
orgs as (
  select org_id from agent_agg
  union
  select org_id from exec_agg
  union
  select org_id from usage_agg
)
select
  o.org_id,
  coalesce(a.total_agents, 0)::bigint as total_agents,
  coalesce(a.configured_active_agents, 0)::bigint as configured_active_agents,
  coalesce(x.executions_today, 0)::bigint as executions_today,
  coalesce(x.executions_this_month, 0)::bigint as executions_this_month,
  coalesce(x.allow_today, 0)::bigint as allow_today,
  coalesce(x.block_today, 0)::bigint as block_today,
  x.avg_latency_ms_today,
  coalesce(a.configured_monthly_limit, 0)::bigint as configured_monthly_limit,
  u.latest_billing_period,
  coalesce(u.metered_executions, 0)::bigint as metered_executions,
  coalesce(u.metered_amount_usd, 0)::numeric as metered_amount_usd,
  null::numeric as monthly_revenue_usd,
  false as monthly_revenue_verified,
  'No org-scoped authoritative revenue amount source is wired to this dashboard view'::text as monthly_revenue_verification_note
from orgs o
left join agent_agg a on a.org_id = o.org_id
left join exec_agg x on x.org_id = o.org_id
left join usage_agg u on u.org_id = o.org_id;

revoke all on public.dashboard_agent_status from anon;
revoke all on public.dashboard_policy_decisions from anon;
revoke all on public.dashboard_activity_feed from anon;
revoke all on public.dashboard_overview_kpis from anon;

grant select on public.dashboard_agent_status to authenticated, service_role;
grant select on public.dashboard_policy_decisions to authenticated, service_role;
grant select on public.dashboard_activity_feed to authenticated, service_role;
grant select on public.dashboard_overview_kpis to authenticated, service_role;

-- Enable realtime on the existing source tables the dashboard should subscribe to.
alter publication supabase_realtime add table public.agents;
alter publication supabase_realtime add table public.executions;
alter publication supabase_realtime add table public.audit_logs;
alter publication supabase_realtime add table public.usage_counters;
alter publication supabase_realtime add table public.subscriptions;;
