-- Dashboard live-data contract views.
-- These views expose org-scoped runtime evidence without synthesizing dashboard values.
-- Source-table RLS remains authoritative because every view uses security_invoker.

CREATE OR REPLACE VIEW public.dashboard_agent_status
WITH (security_invoker = true)
AS
SELECT
  a.org_id,
  a.id AS agent_id,
  a.name,
  a.status AS configured_status,
  a.last_used_at,
  max(e.created_at) AS last_execution_at,
  count(e.id) FILTER (WHERE e.created_at >= date_trunc('day', now())) AS actions_today,
  count(e.id) FILTER (WHERE e.created_at >= date_trunc('month', now())) AS actions_this_month,
  a.monthly_limit,
  round(
    avg(e.latency_ms::numeric) FILTER (WHERE e.created_at >= now() - interval '24 hours'),
    2
  ) AS avg_latency_ms_24h,
  a.metadata
FROM public.agents a
LEFT JOIN public.executions e
  ON e.agent_id = a.id
 AND e.org_id = a.org_id
GROUP BY
  a.org_id,
  a.id,
  a.name,
  a.status,
  a.last_used_at,
  a.monthly_limit,
  a.metadata;

CREATE OR REPLACE VIEW public.dashboard_policy_decisions
WITH (security_invoker = true)
AS
SELECT
  e.org_id,
  e.id,
  e.created_at AS decision_at,
  e.agent_id,
  a.name AS source,
  COALESCE(
    NULLIF(e.metadata ->> 'provider', ''),
    NULLIF(e.request_payload ->> 'provider', '')
  ) AS provider,
  e.policy_version AS policy,
  upper(e.decision) AS decision,
  e.latency_ms,
  COALESCE(
    NULLIF(e.metadata ->> 'proof_id', ''),
    NULLIF(e.metadata ->> 'proof_hash', ''),
    NULLIF(e.metadata ->> 'z3_proof_id', '')
  ) AS proof_id,
  e.reason,
  e.metadata
FROM public.executions e
LEFT JOIN public.agents a
  ON a.id = e.agent_id
 AND a.org_id = e.org_id;

CREATE OR REPLACE VIEW public.dashboard_activity_feed
WITH (security_invoker = true)
AS
SELECT
  al.org_id,
  al.id,
  al.created_at,
  al.agent_id,
  COALESCE(
    a.name,
    NULLIF(al.metadata ->> 'agent_name', ''),
    'System'
  ) AS agent,
  COALESCE(
    NULLIF(al.metadata ->> 'action', ''),
    NULLIF(al.reason, ''),
    al.decision
  ) AS action,
  upper(al.decision) AS result,
  NULLIF(al.metadata ->> 'duration_ms', '') AS duration_ms,
  al.reason AS detail,
  COALESCE(
    NULLIF(al.evidence ->> 'sha256_hash', ''),
    NULLIF(al.evidence ->> 'proof_hash', ''),
    NULLIF(al.metadata ->> 'sha256_hash', ''),
    NULLIF(al.metadata ->> 'proof_hash', '')
  ) AS evidence_hash,
  al.policy_version,
  al.metadata
FROM public.audit_logs al
LEFT JOIN public.agents a
  ON a.id = al.agent_id
 AND a.org_id = al.org_id;

CREATE OR REPLACE VIEW public.dashboard_overview_kpis
WITH (security_invoker = true)
AS
WITH agent_agg AS (
  SELECT
    org_id,
    count(*) AS total_agents,
    count(*) FILTER (WHERE status = 'active') AS configured_active_agents,
    COALESCE(sum(monthly_limit), 0::bigint) AS configured_monthly_limit
  FROM public.agents
  WHERE org_id IS NOT NULL
  GROUP BY org_id
),
exec_agg AS (
  SELECT
    org_id,
    count(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS executions_today,
    count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS executions_this_month,
    count(*) FILTER (
      WHERE created_at >= date_trunc('day', now())
        AND upper(decision) = 'ALLOW'
    ) AS allow_today,
    count(*) FILTER (
      WHERE created_at >= date_trunc('day', now())
        AND upper(decision) = 'BLOCK'
    ) AS block_today,
    round(
      avg(latency_ms::numeric) FILTER (WHERE created_at >= date_trunc('day', now())),
      2
    ) AS avg_latency_ms_today
  FROM public.executions
  WHERE org_id IS NOT NULL
  GROUP BY org_id
),
usage_agg AS (
  SELECT
    org_id,
    max(billing_period) AS latest_billing_period,
    COALESCE(sum(executions), 0::bigint) AS metered_executions,
    COALESCE(sum(amount_usd), 0::numeric) AS metered_amount_usd
  FROM public.usage_counters
  WHERE org_id IS NOT NULL
  GROUP BY org_id
),
orgs AS (
  SELECT org_id FROM agent_agg
  UNION
  SELECT org_id FROM exec_agg
  UNION
  SELECT org_id FROM usage_agg
)
SELECT
  o.org_id,
  COALESCE(a.total_agents, 0::bigint) AS total_agents,
  COALESCE(a.configured_active_agents, 0::bigint) AS configured_active_agents,
  COALESCE(x.executions_today, 0::bigint) AS executions_today,
  COALESCE(x.executions_this_month, 0::bigint) AS executions_this_month,
  COALESCE(x.allow_today, 0::bigint) AS allow_today,
  COALESCE(x.block_today, 0::bigint) AS block_today,
  x.avg_latency_ms_today,
  COALESCE(a.configured_monthly_limit, 0::bigint) AS configured_monthly_limit,
  u.latest_billing_period,
  COALESCE(u.metered_executions, 0::bigint) AS metered_executions,
  COALESCE(u.metered_amount_usd, 0::numeric) AS metered_amount_usd,
  NULL::numeric AS monthly_revenue_usd,
  false AS monthly_revenue_verified,
  'No org-scoped authoritative revenue amount source is wired to this dashboard view'::text
    AS monthly_revenue_verification_note
FROM orgs o
LEFT JOIN agent_agg a ON a.org_id = o.org_id
LEFT JOIN exec_agg x ON x.org_id = o.org_id
LEFT JOIN usage_agg u ON u.org_id = o.org_id;

REVOKE ALL ON public.dashboard_agent_status FROM anon;
REVOKE ALL ON public.dashboard_policy_decisions FROM anon;
REVOKE ALL ON public.dashboard_activity_feed FROM anon;
REVOKE ALL ON public.dashboard_overview_kpis FROM anon;

GRANT SELECT ON public.dashboard_agent_status TO authenticated, service_role;
GRANT SELECT ON public.dashboard_policy_decisions TO authenticated, service_role;
GRANT SELECT ON public.dashboard_activity_feed TO authenticated, service_role;
GRANT SELECT ON public.dashboard_overview_kpis TO authenticated, service_role;

-- Realtime is attached to authoritative source tables, not the views.
DO $$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'agents',
    'executions',
    'audit_logs',
    'usage_counters',
    'subscriptions'
  ]
  LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = relation_name
       ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        relation_name
      );
    END IF;
  END LOOP;
END
$$;
