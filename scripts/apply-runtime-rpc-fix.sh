#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_URL="${SUPABASE_DB_URL:-${1:-}}"

if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: Missing DB URL."
  echo "Usage: SUPABASE_DB_URL=postgres://... ./scripts/apply-runtime-rpc-fix.sh"
  echo "   or: ./scripts/apply-runtime-rpc-fix.sh postgres://..."
  exit 1
fi

echo "[1/4] Applying billing quota RPC migration..."
psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/supabase/migrations/20260402_billing_quota_in_rpc.sql"

echo "[2/4] Applying runtime spine RPC hardening migration..."
psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/supabase/migrations/20260404_runtime_spine_rpc_hardening.sql"

echo "[3/4] Reloading PostgREST schema cache..."
psql "${DB_URL}" -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';"

echo "[4/4] Verifying runtime_commit_execution signature..."
ARG_COUNT="$(
  psql "${DB_URL}" -tA -v ON_ERROR_STOP=1 -c "
    select coalesce(max(p.pronargs), 0)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'runtime_commit_execution';
  " | tr -d '[:space:]'
)"

if [[ "${ARG_COUNT}" -lt 17 ]]; then
  echo "ERROR: runtime_commit_execution still has ${ARG_COUNT} args (expected >= 17)."
  exit 1
fi

echo "OK: runtime_commit_execution is up to date (args=${ARG_COUNT}) and schema cache reload was requested."
