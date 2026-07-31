-- DRAFT: DSG Gate Decisions Table for Phase 2 Z3 Solver Integration
--
-- STATUS: DO NOT APPLY YET — This migration is drafted for Phase 2 (Week 9+)
-- when Z3 formal proof and deterministic gate decisions are integrated.
--
-- PURPOSE: Store Z3 solver results, proof evidence, and decision lineage for
-- deterministic gate evaluation at scale.
--
-- BLOCKERS (10 total, tracked at draft time):
--   CRITICAL (addressed in this revision — see inline notes below):
--     1. Governance model misalignment (org_members vs JWT-claim scoping)      -> RESOLVED, see "GOVERNANCE MODEL" note
--     2. Z3 output format not validated against the real solver contract      -> RESOLVED, see "Z3 SOLVER CONTRACT" note
--     3. Immutability UPDATE policy caused N+3 correlated-subquery SELECTs    -> RESOLVED, see "IMMUTABILITY" note
--   REMAINING (NOT addressed by this revision — still open, tracked for a
--   future draft revision; do not treat these as resolved):
--     4. Proof verification approach confirmed (is a live Z3 call required
--        per-decision, or can cached/replayed proofs be accepted?) — open.
--     5. Index requirements not reviewed with a DBA against real query
--        patterns/volume — the indexes below are a reasonable starting set,
--        not a DBA-approved final set.
--     6. Archive/retention strategy undefined — evidence_retention_until
--        column exists but no retention job/policy references it yet.
--     7. No FK from org_id to an organizations table (unlike policies_markdoc
--        and similar org-scoped tables) — left as bare UUID pending decision
--        on whether organizations(id) is the correct parent.
--     8. No FK from policy_version to a concrete policy manifest/version
--        table — policy_version is a bare UUID with no referential integrity.
--     9. parent_decision_id lineage chain has no cycle protection and no
--        cross-org guard (a parent from a different org_id is not rejected).
--     10. No app-layer route/handler exists yet under app/api/dsg/v1/** that
--         writes to this table — record_z3_gate_decision() is unused by any
--         current code path (verified: no repo references outside this file).
--
-- REVIEW CHECKLIST (before applying):
-- - [x] Z3 output format validated (matches ExternalSolverResponse contract
--       in lib/dsg/deterministic/external-solver.ts and z3-solver-api/README.md)
-- - [ ] Proof verification approach confirmed (blocker 4, still open)
-- - [ ] Index requirements reviewed with DBA (blocker 5, still open)
-- - [x] RLS policies aligned with governance model (public.users / auth_user_id,
--       matching lib/authz.ts requireOrgRole and the dsg_agent_command_gate_decisions
--       precedent in 202605060002_create_dsg_agent_command_gate.sql)
-- - [ ] Archive/retention strategy defined (blocker 6, still open)
--
-- Even with the checklist above at [x], this migration has NOT been applied to
-- any live database in this change. No Supabase credentials were available in
-- this environment; syntax/behavior was instead validated against a disposable
-- local PostgreSQL 16 instance with stub public.users/auth.uid()/auth.jwt()
-- objects standing in for the real Supabase project (see PR notes for the
-- exact commands run). "Migration file exists and locally syntax-validated"
-- is the correct claim here — not "live DB ready".
--

-- Phase 2: Z3 Formal Proof Decision Records
-- Tracks deterministic gate decisions made by Z3 solver with complete proof trace
CREATE TABLE IF NOT EXISTS dsg_gate_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  policy_version UUID NOT NULL,

  -- Input context
  input_hash BYTEA NOT NULL, -- SHA256(input constraints)
  constraint_set JSONB NOT NULL, -- Full Z3 constraint set

  -- Decision result
  decision VARCHAR(20) NOT NULL, -- 'ALLOW', 'BLOCK', 'REVIEW', 'UNSUPPORTED'
  decision_confidence DECIMAL(3, 2) DEFAULT 1.0, -- 0.0 to 1.0

  -- Proof evidence
  proof_hash BYTEA NOT NULL, -- SHA256 of proof output
  proof_format VARCHAR(50) DEFAULT 'z3-smt2', -- 'z3-smt2', 'verilog', 'hol', etc.

  -- ── Z3 SOLVER CONTRACT (blocker 2 fix) ─────────────────────────────────────
  -- These columns mirror the ExternalSolverResponse type exactly as implemented
  -- in lib/dsg/deterministic/external-solver.ts and documented/proven in
  -- z3-solver-api/README.md. Do NOT re-guess this shape; if the solver contract
  -- changes, update external-solver.ts first and mirror the change here.
  --   ExternalSolverResponse = {
  --     status: 'sat' | 'unsat' | 'unknown',
  --     satisfiable: boolean,
  --     model?: Array<{ name: string; value: string }>,
  --     unsatisfiable_core?: string[],
  --     solver_version: string,
  --     time_ms: number,
  --     smt2_hash: string,
  --     error?: string,
  --   }
  -- Notably there is NO 'timeout' status value in the real contract: per
  -- invokeExternalSolver() in external-solver.ts, an aborted/timed-out request
  -- returns `null` (no ExternalSolverResponse is produced at all), so a decision
  -- row backed by a timed-out solver call should simply leave these columns NULL
  -- rather than encode a synthetic 'TIMEOUT' status.
  z3_status VARCHAR(10), -- ExternalSolverResponse.status: 'sat' | 'unsat' | 'unknown'
  z3_satisfiable BOOLEAN, -- ExternalSolverResponse.satisfiable
  z3_solver_version VARCHAR(50), -- ExternalSolverResponse.solver_version, e.g. '4.16.0'
  z3_time_ms INTEGER, -- ExternalSolverResponse.time_ms
  z3_smt2_hash VARCHAR(64), -- ExternalSolverResponse.smt2_hash (hash of the SMT-LIB v2 input formula)
  z3_error TEXT, -- ExternalSolverResponse.error, set only when the solver itself reported a failure
  -- Full solver response payload retained for replay/audit, including the
  -- variable-length model[] and unsatisfiable_core[] arrays that don't warrant
  -- dedicated relational columns. Expected shape is ExternalSolverResponse
  -- (see above) serialized as-is; z3_status/z3_satisfiable/etc. above are
  -- promoted duplicates of this JSON for indexing and cheap filtering.
  z3_trace JSONB DEFAULT '{}',

  -- Decision lineage (for causality chain)
  parent_decision_id UUID REFERENCES dsg_gate_decisions(id) ON DELETE SET NULL,
  parent_proof_hash BYTEA, -- Hash of parent proof for chain validation

  -- Policy and compliance context
  compliance_tags TEXT[] DEFAULT '{}',
  evidence_retention_until TIMESTAMPTZ,

  -- Audit trail
  created_by UUID, -- Service/agent creating this decision
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Constraints and validation
  CONSTRAINT dsg_gate_decision_status_valid
    CHECK (decision IN ('ALLOW', 'BLOCK', 'REVIEW', 'UNSUPPORTED')),
  CONSTRAINT dsg_gate_z3_status_valid
    CHECK (z3_status IS NULL OR z3_status IN ('sat', 'unsat', 'unknown')),
  CONSTRAINT dsg_gate_confidence_range
    CHECK (decision_confidence >= 0.0 AND decision_confidence <= 1.0)
);

-- Indexes for efficient lookup and auditing
CREATE INDEX IF NOT EXISTS idx_dsg_gate_org_created
  ON dsg_gate_decisions(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_gate_policy_version
  ON dsg_gate_decisions(policy_version, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_gate_decision
  ON dsg_gate_decisions(decision);

CREATE INDEX IF NOT EXISTS idx_dsg_gate_input_hash
  ON dsg_gate_decisions(input_hash);

CREATE INDEX IF NOT EXISTS idx_dsg_gate_proof_hash
  ON dsg_gate_decisions(proof_hash);

CREATE INDEX IF NOT EXISTS idx_dsg_gate_proof_chain
  ON dsg_gate_decisions(parent_decision_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_gate_z3_status
  ON dsg_gate_decisions(z3_status)
  WHERE z3_status IS NOT NULL;

-- Partial index for high-confidence decisions
CREATE INDEX IF NOT EXISTS idx_dsg_gate_high_confidence
  ON dsg_gate_decisions(created_at DESC)
  WHERE decision_confidence >= 0.95 AND decision IN ('ALLOW', 'BLOCK');

-- Enable RLS for org-scoped access
ALTER TABLE dsg_gate_decisions ENABLE ROW LEVEL SECURITY;

-- ── GOVERNANCE MODEL (blocker 1 fix) ────────────────────────────────────────
-- This table previously scoped SELECT access via a nonexistent `org_members`
-- table (grep across supabase/migrations/ found `org_members` referenced in
-- USING clauses in ~14 migrations, e.g. 20260730000002_create_audit_log_table.sql,
-- but NO `CREATE TABLE org_members` anywhere in the repo — that policy pattern
-- was never wired to a real table and would fail at query time).
--
-- The sibling table dsg_gate_entitlements (20260630020000_dsg_gate_monetization.sql)
-- instead scopes via `auth.jwt() ->> 'org_id'`, but there is no Supabase auth
-- hook/custom-claims migration anywhere in this repo that populates an
-- `org_id` claim onto issued JWTs (grep for raw_app_meta_data/app_metadata
-- org_id and for a custom_access_token hook found nothing), so that pattern is
-- also unproven against how auth actually works here.
--
-- The repo's dominant, already-proven pattern is the `public.users` table
-- (columns: id, auth_user_id, org_id, is_active, role), which is exactly what
-- the app-layer authorization helper lib/authz.ts (requireOrgRole, and by
-- extension requireRuntimeAccess/requireActiveProfile) resolves org membership
-- against, and which is reused directly in RLS policies elsewhere, e.g.:
--   - supabase/migrations/20260616_add_policies_table.sql
--       (org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid()))
--   - supabase/migrations/202605060002_create_dsg_agent_command_gate.sql,
--     which creates dsg_agent_command_gate_decisions — an existing, applied
--     table that is structurally the closest precedent to dsg_gate_decisions
--     (org-scoped, append-only gate decision audit rows) and uses:
--       exists (select 1 from public.users u
--               where u.auth_user_id = auth.uid()
--                 and u.is_active = true
--                 and u.org_id = <table>.org_id)
--
-- dsg_gate_decisions is aligned to that dsg_agent_command_gate_decisions
-- precedent below. dsg_gate_entitlements' JWT-claim approach is left
-- untouched by this migration (it is a separately applied table outside this
-- draft's scope) but should be reconciled onto the same public.users pattern
-- in a follow-up migration rather than treated as a second valid model.

-- Policy: org members (via public.users) can read gate decisions (audit and review)
DROP POLICY IF EXISTS dsg_gate_org_read ON dsg_gate_decisions;
CREATE POLICY dsg_gate_org_read ON dsg_gate_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.org_id = dsg_gate_decisions.org_id
    )
  );

-- Policy: service_role (Z3 solver / gate evaluation backend) can insert decisions
DROP POLICY IF EXISTS dsg_gate_service_insert ON dsg_gate_decisions;
CREATE POLICY dsg_gate_service_insert ON dsg_gate_decisions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── IMMUTABILITY (blocker 3 fix) ────────────────────────────────────────────
-- The original UPDATE policy allowed service_role to UPDATE any row, gated by
-- a WITH CHECK clause that re-SELECTed decision/proof_hash/input_hash FROM
-- dsg_gate_decisions BY id for every candidate row to prove they were
-- unchanged. That is a correlated subquery run once per compared column per
-- row: 3 extra SELECTs per UPDATE attempt on top of Postgres's own row fetch
-- (N+3), and it still allowed UPDATE (and cost the round trip) for every other
-- column even though gate decisions should never be mutated post-insert at
-- all — evidence_retention_until included; retention changes belong in an
-- explicit deletion/anonymization workflow, not a mutable audit row.
--
-- Fix: gate decisions are treated as fully append-only, matching the
-- precedent in 202605060002_create_dsg_agent_command_gate.sql
-- (dsg_agent_command_gate_decisions), which enforces immutability with a
-- BEFORE UPDATE trigger that raises an exception, rather than an RLS UPDATE
-- policy. A BEFORE UPDATE trigger fires once per row, before Postgres does
-- any RLS policy evaluation or column comparison work, so the N+3 cost is
-- eliminated entirely — the trigger either allows the whole statement to
-- proceed (never, in this case) or aborts it in one step. Both service_role
-- and authenticated are covered by the same trigger since triggers are not
-- role-scoped (unlike RLS policies), so this also closes the previously
-- implicit gap where the old policy only restricted service_role's UPDATE
-- but nothing prevented a future GRANT UPDATE ... TO authenticated from
-- silently bypassing the intended immutability guarantee.
--
-- No UPDATE (or DELETE) RLS policy is created for this table: with RLS
-- enabled and no permissive UPDATE/DELETE policy, those statements are
-- already denied for any role subject to RLS, and the trigger below is a
-- second, role-independent enforcement layer (it also stops service_role,
-- which bypasses RLS by default, and any future superuser/BYPASSRLS role).

CREATE OR REPLACE FUNCTION dsg_prevent_gate_decision_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'dsg_gate_decisions rows are append-only and cannot be updated or deleted (id=%)', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsg_gate_decisions_no_update ON dsg_gate_decisions;
CREATE TRIGGER trg_dsg_gate_decisions_no_update
  BEFORE UPDATE ON dsg_gate_decisions
  FOR EACH ROW EXECUTE FUNCTION dsg_prevent_gate_decision_mutation();

DROP TRIGGER IF EXISTS trg_dsg_gate_decisions_no_delete ON dsg_gate_decisions;
CREATE TRIGGER trg_dsg_gate_decisions_no_delete
  BEFORE DELETE ON dsg_gate_decisions
  FOR EACH ROW EXECUTE FUNCTION dsg_prevent_gate_decision_mutation();

-- Helper function: record Z3 gate decision result
CREATE OR REPLACE FUNCTION record_z3_gate_decision(
  p_org_id UUID,
  p_policy_version UUID,
  p_input_hash BYTEA,
  p_constraint_set JSONB,
  p_decision VARCHAR,
  p_proof_hash BYTEA,
  p_z3_trace JSONB DEFAULT '{}',
  p_z3_status VARCHAR DEFAULT NULL,
  p_z3_satisfiable BOOLEAN DEFAULT NULL,
  p_z3_solver_version VARCHAR DEFAULT NULL,
  p_z3_time_ms INTEGER DEFAULT NULL,
  p_z3_smt2_hash VARCHAR DEFAULT NULL,
  p_z3_error TEXT DEFAULT NULL,
  p_confidence DECIMAL DEFAULT 1.0,
  p_parent_decision_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO dsg_gate_decisions (
    org_id,
    policy_version,
    input_hash,
    constraint_set,
    decision,
    proof_hash,
    z3_trace,
    z3_status,
    z3_satisfiable,
    z3_solver_version,
    z3_time_ms,
    z3_smt2_hash,
    z3_error,
    decision_confidence,
    parent_decision_id,
    created_by
  )
  VALUES (
    p_org_id,
    p_policy_version,
    p_input_hash,
    p_constraint_set,
    p_decision,
    p_proof_hash,
    p_z3_trace,
    p_z3_status,
    p_z3_satisfiable,
    p_z3_solver_version,
    p_z3_time_ms,
    p_z3_smt2_hash,
    p_z3_error,
    p_confidence,
    p_parent_decision_id,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access
GRANT SELECT ON dsg_gate_decisions TO authenticated;
GRANT SELECT, INSERT ON dsg_gate_decisions TO service_role;
-- Deliberately no UPDATE/DELETE grant to any role: immutability is enforced
-- by the BEFORE UPDATE/DELETE trigger above, and withholding the grant is a
-- second, independent layer (a role without UPDATE/DELETE privilege on the
-- table is rejected by the privilege system before the trigger even runs).

-- Comment for future reviewers
COMMENT ON TABLE dsg_gate_decisions IS
  'Phase 2 table: Z3 formal proof decisions. DO NOT APPLY until Week 9+ when Z3 integration is complete. See file header for the 10 tracked blockers (3 CRITICAL resolved in this revision, 7 remaining open).';
