-- DSG Control Plane: incidents table with full governance hardening
-- Append-only pattern (mirrors audit_logs hardening), org-scoped RLS, hash integrity.
--
-- Columns:
--   id          uuid primary key (client-generated, app-supplied)
--   severity    text not null  (P1|P2|P3|P4)
--   title       text not null
--   description text not null default ''
--   status      text not null  (open|investigating|contained|resolved)
--   org_id      text not null  (RLS scoping key)
--   created_at  timestamptz not null default now()
--   resolved_at timestamptz   (nullable; set when status='resolved')
--   record_hash text not null  (unique; integrity fingerprint)
--
-- Hardening:
--   1. RLS enabled with SELECT policy scoped to org_id.
--   2. UPDATE/DELETE blocking trigger (append-only).
--   3. UNIQUE constraint on record_hash (prevents duplicate ingestion).
--   4. REVOKE UPDATE/DELETE/TRUNCATE from anon, authenticated, service_role.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
  id            uuid        PRIMARY KEY,
  severity      text        NOT NULL,
  title         text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'open',
  org_id        text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  record_hash   text        NOT NULL,

  -- Business-rule constraints
  CONSTRAINT incidents_severity_check
    CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
  CONSTRAINT incidents_status_check
    CHECK (status IN ('open', 'investigating', 'contained', 'resolved')),
  -- Integrity fingerprint must be unique across the table
  CONSTRAINT incidents_record_hash_unique UNIQUE (record_hash)
);

-- Index for the most common query pattern: list by org, filter by severity/status,
-- ordered by recency.
CREATE INDEX IF NOT EXISTS incidents_org_id_created_at_idx
  ON public.incidents (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_org_id_severity_idx
  ON public.incidents (org_id, severity);
CREATE INDEX IF NOT EXISTS incidents_org_id_status_idx
  ON public.incidents (org_id, status);

-- ---------------------------------------------------------------------------
-- 2. Row-Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- SELECT scoped to the caller's org_id.
-- The app sets a session variable `app.current_org_id` via a SET LOCAL in the
-- request path, or falls back to the JWT claim.  Because the API route uses
-- the service-role key (which bypasses RLS by default), we force RLS for
-- service_role as well so the org scoping is enforced at the DB layer too.
DROP POLICY IF EXISTS incidents_select_org_scoped ON public.incidents;
CREATE POLICY incidents_select_org_scoped
  ON public.incidents
  FOR SELECT
  USING (
    org_id = current_setting('app.current_org_id', true)
  );

-- No INSERT/UPDATE/DELETE policies — the table is append-only at the DB level.
-- The application INSERTs via the service-role client; UPDATE/DELETE are blocked
-- by the trigger below.  If you need controlled status changes, add a policy
-- that allows UPDATE only on the `status` and `resolved_at` columns.

-- Force RLS on service_role so even the admin client is subject to the SELECT
-- policy above.  (By default, table owners and superusers bypass RLS.)
ALTER TABLE public.incidents FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Append-only trigger (blocks UPDATE and DELETE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dsg_prevent_incidents_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'incidents is append-only: % is not allowed', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS incidents_append_only_guard ON public.incidents;
CREATE TRIGGER incidents_append_only_guard
  BEFORE UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.dsg_prevent_incidents_mutation();

-- ---------------------------------------------------------------------------
-- 4. Revoke mutation privileges from common application roles
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.incidents FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.incidents FROM service_role;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. Comment annotations (self-documenting schema)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.incidents IS
  'Append-only incidents table. UPDATE/DELETE blocked by DB trigger. RLS scoped to org_id.';
COMMENT ON COLUMN public.incidents.record_hash IS
  'Unique integrity fingerprint (e.g. sha256 of canonical fields). Prevents duplicate ingestion.';
COMMENT ON COLUMN public.incidents.org_id IS
  'Organization scoping key. Enforced by RLS SELECT policy.';
