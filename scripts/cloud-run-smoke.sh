#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${CLOUD_RUN_URL:-}}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: scripts/cloud-run-smoke.sh https://<service-url>"
  echo "or set CLOUD_RUN_URL"
  exit 2
fi

BASE_URL="${BASE_URL%/}"

echo "[smoke] base=${BASE_URL}"

echo "[smoke] GET /"
curl -fsS "${BASE_URL}/" >/dev/null

echo "[smoke] GET /product"
curl -fsS "${BASE_URL}/product" >/dev/null

echo "[smoke] GET /api/public-chat/runtime"
RUNTIME_JSON="$(curl -fsS "${BASE_URL}/api/public-chat/runtime")"
echo "${RUNTIME_JSON}"

echo "[smoke] POST /api/public-chat"
CHAT_JSON="$(curl -fsS -X POST "${BASE_URL}/api/public-chat" \
  -H 'content-type: application/json' \
  -d '{"message":"อธิบาย CospinDSG แบบสั้น และบอกว่า public mode execute action ได้ไหม"}')"
echo "${CHAT_JSON}"

if ! echo "${CHAT_JSON}" | grep -Eq 'openai_responses_api|openrouter_chat_completions_api|fallback_public_chat'; then
  echo "[smoke] FAIL: public chat did not return expected mode"
  exit 1
fi

echo "[smoke] PASS"
