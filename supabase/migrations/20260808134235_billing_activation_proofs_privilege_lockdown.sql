revoke all on public.billing_activation_proofs from anon, authenticated, service_role;
grant select on public.billing_activation_proofs to authenticated, service_role;

revoke all on function public.capture_billing_activation_proof() from public, anon, authenticated, service_role;
revoke all on function public.reject_billing_activation_proof_mutation() from public, anon, authenticated, service_role;;
