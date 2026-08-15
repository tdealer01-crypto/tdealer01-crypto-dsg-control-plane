-- Fix: dashboard/API-key pages fail with "permission denied for function is_org_member"
-- Root cause: is_org_member/is_org_admin are SECURITY DEFINER helpers used by 16 RLS
-- policies targeting the authenticated role, but EXECUTE was only granted to
-- postgres and service_role. Any org-scoped query from a logged-in user errored.
-- The functions are safe to expose: they only check membership for auth.uid().

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;;
