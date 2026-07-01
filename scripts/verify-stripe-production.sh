#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="${ROOT_DIR}/.env.local"
ENV_FILE="${ROOT_DIR}/.env"

PASSED=0
FAILED=0
WARNED=0

ok() { echo -e "${GREEN}[PASS]${NC} $*"; PASSED=$((PASSED + 1)); }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAILED=$((FAILED + 1)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; WARNED=$((WARNED + 1)); }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing command: $1"
    exit 2
  fi
}

load_env() {
  if [[ -f "$ENV_LOCAL" ]]; then
    info "Loading $ENV_LOCAL"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_LOCAL"
    set +a
    return
  fi

  if [[ -f "$ENV_FILE" ]]; then
    info "Loading $ENV_FILE"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    return
  fi

  warn "No .env.local or .env found"
}

check_required_vars() {
  local vars=(
    STRIPE_SECRET_KEY
    STRIPE_PUBLISHABLE_KEY
    STRIPE_WEBHOOK_SECRET
    NEXT_PUBLIC_STRIPE_CLIENT_ID
  )

  for v in "${vars[@]}"; do
    if [[ -n "${!v:-}" ]]; then
      ok "$v is set"
    else
      fail "$v is missing"
    fi
  done
}

check_key_formats() {
  [[ "${STRIPE_SECRET_KEY:-}" =~ ^(sk_live|rk_live)_[A-Za-z0-9]{20,128}$ ]] && ok "STRIPE_SECRET_KEY format valid" || fail "STRIPE_SECRET_KEY format invalid"
  [[ "${STRIPE_PUBLISHABLE_KEY:-}" =~ ^pk_live_[A-Za-z0-9]{20,128}$ ]] && ok "STRIPE_PUBLISHABLE_KEY format valid" || fail "STRIPE_PUBLISHABLE_KEY format invalid"
  [[ "${STRIPE_WEBHOOK_SECRET:-}" =~ ^whsec_live_[A-Za-z0-9]{20,128}$ ]] && ok "STRIPE_WEBHOOK_SECRET format valid" || fail "STRIPE_WEBHOOK_SECRET format invalid"
  [[ "${NEXT_PUBLIC_STRIPE_CLIENT_ID:-}" =~ ^ca_[A-Za-z0-9]{8,64}$ ]] && ok "NEXT_PUBLIC_STRIPE_CLIENT_ID format valid" || fail "NEXT_PUBLIC_STRIPE_CLIENT_ID format invalid"
}

stripe_api_call() {
  local path="$1"
  local response body code
  response="$(curl -sS -u "${STRIPE_SECRET_KEY}:" "https://api.stripe.com${path}" -w $'\n%{http_code}')" || {
    fail "Stripe API request failed for ${path}"
    return 1
  }
  body="$(echo "$response" | sed '$d')"
  code="$(echo "$response" | tail -n1)"

  if [[ "$code" == "200" ]]; then
    ok "Stripe API ${path} reachable"
    return 0
  fi

  local msg
  msg="$(echo "$body" | sed -n 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  fail "Stripe API ${path} failed (HTTP ${code}) ${msg:+- ${msg}}"
  return 1
}

resolve_webhook_url() {
  if [[ -n "${STRIPE_WEBHOOK_ENDPOINT_URL:-}" ]]; then
    printf '%s' "$STRIPE_WEBHOOK_ENDPOINT_URL"
    return
  fi

  if [[ -n "${APP_URL:-}" ]]; then
    printf '%s/api/billing/webhook' "${APP_URL%/}"
    return
  fi

  if [[ -n "${NEXT_PUBLIC_APP_URL:-}" ]]; then
    printf '%s/api/billing/webhook' "${NEXT_PUBLIC_APP_URL%/}"
    return
  fi

  printf '%s' 'http://localhost:3000/api/billing/webhook'
}

generate_signature() {
  local payload="$1"
  local secret="$2"
  local ts signed sig
  ts="$(date +%s)"
  signed="${ts}.${payload}"
  sig="$(printf '%s' "$signed" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.* //')"
  printf 't=%s,v1=%s' "$ts" "$sig"
}

check_webhook_reachability_and_signature() {
  local webhook_url payload signature response body code
  webhook_url="$(resolve_webhook_url)"
  info "Webhook URL: ${webhook_url}"

  payload="{\"id\":\"evt_testprobe_$(date +%s)\",\"object\":\"event\",\"api_version\":\"2026-05-27.dahlia\",\"created\":$(date +%s),\"livemode\":true,\"type\":\"payment_intent.created\",\"data\":{\"object\":{\"id\":\"pi_testprobe_$(date +%s)\",\"object\":\"payment_intent\",\"status\":\"requires_payment_method\"}}}"
  signature="$(generate_signature "$payload" "$STRIPE_WEBHOOK_SECRET")"

  response="$(curl -sS -X POST "$webhook_url" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: ${signature}" \
    --data "$payload" \
    -w $'\n%{http_code}')" || {
      fail "Webhook endpoint not reachable"
      return 1
    }

  body="$(echo "$response" | sed '$d')"
  code="$(echo "$response" | tail -n1)"

  if [[ "$code" == "200" || "$code" == "202" ]]; then
    ok "Webhook endpoint reachable and accepts signed payload"
  elif [[ "$code" == "404" ]]; then
    fail "Webhook endpoint returned 404 (${webhook_url})"
  elif [[ "$code" == "400" && "$body" == *"invalid"* ]]; then
    fail "Webhook signature verification failed"
  else
    warn "Webhook returned HTTP ${code}; inspect response: ${body}"
  fi
}

print_summary() {
  echo ""
  echo -e "${BLUE}Stripe Production Verification Summary${NC}"
  echo "Passed : $PASSED"
  echo "Failed : $FAILED"
  echo "Warnings: $WARNED"
  echo ""

  if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}READY: Stripe production setup checks passed.${NC}"
    return 0
  fi

  echo -e "${RED}NOT READY: Resolve failed checks before production rollout.${NC}"
  return 1
}

main() {
  require_cmd curl
  require_cmd openssl
  require_cmd sed

  info "Project root: ${ROOT_DIR}"
  load_env

  echo ""
  check_required_vars
  echo ""
  check_key_formats
  echo ""
  stripe_api_call "/v1/account"
  stripe_api_call "/v1/products?limit=1"
  echo ""
  check_webhook_reachability_and_signature

  print_summary
}

main "$@"
