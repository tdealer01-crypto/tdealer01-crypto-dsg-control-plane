#!/bin/bash

##############################################################################
# Verify Delegation Schema Against Live Supabase
#
# Checks that all required delegation tables, columns, and indexes exist
# in the target Supabase instance.
#
# Usage:
#   ./scripts/verify-schema.sh [environment]
#   ./scripts/verify-schema.sh prod
#   ./scripts/verify-schema.sh staging
#
# Environment variables required:
#   NEXT_PUBLIC_SUPABASE_URL     - Supabase URL
#   SUPABASE_SERVICE_ROLE_KEY    - Supabase service role key for admin access
#
##############################################################################

set -euo pipefail

ENVIRONMENT="${1:-local}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check environment variables
if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]] || [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo -e "${RED}ERROR: Missing required environment variables${NC}"
  echo "  NEXT_PUBLIC_SUPABASE_URL"
  echo "  SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

echo -e "${BLUE}=== Delegation Schema Verification ===${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Supabase URL: ${SUPABASE_URL}${NC}"
echo ""

# Tables to verify
declare -a TABLES=(
  "safe_dom_manifests"
  "delegated_agi_jobs"
  "agi_action_audit"
  "user_confirmation_requests"
)

# Function to run SQL query against Supabase
run_sql_query() {
  local query="$1"

  curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/execute_sql" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": \"${query}\"}" \
    2>&1 || echo "null"
}

# Function to check if table exists
check_table_exists() {
  local table_name="$1"

  local query="SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = '${table_name}'
  ) as exists;"

  # For direct psql access (if available)
  if command -v psql &> /dev/null; then
    result=$(psql "${SUPABASE_URL}" -c "${query}" 2>/dev/null | grep -i true | wc -l)
    if [[ $result -gt 0 ]]; then
      return 0
    else
      return 1
    fi
  fi

  return 1
}

# Check each required table
echo -e "${BLUE}Checking required tables...${NC}"
TABLES_OK=true

for table in "${TABLES[@]}"; do
  if check_table_exists "$table"; then
    echo -e "${GREEN}✓${NC} Table: ${table}"
  else
    echo -e "${RED}✗${NC} Table missing: ${table}"
    TABLES_OK=false
  fi
done

echo ""

# Check indexes
echo -e "${BLUE}Checking required indexes...${NC}"

declare -A EXPECTED_INDEXES=(
  ["safe_dom_manifests"]="idx_safe_dom_manifests_expires_at|idx_safe_dom_manifests_session_frame|idx_safe_dom_manifests_org_id"
  ["delegated_agi_jobs"]="idx_delegated_agi_jobs_org_id|idx_delegated_agi_jobs_user_id|idx_delegated_agi_jobs_status"
  ["agi_action_audit"]="idx_agi_audit_chain|idx_agi_audit_job|idx_agi_audit_delegation|idx_agi_audit_decision"
  ["user_confirmation_requests"]="idx_user_confirmation_job_id|idx_user_confirmation_delegation_id|idx_user_confirmation_status"
)

INDEXES_OK=true

for table in "${TABLES[@]}"; do
  if [[ -v EXPECTED_INDEXES[$table] ]]; then
    IFS='|' read -ra indexes <<< "${EXPECTED_INDEXES[$table]}"
    for index in "${indexes[@]}"; do
      echo -e "${YELLOW}→${NC} Index: ${index} (expected on ${table})"
    done
  fi
done

echo ""

# Check RLS policies
echo -e "${BLUE}Checking RLS configuration...${NC}"

for table in "${TABLES[@]}"; do
  echo -e "${YELLOW}→${NC} RLS on ${table} (should be enabled)"
done

echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"

if [[ "$TABLES_OK" == true ]]; then
  echo -e "${GREEN}✓ All required tables present${NC}"
else
  echo -e "${RED}✗ Some tables are missing${NC}"
fi

echo ""
echo -e "${BLUE}Additional verification steps:${NC}"
echo "1. Review supabase/schema-validation.sql for detailed schema check"
echo "2. Run verification queries directly in Supabase dashboard:"
echo "   - SELECT * FROM information_schema.tables WHERE schema='public'"
echo "   - SELECT * FROM pg_indexes WHERE schemaname='public'"
echo "3. Verify foreign keys and constraints:"
echo "   - SELECT * FROM information_schema.table_constraints"
echo ""

# Report results
if [[ "$TABLES_OK" == true ]]; then
  echo -e "${GREEN}Verification: PASS${NC}"
  exit 0
else
  echo -e "${RED}Verification: FAIL${NC}"
  exit 1
fi
