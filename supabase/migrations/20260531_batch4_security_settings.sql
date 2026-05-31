-- Batch4 enterprise controls: org security settings table.
--
-- Re-port of the relevant slice of the original 20260401_batch4_enterprise_hardening.sql
-- from PR #114 (commit 626ac41). Only org_security_settings is created here
-- because that is the single table the re-ported routes on current main require
-- and that is not already present in main's schema/types. sign_in_events and
-- audit_logs already exist on main and are reused as-is.
--
-- NO-GO until this migration is applied: PATCH /api/settings/security and the
-- SSO anti-lockout safety check read/write this table.

create extension if not exists pgcrypto;

create table if not exists org_security_settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique,
  sso_enabled boolean not null default false,
  sso_enforced boolean not null default false,
  break_glass_email_enabled boolean not null default true,
  sso_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_security_settings_org_id on org_security_settings(org_id);
