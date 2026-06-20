#!/usr/bin/env bash
set -euo pipefail

REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
PR="755"
OUT="pr-755-check-runs-detail.txt"

echo "== Get PR head SHA =="
SHA="$(gh pr view "$PR" --repo "$REPO" --json headRefOid --jq '.headRefOid')"
echo "SHA=$SHA"

: > "$OUT"

{
  echo "# PR #755 Check Runs Detail"
  echo "repo=$REPO"
  echo "pr=$PR"
  echo "sha=$SHA"
  echo
  echo "## PR checks"
  gh pr checks "$PR" --repo "$REPO" || true
  echo
  echo "## Failed / non-success check runs"
} >> "$OUT"

gh api "repos/$REPO/commits/$SHA/check-runs" \
  --jq '.check_runs[] | select(.conclusion!="success" and .conclusion!="neutral" and .conclusion!="skipped") | {name,status,conclusion,details_url,html_url,external_id,output}' \
  >> "$OUT"

echo >> "$OUT"
echo "## Actions runs for SHA" >> "$OUT"

gh run list \
  --repo "$REPO" \
  --commit "$SHA" \
  --limit 50 \
  --json databaseId,name,event,status,conclusion,url,headSha \
  --jq '.[] | [.databaseId,.name,.event,.status,.conclusion,.url] | @tsv' \
  >> "$OUT"

echo >> "$OUT"
echo "## Failed logs" >> "$OUT"

FAILED_RUNS="$(
  gh run list \
    --repo "$REPO" \
    --commit "$SHA" \
    --limit 50 \
    --json databaseId,conclusion \
    --jq '.[] | select(.conclusion=="failure" or .conclusion=="startup_failure" or .conclusion=="timed_out") | .databaseId'
)"

if [ -z "$FAILED_RUNS" ]; then
  echo "No failed action runs found by gh run list." >> "$OUT"
else
  for RUN_ID in $FAILED_RUNS; do
    echo >> "$OUT"
    echo "============================================================" >> "$OUT"
    echo "RUN_ID=$RUN_ID" >> "$OUT"
    echo "============================================================" >> "$OUT"

    gh run view "$RUN_ID" --repo "$REPO" \
      --json databaseId,name,event,status,conclusion,headSha,url,jobs \
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
echo "Show important tail:"
tail -n 260 "$OUT"
