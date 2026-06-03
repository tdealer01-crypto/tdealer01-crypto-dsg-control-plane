-- Breach signal evaluation audit trail.
-- Stores every evaluation result from POST /api/dsg/breach-signal/evaluate.
-- Service-role-only writes; no RLS policies needed for service-role access.
-- rawDataStored is always false by policy enforcement in the route.

CREATE TABLE IF NOT EXISTS breach_signal_evaluations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url            TEXT,
  owner                 TEXT,
  legal_purpose         TEXT,
  decision              TEXT        NOT NULL,
  evidence_level        TEXT        NOT NULL,
  severity              TEXT        NOT NULL,
  reasons               JSONB       NOT NULL DEFAULT '[]',
  allowed_actions       JSONB       NOT NULL DEFAULT '[]',
  blocked_actions       JSONB       NOT NULL DEFAULT '[]',
  hibp_checked          BOOLEAN     NOT NULL DEFAULT false,
  hibp_breach_count     INTEGER,
  hibp_breaches         JSONB,
  hibp_elevated_evidence BOOLEAN   NOT NULL DEFAULT false,
  raw_data_stored       BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS breach_signal_evals_created_at_idx
  ON breach_signal_evaluations (created_at DESC);

CREATE INDEX IF NOT EXISTS breach_signal_evals_decision_idx
  ON breach_signal_evaluations (decision);

ALTER TABLE breach_signal_evaluations ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS. No policies needed for service-role-only access.
