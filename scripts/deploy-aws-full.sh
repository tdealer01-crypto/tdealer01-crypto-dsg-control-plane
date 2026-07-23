#!/bin/bash

################################################################################
# Full AWS Deployment Script for DSG ONE
#
# Orchestrates complete deployment:
# 1. Secrets Manager setup
# 2. CDK infrastructure deployment
# 3. Post-deployment configuration
# 4. Health checks and verification
#
# Usage:
#   ./scripts/deploy-aws-full.sh [environment] [region]
#
# Examples:
#   ./scripts/deploy-aws-full.sh dev us-east-1
#   ./scripts/deploy-aws-full.sh prod us-east-1
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-dev}"
AWS_REGION="${2:-us-east-1}"
PROJECT_NAME="dsg-one"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# State tracking
STEP_COUNT=0
FAILED_STEPS=()

# Helper functions
log_step() {
    STEP_COUNT=$((STEP_COUNT + 1))
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} Step $STEP_COUNT: $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

record_failure() {
    FAILED_STEPS+=("$1")
}

# Main deployment steps
check_prerequisites() {
    log_step "Verify Prerequisites"

    local required_tools=("aws" "jq" "node" "npm" "git")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        else
            log_success "Found $tool ($(command -v "$tool" 2>/dev/null | awk -F' ' '{print $NF}'))"
        fi
    done

    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Install missing tools:"
        echo "  macOS (Homebrew): brew install ${missing_tools[*]}"
        echo "  Ubuntu/Debian: apt-get install ${missing_tools[*]}"
        exit 1
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        echo "Run: aws configure"
        exit 1
    fi

    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)

    log_success "AWS credentials verified"
    log_info "Account ID: $AWS_ACCOUNT_ID"
    log_info "User: $AWS_USER"
    log_info "Region: $AWS_REGION"
}

setup_secrets_manager() {
    log_step "Setup AWS Secrets Manager"

    if [ ! -f "$SCRIPT_DIR/aws-secrets-manager-setup.sh" ]; then
        log_error "Secrets Manager setup script not found"
        record_failure "Secrets Manager setup"
        return 1
    fi

    log_info "Running Secrets Manager setup..."
    if bash "$SCRIPT_DIR/aws-secrets-manager-setup.sh" "$ENVIRONMENT"; then
        log_success "Secrets Manager setup completed"
    else
        log_error "Secrets Manager setup failed"
        record_failure "Secrets Manager setup"
        return 1
    fi
}

validate_secrets() {
    log_step "Validate Secrets"

    log_info "Checking if secrets exist..."
    local secrets=(
        "${PROJECT_NAME}-${ENVIRONMENT}-api-secrets"
        "${PROJECT_NAME}-${ENVIRONMENT}-database-secrets"
        "${PROJECT_NAME}-${ENVIRONMENT}-oauth-secrets"
    )

    for secret in "${secrets[@]}"; do
        if aws secretsmanager describe-secret \
            --secret-id "$secret" \
            --region "$AWS_REGION" &> /dev/null; then
            log_success "Secret found: $secret"
        else
            log_warn "Secret not found: $secret (may need manual creation)"
        fi
    done
}

build_cdk() {
    log_step "Build AWS CDK Infrastructure Code"

    cd "$REPO_ROOT/infra/cdk"

    log_info "Installing CDK dependencies..."
    if npm ci --prefer-offline; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        record_failure "CDK dependencies"
        cd "$REPO_ROOT"
        return 1
    fi

    log_info "Building TypeScript..."
    if npm run build; then
        log_success "CDK code built successfully"
    else
        log_error "Failed to build CDK code"
        record_failure "CDK build"
        cd "$REPO_ROOT"
        return 1
    fi

    cd "$REPO_ROOT"
}

preview_cdk_changes() {
    log_step "Preview CDK Changes"

    cd "$REPO_ROOT/infra/cdk"

    log_info "Running 'cdk diff' to preview changes..."
    log_info "(Press 'q' to exit the diff viewer)"
    echo ""

    if npm run diff 2>&1 | head -100; then
        log_success "CDK diff preview completed"
    else
        log_warn "CDK diff returned non-zero exit code (this is sometimes expected)"
    fi

    cd "$REPO_ROOT"
}

deploy_cdk() {
    log_step "Deploy AWS CDK Stack"

    cd "$REPO_ROOT/infra/cdk"

    local stack_name="${PROJECT_NAME}-cdk-${ENVIRONMENT}"

    log_info "Deploying CDK stack: $stack_name"
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    echo ""

    # Set AWS_REGION for CDK
    export AWS_REGION

    if npm run deploy; then
        log_success "CDK stack deployed successfully"
    else
        log_error "CDK deployment failed"
        record_failure "CDK deployment"
        cd "$REPO_ROOT"
        return 1
    fi

    cd "$REPO_ROOT"
}

