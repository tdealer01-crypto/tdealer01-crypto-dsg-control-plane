-- Follow-up: add columns the application code reads/writes that were missing
-- from supabase/schema.sql (and therefore from the live DB / regenerated types).
-- These surfaced when `next build` type-checking was restored (ignoreBuildErrors
-- removed). lib/database.types.ts already declares these columns; this migration
-- brings the live database into alignment so the runtime queries do not error.
-- Idempotent: every statement uses ADD COLUMN IF NOT EXISTS — safe to re-run.

-- access_requests: intake + review fields written by POST /api/access/request
alter table public.access_requests add column if not exists email_domain text;
alter table public.access_requests add column if not exists workspace_name text;
alter table public.access_requests add column if not exists full_name text;
alter table public.access_requests add column if not exists requested_org_hint text;
alter table public.access_requests add column if not exists review_note text;
alter table public.access_requests add column if not exists reviewed_by_user_id text;
alter table public.access_requests add column if not exists ref_code text;

-- billing_subscriptions: trial window written by /auth/confirm, read by drip crons
alter table public.billing_subscriptions add column if not exists trial_start timestamptz;
alter table public.billing_subscriptions add column if not exists trial_end timestamptz;

-- runtime_ledger_entries: denormalized truth sequence read by runtime-summary,
-- checkpoint and setup/auto routes (canonical value lives on runtime_truth_states)
alter table public.runtime_ledger_entries add column if not exists truth_sequence bigint;

-- runtime_effects: callback accounting used by lib/runtime/reconcile
alter table public.runtime_effects add column if not exists callback_count integer not null default 0;
alter table public.runtime_effects add column if not exists result_payload jsonb;
