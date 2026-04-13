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

log "Step 0/5: ติดตั้ง dependencies สำหรับ Termux"
pkg update -y
pkg install -y nodejs-lts git curl
npm install -g vercel@latest supabase@latest

require_cmd node
require_cmd npm
require_cmd vercel
require_cmd supabase

log "Step 1/5: รับค่า Supabase credentials"
read -r -p "NEXT_PUBLIC_SUPABASE_URL: " NEXT_PUBLIC_SUPABASE_URL
read -r -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " NEXT_PUBLIC_SUPABASE_ANON_KEY
read -r -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -r -p "Supabase Project Ref (จาก app.supabase.com/project/<ref>): " SUPABASE_PROJECT_REF
read -r -p "APP URL (Enter เพื่อใช้ค่า default: ${APP_URL_DEFAULT}): " APP_URL
APP_URL="${APP_URL:-$APP_URL_DEFAULT}"

cat > .env.local <<ENVEOF
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
NEXT_PUBLIC_APP_URL=${APP_URL}
APP_URL=${APP_URL}
DSG_CORE_MODE=internal
ENVEOF

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

log "Step 2/6: Supabase link + migration push"
supabase login
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push

if [[ -z "${SUPABASE_DB_URL:-}" && "${CI:-}" != "true" ]]; then
  read -r -p "SUPABASE_DB_URL สำหรับ reload PostgREST cache (ถ้ายังไม่มีให้กด Enter ข้าม): " SUPABASE_DB_URL
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  log "Step 3/6: Apply runtime RPC hardening + reload PostgREST schema cache"
  SUPABASE_DB_URL="${SUPABASE_DB_URL}" ./scripts/apply-runtime-rpc-fix.sh
else
  log "Step 3/6: ข้าม runtime RPC fix (ไม่ได้ใส่ SUPABASE_DB_URL)"
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

log "Step 4/6: Deploy production บน Vercel"
vercel --prod

log "Step 5/6: Health checks"
printf "\n/api/health =>\n"
curl -sS "${APP_URL}/api/health" | sed 's/^/  /'
printf "\n\n/api/core/monitor =>\n"
curl -sS "${APP_URL}/api/core/monitor" | sed 's/^/  /'
printf "\n"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "${APP_URL}/login"
  echo "✓ เปิดหน้า login แล้ว"
else
  echo "เปิดเองได้ที่: ${APP_URL}/login"
fi

log "เสร็จสิ้นทั้งหมด"
