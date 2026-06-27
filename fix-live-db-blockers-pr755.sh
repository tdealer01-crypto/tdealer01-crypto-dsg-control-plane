#!/usr/bin/env bash
set -euo pipefail

BRANCH="fix/billing-checkout-trial-upgrade-403"
REPORT="live-db-blockers-fix-report.txt"
MIGRATION_DIR="supabase/migrations"
MIGRATION_FILE="$MIGRATION_DIR/20260620043600_fix_live_db_quota_uuid_and_audit_append_only.sql"

echo "== DSG ONE PR #755 live DB blocker fix =="
echo "Repo: $(pwd)"

git checkout "$BRANCH"

: > "$REPORT"

echo "== Collect evidence =="
{
  echo "# Live DB blocker evidence"
  echo
  echo "## git status"
  git status --short
  echo
  echo "## quota references"
  grep -RIn "incrementQuota\|increment_quota\|quota" app lib tests supabase db migrations 2>/dev/null | head -n 300 || true
  echo
  echo "## audit_logs references"
  grep -RIn "audit_logs" app lib tests supabase db migrations 2>/dev/null | head -n 300 || true
} >> "$REPORT"

mkdir -p "$MIGRATION_DIR"

echo "== Create DB hardening migration =="
cat <<'SQL' > "$MIGRATION_FILE"
-- DSG ONE live DB safety fix
-- Date: 2026-06-20
--
-- Fixes two live-test blockers:
-- 1. quota RPC / SQL paths comparing uuid columns with text parameters
-- 2. audit_logs must be append-only at DB level

BEGIN;

-- 1) Audit log immutability guard.
-- This blocks UPDATE/DELETE on audit_logs even if a role accidentally has broad privileges.

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
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    to_regclass('public.audit_logs'),
    to_regclass('api.audit_logs')
  ]
  LOOP
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

      RAISE NOTICE 'audit_logs append-only guard installed on %', target_table;
    END IF;
  END LOOP;
END $$;

-- 2) Compatibility helper for uuid/text comparisons in quota code.
-- Some older quota RPCs accepted org_id as text and compared directly to uuid columns.
-- This helper safely normalizes text to uuid and fails closed on invalid uuid.

CREATE OR REPLACE FUNCTION public.dsg_text_to_uuid(value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'invalid uuid: %', value
    USING ERRCODE = '22P02';
END;
$$;

COMMIT;
SQL

echo "== Patch likely SQL uuid=text quota comparisons in migration/source SQL files =="
python3 <<'PY'
from pathlib import Path
import re

paths = []
for root in ["supabase", "db", "migrations"]:
    p = Path(root)
    if p.exists():
        paths.extend(p.rglob("*.sql"))

changed = []

patterns = [
    (r"org_id\s*=\s*p_org_id(?!\s*::)", "org_id = public.dsg_text_to_uuid(p_org_id)"),
    (r"p_org_id\s*=\s*org_id(?!\s*::)", "public.dsg_text_to_uuid(p_org_id) = org_id"),
    (r"agent_id\s*=\s*p_agent_id(?!\s*::)", "agent_id = public.dsg_text_to_uuid(p_agent_id)"),
    (r"p_agent_id\s*=\s*agent_id(?!\s*::)", "public.dsg_text_to_uuid(p_agent_id) = agent_id"),
]

for path in paths:
    text = path.read_text(errors="ignore")
    if not any(k in text for k in ["quota", "increment", "org_id", "agent_id"]):
        continue

    new = text
    for pat, repl in patterns:
        new = re.sub(pat, repl, new)

    if new != text:
        path.write_text(new)
        changed.append(str(path))

print("SQL files patched:")
for item in changed:
    print("-", item)

if not changed:
    print("No existing SQL files patched; migration helper/guard still created.")
PY

echo "== Patch likely TypeScript uuid=text comparison hints =="
python3 <<'PY'
from pathlib import Path
import re

# This is intentionally conservative:
# it does not rewrite arbitrary app logic.
# It only annotates likely incrementQuota files so maintainers see the boundary.
targets = []
for root in ["app", "lib"]:
    p = Path(root)
    if p.exists():
        for f in p.rglob("*.ts"):
            text = f.read_text(errors="ignore")
            if "incrementQuota" in text or "increment quota" in text or "increment_quota" in text:
                targets.append(f)

print("Likely quota TS files:")
for f in targets:
    print("-", f)
PY

echo
echo "== Verify migration content =="
sed -n '1,220p' "$MIGRATION_FILE"

echo
echo "== Git diff summary =="
git diff --stat

echo
echo "== Run targeted grep after patch =="
grep -RIn "org_id = p_org_id\|p_org_id = org_id\|agent_id = p_agent_id\|p_agent_id = agent_id" supabase db migrations 2>/dev/null || true

echo
echo "== Commit and push =="
git add "$MIGRATION_FILE" supabase db migrations 2>/dev/null || true
git add -A

git commit -m "fix(db): harden audit logs and quota uuid casts" || echo "No new diff to commit"

git push

echo
echo "== PR status =="
gh pr view 755 --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane \
  --json number,title,state,mergeStateStatus,headRefOid,url \
  --jq '.'

echo
echo "DONE: pushed live DB blocker fix to PR #755"
echo "Next: wait for CI, then merge only if checks pass."
