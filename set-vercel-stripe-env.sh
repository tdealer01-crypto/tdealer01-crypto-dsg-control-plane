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

# ========= STRIPE PROD ENV =========
# Live price IDs for Stripe account acct_1Tnbl5CVpjxFKlKT (dsg-one, Inc.), created 2026-07-02.
# Previous defaults pointed at prices from a different Stripe account and would fail
# checkout with "No such price" under the current STRIPE_SECRET_KEY.
STRIPE_PRODUCT_ID="${STRIPE_PRODUCT_ID:-prod_UoShjFSjPBdVRM}"

STRIPE_PRICE_PRO_MONTHLY="${STRIPE_PRICE_PRO_MONTHLY:-price_1TopmZCVpjxFKlKT18ljNI84}"
STRIPE_PRICE_PRO_YEARLY="${STRIPE_PRICE_PRO_YEARLY:-price_1TopmiCVpjxFKlKT0EVZwCps}"

STRIPE_PRICE_BUSINESS_MONTHLY="${STRIPE_PRICE_BUSINESS_MONTHLY:-price_1TopmsCVpjxFKlKTdpm128OG}"
STRIPE_PRICE_BUSINESS_YEARLY="${STRIPE_PRICE_BUSINESS_YEARLY:-price_1Topn0CVpjxFKlKTvxKJUsff}"

STRIPE_PRICE_ENTERPRISE_MONTHLY="${STRIPE_PRICE_ENTERPRISE_MONTHLY:-price_1TopnACVpjxFKlKT36Pe7Zmu}"
STRIPE_PRICE_ENTERPRISE_YEARLY="${STRIPE_PRICE_ENTERPRISE_YEARLY:-price_1TopnICVpjxFKlKTqHhjKzhR}"

# alias เผื่อโค้ดเก่ายังใช้ชื่อเดิม
STRIPE_PRICE_PRO="${STRIPE_PRICE_PRO:-$STRIPE_PRICE_PRO_MONTHLY}"
STRIPE_PRICE_BUSINESS="${STRIPE_PRICE_BUSINESS:-$STRIPE_PRICE_BUSINESS_MONTHLY}"

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
    exit 1
  fi
}

echo "==> checking vercel cli"
if ! command -v vercel >/dev/null 2>&1; then
  if command -v pkg >/dev/null 2>&1; then
    echo "Vercel CLI not found. Installing via Termux pkg..."
    pkg install -y nodejs
    npm install -g vercel@latest
  else
    echo "Vercel CLI not found. Install with: npm i -g vercel@latest" >&2
    exit 1
  fi
fi

require_non_empty "STRIPE_PRODUCT_ID" "$STRIPE_PRODUCT_ID"
require_non_empty "STRIPE_PRICE_PRO_MONTHLY" "$STRIPE_PRICE_PRO_MONTHLY"
require_non_empty "STRIPE_PRICE_PRO_YEARLY" "$STRIPE_PRICE_PRO_YEARLY"
require_non_empty "STRIPE_PRICE_BUSINESS_MONTHLY" "$STRIPE_PRICE_BUSINESS_MONTHLY"
require_non_empty "STRIPE_PRICE_BUSINESS_YEARLY" "$STRIPE_PRICE_BUSINESS_YEARLY"
require_non_empty "STRIPE_PRICE_ENTERPRISE_MONTHLY" "$STRIPE_PRICE_ENTERPRISE_MONTHLY"
require_non_empty "STRIPE_PRICE_ENTERPRISE_YEARLY" "$STRIPE_PRICE_ENTERPRISE_YEARLY"

echo "==> version"
vercel --version "${AUTH_ARGS[@]}" || true

echo "==> setting production envs"
set_env "STRIPE_PRODUCT_ID" "$STRIPE_PRODUCT_ID"

set_env "STRIPE_PRICE_PRO_MONTHLY" "$STRIPE_PRICE_PRO_MONTHLY"
set_env "STRIPE_PRICE_PRO_YEARLY" "$STRIPE_PRICE_PRO_YEARLY"

set_env "STRIPE_PRICE_BUSINESS_MONTHLY" "$STRIPE_PRICE_BUSINESS_MONTHLY"
set_env "STRIPE_PRICE_BUSINESS_YEARLY" "$STRIPE_PRICE_BUSINESS_YEARLY"

set_env "STRIPE_PRICE_ENTERPRISE_MONTHLY" "$STRIPE_PRICE_ENTERPRISE_MONTHLY"
set_env "STRIPE_PRICE_ENTERPRISE_YEARLY" "$STRIPE_PRICE_ENTERPRISE_YEARLY"

set_env "STRIPE_PRICE_PRO" "$STRIPE_PRICE_PRO"
set_env "STRIPE_PRICE_BUSINESS" "$STRIPE_PRICE_BUSINESS"

echo
echo "DONE: production env updated"
echo "Next step: redeploy production"
