-- Tighten billing activation proof privileges after table creation.
-- Supabase default privileges can leave authenticated/service_role with
-- TRUNCATE/TRIGGER/REFERENCES even when INSERT/UPDATE/DELETE are revoked.
-- The proof ledger must be append-only: only the owner trigger function writes.

revoke all on public.billing_activation_proofs from anon, authenticated, service_role;
grant select on public.billing_activation_proofs to authenticated, service_role;

revoke all on function public.capture_billing_activation_proof()
  from public, anon, authenticated, service_role;
revoke all on function public.reject_billing_activation_proof_mutation()
  from public, anon, authenticated, service_role;
