-- DRAFT: DSG Gate Decisions Table for Phase 2 Z3 Solver Integration
--
-- STATUS: DO NOT APPLY YET — This migration is drafted for Phase 2 (Week 9+)
-- when Z3 formal proof and deterministic gate decisions are integrated.
--
-- PURPOSE: Store Z3 solver results, proof evidence, and decision lineage for
-- deterministic gate evaluation at scale.
--
-- BLOCKERS:
-- - Z3 solver contract finalization
-- - Decision format standardization
-- - Evidence chain schema approval
-- - Performance index requirements
--
-- REVIEW CHECKLIST (before applying):
-- - [ ] Z3 output format validated
-- - [ ] Proof verification approach confirmed
-- - [ ] Index requirements reviewed with DBA
-- - [ ] RLS policies aligned with governance model
-- - [ ] Archive/retention strategy defined
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
  z3_trace JSONB DEFAULT '{}', -- Solver assertions, model, timeout info
  satisfiability VARCHAR(20), -- 'SAT', 'UNSAT', 'UNKNOWN', 'TIMEOUT'

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
  CONSTRAINT dsg_gate_sat_valid
    CHECK (satisfiability IS NULL OR satisfiability IN ('SAT', 'UNSAT', 'UNKNOWN', 'TIMEOUT')),
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

CREATE INDEX IF NOT EXISTS idx_dsg_gate_satisfiability
  ON dsg_gate_decisions(satisfiability)
  WHERE satisfiability IS NOT NULL;

-- Partial index for high-confidence decisions
CREATE INDEX IF NOT EXISTS idx_dsg_gate_high_confidence
  ON dsg_gate_decisions(created_at DESC)
  WHERE decision_confidence >= 0.95 AND decision IN ('ALLOW', 'BLOCK');

-- Enable RLS for org-scoped access
ALTER TABLE dsg_gate_decisions ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read gate decisions (audit and review)
CREATE POLICY dsg_gate_org_read ON dsg_gate_decisions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: service_role (Z3 solver) can insert decisions
CREATE POLICY dsg_gate_service_insert ON dsg_gate_decisions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: immutable updates (only specific fields can be updated)
-- Only allow updating evidence_retention_until (for compliance retention)
CREATE POLICY dsg_gate_service_update ON dsg_gate_decisions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (
    -- Ensure immutability of decision/proof
    decision = (SELECT decision FROM dsg_gate_decisions WHERE id = dsg_gate_decisions.id)
    AND proof_hash = (SELECT proof_hash FROM dsg_gate_decisions WHERE id = dsg_gate_decisions.id)
    AND input_hash = (SELECT input_hash FROM dsg_gate_decisions WHERE id = dsg_gate_decisions.id)
  );

-- Helper function: record Z3 gate decision result
CREATE OR REPLACE FUNCTION record_z3_gate_decision(
  p_org_id UUID,
  p_policy_version UUID,
  p_input_hash BYTEA,
  p_constraint_set JSONB,
  p_decision VARCHAR,
  p_proof_hash BYTEA,
  p_z3_trace JSONB DEFAULT '{}',
  p_satisfiability VARCHAR DEFAULT NULL,
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
    satisfiability,
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
    p_satisfiability,
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
GRANT SELECT, INSERT, UPDATE ON dsg_gate_decisions TO service_role;

-- Comment for future reviewers
COMMENT ON TABLE dsg_gate_decisions IS
  'Phase 2 table: Z3 formal proof decisions. DO NOT APPLY until Week 9+ when Z3 integration is complete.';
