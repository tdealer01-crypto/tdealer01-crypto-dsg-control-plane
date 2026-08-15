-- Allow anon role to execute org-membership helper functions used inside RLS policies.
-- Both functions check auth.uid(): for anon sessions auth.uid() is NULL, so they
-- return false and RLS simply yields zero rows instead of "permission denied".
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO anon;;
