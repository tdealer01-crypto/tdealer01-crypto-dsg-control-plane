#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# ========= CONFIG =========
export VERCEL_ORG_ID="team_n189mlAdVHR6cGGiaAwsKzQ0"
export VERCEL_PROJECT_ID="prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW"

# ถ้ามี token ให้ใส่ก่อนรัน:
# export VERCEL_TOKEN="your_vercel_token"
AUTH_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS+=(--token "$VERCEL_TOKEN")
fi

# ========= STRIPE PROD ENV =========
STRIPE_PRODUCT_ID="prod_UBEqTBITqc9uG9"

STRIPE_PRICE_PRO_MONTHLY="price_1TCsZBKCAFwxVQo9hhfjuC9j"
STRIPE_PRICE_PRO_YEARLY="price_1TE50jKCAFwxVQo9QhmIQVqP"

STRIPE_PRICE_BUSINESS_MONTHLY="price_1TCsZXKCAFwxVQo9sbBSzPWQ"
STRIPE_PRICE_BUSINESS_YEARLY="price_1TE51LKCAFwxVQo9vrWiywkR"

STRIPE_PRICE_ENTERPRISE_MONTHLY="price_1TE51tKCAFwxVQo9Lfdlj5ok"
STRIPE_PRICE_ENTERPRISE_YEARLY="price_1TE528KCAFwxVQo9pcDbQ5Hx"

# alias เผื่อโค้ดเก่ายังใช้ชื่อเดิม
STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO_MONTHLY"
STRIPE_PRICE_BUSINESS="$STRIPE_PRICE_BUSINESS_MONTHLY"

# optional: ถ้าจะตั้งด้วยก็ปลด # ออก
# NEXT_PUBLIC_APP_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"

set_env() {
  local name="$1"
  local value="$2"

  printf '%s' "$value" | vercel env add "$name" production --force "${AUTH_ARGS[@]}"
  echo "OK: $name"
}

echo "==> checking vercel cli"
if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Installing..."
  pkg install -y nodejs
  npm install -g vercel@latest
fi

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

# ถ้าจะใช้ด้วย ค่อยเปิดบรรทัดนี้
# set_env "NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_APP_URL"

echo
echo "DONE: production env updated"
echo "Next step: redeploy production"
