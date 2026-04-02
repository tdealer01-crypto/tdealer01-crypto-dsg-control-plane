#!/usr/bin/env bash
set -euo pipefail

export VERCEL_ORG_ID="team_n189mlAdVHR6cGGiaAwsKzQ0"
export VERCEL_PROJECT_ID="prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW"

AUTH_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS+=(--token "$VERCEL_TOKEN")
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

TMP_ENV_FILE=".env.tmp"
cleanup() {
  rm -f "$TMP_ENV_FILE"
}
trap cleanup EXIT

set_env() {
  local key="$1"
  local value="$2"
  printf '%s' "$value" | vercel env add "$key" production --force "${AUTH_ARGS[@]}"
  echo "✓ $key"
}

rm_env() {
  local key="$1"
  if vercel env rm "$key" production -y "${AUTH_ARGS[@]}" >/dev/null 2>&1; then
    echo "✗ removed $key"
  else
    echo "- skip $key"
  fi
}

# Parse .env style values safely (supports optional `export`, quotes and `=` in value)
get_val() {
  local key="$1"
  awk -v k="$key" '
    $0 ~ "^[[:space:]]*(export[[:space:]]+)?" k "=" {
      line=$0
      sub(/^[[:space:]]*(export[[:space:]]+)?[^=]+= */, "", line)
      if ((line ~ /^".*"$/) || (line ~ /^\047.*\047$/)) {
        line = substr(line, 2, length(line)-2)
      }
      print line
      exit
    }
  ' "$TMP_ENV_FILE"
}

echo "==> pulling current env values..."
vercel env pull "$TMP_ENV_FILE" --environment production "${AUTH_ARGS[@]}"

ANON_KEY="$(get_val "dsgone_SUPABASE_ANON_KEY")"
SERVICE_KEY="$(get_val "dsgone_SUPABASE_SECRET_KEY")"
PUBLISHABLE_KEY="$(get_val "NEXT_PUBLIC_dsgone_SUPABASE_PUBLISHABLE_KEY")"
AUTONOMA_CLIENT="$(get_val "AUTONOMA_CLIENT_ID")"
AUTONOMA_SECRET="$(get_val "AUTONOMA_SECRET_ID")"

echo "==> setting corrected env var names..."
[ -n "$ANON_KEY" ] && set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY"
[ -n "$SERVICE_KEY" ] && set_env "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_KEY"
[ -n "$PUBLISHABLE_KEY" ] && set_env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$PUBLISHABLE_KEY"
[ -n "$AUTONOMA_CLIENT" ] && set_env "WORKOS_CLIENT_ID" "$AUTONOMA_CLIENT"
[ -n "$AUTONOMA_SECRET" ] && set_env "WORKOS_API_KEY" "$AUTONOMA_SECRET"

echo "==> setting defaults..."
set_env "NEXT_PUBLIC_APP_URL" "https://tdealer01-crypto-dsg-control-plane.vercel.app"
set_env "APP_URL" "https://tdealer01-crypto-dsg-control-plane.vercel.app"
set_env "DSG_DEFAULT_POLICY_ID" "policy_default"
set_env "OVERAGE_RATE_USD" "0.001"
set_env "ACCESS_MODE" "strict"
set_env "ACCESS_POLICY" "strict"
set_env "ENABLE_DEMO_BOOTSTRAP" "false"

echo "==> removing wrong/legacy vars..."
rm_env "dsgone_SUPABASE_ANON_KEY"
rm_env "dsgone_SUPABASE_SECRET_KEY"
rm_env "NEXT_PUBLIC_dsgone_SUPABASE_PUBLISHABLE_KEY"
rm_env "dsgone_POSTGRES_URL_NON_POOLING"
rm_env "dsgone_SUPABASE_PUBLISHABLE_KEY"
rm_env "AUTONOMA_SECRET_ID"
rm_env "AUTONOMA_CLIENT_ID"
rm_env "STRIPE_PRICE_ID"

echo
echo "==> current production env vars:"
vercel env ls production "${AUTH_ARGS[@]}"

echo
echo "DONE! Remaining vars to set manually (if still missing):"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - DSG_CORE_URL"
echo "  - DSG_CORE_API_KEY"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - RESEND_API_KEY (optional)"
