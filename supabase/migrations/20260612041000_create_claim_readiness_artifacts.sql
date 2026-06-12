-- Migration: Create claim_readiness_artifacts table for immutable evidence artifacts
-- Description: Append-only table for storing compliance claim readiness artifacts with
--              cryptographic hash chains, S3 Object Lock integration, and audit trails.
-- Idempotency: Uses IF NOT EXISTS for table and indexes; safe to re-run.
-- Rollback: DROP TABLE IF EXISTS claim_readiness_artifacts CASCADE;

-- ============================================================================
-- Create claim_readiness_artifacts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_readiness_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Claim identifier linking evidence to a specific compliance claim
  -- e.g., "ISO-42001-A.6-PLANNING", "SOC2-CRYPTO", "GOVERNANCE-CHAIN"
  claim_id TEXT NOT NULL,

  -- Evidence type classification for querying and aggregation
  -- Allowed values: unit_tests, integration_tests, adversarial_tests, mutation_tests,
  --                 sbom, provenance, audit_chain, monitoring
  evidence_type TEXT NOT NULL,

  -- SHA256 hex digest of the artifact (immutable identifier)
  -- Used for deduplication and content verification
  artifact_hash TEXT NOT NULL UNIQUE,

  -- Hash of the previous artifact in the chain (enables chain verification)
  -- NULL for the first artifact in a claim chain
  chain_hash TEXT,

  -- S3 object path where the artifact is stored
  -- e.g., "artifacts/evidence-bundle-manifest.json", "proofs/revenue-20260612.json"
  artifact_path TEXT,

  -- JSON metadata about the artifact
  -- Structure varies by evidence_type:
  --   unit_tests: { coverage_pct, test_count, pass_count, fail_count, test_duration_ms }
  --   mutation_tests: { mutation_score, mutants_killed, mutants_total, mutation_duration_ms }
  --   sbom: { component_count, vulnerability_count, licenses, sbom_version }
  --   provenance: { git_commit, build_id, builder_id, timestamp, source_repo }
  --   audit_chain: { entry_count, chain_depth, verified_signatures }
  artifact_data JSONB,

  -- Cosign/Sigstore signature bundle with key metadata
  -- Structure: { signature, certificate, cert_chain, key_id, signed_at, verified_at }
  signature_bundle JSONB,

  -- When the artifact was moved to S3 Object Lock (immutable storage)
  -- NULL until immutable_at is set by S3 integration
  immutable_at TIMESTAMPTZ,

  -- AWS S3 version ID for the object in Object Lock bucket
  -- Proves the exact version stored in immutable storage
  s3_version_id TEXT,

  -- Object Lock retention expiry date (if set)
  -- NULL for indefinite retention; used for lifecycle/compliance policies
  s3_retain_until TIMESTAMPTZ,

  -- Artifact creation timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Last update timestamp (for tracking signature/metadata updates)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Artifact lifecycle status
  -- PENDING: newly created, awaiting verification/archival
  -- VERIFIED: cryptographically verified and chain-linked
  -- ARCHIVED: moved to Object Lock, immutable
  -- FAILED: verification failed, should not be used for claims
  status TEXT NOT NULL DEFAULT 'PENDING',

  -- Constraints on status values
  CONSTRAINT status_check CHECK (status IN ('PENDING', 'VERIFIED', 'ARCHIVED', 'FAILED')),

  -- Constraints on evidence_type values
  CONSTRAINT evidence_type_check CHECK (evidence_type IN (
    'unit_tests',
    'integration_tests',
    'adversarial_tests',
    'mutation_tests',
    'sbom',
    'provenance',
    'audit_chain',
    'monitoring'
  ))
);

-- Add table comment
COMMENT ON TABLE claim_readiness_artifacts IS
  'Immutable evidence artifacts linked to compliance claims. Append-only by design. '
  'Each artifact has a cryptographic hash, optional chain link, and S3 Object Lock integration. '
  'Used for compliance evidence mapping, pre-audit artifact collection, and governance audit trails.';

-- Add column comments
COMMENT ON COLUMN claim_readiness_artifacts.claim_id IS
  'Unique identifier for the compliance claim (e.g., "ISO-42001-A.6-PLANNING"). '
  'Links artifact to a specific requirement or assertion being evidenced.';

COMMENT ON COLUMN claim_readiness_artifacts.artifact_hash IS
  'SHA256 hex digest of artifact content. Must be unique across all artifacts. '
  'Used for content verification, deduplication, and tamper detection.';

