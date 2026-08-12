-- Restrict automatic-revenue SECURITY DEFINER functions to the server-side
-- service role. Supabase may apply explicit default EXECUTE grants to anon and
-- authenticated when a function is created, so revoking PUBLIC alone is not
-- sufficient in every project.

REVOKE ALL ON FUNCTION public.dsg_gate_evals_this_period(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.dsg_gate_evals_this_period(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT)
  TO service_role;
