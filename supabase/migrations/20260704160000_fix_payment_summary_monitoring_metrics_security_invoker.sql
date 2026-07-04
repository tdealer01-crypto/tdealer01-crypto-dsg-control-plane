-- Fix Supabase security advisor finding: Security Definer View
-- public.payment_summary and public.monitoring_monthly_metrics were SECURITY
-- DEFINER (owned by postgres), which bypasses the RLS policies of their
-- underlying tables (payment_ledger, monitoring_executions). Both views also
-- grant SELECT to anon/authenticated, so any signed-in user (or anon caller)
-- could read aggregated payment/monitoring data across ALL orgs, including
-- through the app's own GET /api/monitoring/metrics route, which queries
-- monitoring_monthly_metrics without an explicit org filter and relies on
-- RLS to scope results.
--
-- security_invoker makes the view evaluate underlying table RLS using the
-- querying role's own context, same fix pattern already applied to
-- public.api_key_usage_summary in 20260615000002.

alter view public.payment_summary
set (security_invoker = true);

alter view public.monitoring_monthly_metrics
set (security_invoker = true);
