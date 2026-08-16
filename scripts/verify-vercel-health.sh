#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_URL="${1:-}"
HEALTH_PATH="${2:-/api/health}"
VERIFY_MODE="${3:-health}"
VERCEL_CLI_VERSION="${VERCEL_CLI_VERSION:-58.0.0}"

if [[ -z "$DEPLOYMENT_URL" ]]; then
  echo "Usage: scripts/verify-vercel-health.sh <deployment-url> [health-path] [health|access]" >&2
  exit 2
fi

if [[ "$VERIFY_MODE" != "health" && "$VERIFY_MODE" != "access" ]]; then
  echo "Invalid verification mode: $VERIFY_MODE (expected health or access)" >&2
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

# Retry loop: a freshly created deployment can still be BUILDING/QUEUED when
# this verification runs, which surfaces as a 503 from Vercel's cold-start
# rather than a real application failure. Keep probing until the deployment
# settles or the wait budget is exhausted.
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-20}"
VERIFY_INTERVAL_SECONDS="${VERIFY_INTERVAL_SECONDS:-15}"
HTTP_STATUS=""
for _attempt in $(seq 1 "$VERIFY_ATTEMPTS"); do
  set +e
  HTTP_STATUS="$("${cmd[@]}")"
  rc=$?
  set -e
  case "$HTTP_STATUS" in
    200) break ;;
    404|502|503|504) sleep "$VERIFY_INTERVAL_SECONDS" ;;
    *) break ;;
  esac
done

if [[ "$VERIFY_MODE" == "access" ]]; then
  # Preview deployments can be READY while their preview-only runtime env is
  # intentionally incomplete. For this preflight we prove only that Vercel
  # Authentication was bypassed and the request reached DSG itself; production
  # health remains strict below. An SSO redirect/body cannot satisfy this JSON
  # identity check.
  node - "$BODY_FILE" "$HTTP_STATUS" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const status = process.argv[3];
let payload;
try {
  payload = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch {
  console.error(`Vercel access verification failed closed: app JSON not reached (HTTP ${status})`);
  process.exit(1);
}
if (payload?.service !== 'dsg-control-plane') {
  console.error(`Vercel access verification failed closed: unexpected app identity (HTTP ${status})`);
  process.exit(1);
}
console.log(`Vercel access verified: protection bypassed and DSG app reached (HTTP ${status})`);
NODE
  exit 0
fi

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
