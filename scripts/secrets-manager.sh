#!/usr/bin/env bash

# DSG runtime secret manager: Azure Key Vault + App Service Managed Identity.
# Secret values are never printed. Local OpenSSL files and AWS export are retired.

set -euo pipefail

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "BLOCK: required command not found: $1" >&2; exit 1; }
}

require_target() {
  : "${AZURE_RESOURCE_GROUP:?BLOCK: set AZURE_RESOURCE_GROUP}"
  : "${AZURE_WEBAPP_NAME:?BLOCK: set AZURE_WEBAPP_NAME}"
  : "${AZURE_KEY_VAULT_NAME:?BLOCK: set AZURE_KEY_VAULT_NAME}"
  [[ "$AZURE_KEY_VAULT_NAME" =~ ^[A-Za-z][A-Za-z0-9-]{2,23}$ ]] || {
    echo 'BLOCK: AZURE_KEY_VAULT_NAME must be 3-24 characters, start with a letter, and contain only letters, digits, or hyphens' >&2
    exit 1
  }
}

slot_args() {
  if [[ "${AZURE_SLOT:-production}" == 'staging' ]]; then printf '%s\n' '--slot' 'staging'; fi
}

ensure_login() {
  require_command az
  az account show --only-show-errors --output none >/dev/null
}

assign_role() {
  local object_id="$1" role="$2" scope="$3" assignment_output
  if ! assignment_output="$(az role assignment create \
    --assignee-object-id "$object_id" \
    --assignee-principal-type ServicePrincipal \
    --role "$role" \
    --scope "$scope" \
    --only-show-errors \
    --output none 2>&1)"; then
    if [[ "$assignment_output" != *RoleAssignmentExists* ]]; then
      echo "BLOCK: unable to assign $role" >&2
      exit 1
    fi
  fi
}

bootstrap() {
  require_target
  ensure_login
  if ! az keyvault show --name "$AZURE_KEY_VAULT_NAME" --only-show-errors --output none 2>/dev/null; then
    local location
    location="$(az group show --name "$AZURE_RESOURCE_GROUP" --query location --output tsv)"
    az keyvault create \
      --name "$AZURE_KEY_VAULT_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --location "$location" \
      --enable-rbac-authorization true \
      --enable-purge-protection true \
      --only-show-errors \
      --output none
  fi

  local vault_id principal_id
  local -a webapp_slot_args=()
  mapfile -t webapp_slot_args < <(slot_args)
  vault_id="$(az keyvault show --name "$AZURE_KEY_VAULT_NAME" --query id --output tsv)"
  principal_id="$(az webapp identity assign \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_WEBAPP_NAME" \
    "${webapp_slot_args[@]}" \
    --query principalId \
    --output tsv)"
  [[ -n "$principal_id" ]] || { echo 'BLOCK: App Service Managed Identity has no principalId' >&2; exit 1; }
  assign_role "$principal_id" 'Key Vault Secrets User' "$vault_id"
  echo "PASS: $AZURE_WEBAPP_NAME (${AZURE_SLOT:-production}) can resolve secrets from $AZURE_KEY_VAULT_NAME"
}

put_secret() {
  require_target
  ensure_login
  local name="${1:-}" file="${2:-}"
  [[ "$name" =~ ^[A-Za-z0-9-]{1,127}$ ]] || { echo 'BLOCK: secret name must contain only letters, digits, or hyphens' >&2; exit 1; }
  [[ -n "$file" && -f "$file" && ! -L "$file" && -r "$file" ]] || { echo 'BLOCK: provide a readable, non-symlink secret value file' >&2; exit 1; }
  az keyvault secret set \
    --vault-name "$AZURE_KEY_VAULT_NAME" \
    --name "$name" \
    --file "$file" \
    --encoding utf-8 \
    --only-show-errors \
    --output none
  echo "PASS: wrote a new version of secret $name; value was not printed"
}

list_secrets() {
  require_target
  ensure_login
  echo "Secret names in $AZURE_KEY_VAULT_NAME:"
  az keyvault secret list --vault-name "$AZURE_KEY_VAULT_NAME" \
    --query '[].name' --only-show-errors --output tsv
}

validate_references() {
  require_target
  ensure_login
  local -a webapp_slot_args=()
  mapfile -t webapp_slot_args < <(slot_args)
  local resource_id references_count unresolved_count
  resource_id="$(az webapp show --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_WEBAPP_NAME" "${webapp_slot_args[@]}" --query id --output tsv)"
  references_count="$(az rest --method get \
    --uri "https://management.azure.com${resource_id}/config/configreferences/appsettings?api-version=2026-07-15" \
    --query 'length(value)' --only-show-errors --output tsv)"
  unresolved_count="$(az rest --method get \
    --uri "https://management.azure.com${resource_id}/config/configreferences/appsettings?api-version=2026-07-15" \
    --query "length(value[?properties.status!='Resolved'])" --only-show-errors --output tsv)"
  az rest --method get \
    --uri "https://management.azure.com${resource_id}/config/configreferences/appsettings?api-version=2026-07-15" \
    --query 'value[].{name:name,status:properties.status}' --only-show-errors --output table
  [[ "$references_count" -gt 0 ]] || { echo 'BLOCK: no Key Vault App Setting references are configured' >&2; exit 1; }
  [[ "$unresolved_count" -eq 0 ]] || { echo "BLOCK: $unresolved_count Key Vault references are unresolved" >&2; exit 1; }
  echo "PASS: all $references_count Key Vault references are Resolved; values were not read"
}

usage() {
  printf '%s\n' \
    'DSG Azure Key Vault secret manager' \
    '' \
    'Commands:' \
    '  bootstrap              create/reuse vault and bind App Service Managed Identity' \
    '  put NAME VALUE_FILE    write a new secret version without printing the value' \
    '  list                   list secret names only' \
    '  validate               require every App Service Key Vault reference to be Resolved' \
    '' \
    'Required environment: AZURE_RESOURCE_GROUP, AZURE_WEBAPP_NAME, AZURE_KEY_VAULT_NAME' \
    'Optional: AZURE_SLOT=production|staging'
}

case "${1:-help}" in
  bootstrap) bootstrap ;;
  put) shift; put_secret "$@" ;;
  list) list_secrets ;;
  validate) validate_references ;;
  init|load|check|encrypt|decrypt|export)
    echo "BLOCK: '$1' belonged to the retired local/AWS secret manager; use Azure Key Vault commands" >&2
    exit 1
    ;;
  help|-h|--help) usage ;;
  *) echo "BLOCK: unknown command: $1" >&2; usage >&2; exit 1 ;;
esac
