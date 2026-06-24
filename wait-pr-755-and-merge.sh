#!/usr/bin/env bash
set -euo pipefail

REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
PR="755"

echo "== PR #755 latest state =="
gh pr view "$PR" --repo "$REPO" \
  --json number,title,state,url,mergeStateStatus,headRefName,headRefOid,isDraft \
  --jq '.'

echo
echo "== Wait for checks to appear =="
for i in 1 2 3 4 5 6; do
  echo "Attempt $i/6..."
  gh pr checks "$PR" --repo "$REPO" && break || true
  sleep 30
done

echo
echo "== Final checks =="
if gh pr checks "$PR" --repo "$REPO" --watch; then
  echo
  echo "== Checks passed or no blocking failure detected =="
else
  echo
  echo "Checks are still failing/pending/unavailable."
  echo "Open PR:"
  echo "https://github.com/$REPO/pull/$PR"
  echo
  echo "Latest runs:"
  gh run list --repo "$REPO" --branch "fix/billing-checkout-trial-upgrade-403" --limit 10
  exit 1
fi

echo
echo "== Merge PR #755 =="
gh pr merge "$PR" \
  --repo "$REPO" \
  --squash \
  --delete-branch

echo
echo "DONE: PR #755 merged."
echo "รอ Vercel deploy แล้วทดสอบ:"
echo "https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/billing"
