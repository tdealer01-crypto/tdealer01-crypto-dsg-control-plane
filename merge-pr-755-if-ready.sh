#!/usr/bin/env bash
set -euo pipefail

REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
PR="755"

echo "== PR status =="
gh pr view "$PR" --repo "$REPO" \
  --json number,title,state,url,mergeStateStatus,reviewDecision,isDraft \
  --jq '.'

echo
echo "== Watch checks =="
gh pr checks "$PR" --repo "$REPO" --watch || {
  echo "WARN: checks failed, pending, or unavailable"
  echo "Open PR:"
  echo "https://github.com/$REPO/pull/$PR"
  exit 1
}

echo
echo "== Merge PR =="
gh pr merge "$PR" \
  --repo "$REPO" \
  --squash \
  --delete-branch

echo
echo "DONE: PR merged. Wait for Vercel production deploy, then test /dashboard/billing → Upgrade Pro."
