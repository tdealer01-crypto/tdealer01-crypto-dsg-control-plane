#!/usr/bin/env bash
##############################################################################
# verify-deployment.sh
#
# Comprehensive deployment verification for AWS CDK + Vercel stack
# Checks CloudFormation stack, DynamoDB, Secrets Manager, and application health
#
# Usage:
#   ./scripts/verify-deployment.sh
#
##############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REGION="us-east-1"
STACK_NAME="DSGOneStack-dev"
APP_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"

# State tracking
passed=0
failed=0

log_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((passed++))
}

log_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((failed++))
}

log_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_info() {
  echo -e "${YELLOW}ℹ️${NC}  $1"
}

# Check AWS credentials
check_aws_credentials() {
  if ! aws sts get-caller-identity &>/dev/null; then
    log_fail "AWS credentials not configured or invalid"
    return 1
  fi
  return 0
}

# Verify CloudFormation stack
verify_stack() {
  log_section "1. CloudFormation Stack Verification"

  if ! check_aws_credentials; then
    log_fail "Cannot verify AWS stack - credentials not available"
    return
  fi

  local status
  status=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

  if [[ "$status" == "CREATE_COMPLETE" || "$status" == "UPDATE_COMPLETE" ]]; then
    log_pass "Stack $STACK_NAME is in $status state"

    # Get stack creation time
    local created
    created=$(aws cloudformation describe-stacks \
      --stack-name "$STACK_NAME" \
      --region "$REGION" \
      --query 'Stacks[0].CreationTime' \
      --output text)
    log_info "Created: $created"
  else
    log_fail "Stack status: $status (expected CREATE_COMPLETE or UPDATE_COMPLETE)"
  fi
}

# Verify DynamoDB tables
verify_dynamodb() {
  log_section "2. DynamoDB Tables Verification"

  if ! check_aws_credentials; then
    log_fail "Cannot verify DynamoDB - credentials not available"
    return
  fi

  local tables
  tables=$(aws dynamodb list-tables \
    --region "$REGION" \
    --query 'TableNames[?starts_with(@, `dsg-one-dev`)]' \
    --output json 2>/dev/null || echo "[]")

  local count
  count=$(echo "$tables" | grep -o '"' | wc -l)
  count=$((count / 2))

  if [[ $count -gt 0 ]]; then
    log_pass "Found $count DynamoDB table(s)"
    echo "Tables:"
    echo "$tables" | grep -o '"[^"]*dsg-one-dev[^"]*"' | tr -d '"' | sed 's/^/  /'
  else
    log_fail "No DynamoDB tables found for dsg-one-dev"
  fi
}

# Verify Secrets Manager
verify_secrets() {
  log_section "3. AWS Secrets Manager Verification"

  if ! check_aws_credentials; then
    log_fail "Cannot verify Secrets Manager - credentials not available"
    return
  fi

  local secrets
  secrets=$(aws secretsmanager list-secrets \
    --region "$REGION" \
    --query 'SecretList[?contains(Name, `dsg-one-dev`)].Name' \
    --output json 2>/dev/null || echo "[]")

  local count
  count=$(echo "$secrets" | grep -o '"' | wc -l)
  count=$((count / 2))

  if [[ $count -ge 3 ]]; then
    log_pass "Found $count secret(s) in Secrets Manager"
    echo "Secrets:"
    echo "$secrets" | grep -o '"[^"]*"' | tr -d '"' | sed 's/^/  /'
  else
    log_fail "Expected at least 3 secrets, found $count"
  fi
}

# Verify IAM role
verify_iam_role() {
  log_section "4. IAM Role Verification"

  if ! check_aws_credentials; then
    log_fail "Cannot verify IAM role - credentials not available"
    return
  fi

  if aws iam get-role --role-name dsg-one-dev-ecs-task-role &>/dev/null; then
    log_pass "IAM role dsg-one-dev-ecs-task-role exists"
  else
    log_fail "IAM role dsg-one-dev-ecs-task-role not found"
  fi
}

# Verify KMS key
verify_kms() {
  log_section "5. KMS Encryption Key Verification"

  if ! check_aws_credentials; then
    log_fail "Cannot verify KMS - credentials not available"
    return
  fi

  local key_id
  key_id=$(aws kms list-aliases \
    --region "$REGION" \
    --query 'Aliases[?AliasName==`alias/dsg-one-dev-secrets-key`].TargetKeyId' \
    --output text 2>/dev/null || echo "")

  if [[ -n "$key_id" ]]; then
    log_pass "KMS key alias dsg-one-dev-secrets-key exists"
    log_info "Key ID: $key_id"
  else
    log_fail "KMS key alias dsg-one-dev-secrets-key not found"
  fi
}

# Verify application health
verify_application() {
  log_section "6. Application Health Verification"

  log_info "Checking $APP_URL"

  # Check /api/health
  local health_code
  health_code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health" 2>/dev/null || echo "000")

  if [[ "$health_code" == "200" ]]; then
    log_pass "Health endpoint responding (HTTP 200)"
  else
    log_fail "Health endpoint returned HTTP $health_code"
  fi

  # Check /api/readiness
  local readiness_code
  readiness_code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/readiness" 2>/dev/null || echo "000")

  if [[ "$readiness_code" == "200" ]]; then
    log_pass "Readiness endpoint responding (HTTP 200)"
  else
    log_fail "Readiness endpoint returned HTTP $readiness_code"
  fi

  # Check /api/agent/status
  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/agent/status" 2>/dev/null || echo "000")

  if [[ "$status_code" == "200" ]]; then
    log_pass "Agent status endpoint responding (HTTP 200)"
  else
    log_fail "Agent status endpoint returned HTTP $status_code"
  fi
}

# Main execution
log_section "COMPREHENSIVE DEPLOYMENT VERIFICATION"
echo ""
echo "Stack Name: $STACK_NAME"
echo "Region: $REGION"
echo "App URL: $APP_URL"
echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

verify_stack
verify_dynamodb
verify_secrets
verify_iam_role
verify_kms
verify_application

# Summary
log_section "VERIFICATION SUMMARY"
echo ""
echo "Passed: $passed"
echo "Failed: $failed"
echo ""

if [[ $failed -eq 0 ]]; then
  echo -e "${GREEN}✅ ALL VERIFICATIONS PASSED${NC}"
  echo ""
  echo "Your AWS CDK infrastructure and application are deployed successfully!"
  exit 0
else
  echo -e "${RED}❌ $failed VERIFICATION(S) FAILED${NC}"
  echo ""
  echo "Please check the errors above and refer to:"
  echo "  - AWS CloudFormation console: https://us-east-1.console.aws.amazon.com/cloudformation/"
  echo "  - Vercel dashboard: https://vercel.com"
  exit 1
fi
