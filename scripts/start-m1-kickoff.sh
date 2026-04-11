#!/usr/bin/env bash
set -euo pipefail

# Day-0 kickoff helper for M1 Production Cutover.

echo "[M1 Kickoff] date: $(date -u +%F)"
echo "1) Freeze demo-only scope"
echo "2) Open M1 epic + issue split"
echo "3) Assign owners for A/B/C/D/E streams"
echo "4) Start PR #1: schema/migration delta"
echo "5) Start parallel Wave 1: A1 + B1 + D2 + E1"

echo
echo "Suggested labels: M1, cutover, no-demo"
