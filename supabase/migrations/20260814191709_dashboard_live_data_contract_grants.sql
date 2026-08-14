-- Dashboard views are read contracts only. Remove broad/default grants and
-- explicitly expose SELECT to signed-in users and the backend service role.

REVOKE ALL ON public.dashboard_agent_status FROM anon, authenticated, service_role;
REVOKE ALL ON public.dashboard_policy_decisions FROM anon, authenticated, service_role;
REVOKE ALL ON public.dashboard_activity_feed FROM anon, authenticated, service_role;
REVOKE ALL ON public.dashboard_overview_kpis FROM anon, authenticated, service_role;

GRANT SELECT ON public.dashboard_agent_status TO authenticated, service_role;
GRANT SELECT ON public.dashboard_policy_decisions TO authenticated, service_role;
GRANT SELECT ON public.dashboard_activity_feed TO authenticated, service_role;
GRANT SELECT ON public.dashboard_overview_kpis TO authenticated, service_role;
