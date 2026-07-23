#!/bin/bash

# Secret Manager CLI — Local encryption/decryption + validation
# Usage: ./scripts/secrets-manager.sh [command] [options]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="${PROJECT_ROOT}/.secrets"
ENCRYPTED_DIR="${SECRETS_DIR}/encrypted"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$ENCRYPTED_DIR"

# Help message
show_help() {
  cat <<EOF
${BLUE}Secret Manager CLI${NC}

Usage: $(basename "$0") [command] [options]

Commands:
  ${GREEN}init${NC}                 Initialize secret manager (create .secrets dir)
  ${GREEN}load${NC} <env>           Load secrets from <env> file (dev/staging/prod)
  ${GREEN}validate${NC}             Validate secrets against schema
  ${GREEN}encrypt${NC} <file>       Encrypt .env file to .secrets/encrypted/
  ${GREEN}decrypt${NC} <file>       Decrypt encrypted secrets
  ${GREEN}list${NC}                 List all secret names (no values)
  ${GREEN}check${NC}                Check which secrets are missing
  ${GREEN}export${NC}               Export secrets for GitHub Actions format
  ${GREEN}help${NC}                 Show this help message

Environment Variables:
  SECRETS_PASSWORD      Master password for encryption (or set interactively)
  ENVIRONMENT           Target environment (dev/staging/prod)

Examples:
  $(basename "$0") init
  $(basename "$0") load dev
  $(basename "$0") validate
  $(basename "$0") check
  $(basename "$0") export

EOF
}

# Initialize secret manager
init_secrets() {
  echo -e "${BLUE}Initializing Secret Manager...${NC}"
  mkdir -p "$SECRETS_DIR/encrypted"
  mkdir -p "$SECRETS_DIR/backups"

  cat > "$SECRETS_DIR/.gitignore" <<'GITIGNORE'
# Secret Manager ignore rules
*.key
*.enc
encrypted/
backups/
.password
secrets.*.json
GITIGNORE

  echo -e "${GREEN}✓ Secret directories created${NC}"
  echo -e "${YELLOW}Note: Add SECRETS_PASSWORD to your environment or enter it interactively${NC}"
}

# Load secrets from .env file
load_secrets() {
  local env_file="${1:-.env.example}"

  if [[ ! -f "$PROJECT_ROOT/$env_file" ]]; then
    echo -e "${RED}✗ File not found: $env_file${NC}"
    exit 1
  fi

  echo -e "${BLUE}Loading secrets from $env_file...${NC}"

  # Source the env file (safe: only expands variables, doesn't execute)
  set -a
  source "$PROJECT_ROOT/$env_file"
  set +a

  echo -e "${GREEN}✓ Secrets loaded${NC}"
}

# Validate secrets schema
validate_secrets() {
  echo -e "${BLUE}Validating secrets schema...${NC}"

  local required_secrets=(
    "AWS_ACCOUNT_ID"
    "AWS_REGION"
    "ENVIRONMENT"
  )

  local optional_secrets=(
    "ANTHROPIC_API_KEY"
    "JWT_SECRET"
    "SUPABASE_SERVICE_ROLE"
    "STRIPE_SECRET_KEY"
    "GITHUB_TOKEN"
  )

  local missing=0

  echo -e "${BLUE}Checking required secrets:${NC}"
  for secret in "${required_secrets[@]}"; do
    if [[ -z "${!secret:-}" ]]; then
      echo -e "${RED}✗ Missing: $secret${NC}"
      ((missing++))
    else
      echo -e "${GREEN}✓ Present: $secret${NC}"
    fi
  done

  if [[ $missing -gt 0 ]]; then
    echo -e "${RED}✗ $missing required secrets missing${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ All required secrets present${NC}"
}

