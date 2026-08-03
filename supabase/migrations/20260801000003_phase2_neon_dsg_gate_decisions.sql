-- Phase 2: Z3 Formal Proof Gate Decisions Table for Neon
-- Derives from: 20260730000005_DRAFT_dsg_gate_decisions_phase2.sql
-- Status: PENDING_NEON_APPLICATION (proof verification approach TBD)
--
-- BLOCKERS (7 remaining open; 3 CRITICAL resolved in Phase 1):
--   4. Proof verification approach: cached/replayed vs live Z3 call per decision (OPEN)
--   5. Index requirements: DBA review against real query patterns (OPEN)
--   6. Archive/retention strategy: evidence_retention_until column exists but no job (OPEN)
--   7. FK to organizations table: org_id bare UUID, no referential integrity (OPEN)
--   8. FK to policy_version table: bare UUID, no constraint (OPEN)
--   9. parent_decision_id lineage: no cycle/cross-org guards (OPEN)
--   10. App-layer route handler: record_z3_gate_decision() unused; blocker until route is wired (OPEN)

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

  -- Z3 Solver Contract (matches ExternalSolverResponse in lib/dsg/deterministic/external-solver.ts)
  z3_status VARCHAR(10), -- 'sat' | 'unsat' | 'unknown'
  z3_satisfiable BOOLEAN, -- true/false/null
  z3_solver_version VARCHAR(50), -- e.g. '4.16.0'
  z3_time_ms INTEGER, -- solver execution time in milliseconds
  z3_smt2_hash VARCHAR(64), -- hash of the SMT-LIB v2 input formula
  z3_error TEXT, -- solver error message if status is error
  z3_trace JSONB DEFAULT '{}', -- full solver response payload for replay/audit

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

-- Policy: org members (via get_user_orgs) can read gate decisions (audit and review)
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
CREATE POLICY dsg_gate_service_insert ON dsg_gate_decisions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Immutability enforcement: gate decisions are append-only
-- BEFORE UPDATE/DELETE trigger prevents any mutation post-insert
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
-- Deliberately no UPDATE/DELETE grant to any role: immutability enforced by trigger

-- Comments for future reviewers
COMMENT ON TABLE dsg_gate_decisions IS
  'Phase 2 table: Z3 formal proof decisions (Neon). Tracks deterministic gate decisions with complete proof trace.
   See docs/PHASE2_PLAN.md for open blockers (4-10) and verification approach decisions.
   APPEND-ONLY: immutability enforced by BEFORE UPDATE/DELETE trigger.';

COMMENT ON FUNCTION record_z3_gate_decision(UUID, UUID, BYTEA, JSONB, VARCHAR, BYTEA, JSONB, VARCHAR, BOOLEAN, VARCHAR, INTEGER, VARCHAR, TEXT, NUMERIC, UUID) IS
  'Record Z3 formal proof gate decision. Inserts immutable row into dsg_gate_decisions.
   Called by POST /api/dsg/v1/gates/evaluate when Z3 solver decision is recorded.';

COMMENT ON FUNCTION dsg_prevent_gate_decision_mutation() IS
  'Prevents UPDATE/DELETE on gate decisions. Enforces append-only constraint for audit trail integrity.';
