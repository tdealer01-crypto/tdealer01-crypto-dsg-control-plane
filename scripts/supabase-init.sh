#!/usr/bin/env bash
# Link the canonical DSG Supabase project and apply repository migrations.
# Hosted Supabase uses a temporary CLI login role; no database password is required.

set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-${SUPABASE_PROJECT_ID:-zeyguilldygozufpgxms}}"

command -v supabase >/dev/null 2>&1 || {
  echo "supabase CLI 2.116.0 or newer is required. Install it before running this script." >&2
  exit 1
}

echo "Linking Supabase project: $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF" --yes

echo "Applying canonical repository migrations..."
supabase db push --linked --yes

echo "Supabase initialization complete."
