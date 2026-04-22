#!/usr/bin/env bash
set -euo pipefail

export VERCEL_ORG_ID="${VERCEL_ORG_ID:-team_n189mlAdVHR6cGGiaAwsKzQ0}"
export VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW}"
APP_URL_DEFAULT="${APP_URL_DEFAULT:-https://tdealer01-crypto-dsg-control-plane.vercel.app}"

AUTH_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS+=(--token "$VERCEL_TOKEN")
fi

VERCEL_CMD=()
if command -v vercel >/dev/null 2>&1; then
  VERCEL_CMD=(vercel)
elif command -v npx >/dev/null 2>&1; then
  VERCEL_CMD=(npx --yes vercel)
else
  echo "Vercel CLI not found and npx is unavailable."
  exit 1
fi

run_vercel() {
  "${VERCEL_CMD[@]}" "$@"
}

TMP_ENV_FILE=".env.tmp"
cleanup() {
  rm -f "$TMP_ENV_FILE"
}
trap cleanup EXIT

set_env() {
  local key="$1"
  local value="$2"
  printf '%s' "$value" | run_vercel env add "$key" production --force "${AUTH_ARGS[@]}"
  echo "✓ $key"
}

set_env_if_present() {
  local key="$1"
  local value="${2:-}"
  if [ -n "$value" ]; then
    set_env "$key" "$value"
  else
    echo "- skip $key"
  fi
}

rm_env() {
  local key="$1"
  if run_vercel env rm "$key" production -y "${AUTH_ARGS[@]}" >/dev/null 2>&1; then
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
run_vercel env pull "$TMP_ENV_FILE" --environment production "${AUTH_ARGS[@]}"

ANON_KEY="$(get_val "dsgone_SUPABASE_ANON_KEY")"
SERVICE_KEY="$(get_val "dsgone_SUPABASE_SECRET_KEY")"
SUPABASE_URL_VALUE_FROM_PULL="$(get_val "NEXT_PUBLIC_SUPABASE_URL")"
if [ -z "$SUPABASE_URL_VALUE_FROM_PULL" ]; then
  SUPABASE_URL_VALUE_FROM_PULL="$(get_val "SUPABASE_URL")"
fi
if [ -z "$SUPABASE_URL_VALUE_FROM_PULL" ]; then
  SUPABASE_URL_VALUE_FROM_PULL="$(get_val "dsgone_SUPABASE_URL")"
fi
PUBLISHABLE_KEY="$(get_val "NEXT_PUBLIC_dsgone_SUPABASE_PUBLISHABLE_KEY")"
AUTONOMA_CLIENT="$(get_val "AUTONOMA_CLIENT_ID")"
AUTONOMA_SECRET="$(get_val "AUTONOMA_SECRET_ID")"
CURRENT_APP_URL="$(get_val "APP_URL")"
CURRENT_NEXT_PUBLIC_APP_URL="$(get_val "NEXT_PUBLIC_APP_URL")"
CURRENT_ALLOWED_ORIGINS="$(get_val "DSG_ALLOWED_ORIGINS")"
CURRENT_INTERNAL_SERVICE_TOKEN="$(get_val "INTERNAL_SERVICE_TOKEN")"
CURRENT_UPSTASH_URL="$(get_val "UPSTASH_REDIS_REST_URL")"
CURRENT_UPSTASH_TOKEN="$(get_val "UPSTASH_REDIS_REST_TOKEN")"

APP_URL_VALUE="${APP_URL:-${CURRENT_APP_URL:-${CURRENT_NEXT_PUBLIC_APP_URL:-$APP_URL_DEFAULT}}}"
ALLOWED_ORIGINS_VALUE="${DSG_ALLOWED_ORIGINS:-${CURRENT_ALLOWED_ORIGINS:-$APP_URL_VALUE}}"
INTERNAL_SERVICE_TOKEN_VALUE="${INTERNAL_SERVICE_TOKEN:-${CURRENT_INTERNAL_SERVICE_TOKEN:-}}"
UPSTASH_URL_VALUE="${UPSTASH_REDIS_REST_URL:-${CURRENT_UPSTASH_URL:-}}"
UPSTASH_TOKEN_VALUE="${UPSTASH_REDIS_REST_TOKEN:-${CURRENT_UPSTASH_TOKEN:-}}"
SUPABASE_URL_VALUE="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL_VALUE_FROM_PULL:-}}"
SUPABASE_SERVICE_ROLE_VALUE="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_KEY:-}}"

echo "==> setting corrected env var names..."
[ -n "$ANON_KEY" ] && set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY"
[ -n "$SUPABASE_SERVICE_ROLE_VALUE" ] && set_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_VALUE"
[ -n "$SUPABASE_URL_VALUE" ] && set_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL_VALUE"
[ -n "$PUBLISHABLE_KEY" ] && set_env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$PUBLISHABLE_KEY"
[ -n "$AUTONOMA_CLIENT" ] && set_env "WORKOS_CLIENT_ID" "$AUTONOMA_CLIENT"
[ -n "$AUTONOMA_SECRET" ] && set_env "WORKOS_API_KEY" "$AUTONOMA_SECRET"

echo "==> setting defaults and runtime-aligned vars..."
set_env "NEXT_PUBLIC_APP_URL" "$APP_URL_VALUE"
set_env "APP_URL" "$APP_URL_VALUE"
set_env "DSG_ALLOWED_ORIGINS" "$ALLOWED_ORIGINS_VALUE"
set_env "DSG_DEFAULT_POLICY_ID" "${DSG_DEFAULT_POLICY_ID:-policy_default}"
set_env "OVERAGE_RATE_USD" "${OVERAGE_RATE_USD:-0.001}"
set_env "ACCESS_MODE" "${ACCESS_MODE:-strict}"
set_env "ACCESS_POLICY" "${ACCESS_POLICY:-strict}"
set_env "ENABLE_DEMO_BOOTSTRAP" "${ENABLE_DEMO_BOOTSTRAP:-false}"
set_env_if_present "INTERNAL_SERVICE_TOKEN" "$INTERNAL_SERVICE_TOKEN_VALUE"
set_env_if_present "UPSTASH_REDIS_REST_URL" "$UPSTASH_URL_VALUE"
set_env_if_present "UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_TOKEN_VALUE"

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
run_vercel env ls production "${AUTH_ARGS[@]}"

echo
echo "DONE! Remaining vars to set manually (if still missing):"
if [ -z "$SUPABASE_URL_VALUE" ]; then
  echo "  - NEXT_PUBLIC_SUPABASE_URL"
fi
if [ -z "$SUPABASE_SERVICE_ROLE_VALUE" ]; then
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
fi
echo "  - DSG_CORE_URL (only when DSG_CORE_MODE=remote)"
echo "  - DSG_CORE_API_KEY (only when DSG_CORE_MODE=remote)"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - INTERNAL_SERVICE_TOKEN"
echo "  - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (recommended for serverless rate limiting)"
echo "  - RESEND_API_KEY (optional)"
