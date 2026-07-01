#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${ENV_FILE}.backup.${TIMESTAMP}"

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err() { echo -e "${RED}[ERROR]${NC} $*"; }

die() { log_err "$*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

prompt_hidden() {
  local label="$1"
  local value=""
  while true; do
    read -r -s -p "$label: " value
    echo ""
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
    log_warn "Value cannot be empty."
  done
}

validate_regex() {
  local value="$1"
  local regex="$2"
  local label="$3"
  if [[ ! "$value" =~ $regex ]]; then
    die "$label has invalid format"
  fi
}

strip_error_message() {
  sed -n 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1
}

test_secret_key_connectivity() {
  local key="$1"
  log_info "Testing STRIPE_SECRET_KEY connectivity via /v1/account ..."
  local response
  response="$(curl -sS -u "${key}:" "https://api.stripe.com/v1/account" -w $'\n%{http_code}')" || die "Network/API error while testing secret key"
  local body http_code
  body="$(echo "$response" | sed '$d')"
  http_code="$(echo "$response" | tail -n1)"

  if [[ "$http_code" == "200" ]]; then
    log_ok "Secret key connectivity OK"
  else
    local msg
    msg="$(echo "$body" | strip_error_message || true)"
    die "Secret key test failed (HTTP ${http_code}) ${msg:+- ${msg}}"
  fi
}

test_publishable_key_connectivity() {
  local key="$1"
  log_info "Testing STRIPE_PUBLISHABLE_KEY connectivity via /v1/tokens probe ..."
  local response
  response="$(curl -sS -u "${key}:" -X POST "https://api.stripe.com/v1/tokens" -d "probe=true" -w $'\n%{http_code}')" || die "Network/API error while testing publishable key"
  local body http_code
  body="$(echo "$response" | sed '$d')"
  http_code="$(echo "$response" | tail -n1)"

  case "$http_code" in
    200|400)
      log_ok "Publishable key is accepted by Stripe API"
      ;;
    401|403)
      local msg
      msg="$(echo "$body" | strip_error_message || true)"
      die "Publishable key rejected (HTTP ${http_code}) ${msg:+- ${msg}}"
      ;;
    *)
      local msg
      msg="$(echo "$body" | strip_error_message || true)"
      die "Unexpected publishable key test result (HTTP ${http_code}) ${msg:+- ${msg}}"
      ;;
  esac
}

upsert_env() {
  local key="$1"
  local value="$2"
  if [[ ! -f "$ENV_FILE" ]]; then
    touch "$ENV_FILE"
  fi

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

backup_env() {
  if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" "$BACKUP_FILE"
    log_ok "Backed up existing .env.local to ${BACKUP_FILE}"
  else
    log_warn ".env.local does not exist yet; it will be created"
  fi
}

print_vercel_output() {
  local sk="$1"
  local pk="$2"
  local wh="$3"
  local cid="$4"

  cat <<OUTPUT

Vercel CLI (production) commands:
printf '%s' '${sk}' | vercel env add STRIPE_SECRET_KEY production
printf '%s' '${pk}' | vercel env add STRIPE_PUBLISHABLE_KEY production
printf '%s' '${wh}' | vercel env add STRIPE_WEBHOOK_SECRET production
printf '%s' '${cid}' | vercel env add NEXT_PUBLIC_STRIPE_CLIENT_ID production

Optional compatibility variable:
printf '%s' '${pk}' | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

After setting env vars, redeploy production:
vercel --prod
OUTPUT
}

main() {
  require_cmd curl
  require_cmd sed
  require_cmd grep

  echo -e "${BLUE}Stripe Production Setup${NC}"
  echo "Repository: ${ROOT_DIR}"
  echo ""

  log_info "Enter Stripe production credentials (hidden input)."
  local stripe_secret stripe_publishable stripe_webhook stripe_client_id
  stripe_secret="$(prompt_hidden 'STRIPE_SECRET_KEY (sk_live_* or rk_live_*)')"
  stripe_publishable="$(prompt_hidden 'STRIPE_PUBLISHABLE_KEY (pk_live_*)')"
  stripe_webhook="$(prompt_hidden 'STRIPE_WEBHOOK_SECRET (whsec_live_*)')"
  stripe_client_id="$(prompt_hidden 'NEXT_PUBLIC_STRIPE_CLIENT_ID (ca_*)')"

  validate_regex "$stripe_secret" '^(sk_live|rk_live)_[A-Za-z0-9_]+' 'STRIPE_SECRET_KEY'
  validate_regex "$stripe_publishable" '^pk_live_[A-Za-z0-9_]+' 'STRIPE_PUBLISHABLE_KEY'
  validate_regex "$stripe_webhook" '^whsec_live_[A-Za-z0-9_]+' 'STRIPE_WEBHOOK_SECRET'
  validate_regex "$stripe_client_id" '^ca_[A-Za-z0-9_]+' 'NEXT_PUBLIC_STRIPE_CLIENT_ID'
  log_ok "Key format validation passed"

  test_secret_key_connectivity "$stripe_secret"
  test_publishable_key_connectivity "$stripe_publishable"
  log_ok "Webhook secret format validation passed"

  backup_env

  upsert_env "STRIPE_SECRET_KEY" "$stripe_secret"
  upsert_env "STRIPE_PUBLISHABLE_KEY" "$stripe_publishable"
  upsert_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$stripe_publishable"
  upsert_env "STRIPE_WEBHOOK_SECRET" "$stripe_webhook"
  upsert_env "NEXT_PUBLIC_STRIPE_CLIENT_ID" "$stripe_client_id"

  log_ok "Updated ${ENV_FILE}"
  print_vercel_output "$stripe_secret" "$stripe_publishable" "$stripe_webhook" "$stripe_client_id"

  echo ""
  log_info "Next: run scripts/verify-stripe-production.sh"
}

main "$@"
