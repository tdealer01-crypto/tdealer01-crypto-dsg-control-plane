#!/usr/bin/env bash
set -euo pipefail

REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
PR="755"
BRANCH="fix/billing-checkout-trial-upgrade-403"
OUT="ci-failure-report-pr-755.txt"

echo "== Collect PR #755 failed CI logs =="
echo "repo=$REPO"
echo "branch=$BRANCH"
echo "output=$OUT"

: > "$OUT"

{
  echo "# CI Failure Report — PR $PR"
  echo
  echo "## PR"
  gh pr view "$PR" --repo "$REPO" \
    --json number,title,state,url,mergeStateStatus,reviewDecision,isDraft,headRefName,baseRefName \
    --jq '.'
  echo
  echo "## Checks"
  gh pr checks "$PR" --repo "$REPO" || true
  echo
  echo "## Workflow runs on branch"
} >> "$OUT"

gh run list \
  --repo "$REPO" \
  --branch "$BRANCH" \
  --limit 30 \
  --json databaseId,name,event,status,conclusion,headSha,url,createdAt \
  --jq '.[] | [.databaseId,.name,.event,.status,.conclusion,.createdAt,.url] | @tsv' \
  >> "$OUT"

echo >> "$OUT"
echo "## Failed run logs" >> "$OUT"

FAILED_RUNS="$(
  gh run list \
    --repo "$REPO" \
    --branch "$BRANCH" \
    --limit 30 \
    --json databaseId,conclusion \
    --jq '.[] | select(.conclusion=="failure" or .conclusion=="cancelled" or .conclusion=="timed_out" or .conclusion=="startup_failure") | .databaseId'
)"

if [ -z "$FAILED_RUNS" ]; then
  echo "No failed runs found by gh run list." | tee -a "$OUT"
else
  for RUN_ID in $FAILED_RUNS; do
    echo >> "$OUT"
    echo "============================================================" >> "$OUT"
    echo "RUN_ID=$RUN_ID" >> "$OUT"
    echo "============================================================" >> "$OUT"

    gh run view "$RUN_ID" --repo "$REPO" \
      --json databaseId,name,event,status,conclusion,headSha,url,createdAt \
      --jq '.' >> "$OUT" || true

    echo >> "$OUT"
    echo "---- FAILED LOG ----" >> "$OUT"

    gh run view "$RUN_ID" --repo "$REPO" --log-failed >> "$OUT" 2>&1 || true
  done
fi

echo
echo "DONE"
echo "Saved: $OUT"
echo
echo "Show last 200 lines:"
tail -n 200 "$OUT"