COMMENT ON COLUMN claim_readiness_artifacts.chain_hash IS
  'Hash of the previous artifact in the claim chain (enables cryptographic chaining). '
  'NULL for the first artifact; enables chain verification and replay detection.';

COMMENT ON COLUMN claim_readiness_artifacts.s3_version_id IS
  'AWS S3 version ID from Object Lock bucket. '
  'Cryptographic proof that artifact is stored in immutable storage with exact version tracking.';

COMMENT ON COLUMN claim_readiness_artifacts.status IS
  'Artifact lifecycle status: PENDING (new), VERIFIED (chain-verified), ARCHIVED (in Object Lock), FAILED (rejected). '
  'Only VERIFIED and ARCHIVED artifacts should be used in compliance claims.';

-- ============================================================================
-- Create indexes for efficient querying
-- ============================================================================

-- Fast lookup by claim_id (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_claim_readiness_claim_id
  ON claim_readiness_artifacts(claim_id);

-- Fast lookup by evidence type with recency ordering
CREATE INDEX IF NOT EXISTS idx_claim_readiness_evidence_type_created
  ON claim_readiness_artifacts(evidence_type, created_at DESC);

-- Deduplication and exact hash lookup
CREATE INDEX IF NOT EXISTS idx_claim_readiness_artifact_hash
  ON claim_readiness_artifacts(artifact_hash);

-- Chain verification and traversal
CREATE INDEX IF NOT EXISTS idx_claim_readiness_chain_hash
  ON claim_readiness_artifacts(chain_hash);

-- Status queries with recency filtering
CREATE INDEX IF NOT EXISTS idx_claim_readiness_status_created
  ON claim_readiness_artifacts(status, created_at DESC);

-- Archival/Object Lock tracking
CREATE INDEX IF NOT EXISTS idx_claim_readiness_immutable_at
  ON claim_readiness_artifacts(immutable_at DESC);

-- ============================================================================
-- Row-Level Security (RLS) — Disabled by default
-- ============================================================================

-- RLS is disabled for now. Audit table integrity is enforced by application logic.
-- If RLS is needed in the future, implement append-only policies:
--   - SELECT: users can read artifacts for their organization/claim scope
--   - INSERT: only audit service can insert (verified via API key)
--   - UPDATE: only status updates allowed (PENDING → VERIFIED → ARCHIVED), immutable fields locked
--   - DELETE: permanently disabled (append-only design)

ALTER TABLE claim_readiness_artifacts DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Audit trigger (if audit_log table exists)
-- ============================================================================

-- Create audit trigger function if audit_log table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    CREATE OR REPLACE FUNCTION audit_claim_readiness_artifacts()
    RETURNS TRIGGER AS $audit_trigger$
    BEGIN
      INSERT INTO audit_log (
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        created_at
      ) VALUES (
        'claim_readiness_artifacts',
        TG_OP,
        COALESCE(NEW.id, OLD.id)::text,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        now()
      );
      RETURN COALESCE(NEW, OLD);
    END;
    $audit_trigger$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS audit_claim_readiness_artifacts_trigger
      ON claim_readiness_artifacts;

    CREATE TRIGGER audit_claim_readiness_artifacts_trigger
    AFTER INSERT OR UPDATE ON claim_readiness_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION audit_claim_readiness_artifacts();
  END IF;
END $$;

-- ============================================================================
-- Grant default permissions
-- ============================================================================

-- Public select (read-only access to evidence artifacts)
GRANT SELECT ON claim_readiness_artifacts TO postgres, authenticated;

-- Service role and authenticated users can insert
GRANT INSERT ON claim_readiness_artifacts TO postgres, authenticated;

-- Only service role can update status/metadata
GRANT UPDATE ON claim_readiness_artifacts TO postgres;

-- No delete permissions (append-only design)
-- GRANT DELETE is intentionally not issued

-- ============================================================================
-- Idempotency marker and rollback notes
-- ============================================================================

-- Idempotency: This migration uses IF NOT EXISTS and safe index creation.
--              Re-running is safe and will not cause data loss.
--
-- Rollback:    To remove this table and all data:
--              DROP TABLE IF EXISTS claim_readiness_artifacts CASCADE;
--
-- Verification: After applying, verify with:
--              SELECT * FROM information_schema.tables
--              WHERE table_name = 'claim_readiness_artifacts';
--
--              SELECT * FROM information_schema.constraint_column_usage
--              WHERE table_name = 'claim_readiness_artifacts';
--
--              SELECT indexname FROM pg_indexes
--              WHERE tablename = 'claim_readiness_artifacts';
