#!/usr/bin/env bash
set -euo pipefail

if [ ! -f package.json ]; then
  echo "[BLOCK] ไม่เจอ package.json"
  echo "ตอนนี้ต้อง cd เข้าโฟลเดอร์ package ก่อน"
  echo "เช่น: cd packages/dsg-one-sdk"
  exit 1
fi

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"
TOKEN_NAME="termux-${PKG_NAME//@/}-${PKG_VERSION}-$(date +%Y%m%d-%H%M)"
TOKEN_NAME="${TOKEN_NAME//\//-}"

echo "[INFO] package: ${PKG_NAME}@${PKG_VERSION}"
echo "[INFO] token name: ${TOKEN_NAME}"
echo

case "$PKG_NAME" in
  @*/*)
    SCOPE="${PKG_NAME%%/*}"
    SCOPE="${SCOPE#@}"

    echo "[CREATE] สร้าง token แบบผูกกับ scope: @${SCOPE}"
    npm token create \
      --name "$TOKEN_NAME" \
      --packages-and-scopes-permission=read-write \
      --scopes "$SCOPE" \
      --bypass-2fa \
      --expires=30
    ;;

  *)
    echo "[CREATE] package เป็น unscoped: ${PKG_NAME}"
    echo "[NOTE] ถ้า package ยังไม่เคย publish มาก่อน npm อาจไม่ยอมสร้าง token ด้วย --packages"
    echo "[NOTE] ถ้าติด error ให้ใช้ npm login + publish ด้วย OTP ด้านล่าง"
    npm token create \
      --name "$TOKEN_NAME" \
      --packages-and-scopes-permission=read-write \
      --packages "$PKG_NAME" \
      --bypass-2fa \
      --expires=30
    ;;
esac

echo
echo "[DONE] ถ้า npm แสดง token ที่ขึ้นต้น npm_ ให้ copy ทันที"
echo "ห้ามส่ง token มาในแชต / ห้าม commit ลง GitHub"
