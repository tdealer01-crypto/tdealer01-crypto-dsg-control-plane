-- Neon Auth/RLS Compatibility Layer
-- ============================================================================
-- WARNING: Apply this ONLY to the Neon database (dsgone_neon). Never apply to
-- Supabase — Supabase already has a real `auth` schema backed by GoTrue/PostgREST;
-- running this against it would shadow/break the real auth.uid()/auth.role().
--
-- This file deliberately lives outside supabase/migrations/ so Supabase CLI/CI
-- tooling never picks it up.
--
-- Purpose: supabase/migrations/20260801000001-3_phase2_neon_*.sql call
-- auth.uid()/auth.role() and grant to roles `authenticated`/`service_role`,
-- which are Supabase Auth (GoTrue) + PostgREST constructs that don't exist on
-- plain Neon. This creates equivalent primitives so those migrations' RLS
-- policies behave the same way, driven by session-local GUCs the application
-- sets per-transaction (see lib/neon/auth-context.ts).
--
-- Status: NOT APPLIED to any live database. SQL syntax reviewed only; RLS
-- enforcement has not been verified against a live Neon connection (this
-- environment has no network route to Neon's Postgres port, only to Neon's
-- HTTPS control-plane API). See docs/PHASE2_PLAN.md blocker list.
-- ============================================================================

-- Roles (idempotent — CREATE ROLE has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- BYPASSRLS mirrors Supabase: service_role reads/writes are not subject to RLS.
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- Let the pooled application role switch into these roles per-transaction.
-- Replace neondb_owner with the actual connection role if it differs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
    GRANT anon, authenticated, service_role TO neondb_owner;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- Mirrors Supabase's real implementation: reads the JWT `sub` claim that
-- PostgREST would normally set via SET LOCAL on each request. Here, the
-- application sets the same GUC explicitly per-transaction.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Mirrors Supabase's real implementation: reads the JWT `role` claim.
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;

COMMENT ON FUNCTION auth.uid() IS
  'Neon compat shim for Supabase auth.uid(). Returns the request.jwt.claim.sub
   GUC, which the app must SET LOCAL per-transaction (see lib/neon/auth-context.ts).
   Returns NULL if unset, matching Supabase behavior for anonymous requests.';

COMMENT ON FUNCTION auth.role() IS
  'Neon compat shim for Supabase auth.role(). Returns the request.jwt.claim.role
   GUC, defaulting to ''anon'' if unset, matching Supabase behavior.';
