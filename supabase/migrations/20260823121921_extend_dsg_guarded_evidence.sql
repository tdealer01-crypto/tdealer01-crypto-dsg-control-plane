-- Restored from supabase_migrations.schema_migrations on 2026-08-28.

ALTER TABLE dsg_guarded_evidence
    ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'prototype',
    ADD COLUMN IF NOT EXISTS plan_hash TEXT NOT NULL DEFAULT repeat('0', 64),
    ADD COLUMN IF NOT EXISTS agent_identity TEXT NOT NULL DEFAULT 'prototype',
    ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'api',
    ADD COLUMN IF NOT EXISTS step_id TEXT,
    ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'prototype',
    ADD COLUMN IF NOT EXISTS target TEXT NOT NULL DEFAULT 'prototype',
    ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS decision TEXT NOT NULL DEFAULT 'PROTOTYPE',
    ADD COLUMN IF NOT EXISTS control_hash TEXT NOT NULL DEFAULT repeat('0', 64),
    ADD COLUMN IF NOT EXISTS mutation_status TEXT NOT NULL DEFAULT 'succeeded',
    ADD COLUMN IF NOT EXISTS outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS evidence_hash TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS recorded_at TEXT NOT NULL DEFAULT '';

UPDATE dsg_guarded_evidence
   SET recorded_at = to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
 WHERE recorded_at = '';

ALTER TABLE dsg_guarded_evidence
    ALTER COLUMN plan_id DROP DEFAULT,
    ALTER COLUMN plan_hash DROP DEFAULT,
    ALTER COLUMN agent_identity DROP DEFAULT,
    ALTER COLUMN channel DROP DEFAULT,
    ALTER COLUMN action DROP DEFAULT,
    ALTER COLUMN target DROP DEFAULT,
    ALTER COLUMN decision DROP DEFAULT,
    ALTER COLUMN control_hash DROP DEFAULT,
    ALTER COLUMN mutation_status DROP DEFAULT,
    ALTER COLUMN evidence_hash DROP DEFAULT,
    ALTER COLUMN recorded_at DROP DEFAULT;

CREATE INDEX IF NOT EXISTS dsg_guarded_evidence_tenant_created_idx
    ON dsg_guarded_evidence (tenant_id, created_at DESC);
