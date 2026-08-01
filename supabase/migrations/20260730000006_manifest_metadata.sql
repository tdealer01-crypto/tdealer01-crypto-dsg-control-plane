-- Manifest Metadata Table for Policy Manifests
-- Stores metadata about policy manifests including cache hits, embeddings, and TTL
-- Supports Harmony cache and manifest versioning

CREATE TABLE IF NOT EXISTS manifest_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  frame_id TEXT NOT NULL,

  -- Manifest content and hashing
  manifest_hash TEXT NOT NULL,           -- SHA256(manifest JSON)
  manifest_size INTEGER NOT NULL,        -- Size in bytes for quota tracking

  -- Harmony cache hits (heuristic matching)
  harmony_hit_count INTEGER DEFAULT 0,   -- Number of heuristic matches
  harmony_embedding_score NUMERIC,       -- Embedding cosine similarity (0.0-1.0)

  -- TTL and retention
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,       -- TTL expiration

  -- Constraints
  UNIQUE(org_id, session_id, frame_id),
  CONSTRAINT manifest_manifest_size_positive CHECK (manifest_size > 0),
  CONSTRAINT manifest_hash_format CHECK (manifest_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT manifest_embedding_range CHECK (harmony_embedding_score IS NULL OR (harmony_embedding_score >= 0.0 AND harmony_embedding_score <= 1.0))
);

-- Indexes for efficient lookup and TTL cleanup
CREATE INDEX IF NOT EXISTS idx_manifest_metadata_expires
  ON manifest_metadata(expires_at);

CREATE INDEX IF NOT EXISTS idx_manifest_metadata_hash
  ON manifest_metadata(manifest_hash);

CREATE INDEX IF NOT EXISTS idx_manifest_metadata_org
  ON manifest_metadata(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manifest_metadata_org_session
  ON manifest_metadata(org_id, session_id);

-- Partial index for active manifests (not yet expired)
CREATE INDEX IF NOT EXISTS idx_manifest_metadata_active
  ON manifest_metadata(org_id, created_at DESC)
  WHERE expires_at > now();

-- Enable RLS for org-scoped access
ALTER TABLE manifest_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read manifest metadata within their org
CREATE POLICY manifest_metadata_org_read ON manifest_metadata
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: service_role can insert/update manifest metadata
CREATE POLICY manifest_metadata_service_write ON manifest_metadata
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY manifest_metadata_service_update ON manifest_metadata
  FOR UPDATE
  WITH CHECK (true);

-- Grant access
GRANT SELECT ON manifest_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE ON manifest_metadata TO service_role;

-- Comment for documentation
COMMENT ON TABLE manifest_metadata IS
  'Metadata for policy manifests including Harmony cache stats and TTL expiration';

COMMENT ON COLUMN manifest_metadata.harmony_hit_count IS
  'Heuristic cache hit count for Harmony matching (incremented on each cache hit)';

COMMENT ON COLUMN manifest_metadata.harmony_embedding_score IS
  'Cosine similarity score (0.0-1.0) from embedding model for semantic matching';
