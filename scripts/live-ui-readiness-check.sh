#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ENV_ONLY=0

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--base-url URL] [--env-only]

Checks whether DSG ONE live UI dependencies are ready.

Options:
  --base-url URL  Base URL to probe (default: http://localhost:3000)
  --env-only      Only validate environment variables (skip HTTP probes)
  -h, --help      Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --env-only)
      ENV_ONLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

missing=0
warn=0

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[MISS] $name is not set"
    missing=1
  else
    echo "[ OK ] $name"
  fi
}

optional_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[WARN] $name is not set"
    warn=1
  else
    echo "[ OK ] $name"
  fi
}

echo "== Environment checks =="
require_env NEXT_PUBLIC_SUPABASE_URL
require_env NEXT_PUBLIC_SUPABASE_ANON_KEY
require_env SUPABASE_SERVICE_ROLE_KEY

if [[ -z "${APP_URL:-}" && -z "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  echo "[MISS] APP_URL or NEXT_PUBLIC_APP_URL must be set"
  missing=1
else
  echo "[ OK ] APP_URL / NEXT_PUBLIC_APP_URL"
fi

mode="${DSG_CORE_MODE:-}"
if [[ "$mode" != "internal" && "$mode" != "remote" ]]; then
  echo "[MISS] DSG_CORE_MODE must be internal or remote"
  missing=1
else
  echo "[ OK ] DSG_CORE_MODE=$mode"
fi

if [[ "$mode" == "remote" ]]; then
  require_env DSG_CORE_URL
  require_env DSG_CORE_API_KEY
fi

optional_env ACCESS_MODE
optional_env ACCESS_POLICY
optional_env OVERAGE_RATE_USD

check_endpoint() {
  local path="$1"
  local url="${BASE_URL%/}$path"
  if curl -fsS -m 10 "$url" >/dev/null; then
    echo "[ OK ] $path"
  else
    echo "[MISS] $path (unable to reach or non-2xx)"
    missing=1
  fi
}

if [[ "$ENV_ONLY" -eq 0 ]]; then
  echo
  echo "== HTTP probes (${BASE_URL}) =="
  check_endpoint /api/health
  check_endpoint /api/usage
  check_endpoint /api/executions?limit=8
  check_endpoint /api/integration
  check_endpoint /api/audit?limit=8

  echo
  echo "== UI routes =="
  check_endpoint /dashboard
  check_endpoint /dashboard/live-control
  check_endpoint /dashboard/command-center
fi

echo
if [[ "$missing" -eq 1 ]]; then
  echo "RESULT: NOT READY"
  exit 1
fi

if [[ "$warn" -eq 1 ]]; then
  echo "RESULT: READY WITH WARNINGS"
  exit 0
fi

echo "RESULT: READY"
