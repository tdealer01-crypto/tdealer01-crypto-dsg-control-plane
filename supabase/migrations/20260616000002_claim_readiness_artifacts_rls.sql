-- Enable Row-Level Security on claim_readiness_artifacts.
--
-- Previous migration (20260612041000) created the table with RLS disabled.
-- This migration activates RLS and enforces the append-only / WORM pattern:
--
--   SELECT  — authenticated users may read all artifacts
--   INSERT  — service_role only (API writes evidence records)
--   UPDATE  — service_role only (status transitions: PENDING→VERIFIED→ARCHIVED)
--   DELETE  — blocked for all roles via a BEFORE DELETE trigger
--
-- Note: service_role bypasses RLS by default in Supabase, so the policies
-- below govern the authenticated (anon-key) surface only. The DELETE trigger
-- blocks all roles, including service_role.

ALTER TABLE claim_readiness_artifacts ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read compliance artifacts
CREATE POLICY "artifacts_select_authenticated"
  ON claim_readiness_artifacts
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: authenticated users are blocked; service_role bypasses RLS and may insert
-- No authenticated INSERT policy is intentional.

-- UPDATE: authenticated users are blocked; service_role may update (status transitions)
-- No authenticated UPDATE policy is intentional.

-- DELETE: prevent deletion for all roles (append-only / WORM enforcement)
CREATE OR REPLACE FUNCTION prevent_artifact_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Deletion of claim_readiness_artifacts is not permitted (append-only WORM table)';
END;
$$;

DROP TRIGGER IF EXISTS no_delete_artifacts ON claim_readiness_artifacts;

CREATE TRIGGER no_delete_artifacts
  BEFORE DELETE ON claim_readiness_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_artifact_delete();

COMMENT ON TABLE claim_readiness_artifacts
  IS 'Append-only WORM table. RLS enabled. DELETE blocked by trigger for all roles.';
