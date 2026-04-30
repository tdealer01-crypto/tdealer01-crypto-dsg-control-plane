#!/usr/bin/env bash
set -euo pipefail

EVIDENCE_FILE="${RUNNER_TEMP:-/tmp}/dsg-secure-deploy-gate-evidence.json"
BODY_FILE="${RUNNER_TEMP:-/tmp}/dsg-readiness-body.json"

READINESS_URL="${DSG_READINESS_URL:?Missing DSG_READINESS_URL}"
EXPECTED_STATUS="${DSG_EXPECTED_STATUS:-200}"
REQUIRE_JSON_OK="${DSG_REQUIRE_JSON_OK:-true}"
PROTECTED_URL="${DSG_PROTECTED_URL:-}"
PROTECTED_EXPECTED="${DSG_PROTECTED_EXPECTED:-401,403}"

started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

printf '%s\n' "DSG Secure Deploy Gate"
printf 'Checking readiness URL: %s\n' "$READINESS_URL"

readiness_status="$(
  curl -sS -L \
    -o "$BODY_FILE" \
    -w "%{http_code}" \
    "$READINESS_URL"
)"

verdict="GO"
failure_reason=""

if [[ "$readiness_status" != "$EXPECTED_STATUS" ]]; then
  verdict="NO-GO"
  failure_reason="readiness_status_expected_${EXPECTED_STATUS}_got_${readiness_status}"
fi

if [[ "$verdict" == "GO" && "$REQUIRE_JSON_OK" == "true" ]]; then
  if command -v jq >/dev/null 2>&1; then
    json_ok="$(jq -r '.ok // empty' "$BODY_FILE" 2>/dev/null || true)"
    if [[ "$json_ok" != "true" ]]; then
      verdict="NO-GO"
      failure_reason="readiness_json_ok_not_true"
    fi
  else
    if ! grep -q '"ok"[[:space:]]*:[[:space:]]*true' "$BODY_FILE"; then
      verdict="NO-GO"
      failure_reason="readiness_json_ok_not_found"
    fi
  fi
fi

protected_status=""
if [[ -n "$PROTECTED_URL" ]]; then
  printf 'Checking protected URL: %s\n' "$PROTECTED_URL"

  protected_status="$(
    curl -sS -L \
      -o /dev/null \
      -w "%{http_code}" \
      "$PROTECTED_URL"
  )"

  IFS=',' read -ra allowed_statuses <<< "$PROTECTED_EXPECTED"
  protected_match="false"

  for status in "${allowed_statuses[@]}"; do
    status="${status//[[:space:]]/}"
    if [[ "$protected_status" == "$status" ]]; then
      protected_match="true"
      break
    fi
  done

  if [[ "$protected_match" != "true" ]]; then
    verdict="NO-GO"
    failure_reason="protected_route_expected_${PROTECTED_EXPECTED}_got_${protected_status}"
  fi
fi

finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$EVIDENCE_FILE" <<JSON
{
  "tool": "dsg-secure-deploy-gate",
  "verdict": "$verdict",
  "readiness_url": "$READINESS_URL",
  "readiness_status": "$readiness_status",
  "expected_status": "$EXPECTED_STATUS",
  "require_json_ok": "$REQUIRE_JSON_OK",
  "protected_url": "$PROTECTED_URL",
  "protected_status": "$protected_status",
  "protected_expected": "$PROTECTED_EXPECTED",
  "failure_reason": "$failure_reason",
  "started_at": "$started_at",
  "finished_at": "$finished_at"
}
JSON

evidence_hash="$(sha256sum "$EVIDENCE_FILE" | awk '{print $1}')"

{
  echo "verdict=$verdict"
  echo "readiness_status=$readiness_status"
  echo "evidence_hash=$evidence_hash"
} >> "$GITHUB_OUTPUT"

{
  echo "## DSG Secure Deploy Gate"
  echo ""
  echo "| Field | Value |"
  echo "|---|---|"
  echo "| Verdict | $verdict |"
  echo "| Readiness status | $readiness_status |"
  echo "| Expected status | $EXPECTED_STATUS |"
  echo "| Protected status | ${protected_status:-not_checked} |"
  echo "| Evidence hash | \`$evidence_hash\` |"
  echo "| Failure reason | ${failure_reason:-none} |"
} >> "$GITHUB_STEP_SUMMARY"

cat "$EVIDENCE_FILE"

if [[ "$verdict" != "GO" ]]; then
  printf 'DSG gate failed: %s\n' "$failure_reason"
  exit 1
fi

printf '%s\n' "DSG gate passed: GO"
