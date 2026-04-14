#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_NAME="tdealer01-crypto-dsg-control-plane"
APP_URL_DEFAULT="https://tdealer01-crypto-dsg-control-plane.vercel.app"

log() { printf "\n[%s] %s\n" "$(date '+%H:%M:%S')" "$*"; }

require_cmd() {
  local c="$1"
  command -v "$c" >/dev/null 2>&1 || {
    echo "ERROR: ไม่พบคำสั่ง '$c'" >&2
    exit 1
  }
}

set_vercel_env() {
  local key="$1"
  local value="$2"

  # ลบค่าเดิมก่อนเพื่อกัน env ซ้ำ
  vercel env rm "$key" production -y >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$key" production
  echo "✓ set $key"
}

set_vercel_env_if_present() {
  local key="$1"
  local value="${2:-}"
  if [[ -n "$value" ]]; then
    set_vercel_env "$key" "$value"
  else
    echo "- ข้าม $key (ไม่ได้ระบุค่า)"
  fi
}

append_env_if_present() {
  local key="$1"
  local value="${2:-}"
  if [[ -n "$value" ]]; then
    printf '%s=%s\n' "$key" "$value" >> .env.local
  fi
}

validate_json_field_equals() {
  local file="$1"
  local jq_expr="$2"
  local expected="$3"
  jq -e "$jq_expr == \"$expected\"" "$file" >/dev/null 2>&1
}

