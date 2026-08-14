-- Remote development hotfix marker.
-- The ambiguous PL/pgSQL column references are already corrected in
-- 20260804085957_agent_workspace_autonomy_v2.sql for fresh environments.
-- This version is retained so local migration history matches the verified
-- Supabase development project migration ledger.

select public.agent_workspace_scope_matches(array['repo.*']::text[], 'repo.write');
