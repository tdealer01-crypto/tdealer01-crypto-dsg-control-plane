#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_URL="${1:-}"
HEALTH_PATH="${2:-/api/health}"
VERCEL_CLI_VERSION="${VERCEL_CLI_VERSION:-58.0.0}"

if [[ -z "$DEPLOYMENT_URL" ]]; then
  echo "Usage: scripts/verify-vercel-health.sh <deployment-url> [health-path]" >&2
  exit 2
fi

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"

BODY_FILE="$(mktemp)"
cleanup() { rm -f "$BODY_FILE"; }
trap cleanup EXIT

# Vercel CLI officially supports VERCEL_TOKEN as an environment variable.
# Do not pass --token (or other Vercel-global flags) on this `vercel curl`
# command: in CLI 58.0.0 the beta curl command can forward those flags to the
# underlying system curl process, which then fails with
# "curl: option --token: is unknown". The linked .vercel/project.json plus
# VERCEL_ORG_ID / VERCEL_PROJECT_ID keep this request bound to the destination
# project while VERCEL_TOKEN authenticates the CLI itself.
cmd=(
  npx --yes "vercel@${VERCEL_CLI_VERSION}"
  curl "$HEALTH_PATH"
  --deployment "$DEPLOYMENT_URL"
)

# vercel curl automatically handles Vercel Deployment Protection for the
# authenticated project. curl's output is separated so HTTP status and JSON
# payload can be independently asserted.
cmd+=(--silent --show-error --output "$BODY_FILE" --write-out '%{http_code}')

HTTP_STATUS="$("${cmd[@]}")"
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "Vercel health verification failed closed: expected HTTP 200, got ${HTTP_STATUS}" >&2
  exit 1
fi

node - "$BODY_FILE" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
let payload;
try {
  payload = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch {
  console.error('Vercel health verification failed closed: response is not valid JSON');
  process.exit(1);
}
if (payload?.ok !== true) {
  const reason = payload?.error ?? payload?.status ?? 'health_payload_not_ok';
  console.error(`Vercel health verification failed closed: ${String(reason)}`);
  process.exit(1);
}
console.log('Vercel health verified: protected deployment bypassed, HTTP 200 + JSON ok=true');
NODE
