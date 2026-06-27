-- Fix Supabase security advisor finding: Security Definer View
-- public.api_key_usage_summary must evaluate underlying table permissions/RLS
-- using the querying user's context, not the view owner's context.

alter view public.api_key_usage_summary
set (security_invoker = true);
