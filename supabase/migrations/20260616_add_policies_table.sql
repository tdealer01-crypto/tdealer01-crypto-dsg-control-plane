-- Policies table for storing markdown-based policy documents
-- Integrates with Markdoc rendering and DSG governance

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Policy metadata
  name TEXT NOT NULL,
  description TEXT,
  policy_type TEXT DEFAULT 'agent_execution',

  -- Markdoc content
  markdown_content TEXT NOT NULL,
  rendered_content JSONB, -- Pre-rendered Markdoc AST (optional cache)

  -- Versioning & hashing
  version INT NOT NULL DEFAULT 1,
  content_hash TEXT NOT NULL, -- SHA256 of markdown_content
  policy_hash TEXT NOT NULL, -- Hash of resolved policy constraints

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived
  is_default BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID,

  FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT policy_name_org_unique UNIQUE(org_id, name)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_policies_org_status
  ON policies(org_id, status);

CREATE INDEX IF NOT EXISTS idx_policies_content_hash
  ON policies(org_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_policies_policy_hash
  ON policies(org_id, policy_hash);

-- RLS policies
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_policies" ON policies
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "admins_manage_policies" ON policies
  FOR ALL
  USING (
    org_id IN (SELECT org_id FROM users
               WHERE auth_user_id = auth.uid()
               AND role IN ('owner', 'admin'))
  );

-- Policy versions table (audit trail)
CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  policy_id UUID NOT NULL,

  -- Content snapshot
  version INT NOT NULL,
  markdown_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  policy_hash TEXT NOT NULL,

  -- Change metadata
  change_reason TEXT,
  changed_by UUID,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT policy_version_unique UNIQUE(policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_policy_id
  ON policy_versions(policy_id, version DESC);

-- Helper function: compute policy hash from markdown
CREATE OR REPLACE FUNCTION compute_policy_hash(p_markdown TEXT)
RETURNS TEXT AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Simple hash of key policy directives
  -- In production, this would extract and hash actual policy constraints
  SELECT encode(digest(p_markdown, 'sha256'), 'hex') INTO v_hash;
  RETURN v_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: compute content hash
CREATE OR REPLACE FUNCTION compute_content_hash(p_markdown TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(p_markdown, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: update updated_at on policy change
CREATE OR REPLACE FUNCTION update_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS policies_update_timestamp ON policies;
CREATE TRIGGER policies_update_timestamp
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_policy_timestamp();

-- Trigger: auto-increment version & archive old on update
CREATE OR REPLACE FUNCTION archive_policy_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.markdown_content IS DISTINCT FROM OLD.markdown_content THEN
    -- Archive current version
    INSERT INTO policy_versions (org_id, policy_id, version, markdown_content, content_hash, policy_hash, changed_by)
    VALUES (OLD.org_id, OLD.id, OLD.version, OLD.markdown_content, OLD.content_hash, OLD.policy_hash, NEW.updated_by);

    -- Increment version
    NEW.version = OLD.version + 1;
    NEW.content_hash = compute_content_hash(NEW.markdown_content);
    NEW.policy_hash = compute_policy_hash(NEW.markdown_content);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS policies_archive_on_update ON policies;
CREATE TRIGGER policies_archive_on_update
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION archive_policy_on_update();

COMMENT ON TABLE policies IS 'Markdown-based policies for DSG governance (Markdoc rendering support)';
COMMENT ON COLUMN policies.markdown_content IS 'Policy document in Markdoc markdown format';
COMMENT ON COLUMN policies.rendered_content IS 'Optional cached Markdoc AST (JSONB)';
COMMENT ON COLUMN policies.content_hash IS 'SHA256 of markdown_content for caching/comparison';
COMMENT ON COLUMN policies.policy_hash IS 'Hash of actual policy constraints (for governance verification)';
