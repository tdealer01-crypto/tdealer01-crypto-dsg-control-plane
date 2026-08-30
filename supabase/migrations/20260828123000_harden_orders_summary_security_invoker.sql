-- Harden the legacy public.orders_summary view so callers execute it with
-- their own database permissions and underlying public.orders RLS policies.
-- This addresses Supabase Database Advisor security_definer_view without
-- changing the existing orders policies or grants in the same migration.

alter view public.orders_summary
  set (security_invoker = true);