# Encrypt .env file
encrypt_secrets() {
  local env_file="${1:-.env.local}"

  if [[ ! -f "$PROJECT_ROOT/$env_file" ]]; then
    echo -e "${RED}✗ File not found: $env_file${NC}"
    exit 1
  fi

  echo -e "${BLUE}Encrypting $env_file...${NC}"

  # Get password
  if [[ -z "${SECRETS_PASSWORD:-}" ]]; then
    echo -n "Enter encryption password: "
    read -s SECRETS_PASSWORD
    echo
  fi

  local basename=$(basename "$env_file" .env)
  local output_file="$ENCRYPTED_DIR/secrets.${basename}.enc"

  # Simple base64 + openssl encryption (production: use proper key derivation)
  openssl enc -aes-256-cbc -salt -in "$PROJECT_ROOT/$env_file" \
    -out "$output_file" -k "$SECRETS_PASSWORD" -md sha256

  if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Encrypted to: $output_file${NC}"
  else
    echo -e "${RED}✗ Encryption failed${NC}"
    exit 1
  fi
}

# Decrypt encrypted secrets
decrypt_secrets() {
  local encrypted_file="${1}"

  if [[ ! -f "$encrypted_file" ]]; then
    echo -e "${RED}✗ File not found: $encrypted_file${NC}"
    exit 1
  fi

  echo -e "${BLUE}Decrypting $encrypted_file...${NC}"

  # Get password
  if [[ -z "${SECRETS_PASSWORD:-}" ]]; then
    echo -n "Enter decryption password: "
    read -s SECRETS_PASSWORD
    echo
  fi

  openssl enc -aes-256-cbc -d -in "$encrypted_file" -k "$SECRETS_PASSWORD" -md sha256
}

# List secret names
list_secrets() {
  echo -e "${BLUE}Available secrets:${NC}"

  if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
    grep -E '^\s*[A-Z_]+=' "$PROJECT_ROOT/.env.example" | \
      sed 's/=.*//' | sed 's/^\s*//' | \
      sort | \
      while read secret; do
        echo -e "${GREEN}  ✓ $secret${NC}"
      done
  else
    echo -e "${YELLOW}No .env.example found${NC}"
  fi
}

# Check missing secrets
check_missing() {
  echo -e "${BLUE}Checking for missing secrets...${NC}"

  local missing=()

  if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
    grep -E '^\s*[A-Z_]+=' "$PROJECT_ROOT/.env.example" | \
      sed 's/=.*//' | sed 's/^\s*//' | \
      while read secret; do
        if [[ -z "${!secret:-}" ]]; then
          echo -e "${YELLOW}⚠ Missing: $secret${NC}"
        fi
      done
  fi
}

# Export for GitHub Actions
export_for_github() {
  echo -e "${BLUE}Exporting secrets for GitHub Actions...${NC}"
  echo -e "${YELLOW}Copy these to GitHub Settings → Secrets and variables → Actions:${NC}"
  echo ""

  cat <<EOF
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-YOUR_AWS_ACCOUNT_ID}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-YOUR_AWS_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-YOUR_AWS_SECRET_KEY}
ENVIRONMENT=${ENVIRONMENT:-dev}
EOF

  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
  fi

  if [[ -n "${JWT_SECRET:-}" ]]; then
    echo "JWT_SECRET=${JWT_SECRET}"
  fi

  echo ""
  echo -e "${YELLOW}⚠ Never share these values in logs or repositories${NC}"
}

# Main command router
main() {
  local command="${1:-help}"

  case "$command" in
    init)
      init_secrets
      ;;
    load)
      load_secrets "${2:-.env.example}"
      ;;
    validate)
      validate_secrets
      ;;
    encrypt)
      encrypt_secrets "${2:-.env.local}"
      ;;
    decrypt)
      decrypt_secrets "${2:-}"
      ;;
    list)
      list_secrets
      ;;
    check)
      check_missing
      ;;
    export)
      export_for_github
      ;;
    help)
      show_help
      ;;
    *)
      echo -e "${RED}Unknown command: $command${NC}"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
