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
  sequence_number NUMERIC NOT NULL,
  request_hash TEXT NOT NULL,
  decision_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL,
  decision_outcome TEXT NOT NULL,
  decision_reason TEXT NOT NULL,
  risk_score NUMERIC,
  evidence JSONB,
  verified BOOLEAN NOT NULL DEFAULT true,
  merkle_leaf_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  metadata JSONB,
  CONSTRAINT unique_org_sequence UNIQUE(org_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_org_id
ON dsg_determinism_ledger(org_id);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_org_sequence
ON dsg_determinism_ledger(org_id, sequence_number DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_entry_id
ON dsg_determinism_ledger(entry_id);

CREATE INDEX IF NOT EXISTS idx_dsg_ledger_created_at
ON dsg_determinism_ledger(created_at DESC);

CREATE TABLE IF NOT EXISTS dsg_determinism_merkle_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  checkpoint_sequence NUMERIC NOT NULL,
  merkle_root_hash TEXT NOT NULL,
  total_entries BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_checkpoint UNIQUE(org_id, checkpoint_sequence)
);

CREATE INDEX IF NOT EXISTS idx_merkle_checkpoints_org
ON dsg_determinism_merkle_checkpoints(org_id);

CREATE OR REPLACE FUNCTION next_dsg_sequence(org_id TEXT)
RETURNS BIGINT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  UPDATE dsg_determinism_sequences
  SET current_sequence = current_sequence + 1,
      last_updated_at = NOW()
  WHERE dsg_determinism_sequences.org_id = $1;

  IF NOT FOUND THEN
    INSERT INTO dsg_determinism_sequences (org_id, current_sequence)
    VALUES ($1, 1)
    ON CONFLICT (org_id) DO UPDATE
    SET current_sequence = current_sequence + 1,
        last_updated_at = NOW();
  END IF;

  SELECT current_sequence INTO next_val
  FROM dsg_determinism_sequences
  WHERE dsg_determinism_sequences.org_id = $1;

  RETURN next_val;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION compute_dsg_merkle_leaf()
RETURNS TRIGGER AS $$
BEGIN
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

ALTER TABLE dsg_determinism_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_determinism_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_determinism_merkle_checkpoints ENABLE ROW LEVEL SECURITY;

GRANT ALL ON dsg_determinism_ledger TO service_role;
GRANT ALL ON dsg_determinism_sequences TO service_role;
GRANT ALL ON dsg_determinism_merkle_checkpoints TO service_role;
GRANT EXECUTE ON FUNCTION next_dsg_sequence TO service_role;;