check_endpoint_with_retry() {
  local name="$1"
  local url="$2"
  local output_file="$3"
  local max_retries="${4:-3}"
  local retry_delay="${5:-5}"
  local validate_mode="${6:-none}"

  local attempt http_code readiness
  for attempt in $(seq 1 "$max_retries"); do
    http_code="$(curl -sS -o "$output_file" -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")"

    if [[ "$validate_mode" == "health" ]]; then
      if [[ "$http_code" == "200" ]] && validate_json_field_equals "$output_file" '.ok' "true"; then
        echo "✓ $name ผ่าน (attempt $attempt/$max_retries)"
        return 0
      fi
      echo "⚠ $name ยังไม่ผ่าน (HTTP $http_code, attempt $attempt/$max_retries)"
    elif [[ "$validate_mode" == "monitor" ]]; then
      if [[ "$http_code" == "200" ]]; then
        readiness="$(jq -r '.readiness.status // "unknown"' "$output_file" 2>/dev/null || echo "unknown")"
        if [[ "$readiness" == "ready" ]]; then
          echo "✓ $name ready (attempt $attempt/$max_retries)"
          return 0
        fi
        echo "⚠ $name HTTP 200 แต่ readiness=$readiness (attempt $attempt/$max_retries)"
      elif [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
        echo "⚠ $name ต้อง auth (HTTP $http_code) ถือว่าเป็น expected ในบางกรณี"
        return 0
      else
        echo "⚠ $name HTTP $http_code (attempt $attempt/$max_retries)"
      fi
    elif [[ "$validate_mode" == "usage" ]]; then
      if [[ "$http_code" == "200" ]]; then
        echo "✓ $name ผ่าน (HTTP 200)"
        return 0
      elif [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
        echo "⚠ $name ต้อง auth (HTTP $http_code) ถือว่าเป็น expected ในบางกรณี"
        return 0
      fi
      echo "⚠ $name HTTP $http_code (attempt $attempt/$max_retries)"
    else
      if [[ "$http_code" == "200" ]]; then
        echo "✓ $name ผ่าน (HTTP 200)"
        return 0
      fi
      echo "⚠ $name HTTP $http_code (attempt $attempt/$max_retries)"
    fi

    if [[ "$attempt" -lt "$max_retries" ]]; then
      sleep "$retry_delay"
    fi
  done

  echo "✗ $name ไม่ผ่านหลัง retry ครบ $max_retries ครั้ง"
  return 1
}

log "Step 1/6: ติดตั้ง dependencies สำหรับ Termux"
pkg update -y
pkg install -y nodejs-lts git curl jq
npm install -g vercel@latest supabase@latest

require_cmd node
require_cmd npm
require_cmd vercel
require_cmd supabase
require_cmd jq

log "Step 2/6: รับค่า env สำหรับ deploy"
read -r -p "NEXT_PUBLIC_SUPABASE_URL: " NEXT_PUBLIC_SUPABASE_URL
read -r -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " NEXT_PUBLIC_SUPABASE_ANON_KEY
read -r -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -r -p "Supabase Project Ref (จาก app.supabase.com/project/<ref>): " SUPABASE_PROJECT_REF
read -r -p "APP URL (Enter เพื่อใช้ค่า default: ${APP_URL_DEFAULT}): " APP_URL
APP_URL="${APP_URL:-$APP_URL_DEFAULT}"
read -r -p "DSG_DEFAULT_POLICY_ID (default: policy_default): " DSG_DEFAULT_POLICY_ID
DSG_DEFAULT_POLICY_ID="${DSG_DEFAULT_POLICY_ID:-policy_default}"
read -r -p "OVERAGE_RATE_USD (default: 0.001): " OVERAGE_RATE_USD
OVERAGE_RATE_USD="${OVERAGE_RATE_USD:-0.001}"
read -r -p "ACCESS_MODE (default: strict): " ACCESS_MODE
ACCESS_MODE="${ACCESS_MODE:-strict}"
read -r -p "ACCESS_POLICY (default: strict): " ACCESS_POLICY
ACCESS_POLICY="${ACCESS_POLICY:-strict}"
read -r -p "ENABLE_DEMO_BOOTSTRAP (default: false): " ENABLE_DEMO_BOOTSTRAP
ENABLE_DEMO_BOOTSTRAP="${ENABLE_DEMO_BOOTSTRAP:-false}"

echo
echo "Billing env (ถ้ายังไม่พร้อม กด Enter เพื่อข้ามได้):"
read -r -p "STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
read -r -p "STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET
read -r -p "STRIPE_PRICE_PRO_MONTHLY: " STRIPE_PRICE_PRO_MONTHLY
read -r -p "STRIPE_PRICE_BUSINESS_MONTHLY: " STRIPE_PRICE_BUSINESS_MONTHLY
read -r -p "STRIPE_PRICE_ENTERPRISE_MONTHLY: " STRIPE_PRICE_ENTERPRISE_MONTHLY

cat > .env.local <<ENVEOF
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
NEXT_PUBLIC_APP_URL=${APP_URL}
APP_URL=${APP_URL}
DSG_CORE_MODE=internal
DSG_DEFAULT_POLICY_ID=${DSG_DEFAULT_POLICY_ID}
OVERAGE_RATE_USD=${OVERAGE_RATE_USD}
ACCESS_MODE=${ACCESS_MODE}
ACCESS_POLICY=${ACCESS_POLICY}
ENABLE_DEMO_BOOTSTRAP=${ENABLE_DEMO_BOOTSTRAP}
ENVEOF

append_env_if_present "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"
append_env_if_present "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET:-}"
append_env_if_present "STRIPE_PRICE_PRO_MONTHLY" "${STRIPE_PRICE_PRO_MONTHLY:-}"
append_env_if_present "STRIPE_PRICE_BUSINESS_MONTHLY" "${STRIPE_PRICE_BUSINESS_MONTHLY:-}"
append_env_if_present "STRIPE_PRICE_ENTERPRISE_MONTHLY" "${STRIPE_PRICE_ENTERPRISE_MONTHLY:-}"

echo "✓ สร้าง .env.local แล้ว"

log "Login Vercel CLI"
vercel login

log "ตั้งค่า env ใน Vercel (production)"
set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
set_vercel_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_vercel_env "NEXT_PUBLIC_APP_URL" "$APP_URL"
set_vercel_env "APP_URL" "$APP_URL"
set_vercel_env "DSG_CORE_MODE" "internal"
set_vercel_env "DSG_DEFAULT_POLICY_ID" "$DSG_DEFAULT_POLICY_ID"
set_vercel_env "OVERAGE_RATE_USD" "$OVERAGE_RATE_USD"
set_vercel_env "ACCESS_MODE" "$ACCESS_MODE"
set_vercel_env "ACCESS_POLICY" "$ACCESS_POLICY"
set_vercel_env "ENABLE_DEMO_BOOTSTRAP" "$ENABLE_DEMO_BOOTSTRAP"
set_vercel_env_if_present "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"
set_vercel_env_if_present "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET:-}"
set_vercel_env_if_present "STRIPE_PRICE_PRO_MONTHLY" "${STRIPE_PRICE_PRO_MONTHLY:-}"
set_vercel_env_if_present "STRIPE_PRICE_BUSINESS_MONTHLY" "${STRIPE_PRICE_BUSINESS_MONTHLY:-}"
set_vercel_env_if_present "STRIPE_PRICE_ENTERPRISE_MONTHLY" "${STRIPE_PRICE_ENTERPRISE_MONTHLY:-}"

log "Step 3/6: Supabase link + migration push"
supabase login
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push

if [[ -z "${SUPABASE_DB_URL:-}" && "${CI:-}" != "true" ]]; then
  read -r -p "SUPABASE_DB_URL สำหรับ reload PostgREST cache (ถ้ายังไม่มีให้กด Enter ข้าม): " SUPABASE_DB_URL
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  log "Step 4/6: Apply runtime RPC hardening + reload PostgREST schema cache"
  SUPABASE_DB_URL="${SUPABASE_DB_URL}" ./scripts/apply-runtime-rpc-fix.sh
else
  log "Step 4/6: ข้าม runtime RPC fix (ไม่ได้ใส่ SUPABASE_DB_URL)"
  echo "  สามารถรันทีหลังได้ด้วย:"
  echo "  SUPABASE_DB_URL='postgres://...' ./scripts/apply-runtime-rpc-fix.sh"
fi

cat <<'NOTE'

[ต้องทำเองใน Supabase Dashboard]
1) Authentication → Providers → Email → Enable
2) Authentication → URL Configuration
   - Site URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
   - Redirect URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm
NOTE

log "Step 5/6: Deploy production บน Vercel"
vercel --prod

log "Step 6/6: Health checks (/api/health, /api/core/monitor, /api/usage)"
check_endpoint_with_retry "api/health" "${APP_URL}/api/health" "/tmp/health.json" 3 10 "health"
check_endpoint_with_retry "api/core/monitor" "${APP_URL}/api/core/monitor" "/tmp/monitor.json" 3 10 "monitor"
check_endpoint_with_retry "api/usage" "${APP_URL}/api/usage" "/tmp/usage.json" 3 10 "usage"

printf "\n/api/health body =>\n"
sed 's/^/  /' /tmp/health.json || true
printf "\n\n/api/core/monitor body =>\n"
sed 's/^/  /' /tmp/monitor.json || true
printf "\n\n/api/usage body =>\n"
sed 's/^/  /' /tmp/usage.json || true
printf "\n"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "${APP_URL}/login"
  echo "✓ เปิดหน้า login แล้ว"
else
  echo "เปิดเองได้ที่: ${APP_URL}/login"
fi

log "เสร็จสิ้นทั้งหมด"
