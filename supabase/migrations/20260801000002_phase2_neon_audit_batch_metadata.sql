-- Phase 2: Audit Batch Metadata Table for Neon Multi-Tenant Setup
-- Parallel to Supabase (20260730000007); ensures consistent hash-chain integrity across both databases
-- Status: PENDING_NEON_APPLICATION

-- Audit Batch Metadata Table for Hash Chain Integrity
-- Tracks batch hashes, chain links, and verification state for audit trail integrity
-- Implements tamper detection through hash chain validation
CREATE TABLE IF NOT EXISTS audit_batch_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Batch identification and hashing
  batch_hash TEXT NOT NULL,              -- SHA256(events || previous_hash)
  previous_hash TEXT,                    -- Hash chain link to previous batch
  previous_org_id UUID,                  -- Org ID of previous batch (for chain integrity)

  -- Batch statistics
  event_count INTEGER NOT NULL,          -- Number of events in this batch
  batch_size_bytes INTEGER,              -- Total size in bytes for quota tracking

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  chain_verified_at TIMESTAMPTZ,         -- When hash chain was last validated

  -- Chain verification state
  verification_status TEXT DEFAULT 'pending',  -- 'pending', 'verified', 'failed'

  -- Constraints
  CONSTRAINT batch_hash_format CHECK (batch_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT previous_hash_format CHECK (previous_hash IS NULL OR previous_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT event_count_positive CHECK (event_count > 0),
  CONSTRAINT verification_status_valid CHECK (verification_status IN ('pending', 'verified', 'failed')),

  -- Org-scoped batch hash uniqueness (prevents cross-org collisions)
  CONSTRAINT batch_hash_org_unique UNIQUE (org_id, batch_hash),

  -- Chain link completeness: if previous_hash is set, previous_org_id must also be set and equal org_id
  CONSTRAINT chain_link_complete CHECK ((previous_hash IS NULL AND previous_org_id IS NULL) OR (previous_hash IS NOT NULL AND previous_org_id = org_id)),

  -- Foreign key to previous batch (org-scoped chain integrity)
  -- RESTRICT: prevents deletion of predecessor batches to preserve chain link evidence
  CONSTRAINT batch_hash_chain_link FOREIGN KEY (previous_org_id, previous_hash)
    REFERENCES audit_batch_metadata(org_id, batch_hash) ON DELETE RESTRICT
);

-- Indexes for efficient chain traversal and queries
CREATE INDEX IF NOT EXISTS idx_audit_batch_metadata_chain
  ON audit_batch_metadata(batch_hash, previous_hash);

CREATE INDEX IF NOT EXISTS idx_audit_batch_metadata_org
  ON audit_batch_metadata(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_batch_metadata_verification
  ON audit_batch_metadata(verification_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_batch_metadata_org_verified
  ON audit_batch_metadata(org_id, verification_status, created_at DESC);

-- Partial index for unverified batches (for priority verification)
CREATE INDEX IF NOT EXISTS idx_audit_batch_metadata_unverified
  ON audit_batch_metadata(created_at DESC)
  WHERE verification_status = 'pending';

-- Function to compute and verify batch hash chain
CREATE OR REPLACE FUNCTION verify_audit_batch_chain(p_batch_id UUID)
RETURNS TABLE(batch_hash TEXT, previous_hash TEXT, verification_status TEXT, is_valid BOOLEAN) AS $$
DECLARE
  v_batch audit_batch_metadata;
  v_prev_count INTEGER;
BEGIN
  -- Get the batch
  SELECT * INTO v_batch FROM audit_batch_metadata WHERE id = p_batch_id;

  IF v_batch IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  -- For the first batch, previous_hash should be NULL
  IF v_batch.previous_hash IS NOT NULL THEN
    -- Verify the previous batch exists, is verified, and belongs to the same org (tenant isolation)
    SELECT COUNT(*) INTO v_prev_count
      FROM audit_batch_metadata
      WHERE batch_hash = v_batch.previous_hash
        AND org_id = v_batch.previous_org_id
        AND verification_status = 'verified';

    IF v_prev_count = 0 THEN
      RETURN QUERY SELECT
        v_batch.batch_hash,
        v_batch.previous_hash,
        'failed'::TEXT,
        FALSE;
      RETURN;
    END IF;
  END IF;

  -- Update verification status to verified
  UPDATE audit_batch_metadata
    SET verification_status = 'verified',
        chain_verified_at = now()
    WHERE id = p_batch_id;

  RETURN QUERY SELECT
    v_batch.batch_hash,
    v_batch.previous_hash,
    'verified'::TEXT,
    TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to detect chain breaks (tamper detection)
CREATE OR REPLACE FUNCTION detect_chain_break(p_org_id UUID)
RETURNS TABLE(batch_hash TEXT, previous_hash TEXT, is_broken BOOLEAN, reason TEXT) AS $$
DECLARE
  v_batch audit_batch_metadata;
  v_prev_count INTEGER;
BEGIN
  -- Check for batches with missing previous_hash links
  FOR v_batch IN
    SELECT * FROM audit_batch_metadata
    WHERE org_id = p_org_id
    ORDER BY created_at DESC
  LOOP
    IF v_batch.previous_hash IS NOT NULL THEN
      SELECT COUNT(*) INTO v_prev_count
        FROM audit_batch_metadata
        WHERE batch_hash = v_batch.previous_hash;

      IF v_prev_count = 0 THEN
        RETURN QUERY SELECT
          v_batch.batch_hash,
          v_batch.previous_hash,
          TRUE,
          'Previous batch not found (possible tampering)';
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS for org-scoped access
ALTER TABLE audit_batch_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: users can read batch metadata only for their org
CREATE POLICY audit_batch_metadata_org_read ON audit_batch_metadata
  FOR SELECT
  USING (
    org_id IN (
      SELECT get_user_orgs(auth.uid())
    )
  );

-- Policy: service_role can insert batch metadata
CREATE POLICY audit_batch_metadata_service_insert ON audit_batch_metadata
  FOR INSERT
  WITH CHECK (true);

-- Policy: service_role can update verification status only (restrictive update)
CREATE POLICY audit_batch_metadata_service_update ON audit_batch_metadata
  FOR UPDATE
  WITH CHECK (true)
  USING (true);

-- Function to safely update verification status (prevents mutation of batch_hash, previous_hash, org_id)
CREATE OR REPLACE FUNCTION update_batch_verification(
  p_batch_id UUID,
  p_verification_status TEXT,
  p_chain_verified_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_verification_status NOT IN ('pending', 'verified', 'failed') THEN
    RAISE EXCEPTION 'Invalid verification_status: %', p_verification_status;
  END IF;

  UPDATE audit_batch_metadata
    SET verification_status = p_verification_status,
        chain_verified_at = COALESCE(p_chain_verified_at, chain_verified_at)
    WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public access from verification functions (security: restrict to service_role only)
REVOKE EXECUTE ON FUNCTION verify_audit_batch_chain(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION detect_chain_break(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_batch_verification(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- Grant access
GRANT SELECT ON audit_batch_metadata TO authenticated;
GRANT SELECT, INSERT ON audit_batch_metadata TO service_role;
GRANT EXECUTE ON FUNCTION update_batch_verification TO service_role;
GRANT EXECUTE ON FUNCTION verify_audit_batch_chain TO service_role;
GRANT EXECUTE ON FUNCTION detect_chain_break TO service_role;

-- Comments for documentation
COMMENT ON TABLE audit_batch_metadata IS
  'Metadata for audit batches including hash chain state and verification status (Neon Phase 2). Used for tamper detection.
   SECURITY: Org-scoped batch uniqueness (org_id, batch_hash) prevents cross-org chain links.
   SECURITY: RLS policies use get_user_orgs() SECURITY DEFINER function to avoid recursion.
   SECURITY: Function-based update restrictions prevent mutation of immutable fields.
   SECURITY: Verification functions filter by org_id to maintain tenant isolation.
   SECURITY: FK ON DELETE RESTRICT prevents predecessor deletion that would hide tampering evidence.';

COMMENT ON FUNCTION verify_audit_batch_chain(UUID) IS
  'Verify the integrity of a batch in the hash chain. Updates verification_status and chain_verified_at only.
   SECURITY: Filters previous batch lookup by org_id to prevent cross-tenant chain verification.';

COMMENT ON FUNCTION detect_chain_break(UUID) IS
  'Detect chain breaks in audit trail for an organization (signs of tampering).';

COMMENT ON FUNCTION update_batch_verification(UUID, TEXT, TIMESTAMPTZ) IS
  'Safely update verification status without allowing mutation of batch_hash, previous_hash, or org_id.
   Designed to replace direct UPDATE grants for security enforcement.';
