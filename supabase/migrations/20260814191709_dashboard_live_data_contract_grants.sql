REVOKE ALL ON public.dashboard_agent_status FROM anon, authenticated, service_role;
REVOKE ALL ON public.dashboard_policy_decisions FROM anon, authenticated, service_role;
REVOKE ALL ON public.dashboard_activity_feed FROM anon, authenticated, service_role;
REVOKE ALL ON public.dashboard_overview_kpis FROM anon, authenticated, service_role;

GRANT SELECT ON public.dashboard_agent_status TO authenticated, service_role;
GRANT SELECT ON public.dashboard_policy_decisions TO authenticated, service_role;
GRANT SELECT ON public.dashboard_activity_feed TO authenticated, service_role;
GRANT SELECT ON public.dashboard_overview_kpis TO authenticated, service_role;;
