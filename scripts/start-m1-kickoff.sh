#!/usr/bin/env bash
set -euo pipefail

# Day-0 kickoff helper for M1 Production Cutover.
# Usage:
#   ./scripts/start-m1-kickoff.sh
#   ./scripts/start-m1-kickoff.sh --json

if [[ "${1:-}" == "--json" ]]; then
  date_utc="$(date -u +%F)"
  printf '{\n'
  printf '  "milestone": "M1",\n'
  printf '  "date_utc": "%s",\n' "$date_utc"
  printf '  "actions": [\n'
  printf '    "Freeze demo-only scope",\n'
  printf '    "Open M1 epic + issue split",\n'
  printf '    "Assign owners for A/B/C/D/E streams",\n'
  printf '    "Start PR #1: schema/migration delta",\n'
  printf '    "Start parallel Wave 1: A1 + B1 + D2 + E1"\n'
  printf '  ],\n'
  printf '  "suggested_labels": ["M1", "cutover", "no-demo"]\n'
  printf '}\n'
  exit 0
fi

echo "[M1 Kickoff] date: $(date -u +%F)"
echo "1) Freeze demo-only scope"
echo "2) Open M1 epic + issue split"
echo "3) Assign owners for A/B/C/D/E streams"
echo "4) Start PR #1: schema/migration delta"
echo "5) Start parallel Wave 1: A1 + B1 + D2 + E1"

echo
echo "Suggested labels: M1, cutover, no-demo"
