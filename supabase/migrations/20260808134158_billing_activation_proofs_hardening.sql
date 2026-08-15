grant select on public.billing_activation_proofs to service_role;

revoke all on function public.capture_billing_activation_proof() from public, anon, authenticated;
revoke all on function public.reject_billing_activation_proof_mutation() from public, anon, authenticated;

grant execute on function public.capture_billing_activation_proof() to postgres, service_role;
grant execute on function public.reject_billing_activation_proof_mutation() to postgres, service_role;;
