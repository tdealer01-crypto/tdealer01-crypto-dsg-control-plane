#!/usr/bin/env bash
set -euo pipefail

REGISTRY_HOST="//registry.npmjs.org/"
NPMRC="${HOME}/.npmrc"

ensure_node() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "[SETUP] Installing nodejs..."
    pkg update -y
    pkg install -y nodejs
  fi
}

open_tokens_page() {
  URL="https://www.npmjs.com/settings/tokens"
  echo "[OPEN] $URL"
  am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
  echo "ถ้า browser ไม่เปิด ให้ copy URL นี้ไปเปิดเอง:"
  echo "$URL"
}

verify_package() {
  if [ ! -f package.json ]; then
    echo "[BLOCK] ไม่เจอ package.json"
    echo "ให้ cd เข้าโฟลเดอร์ package ก่อน เช่น:"
    echo "cd your-package-folder"
    exit 1
  fi

  node <<'NODE'
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));

const issues = [];
if (!p.name) issues.push("missing name");
if (!p.version) issues.push("missing version");
if (p.private === true) issues.push("private=true");

if (issues.length) {
  console.error("[BLOCK] package.json ยังไม่พร้อม:", issues.join(", "));
  process.exit(1);
}

console.log(`[OK] Package: ${p.name}@${p.version}`);
NODE
}

set_token() {
  echo
  echo "Paste NPM token ที่ขึ้นต้นด้วย npm_"
  read -r -s -p "NPM_TOKEN: " TOKEN
  echo

  case "$TOKEN" in
    npm_*) ;;
    *)
      echo "[BLOCK] token ดูไม่ใช่รูปแบบ npm_..."
      exit 1
      ;;
  esac

  touch "$NPMRC"
  chmod 600 "$NPMRC"

  sed -i.bak "\|^${REGISTRY_HOST}:_authToken=|d" "$NPMRC" 2>/dev/null || true
  printf '%s:_authToken=%s\n' "$REGISTRY_HOST" "$TOKEN" >> "$NPMRC"

  unset TOKEN

  echo "[OK] ตั้งค่า token แล้ว"
  echo "[CHECK] npm whoami:"
  npm whoami
}

publish_package() {
  verify_package

  echo
  echo "[DRY RUN] ตรวจแพ็กเกจก่อน publish จริง"
  npm publish --access public --dry-run

  echo
  read -r -p "ถ้าพร้อม publish จริง พิมพ์ YES: " CONFIRM
  if [ "$CONFIRM" != "YES" ]; then
    echo "[CANCEL] ยกเลิก publish"
    exit 0
  fi

  echo
  read -r -p "ใส่ OTP 6 หลัก ถ้ามี / ถ้าใช้ token bypass 2FA ให้กด Enter: " OTP

  if [ -n "$OTP" ]; then
    npm publish --access public --otp "$OTP"
  else
    npm publish --access public
  fi
}

remove_token() {
  npm config delete "${REGISTRY_HOST}:_authToken" 2>/dev/null || true
  sed -i.bak "\|^${REGISTRY_HOST}:_authToken=|d" "$NPMRC" 2>/dev/null || true
  echo "[OK] ลบ npm token ออกจาก Termux แล้ว"
}

main() {
  ensure_node

  echo "Node: $(node -v)"
  echo "npm:  $(npm -v)"
  echo
  echo "เลือกคำสั่ง:"
  echo "1) เปิดหน้า npm token"
  echo "2) ตั้งค่า NPM token"
  echo "3) เช็ก npm whoami"
  echo "4) publish package ปัจจุบัน"
  echo "5) ลบ token ออกจาก Termux"
  echo

  read -r -p "เลือกเลข: " CHOICE

  case "$CHOICE" in
    1) open_tokens_page ;;
    2) set_token ;;
    3) npm whoami ;;
    4) publish_package ;;
    5) remove_token ;;
    *) echo "[BLOCK] เลือกไม่ถูก"; exit 1 ;;
  esac
}

main "$@"
