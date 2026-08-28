-- Harden the SECURITY DEFINER baseline commit RPC against search-path shadowing.
-- Supabase Database Advisor 0011 recommends a fixed empty search_path for
-- SECURITY DEFINER functions when relation references are schema-qualified.

alter function public.dsg_commit_evolution_baseline(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) set search_path = '';
