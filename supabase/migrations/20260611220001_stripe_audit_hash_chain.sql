-- Stripe Approval Decision RPC
-- P0-4: Fail-closed audit recording via atomic transaction
-- P0-5: Hash chain for immutable audit trail

-- First, add hash chain columns to stripe_operation_audits
-- (This assumes stripe_operation_audits already exists from 20260606185643_stripe_app_tables.sql)

ALTER TABLE stripe_operation_audits
ADD COLUMN IF NOT EXISTS prev_hash TEXT,
ADD COLUMN IF NOT EXISTS record_hash TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS chain_index BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Index for hash chain verification
CREATE INDEX IF NOT EXISTS idx_stripe_operation_audits_chain
  ON stripe_operation_audits(stripe_account_id, chain_index);

-- Trigger function to prevent UPDATE/DELETE on audit rows
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Allow updates only to these specific columns (for approval workflow)
    IF NEW.dsg_decision <> OLD.dsg_decision
       OR NEW.dsg_reason <> OLD.dsg_reason
       OR NEW.status <> OLD.status
       OR NEW.dsg_decision_id <> OLD.dsg_decision_id
       OR NEW.updated_at <> OLD.updated_at THEN
      -- These are allowed for approval workflow (REVIEW -> ALLOW/BLOCK)
      RETURN NEW;
    END IF;
    -- Block updates to immutable fields
    IF NEW.stripe_event_id <> OLD.stripe_event_id
       OR NEW.stripe_object_id <> OLD.stripe_object_id
       OR NEW.operation_type <> OLD.operation_type
       OR NEW.dsg_proof <> OLD.dsg_proof
       OR NEW.payload <> OLD.payload
       OR NEW.prev_hash <> OLD.prev_hash
       OR NEW.record_hash <> OLD.record_hash
       OR NEW.chain_index <> OLD.chain_index
       OR NEW.locked_at <> OLD.locked_at THEN
      RAISE EXCEPTION 'Cannot modify immutable audit fields';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete audit records. Audit trail is immutable.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to stripe_operation_audits
DROP TRIGGER IF EXISTS trigger_prevent_audit_modification ON stripe_operation_audits;
CREATE TRIGGER trigger_prevent_audit_modification
  BEFORE UPDATE OR DELETE ON stripe_operation_audits
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Function to compute record hash (canonical hash of row data + prev_hash)
CREATE OR REPLACE FUNCTION compute_audit_record_hash(
  p_stripe_account_id TEXT,
  p_stripe_event_id TEXT,
  p_stripe_object_id TEXT,
  p_operation_type TEXT,
  p_dsg_decision TEXT,
  p_dsg_reason TEXT,
  p_dsg_proof TEXT,
  p_payload JSONB,
  p_prev_hash TEXT
) RETURNS TEXT AS $$
DECLARE
  canonical JSONB;
  hash_bytes BYTEA;
BEGIN
  canonical := jsonb_build_object(
    'stripe_account_id', p_stripe_account_id,
    'stripe_event_id', p_stripe_event_id,
    'stripe_object_id', p_stripe_object_id,
    'operation_type', p_operation_type,
    'dsg_decision', p_dsg_decision,
    'dsg_reason', p_dsg_reason,
    'dsg_proof', p_dsg_proof,
    'payload', p_payload,
    'prev_hash', p_prev_hash
  );
  hash_bytes := digest(canonical::TEXT, 'sha256');
  RETURN encode(hash_bytes, 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Function to get the latest chain_index and record_hash for an account
CREATE OR REPLACE FUNCTION get_latest_audit_chain(p_stripe_account_id TEXT)
RETURNS TABLE(chain_index BIGINT, record_hash TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT a.chain_index, a.record_hash
  FROM stripe_operation_audits a
  WHERE a.stripe_account_id = p_stripe_account_id
  ORDER BY a.chain_index DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

SELECT pg_sleep(0);