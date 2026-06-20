#!/usr/bin/env bash
set -euo pipefail

BRANCH="fix/billing-checkout-trial-upgrade-403"
REPORT="live-db-blockers-report.txt"
MIGRATION_DIR="supabase/migrations"
MIGRATION_FILE="$MIGRATION_DIR/20260620043300_harden_audit_logs_append_only.sql"

echo "== DSG ONE live DB blocker inspection =="
git checkout "$BRANCH"

: > "$REPORT"

{
  echo "# Live DB Blockers Report"
  echo
  echo "## Git"
  git status --short
  echo
  echo "## incrementQuota references"
  grep -RIn "incrementQuota\|increment_quota\|quota" \
    app lib tests supabase db migrations 2>/dev/null | head -n 240 || true
  echo
  echo "## audit_logs references"
  grep -RIn "audit_logs\|audit log\|audit_logs" \
    app lib tests supabase db migrations 2>/dev/null | head -n 240 || true
  echo
  echo "## Relevant test context"
  if [ -f tests/integration/api/spine/execute.test.ts ]; then
    echo
    echo "### tests/integration/api/spine/execute.test.ts"
    nl -ba tests/integration/api/spine/execute.test.ts | sed -n '1,220p'
  fi
  if [ -f tests/integration/api/execute-live-db.required.test.ts ]; then
    echo
    echo "### tests/integration/api/execute-live-db.required.test.ts"
    nl -ba tests/integration/api/execute-live-db.required.test.ts | sed -n '1,260p'
  fi
  if [ -f tests/integration/api/live-db-supabase.required.test.ts ]; then
    echo
    echo "### tests/integration/api/live-db-supabase.required.test.ts"
    nl -ba tests/integration/api/live-db-supabase.required.test.ts | sed -n '1,260p'
  fi
} >> "$REPORT"

echo "== Prepare append-only audit_logs migration =="
mkdir -p "$MIGRATION_DIR"

cat <<'SQL' > "$MIGRATION_FILE"
-- DSG ONE live DB safety fix:
-- Make audit_logs append-only at DB level.
-- This intentionally blocks UPDATE, DELETE, and TRUNCATE even if an application role
-- accidentally receives broad table privileges.
--
-- Safe/idempotent:
-- - Applies only if public.audit_logs or api.audit_logs exists.
-- - Recreates the trigger protection.
-- - Revokes mutation privileges from common application roles when present.

CREATE OR REPLACE FUNCTION public.dsg_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DO $$
DECLARE
  target_table regclass;
  target_schema text;
  target_name text;
BEGIN
  FOR target_schema, target_name IN
    SELECT 'public', 'audit_logs'
    UNION ALL
    SELECT 'api', 'audit_logs'
  LOOP
    target_table := to_regclass(format('%I.%I', target_schema, target_name));

    IF target_table IS NOT NULL THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS dsg_audit_logs_append_only_guard ON %s',
        target_table
      );

      EXECUTE format(
        'CREATE TRIGGER dsg_audit_logs_append_only_guard
         BEFORE UPDATE OR DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION public.dsg_prevent_audit_log_mutation()',
        target_table
      );

      EXECUTE format(
        'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE %s FROM anon, authenticated',
        target_table
      );

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE format(
          'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE %s FROM service_role',
          target_table
        );
      END IF;

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        -- postgres remains owner/superuser; trigger still protects normal UPDATE/DELETE.
        NULL;
      END IF;

      RAISE NOTICE 'DSG append-only audit_logs guard installed on %', target_table;
    END IF;
  END LOOP;
END $$;
SQL

echo
echo "Created migration:"
echo "$MIGRATION_FILE"

echo
echo "== Git diff =="
git diff -- "$MIGRATION_FILE"

echo
echo "== Report saved =="
echo "$REPORT"
echo
echo "Show key lines:"
grep -n -E "incrementQuota|increment_quota|audit_logs|NO-GO|uuid = text" "$REPORT" | head -n 120 || true

echo
echo "DONE"
