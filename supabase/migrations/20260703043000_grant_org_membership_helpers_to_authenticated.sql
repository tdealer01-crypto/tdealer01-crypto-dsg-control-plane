-- Fix: dashboard/API-key pages fail with "permission denied for function is_org_member"
--
-- Root cause: public.is_org_member(uuid) and public.is_org_admin(uuid) are
-- SECURITY DEFINER helper functions referenced by 16 RLS policies (on agents,
-- audit_logs, executions, organizations, policies, subscriptions,
-- usage_counters, usage_events, users) that target the `authenticated` role,
-- but EXECUTE was only granted to `postgres` and `service_role`. Any org-scoped
-- query from a logged-in user therefore errored with permission denied —
-- including the api_keys policy, whose USING subquery reads `users` and
-- triggers users_select_same_org -> is_org_member.
--
-- The functions are safe to expose to `authenticated`: they only check
-- membership/role for auth.uid() and take no caller-controlled identity.
--
-- Applied to live project zeyguilldygozufpgxms via Supabase MCP on 2026-07-03
-- (migration name: grant_org_membership_helpers_to_authenticated).
-- GRANT is idempotent; safe to re-run.

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
