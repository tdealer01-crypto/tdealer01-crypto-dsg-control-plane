#!/usr/bin/env bash
set -euo pipefail

FILE="app/api/billing/checkout/route.ts"
BRANCH="fix/billing-checkout-trial-upgrade-403"

echo "== DSG ONE billing checkout 403 fix =="
echo "Repo: $(pwd)"

if [ ! -f "$FILE" ]; then
  echo "ERROR: ไม่พบไฟล์ $FILE"
  echo "ต้องรันจากโฟลเดอร์รากของ repo ที่มี app/api/billing/checkout/route.ts"
  exit 1
fi

echo "== Create/switch branch =="
git checkout -B "$BRANCH"

echo "== Backup file =="
cp "$FILE" "$FILE.bak.$(date +%Y%m%d-%H%M%S)"

echo "== Patch file with Python =="
python3 <<'PY'
from pathlib import Path
import sys

path = Path("app/api/billing/checkout/route.ts")
text = path.read_text()

target = "if (!profile?.is_active || !profile?.org_id) {"

if target not in text:
    print("ERROR: ไม่พบ block ที่ต้องแก้:", target)
    print("ตรวจว่าไฟล์เปลี่ยนไปแล้วหรือยัง")
    sys.exit(1)

lines = text.splitlines(keepends=True)
out = []
changed = False
inside_target_block = False

for line in lines:
    if target in line and not changed:
        indent = line[: len(line) - len(line.lstrip())]
        out.append(f"{indent}// Allow trial/inactive profiles to start Stripe checkout; still require an organization.\n")
        out.append(line.replace("!profile?.is_active || !profile?.org_id", "!profile?.org_id"))
        inside_target_block = True
        changed = True
        continue

    if inside_target_block and "{ error: 'Forbidden' }" in line:
        line = line.replace("{ error: 'Forbidden' }", "{ error: 'Missing organization' }")
        inside_target_block = False

    out.append(line)

new_text = "".join(out)

if target in new_text:
    print("ERROR: target condition ยังเหลืออยู่ แพตช์ไม่สมบูรณ์")
    sys.exit(1)

if "Allow trial/inactive profiles to start Stripe checkout" not in new_text:
    print("ERROR: ไม่พบ comment ยืนยันการแก้ไข")
    sys.exit(1)

path.write_text(new_text)
print("PATCHED:", path)
PY

echo
echo "== Verify changed block =="
grep -n -A8 -B4 "Allow trial/inactive profiles" "$FILE" || true

echo
echo "== Git diff =="
git diff -- "$FILE"

echo
echo "== Run checks =="
npm run typecheck --if-present || {
  echo "WARN: typecheck failed หรือไม่มี script typecheck"
}

npm run lint --if-present || {
  echo "WARN: lint failed หรือไม่มี script lint"
}

echo
echo "== Commit =="
git add "$FILE"
git commit -m "fix(billing): allow trial profiles to start checkout" || {
  echo "ไม่มี diff ใหม่ให้ commit หรือ commit ถูกสร้างไว้แล้ว"
}

echo
echo "== Push branch =="
git push -u origin "$BRANCH"

echo
echo "== Create PR =="
if command -v gh >/dev/null 2>&1; then
  gh pr create \
    --title "fix(billing): allow trial profiles to start checkout" \
    --body "Fixes dashboard Billing upgrade returning 403 for trial/inactive user profiles that already have an org_id. The checkout route now only blocks profiles without org_id, so trial users can enter Stripe Checkout while org isolation remains enforced." \
    --base main \
    --head "$BRANCH"
else
  echo "gh CLI ไม่พบในเครื่อง"
  echo "เปิด PR ได้ที่:"
  echo "https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/compare/main...$BRANCH?expand=1"
fi

echo
echo "DONE"
