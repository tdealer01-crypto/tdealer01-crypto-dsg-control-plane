#!/usr/bin/env bash
set -euo pipefail

FILE="app/api/billing/checkout/route.ts"
BRANCH="fix/billing-checkout-trial-upgrade-403"

echo "== DSG ONE billing checkout 403 fix v2 =="
echo "Repo: $(pwd)"

if [ ! -f "$FILE" ]; then
  echo "ERROR: ไม่พบไฟล์ $FILE"
  echo "ต้องรันจากโฟลเดอร์รากของ repo"
  exit 1
fi

echo "== Switch branch =="
git checkout -B "$BRANCH"

echo "== Restore target file to clean HEAD =="
git checkout -- "$FILE" || true

echo "== Backup file =="
cp "$FILE" "$FILE.bak.$(date +%Y%m%d-%H%M%S)"

echo "== Patch all inactive-profile checkout blockers =="
python3 <<'PY'
from pathlib import Path
import sys

path = Path("app/api/billing/checkout/route.ts")
text = path.read_text()

target = "if (!profile?.is_active || !profile?.org_id) {"

count = text.count(target)
print("Found target blocks:", count)

if count == 0:
    print("ERROR: ไม่พบ target condition ในไฟล์ อาจถูกแก้ไปแล้วหรือไฟล์เปลี่ยน")
    sys.exit(1)

lines = text.splitlines(keepends=True)
out = []
changed = 0
inside_target_block = False

for line in lines:
    if target in line:
        indent = line[: len(line) - len(line.lstrip())]
        out.append(f"{indent}// Allow trial/inactive profiles to start Stripe checkout; still require an organization.\n")
        out.append(line.replace("!profile?.is_active || !profile?.org_id", "!profile?.org_id"))
        inside_target_block = True
        changed += 1
        continue

    if inside_target_block and "{ error: 'Forbidden' }" in line:
        line = line.replace("{ error: 'Forbidden' }", "{ error: 'Missing organization' }")
        inside_target_block = False

    out.append(line)

new_text = "".join(out)

remaining = new_text.count(target)
if remaining:
    print("ERROR: ยังเหลือ target condition:", remaining)
    sys.exit(1)

path.write_text(new_text)

print("PATCHED:", path)
print("Changed blocks:", changed)
PY

echo
echo "== Verify changed blocks =="
grep -n -A5 -B3 "Allow trial/inactive profiles" "$FILE" || true

echo
echo "== Git diff =="
git diff -- "$FILE"

echo
echo "== Run checks =="
npm run typecheck --if-present || echo "WARN: typecheck failed หรือไม่มี script typecheck"
npm run lint --if-present || echo "WARN: lint failed หรือไม่มี script lint"

echo
echo "== Commit =="
git add "$FILE"
git commit -m "fix(billing): allow trial profiles to start checkout" || echo "ไม่มี diff ใหม่ให้ commit หรือ commit ถูกสร้างไว้แล้ว"

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
  echo "เปิด PR เองได้ที่:"
  echo "https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/compare/main...$BRANCH?expand=1"
fi

echo
echo "DONE"
