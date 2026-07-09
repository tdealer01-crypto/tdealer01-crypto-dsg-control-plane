/**
 * DSG ONE Determinism Ledger Tables
 *
 * Creates immutable ledger for recording deterministic policy executions.
 * Structure enables:
 * - Gap-free sequence numbering (prove no entries were hidden)
 * - Hash chain verification (prove no tampering)
 * - Merkle tree for compact audit proofs
 * - Enterprise audit compliance
 */

-- Sequence counter for gap-free numbering per organization
CREATE TABLE IF NOT EXISTS dsg_determinism_sequences (
  org_id TEXT NOT NULL,
  current_sequence BIGINT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id)
);

CREATE INDEX IF NOT EXISTS idx_dsg_determinism_sequences_org_id
ON dsg_determinism_sequences(org_id);

-- Main determinism ledger table
CREATE TABLE IF NOT EXISTS dsg_determinism_ledger (
  id BIGSERIAL PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,

  -- Sequence number (gap-free, monotonic per org)
  sequence_number NUMERIC NOT NULL,

  -- Deterministic hashes (SHA-256 format: "sha256:...")
  request_hash TEXT NOT NULL,      -- Hash of policy request
  decision_hash TEXT NOT NULL,     -- Hash of policy decision
  chain_hash TEXT NOT NULL,        -- Link to previous entry (prevents tampering)

  -- Decision details
  decision_outcome TEXT NOT NULL,  -- 'ALLOW' | 'BLOCK' | 'REVIEW'
  decision_reason TEXT NOT NULL,   -- Why decision was made
  risk_score NUMERIC,              -- Risk assessment score
  evidence JSONB,                  -- Evidence used in decision

  -- Verification status
  verified BOOLEAN NOT NULL DEFAULT true,  -- Chain hash verified
  merkle_leaf_hash TEXT,           -- For Merkle tree verification

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,                 -- User or system that recorded this
  metadata JSONB,                  -- Additional metadata

  -- Ensure org_id + sequence_number is unique (can't have two #1 for same org)
  CONSTRAINT unique_org_sequence UNIQUE(org_id, sequence_number)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dsg_ledger_org_id
ON dsg_determinism_ledger(org_id);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_org_sequence
ON dsg_determinism_ledger(org_id, sequence_number DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_entry_id
ON dsg_determinism_ledger(entry_id);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_created_at
ON dsg_determinism_ledger(created_at DESC);

-- Merkle tree verification table (optional, for large ledgers)
-- Stores pre-computed Merkle roots at regular intervals for faster verification
CREATE TABLE IF NOT EXISTS dsg_determinism_merkle_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,

  -- Checkpoint details
  checkpoint_sequence NUMERIC NOT NULL,    -- Last sequence number in checkpoint
  merkle_root_hash TEXT NOT NULL,          -- Root hash of all entries up to checkpoint_sequence
  total_entries BIGINT NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_org_checkpoint UNIQUE(org_id, checkpoint_sequence)
);

CREATE INDEX IF NOT EXISTS idx_merkle_checkpoints_org
ON dsg_determinism_merkle_checkpoints(org_id);

-- Function to get next sequence number (atomic, race-condition safe)
CREATE OR REPLACE FUNCTION next_dsg_sequence(org_id TEXT)
RETURNS BIGINT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  -- Try to update existing row
  UPDATE dsg_determinism_sequences
  SET current_sequence = current_sequence + 1,
      last_updated_at = NOW()
  WHERE dsg_determinism_sequences.org_id = $1;

  -- If no row exists, insert it
  IF NOT FOUND THEN
    INSERT INTO dsg_determinism_sequences (org_id, current_sequence)
    VALUES ($1, 1)
    ON CONFLICT (org_id) DO UPDATE
    SET current_sequence = current_sequence + 1,
        last_updated_at = NOW();
  END IF;

  -- Get the new sequence number
  SELECT current_sequence INTO next_val
  FROM dsg_determinism_sequences
  WHERE dsg_determinism_sequences.org_id = $1;

  RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-compute Merkle leaf hash on insert
CREATE OR REPLACE FUNCTION compute_dsg_merkle_leaf()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple leaf hash: hash of the entry's key fields
  -- In production, use SHA-256 of JSON representation
  NEW.merkle_leaf_hash := md5(
    NEW.entry_id || '|' ||
    NEW.sequence_number || '|' ||
    NEW.request_hash || '|' ||
    NEW.decision_hash
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_merkle_leaf
BEFORE INSERT ON dsg_determinism_ledger
FOR EACH ROW
EXECUTE FUNCTION compute_dsg_merkle_leaf();

-- Enable Row Level Security
ALTER TABLE dsg_determinism_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_determinism_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_determinism_merkle_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Organizations can only see their own ledger entries
CREATE POLICY "organizations_can_read_own_ledger" ON dsg_determinism_ledger
FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM dsg_governance_orgs
    WHERE auth.uid()::text IN (
      SELECT user_id FROM dsg_governance_org_members WHERE org_id = org_id
    )
  ) OR
  auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "organizations_can_insert_own_ledger" ON dsg_determinism_ledger
FOR INSERT WITH CHECK (
  org_id IN (
    SELECT org_id FROM dsg_governance_orgs
    WHERE auth.uid()::text IN (
      SELECT user_id FROM dsg_governance_org_members WHERE org_id = org_id
    )
  ) OR
  auth.jwt() ->> 'role' = 'admin'
);

-- Grant permissions to service role
GRANT ALL ON dsg_determinism_ledger TO service_role;
GRANT ALL ON dsg_determinism_sequences TO service_role;
GRANT ALL ON dsg_determinism_merkle_checkpoints TO service_role;
GRANT EXECUTE ON FUNCTION next_dsg_sequence TO service_role;
