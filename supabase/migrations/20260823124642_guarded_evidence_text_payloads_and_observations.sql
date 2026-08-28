-- Restored from supabase_migrations.schema_migrations on 2026-08-28.

ALTER TABLE dsg_guarded_evidence
    ADD COLUMN IF NOT EXISTS output_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS started_at TEXT,
    ADD COLUMN IF NOT EXISTS finished_at TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name = 'dsg_guarded_evidence'
           AND column_name IN ('parameters', 'outputs')
           AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE dsg_guarded_evidence
            ALTER COLUMN parameters TYPE TEXT USING parameters::text,
            ALTER COLUMN outputs TYPE TEXT USING outputs::text;
    END IF;
END $$;
