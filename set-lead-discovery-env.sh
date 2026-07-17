#!/usr/bin/env bash
set -euo pipefail

# ========= CONFIG =========
export VERCEL_ORG_ID="${VERCEL_ORG_ID:-team_n189mlAdVHR6cGGiaAwsKzQ0}"
export VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW}"

# ถ้ามี token ให้ใส่ก่อนรัน:
# export VERCEL_TOKEN="your_vercel_token"
AUTH_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS+=(--token "$VERCEL_TOKEN")
fi

# ========= LEAD DISCOVERY ENV =========
# Required: Get these from your accounts
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
TWITTER_BEARER_TOKEN="${TWITTER_BEARER_TOKEN:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
CRON_SECRET="${CRON_SECRET:-}"

set_env() {
  local name="$1"
  local value="$2"

  printf '%s' "$value" | vercel env add "$name" production --force "${AUTH_ARGS[@]}"
  echo "OK: $name"
}

require_non_empty() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "ERROR: missing required value for $name" >&2
    echo "Please set: export $name='your_value'" >&2
    exit 1
  fi
}

echo "==> checking vercel cli"
if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Install with: npm i -g vercel@latest" >&2
  exit 1
fi

echo "==> validating required variables"
require_non_empty "GITHUB_TOKEN" "$GITHUB_TOKEN"

echo "==> version"
vercel --version "${AUTH_ARGS[@]}" || true

echo "==> setting production envs"

# Required: GitHub token for lead discovery
set_env "GITHUB_TOKEN" "$GITHUB_TOKEN"

# Optional: Twitter lead discovery
if [[ -n "$TWITTER_BEARER_TOKEN" ]]; then
  set_env "TWITTER_BEARER_TOKEN" "$TWITTER_BEARER_TOKEN"
fi

# Optional: Email sending via Resend
if [[ -n "$RESEND_API_KEY" ]]; then
  set_env "RESEND_API_KEY" "$RESEND_API_KEY"
fi

# Recommended: Cron job security
if [[ -n "$CRON_SECRET" ]]; then
  set_env "CRON_SECRET" "$CRON_SECRET"
else
  echo "WARNING: CRON_SECRET not set. Cron jobs will be less secure."
  echo "Generate with: openssl rand -base64 32"
fi

echo
echo "DONE: production env updated"
echo "Next step: trigger deployment or await next auto-deployment"
