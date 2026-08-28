-- Restored from supabase_migrations.schema_migrations on 2026-08-28.

GRANT USAGE ON SCHEMA api TO service_role;
GRANT SELECT, INSERT ON TABLE api.dsg_audit_events TO service_role;
