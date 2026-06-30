-- Migration: DSG Gate API Monetization
-- Creates tables for metered billing of gate evaluations and proof runs.
--
-- Phase 1: Schema ready for usage recording.
-- Phase 2: Wire Stripe metered billing events via dsg_gate_usage inserts.
--
-- Tables:
--   dsg_gate_entitlements — org-level plan tier and monthly quota
--   dsg_gate_usage        — per-call usage events for billing aggregation
--
-- Idempotent: wrapped in IF NOT EXISTS guards.

-- ── dsg_gate_entitlements ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsg_gate_entitlements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT        NOT NULL,
  tier            TEXT        NOT NULL DEFAULT 'free'
                              CHECK (tier IN ('free', 'pro', 'enterprise')),
  evals_per_month INTEGER     NOT NULL DEFAULT 50,
  -- Phase 2: Stripe subscription metadata
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_meter_event_name TEXT,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

-- RLS: only the owning org can read its own entitlement
ALTER TABLE dsg_gate_entitlements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dsg_gate_entitlements' AND policyname = 'org_member_read'
  ) THEN
    CREATE POLICY org_member_read ON dsg_gate_entitlements
      FOR SELECT
      USING (org_id = auth.jwt() ->> 'org_id');
  END IF;
END $$;

-- ── dsg_gate_usage ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsg_gate_usage (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT        NOT NULL,
  eval_id     TEXT        NOT NULL,           -- proofId from gate decision
  route       TEXT        NOT NULL            -- 'gates/evaluate' | 'proofs/prove'
              CHECK (route IN ('gates/evaluate', 'proofs/prove')),
  gate_status TEXT        NOT NULL,           -- PASS | REVIEW | BLOCK
  duration_ms INTEGER,
  billed      BOOLEAN     NOT NULL DEFAULT FALSE,
  meter_event_id TEXT,                        -- Stripe meter event ID when fired
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsg_gate_usage_org_id_idx
  ON dsg_gate_usage (org_id, created_at DESC);

-- RLS: only service role can insert; org can read its own usage
ALTER TABLE dsg_gate_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dsg_gate_usage' AND policyname = 'org_member_read'
  ) THEN
    CREATE POLICY org_member_read ON dsg_gate_usage
      FOR SELECT
      USING (org_id = auth.jwt() ->> 'org_id');
  END IF;
END $$;

-- ── Helper: current-period eval count ────────────────────────────────────────
-- NOTE: Uses calendar-month boundaries (UTC). Phase 2 should replace this with
-- subscription-period boundaries from dsg_gate_entitlements.current_period_start /
-- current_period_end to align with Stripe billing cycles.

CREATE OR REPLACE FUNCTION dsg_gate_evals_this_period(p_org_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM dsg_gate_usage
  WHERE org_id = p_org_id
    AND created_at >= date_trunc('month', now())
    AND created_at <  date_trunc('month', now()) + INTERVAL '1 month';
$$;

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE dsg_gate_entitlements IS
  'Org-level DSG Gate API plan tier and monthly evaluation quota. Phase 1 in-memory; Phase 2 Stripe-backed.';

COMMENT ON TABLE dsg_gate_usage IS
  'Per-call usage events for DSG Gate API metered billing. Phase 2 will fire Stripe meter events on insert.';
