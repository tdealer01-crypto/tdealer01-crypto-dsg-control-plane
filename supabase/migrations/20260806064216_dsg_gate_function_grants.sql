REVOKE ALL ON FUNCTION public.dsg_gate_evals_this_period(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.dsg_gate_evals_this_period(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT)
  TO service_role;;