verify_deployment() {
    log_step "Verify Deployment"

    local stack_name="${PROJECT_NAME}-cdk-${ENVIRONMENT}"

    log_info "Checking stack status..."

    local stack_status=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")

    case "$stack_status" in
        "CREATE_COMPLETE"|"UPDATE_COMPLETE")
            log_success "Stack status: $stack_status ✓"
            ;;
        "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
            log_info "Stack status: $stack_status (still deploying...)"
            ;;
        "ROLLBACK_COMPLETE"|"UPDATE_ROLLBACK_COMPLETE")
            log_error "Stack status: $stack_status (deployment failed)"
            record_failure "Deployment verification"
            return 1
            ;;
        "NOT_FOUND")
            log_error "Stack not found: $stack_name"
            record_failure "Deployment verification"
            return 1
            ;;
        *)
            log_warn "Unknown stack status: $stack_status"
            ;;
    esac

    # Get stack outputs
    log_info "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table 2>/dev/null || log_warn "No outputs available"
}

generate_env_file() {
    log_step "Generate Environment Configuration"

    local env_file="$REPO_ROOT/.env.aws.${ENVIRONMENT}"

    log_info "Creating environment file: $env_file"

    cat > "$env_file" << EOF
# AWS Configuration - $ENVIRONMENT environment
# Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')

# AWS Setup
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

# Secrets Manager Configuration
SECRETS_MANAGER_ENABLED=true
CREDENTIAL_BROKER_BACKEND=aws-secrets-manager
CREDENTIAL_BROKER_DEFAULT_LEASE_TTL_MS=300000

# Stack Information
CDK_STACK_NAME=${PROJECT_NAME}-cdk-${ENVIRONMENT}
ENVIRONMENT=$ENVIRONMENT

# Next Steps:
# 1. Review and update actual secret values in AWS Secrets Manager
# 2. Deploy ECS services with this configuration
# 3. Monitor CloudWatch logs for credential broker operations
EOF

    log_success "Environment file created: $env_file"
    echo ""
    log_info "Environment configuration:"
    cat "$env_file" | grep -v "^#" | grep -v "^$"
}

print_summary() {
    log_section "Deployment Summary"

    echo ""
    echo -e "${CYAN}Configuration:${NC}"
    echo "  Environment: $ENVIRONMENT"
    echo "  AWS Region: $AWS_REGION"
    echo "  AWS Account: $AWS_ACCOUNT_ID"
    echo "  Project: $PROJECT_NAME"
    echo ""

    echo -e "${CYAN}Deployed Resources:${NC}"
    echo "  ✓ KMS encryption key"
    echo "  ✓ AWS Secrets Manager (3 secrets)"
    echo "  ✓ IAM roles and policies"
    echo "  ✓ CDK CloudFormation stack"
    echo ""

    if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
        echo -e "${GREEN}Status: All steps completed successfully! ✓${NC}"
    else
        echo -e "${RED}Status: Some steps failed:${NC}"
        for step in "${FAILED_STEPS[@]}"; do
            echo "  ✗ $step"
        done
    fi

    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. Review and update secret values:"
    echo "     aws secretsmanager update-secret --secret-id ${PROJECT_NAME}-${ENVIRONMENT}-api-secrets"
    echo ""
    echo "  2. Deploy ECS service:"
    echo "     aws ecs create-service --cluster dsg-one-${ENVIRONMENT} ..."
    echo ""
    echo "  3. Configure environment variables (.env.aws.${ENVIRONMENT}):"
    cat "$REPO_ROOT/.env.aws.${ENVIRONMENT}"
    echo ""
    echo "  4. Monitor deployment:"
    echo "     aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-cdk-${ENVIRONMENT}"
    echo ""
    echo -e "${CYAN}Documentation:${NC}"
    echo "  AWS Secrets Manager: docs/AWS_SECRETS_MANAGER_GUIDE.md"
    echo "  CDK Infrastructure: infra/cdk/README.md"
    echo "  Deployment Guide: docs/RUNBOOK_DEPLOY.md"
}

main() {
    clear

    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    DSG ONE - AWS Infrastructure Deployment                   ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    log_section "Deployment Configuration"
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo ""
    echo "Press Ctrl+C to cancel, or Enter to continue..."
    read -r

    # Run deployment steps
    check_prerequisites || exit 1
    setup_secrets_manager
    validate_secrets
    build_cdk
    preview_cdk_changes
    deploy_cdk
    verify_deployment
    generate_env_file

    # Print final summary
    print_summary
}

# Trap errors
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
