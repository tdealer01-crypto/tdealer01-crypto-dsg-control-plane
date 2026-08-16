-- DSG ONE — Verified Execution runs.
--
-- One run carries one user intent through the five product layers:
-- PLAN LOCK -> VERIFY -> EXECUTE -> OBSERVE -> PROVE.
-- See docs/product/DSG_ONE_VERIFIED_EXECUTION.md.
--
-- Invariants enforced here rather than only in application code, because a run
-- whose plan can be edited after approval proves nothing:
--
--   1. A run cannot leave DRAFT without a frozen plan_hash (approve_check).
--   2. plan_hash, plan, approved_by and approved_at are immutable once set
--      (freeze trigger). Re-planning creates a new run, it never rewrites one.
--   3. Every step belongs to exactly one run and is ordered within it.
--   4. Terminal runs never change status again (terminal trigger).
--
-- This migration is additive and idempotent so it can be applied from the
-- Supabase dashboard SQL editor during recovery.

BEGIN;

-- ─── Runs ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dsg_one_runs (
  run_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL,
  actor_id     TEXT NOT NULL,
  surface      TEXT NOT NULL DEFAULT 'api',
  status       TEXT NOT NULL DEFAULT 'DRAFT',

  intent       TEXT NOT NULL,
  plan         JSONB NOT NULL,
  plan_hash    TEXT,
  template_id  TEXT,

  -- Systems the client executor declared it can reach when the run was created.
  -- Executor-declared, not verified by DSG: it feeds the gate's permission and
  -- deploy-target constraints so a step targeting an unreachable system fails
  -- closed instead of being dispatched into a wall. It is not a security
  -- boundary — plan_hash conformance on each observation is.
  connected_systems JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_available   BOOLEAN NOT NULL DEFAULT false,

  approved_by  TEXT,
  approved_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,

  receipt_id   TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dsg_one_runs_status_check
    CHECK (status IN ('DRAFT', 'LOCKED', 'RUNNING', 'VERIFIED', 'NEEDS_REVIEW', 'BLOCKED', 'CANCELLED')),
  CONSTRAINT dsg_one_runs_surface_check
    CHECK (surface IN ('api', 'unify', 'trinity-mcp')),

  -- A run past DRAFT must carry a frozen plan and a named approver. CANCELLED
  -- is exempt: a rejected plan is never locked, so it has nothing to freeze.
  CONSTRAINT dsg_one_runs_approve_check CHECK (
    status IN ('DRAFT', 'CANCELLED')
    OR (plan_hash IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_dsg_one_runs_org_created
  ON public.dsg_one_runs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_one_runs_org_status
  ON public.dsg_one_runs (org_id, status);

CREATE INDEX IF NOT EXISTS idx_dsg_one_runs_plan_hash
  ON public.dsg_one_runs (plan_hash)
  WHERE plan_hash IS NOT NULL;

-- ─── Steps ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dsg_one_run_steps (
  step_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         UUID NOT NULL REFERENCES public.dsg_one_runs(run_id) ON DELETE CASCADE,
  org_id         TEXT NOT NULL,
  ordinal        INTEGER NOT NULL,

  summary        TEXT NOT NULL,
  action_type    TEXT NOT NULL,
  target_system  TEXT NOT NULL,
  operation      TEXT NOT NULL,
  risk_level     TEXT NOT NULL,
  phase          TEXT NOT NULL,

  status         TEXT NOT NULL DEFAULT 'PENDING',
  gate_verdict   TEXT,
  observation    JSONB,
  judgement      JSONB,

  dispatched_at  TIMESTAMPTZ,
  settled_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dsg_one_run_steps_status_check
    CHECK (status IN ('PENDING', 'VERIFIED', 'DISPATCHED', 'PASSED', 'REVIEW', 'BLOCKED', 'SKIPPED')),
  CONSTRAINT dsg_one_run_steps_verdict_check
    CHECK (gate_verdict IS NULL OR gate_verdict IN ('PASS', 'BLOCK', 'UNSUPPORTED')),
  CONSTRAINT dsg_one_run_steps_risk_check
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT dsg_one_run_steps_ordinal_unique UNIQUE (run_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_dsg_one_run_steps_run
  ON public.dsg_one_run_steps (run_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_dsg_one_run_steps_org
  ON public.dsg_one_run_steps (org_id, created_at DESC);

-- ─── Immutability triggers ───────────────────────────────────────────────────

-- Once a plan is approved its hash, body and approver are settled facts. A
-- silent UPDATE here would let an operator widen the scope a user consented to
-- while keeping the run's VERIFIED verdict, which is the exact failure this
-- product exists to prevent.
CREATE OR REPLACE FUNCTION public.dsg_one_freeze_approved_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.plan_hash IS NOT NULL THEN
    IF NEW.plan_hash IS DISTINCT FROM OLD.plan_hash THEN
      RAISE EXCEPTION 'PLAN_HASH_IMMUTABLE: run % already locked plan %', OLD.run_id, OLD.plan_hash;
    END IF;
    IF NEW.plan::text IS DISTINCT FROM OLD.plan::text THEN
      RAISE EXCEPTION 'PLAN_IMMUTABLE: run % plan cannot change after approval', OLD.run_id;
    END IF;
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'APPROVAL_IMMUTABLE: run % approval cannot be reassigned', OLD.run_id;
    END IF;
  END IF;

  IF OLD.status IN ('VERIFIED', 'NEEDS_REVIEW', 'BLOCKED', 'CANCELLED')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'RUN_TERMINAL: run % is % and cannot change status', OLD.run_id, OLD.status;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsg_one_freeze_approved_plan ON public.dsg_one_runs;
CREATE TRIGGER trg_dsg_one_freeze_approved_plan
  BEFORE UPDATE ON public.dsg_one_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.dsg_one_freeze_approved_plan();

CREATE OR REPLACE FUNCTION public.dsg_one_touch_step()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsg_one_touch_step ON public.dsg_one_run_steps;
CREATE TRIGGER trg_dsg_one_touch_step
  BEFORE UPDATE ON public.dsg_one_run_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.dsg_one_touch_step();

-- ─── Row level security ──────────────────────────────────────────────────────
--
-- Reads are org-scoped for authenticated users, matching
-- 20260323054500_product_loop_rls.sql. Writes go through the service role only:
-- the orchestration routes are the sole legitimate writer, because a run whose
-- steps can be written by a browser session is not evidence of anything.

ALTER TABLE public.dsg_one_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsg_one_run_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dsg_one_runs_select_same_org ON public.dsg_one_runs;
CREATE POLICY dsg_one_runs_select_same_org
  ON public.dsg_one_runs
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.is_active = true
    )
  );

DROP POLICY IF EXISTS dsg_one_run_steps_select_same_org ON public.dsg_one_run_steps;
CREATE POLICY dsg_one_run_steps_select_same_org
  ON public.dsg_one_run_steps
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.is_active = true
    )
  );

GRANT ALL ON public.dsg_one_runs      TO service_role;
GRANT ALL ON public.dsg_one_run_steps TO service_role;
GRANT SELECT ON public.dsg_one_runs      TO authenticated;
GRANT SELECT ON public.dsg_one_run_steps TO authenticated;

COMMIT;
