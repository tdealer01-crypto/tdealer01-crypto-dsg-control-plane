#!/usr/bin/env bash
# scripts/auto-setup-env.sh
# ตั้ง env vars สำคัญสำหรับ DSG auto-setup บน Vercel
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

set_env() {
  local key="$1"
  local value="$2"

  printf '%s' "$value" | vercel env add "$key" production --force "${AUTH_ARGS[@]}"
  echo "✓ $key"
}

echo "==> configuring DSG core/runtime envs"
set_env "DSG_CORE_MODE" "internal"
set_env "DSG_DEFAULT_POLICY_ID" "policy_default"
set_env "OVERAGE_RATE_USD" "0.001"
set_env "ACCESS_MODE" "strict"
set_env "ACCESS_POLICY" "strict"
set_env "ENABLE_DEMO_BOOTSTRAP" "false"

echo
cat <<'NOTE'
DONE
ตรวจสอบว่า env ที่ยังต้องมีด้วย:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - STRIPE_SECRET_KEY (ถ้าใช้ billing)
  - STRIPE_WEBHOOK_SECRET (ถ้าใช้ billing)
NOTE
