#!/usr/bin/env bash
# Link the canonical DSG Supabase project and apply repository migrations.
# SUPABASE_DB_PASSWORD must be the raw database password; do not percent-encode it here.

set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_DB_PASSWORD:?SUPABASE_DB_PASSWORD is required}"

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-${SUPABASE_PROJECT_ID:-zeyguilldygozufpgxms}}"

command -v supabase >/dev/null 2>&1 || {
  echo "supabase CLI is required. Install it before running this script." >&2
  exit 1
}

echo "Linking Supabase project: $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "Applying canonical repository migrations..."
supabase db push --linked

echo "Supabase initialization complete."
