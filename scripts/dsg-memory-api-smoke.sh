#!/usr/bin/env bash
set -euo pipefail

# Step 16E: Governed Memory API smoke test
# This is a development/staging verification script, not a production claim.
# Required server env on the target app:
#   DSG_ALLOW_DEV_AUTH_HEADERS=true
#   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY

APP_URL="${APP_URL:-}"
WORKSPACE_ID="${DSG_SMOKE_WORKSPACE_ID:-}"
ACTOR_ID="${DSG_SMOKE_ACTOR_ID:-}"
ACTOR_ROLE="${DSG_SMOKE_ACTOR_ROLE:-operator}"

if [ -z "$APP_URL" ]; then
  echo "BLOCK: APP_URL is required" >&2
  exit 1
fi

if [ -z "$WORKSPACE_ID" ]; then
  echo "BLOCK: DSG_SMOKE_WORKSPACE_ID is required" >&2
  exit 1
fi

if [ -z "$ACTOR_ID" ]; then
  echo "BLOCK: DSG_SMOKE_ACTOR_ID is required" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PERMISSIONS="memory:write,memory:read,memory:gate,memory:context_pack"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RAW_TEXT="DSG Step 16E smoke memory. Memory must not override evidence. Timestamp: $NOW"
CONTENT_HASH="$(node -e "const crypto=require('crypto'); process.stdout.write(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "$RAW_TEXT")"

request_json() {
  local method="$1"
  local url="$2"
  local payload_file="${3:-}"
  local output_file="$4"
  local status_file="$5"

  if [ -n "$payload_file" ]; then
    curl -sS -X "$method" "$url" \
      -H "content-type: application/json" \
      -H "x-dsg-workspace-id: $WORKSPACE_ID" \
      -H "x-dsg-actor-id: $ACTOR_ID" \
      -H "x-dsg-actor-role: $ACTOR_ROLE" \
      -H "x-dsg-permissions: $PERMISSIONS" \
      --data-binary "@$payload_file" \
      -o "$output_file" \
      -w "%{http_code}" > "$status_file"
  else
    curl -sS -X "$method" "$url" \
      -H "x-dsg-workspace-id: $WORKSPACE_ID" \
      -H "x-dsg-actor-id: $ACTOR_ID" \
      -H "x-dsg-actor-role: $ACTOR_ROLE" \
      -H "x-dsg-permissions: $PERMISSIONS" \
      -o "$output_file" \
      -w "%{http_code}" > "$status_file"
  fi
}

assert_ok_response() {
  local label="$1"
  local response_file="$2"
  local status_file="$3"
  local status
  status="$(cat "$status_file")"

  if [[ "$status" != 2* ]]; then
    echo "BLOCK: $label returned HTTP $status" >&2
    cat "$response_file" >&2
    exit 1
  fi

  node <<'NODE' "$response_file" "$label"
const fs = require('fs');
const file = process.argv[2];
const label = process.argv[3];
const body = JSON.parse(fs.readFileSync(file, 'utf8'));
if (body.ok !== true) {
  console.error(`BLOCK: ${label} did not return ok=true`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
if (!body.boundary || body.boundary.productionReadyClaim !== false) {
  console.error(`BLOCK: ${label} missing non-production boundary`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
NODE
}

cat > "$TMP_DIR/ingest.json" <<JSON
{
  "sourceType": "manual_note",
  "memoryKind": "policy",
  "rawText": "$RAW_TEXT",
  "trustLevel": "user_supplied",
  "status": "active",
  "containsSecret": false,
  "containsPii": false,
  "containsLegalClaim": false,
  "containsProductionClaim": false,
  "contentHash": "$CONTENT_HASH",
  "metadata": {
    "smoke": true,
    "step": "16E",
    "timestamp": "$NOW"
  }
}
JSON

request_json POST "$APP_URL/api/dsg/memory/ingest" "$TMP_DIR/ingest.json" "$TMP_DIR/ingest.response.json" "$TMP_DIR/ingest.status"
assert_ok_response "memory ingest" "$TMP_DIR/ingest.response.json" "$TMP_DIR/ingest.status"

node <<'NODE' "$TMP_DIR/ingest.response.json" > "$TMP_DIR/memory.json"
const fs = require('fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!body.memory || !body.memory.id) {
  console.error('BLOCK: ingest response missing memory.id');
  process.exit(1);
}
process.stdout.write(JSON.stringify(body.memory));
NODE

SEARCH_URL="$APP_URL/api/dsg/memory/search?q=$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "DSG Step 16E smoke memory")&limit=5"
request_json GET "$SEARCH_URL" "" "$TMP_DIR/search.response.json" "$TMP_DIR/search.status"
assert_ok_response "memory search" "$TMP_DIR/search.response.json" "$TMP_DIR/search.status"

node <<'NODE' "$TMP_DIR/search.response.json"
const fs = require('fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(body.memories) || body.memories.length < 1) {
  console.error('BLOCK: search returned no memories');
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
NODE

node <<'NODE' "$TMP_DIR/memory.json" > "$TMP_DIR/gate.json"
const fs = require('fs');
const memory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify({
  queryText: 'Step 16E smoke gate',
  scope: {
    purpose: 'planning',
    requireVerifiedEvidence: false
  },
  memories: [memory]
}));
NODE

request_json POST "$APP_URL/api/dsg/memory/gate" "$TMP_DIR/gate.json" "$TMP_DIR/gate.response.json" "$TMP_DIR/gate.status"
assert_ok_response "memory gate" "$TMP_DIR/gate.response.json" "$TMP_DIR/gate.status"

node <<'NODE' "$TMP_DIR/gate.response.json"
const fs = require('fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!body.gate || !['PASS', 'REVIEW', 'BLOCK', 'UNSUPPORTED'].includes(body.gate.status)) {
  console.error('BLOCK: gate response missing valid status');
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
NODE

node <<'NODE' "$TMP_DIR/memory.json" > "$TMP_DIR/context-pack.json"
const fs = require('fs');
const memory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify({
  scope: {
    purpose: 'planning',
    requireVerifiedEvidence: false
  },
  memories: [memory],
  evidenceIds: [],
  auditIds: []
}));
NODE

request_json POST "$APP_URL/api/dsg/memory/context-pack" "$TMP_DIR/context-pack.json" "$TMP_DIR/context-pack.response.json" "$TMP_DIR/context-pack.status"
assert_ok_response "memory context pack" "$TMP_DIR/context-pack.response.json" "$TMP_DIR/context-pack.status"

node <<'NODE' "$TMP_DIR/context-pack.response.json"
const fs = require('fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!body.contextPack || !body.contextPack.contextHash) {
  console.error('BLOCK: context-pack response missing contextHash');
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
NODE

echo "PASS: Step 16E governed memory API smoke completed"
echo "NOTE: This proves dev-gated route path only. It is not a production auth/RBAC or production claim."
