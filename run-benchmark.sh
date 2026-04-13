#!/usr/bin/env bash
set -euo pipefail

# =============================
# DSG Benchmark Script
# =============================

BENCHMARK_BASE_URL="${BENCHMARK_BASE_URL:-https://tdealer01-crypto-dsg-control-plane.vercel.app}"
BENCHMARK_API_KEY="${BENCHMARK_API_KEY:-}"
BENCHMARK_AGENT_ID="${BENCHMARK_AGENT_ID:-}"
BENCHMARK_EXECUTE_PATH="${BENCHMARK_EXECUTE_PATH:-/api/execute}"
BENCHMARK_REPLAY_PATH_PREFIX="${BENCHMARK_REPLAY_PATH_PREFIX:-/api/replay}"

if [[ -z "$BENCHMARK_API_KEY" || -z "$BENCHMARK_AGENT_ID" ]]; then
  cat <<MSG
❌ Missing required env:
  - BENCHMARK_API_KEY
  - BENCHMARK_AGENT_ID

Example:
  export BENCHMARK_API_KEY="dsg_live_xxx"
  export BENCHMARK_AGENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  ./run-benchmark.sh
MSG
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq is required (install jq first)"
  exit 1
fi

export BENCHMARK_BASE_URL
export BENCHMARK_API_KEY
export BENCHMARK_AGENT_ID
export BENCHMARK_EXECUTE_PATH
export BENCHMARK_REPLAY_PATH_PREFIX

echo "🔎 Preflight execute check..."
PRECHECK_JSON="$(curl -sS -X POST "${BENCHMARK_BASE_URL}${BENCHMARK_EXECUTE_PATH}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BENCHMARK_API_KEY}" \
  -d "{\"agent_id\":\"${BENCHMARK_AGENT_ID}\",\"action\":\"scan\",\"input\":{},\"context\":{}}")"

echo "$PRECHECK_JSON" | jq .

PRECHECK_ERROR="$(echo "$PRECHECK_JSON" | jq -r '.error // empty')"
if [[ "$PRECHECK_ERROR" == "Invalid agent_id or API key" ]]; then
  cat <<MSG

❌ Preflight failed: Invalid agent_id or API key

Likely causes:
  1) API key and agent_id are from different agents
  2) API key was rotated/revoked
  3) Hitting wrong environment (prod/staging)

Quick fix checklist:
  - Re-issue a fresh API key from the same agent
  - Re-export both values and run again
  - Verify URL: ${BENCHMARK_BASE_URL}
MSG
  exit 1
fi

if [[ "$PRECHECK_ERROR" == "Agent is not active" ]]; then
  echo "❌ Preflight failed: Agent is not active. Activate it first."
  exit 1
fi

echo "🚀 Running DSG benchmark..."
node scripts/benchmark-dsg.mjs
node scripts/render-benchmark-site.mjs

echo "✅ Done. See artifacts/benchmark/"
