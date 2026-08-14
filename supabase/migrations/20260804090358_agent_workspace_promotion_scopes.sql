-- Remote development hotfix marker.
-- Promotion-only scopes and production-environment enforcement are already
-- included in 20260804085957_agent_workspace_autonomy_v2.sql for fresh
-- environments. This version preserves migration-ledger parity with the
-- verified Supabase development project.

select public.agent_workspace_scope_matches(
  array['deploy.production']::text[],
  'deploy.production'
);
