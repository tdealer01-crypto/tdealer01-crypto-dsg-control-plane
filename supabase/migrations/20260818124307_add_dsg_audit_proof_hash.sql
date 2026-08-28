-- Restored from supabase_migrations.schema_migrations on 2026-08-28.

ALTER TABLE api.dsg_audit_events ADD COLUMN IF NOT EXISTS proof_hash text;
