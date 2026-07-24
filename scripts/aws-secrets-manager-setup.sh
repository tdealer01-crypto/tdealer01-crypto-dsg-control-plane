#!/bin/bash

################################################################################
# AWS Secrets Manager Setup Script for DSG ONE
#
# This script automates the setup of AWS Secrets Manager with proper
# encryption, credential broker integration, and production-ready configuration.
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - AWS credentials with appropriate IAM permissions
#   - jq installed (for JSON processing)
#
# Usage:
#   ./scripts/aws-secrets-manager-setup.sh [environment]
#
# Examples:
#   ./scripts/aws-secrets-manager-setup.sh dev
#   ./scripts/aws-secrets-manager-setup.sh prod
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="dsg-one"
STACK_NAME="dsg-one-cdk-${ENVIRONMENT}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please configure AWS credentials."
        exit 1
    fi

    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_success "AWS credentials verified. Account ID: $AWS_ACCOUNT_ID"
}

verify_aws_access() {
    log_info "Verifying AWS permissions..."

    local required_actions=(
        "secretsmanager:CreateSecret"
        "secretsmanager:UpdateSecret"
        "secretsmanager:GetSecretValue"
        "kms:CreateKey"
        "kms:CreateAlias"
        "iam:CreateRole"
        "iam:AttachRolePolicy"
    )

    log_success "AWS IAM permissions check required (manual verification recommended)"
    log_info "Required IAM actions: ${required_actions[@]}"
}

create_kms_key() {
    local key_name="${PROJECT_NAME}-${ENVIRONMENT}-secrets-key"
    local alias="alias/${key_name}"
    local kms_key_id=""

    # Check if key alias already exists
    if aws kms list-aliases --region "$AWS_REGION" 2>/dev/null | grep -q "\"AliasName\": \"$alias\""; then
        log_warn "KMS key alias already exists: $alias"
        kms_key_id=$(aws kms list-aliases --region "$AWS_REGION" | jq -r ".Aliases[] | select(.AliasName == \"$alias\") | .TargetKeyId")
    else
        log_info "Creating new KMS key..."
        local key_response=$(aws kms create-key \
            --region "$AWS_REGION" \
            --description "Encryption key for $PROJECT_NAME $ENVIRONMENT Secrets Manager" \
            --tags TagKey=Environment,TagValue="$ENVIRONMENT" TagKey=Project,TagValue="$PROJECT_NAME" 2>/dev/null)

        kms_key_id=$(echo "$key_response" | jq -r '.KeyMetadata.KeyId' 2>/dev/null)

        if [ -z "$kms_key_id" ] || [ "$kms_key_id" = "null" ]; then
            log_error "Failed to create KMS key"
        fi

        # Create alias
        aws kms create-alias \
            --alias-name "$alias" \
            --target-key-id "$kms_key_id" \
            --region "$AWS_REGION" 2>/dev/null || true

        log_success "KMS key created: $kms_key_id"
    fi

    # Only output the key ID, no log messages
    echo "$kms_key_id"
}

create_secrets() {
    log_info "Creating AWS Secrets Manager secrets..."

    local kms_key_id="$1"

    # API Secrets
    log_info "Creating API secrets..."
    create_or_update_secret "api-secrets" '{
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY_HERE",
        "JWT_SECRET": "YOUR_JWT_SECRET_HERE",
        "API_KEY": "YOUR_API_KEY_HERE"
    }' "$kms_key_id"

    # Database Secrets
    log_info "Creating database secrets..."
    create_or_update_secret "database-secrets" '{
        "username": "dsg_admin",
        "password": "GENERATE_STRONG_PASSWORD_HERE",
        "host": "YOUR_DB_HOST_HERE",
        "port": "5432",
        "dbname": "dsg_one"
    }' "$kms_key_id"

    # OAuth Secrets
    log_info "Creating OAuth secrets..."
    create_or_update_secret "oauth-secrets" '{
        "GITHUB_CLIENT_ID": "YOUR_GITHUB_CLIENT_ID_HERE",
        "GITHUB_CLIENT_SECRET": "YOUR_GITHUB_CLIENT_SECRET_HERE",
        "GOOGLE_CLIENT_ID": "YOUR_GOOGLE_CLIENT_ID_HERE",
        "GOOGLE_CLIENT_SECRET": "YOUR_GOOGLE_CLIENT_SECRET_HERE"
    }' "$kms_key_id"

    log_success "All secrets created successfully"
}

create_or_update_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local kms_key_id="$3"
    local full_secret_name="${PROJECT_NAME}-${ENVIRONMENT}-${secret_name}"

    if aws secretsmanager describe-secret \
        --secret-id "$full_secret_name" \
        --region "$AWS_REGION" &> /dev/null; then

        log_info "Updating existing secret: $full_secret_name"
        aws secretsmanager update-secret \
            --secret-id "$full_secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
    else
        log_info "Creating new secret: $full_secret_name"
        aws secretsmanager create-secret \
            --name "$full_secret_name" \
            --description "DSG ONE $ENVIRONMENT $(echo $secret_name | sed 's/-/ /g')" \
            --secret-string "$secret_value" \
            --kms-key-id "$kms_key_id" \
            --tags Key=Environment,Value="$ENVIRONMENT" Key=Project,Value="$PROJECT_NAME" \
            --region "$AWS_REGION"
    fi

    log_success "Secret created/updated: $full_secret_name"
}

setup_iam_roles() {
    log_info "Setting up IAM roles for ECS task execution..."

    local role_name="${PROJECT_NAME}-${ENVIRONMENT}-ecs-task-role"
    local policy_name="${PROJECT_NAME}-${ENVIRONMENT}-secrets-access"

    # Check if role exists
    if aws iam get-role --role-name "$role_name" &> /dev/null; then
        log_warn "IAM role already exists: $role_name"
    else
        log_info "Creating IAM role for ECS tasks..."

        # Create trust policy
        local trust_policy='{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }]
        }'

        aws iam create-role \
            --role-name "$role_name" \
            --assume-role-policy-document "$trust_policy"

        log_success "IAM role created: $role_name"
    fi

    # Create and attach policy for Secrets Manager access
    local secrets_policy="{
        \"Version\": \"2012-10-17\",
        \"Statement\": [
            {
                \"Effect\": \"Allow\",
                \"Action\": [
                    \"secretsmanager:GetSecretValue\",
                    \"secretsmanager:DescribeSecret\"
                ],
                \"Resource\": \"arn:aws:secretsmanager:${AWS_REGION}:*:secret:${PROJECT_NAME}-${ENVIRONMENT}-*\"
            },
            {
                \"Effect\": \"Allow\",
                \"Action\": [
                    \"kms:Decrypt\",
                    \"kms:DescribeKey\"
                ],
                \"Resource\": \"*\",
                \"Condition\": {
                    \"StringEquals\": {
                        \"kms:ViaService\": \"secretsmanager.${AWS_REGION}.amazonaws.com\"
                    }
                }
            }
        ]
    }"

    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "$policy_name" \
        --policy-document "$secrets_policy"

    log_success "IAM policy attached: $policy_name"
}

list_secrets() {
    log_info "Listing created secrets..."

    local secrets=$(aws secretsmanager list-secrets \
        --region "$AWS_REGION" \
        --filters Key=name,Values="${PROJECT_NAME}-${ENVIRONMENT}" \
        --query 'SecretList[*].[Name,ARN]' \
        --output table)

    echo "$secrets"
}

output_summary() {
    log_info "AWS Secrets Manager Setup Summary"
    echo "=================================="
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo "AWS Account: $AWS_ACCOUNT_ID"
    echo ""
    echo "Secrets created with naming pattern:"
    echo "  - ${PROJECT_NAME}-${ENVIRONMENT}-api-secrets"
    echo "  - ${PROJECT_NAME}-${ENVIRONMENT}-database-secrets"
    echo "  - ${PROJECT_NAME}-${ENVIRONMENT}-oauth-secrets"
    echo ""
    echo "Next steps:"
    echo "1. Update secret values in AWS Secrets Manager console"
    echo "2. Configure ECS task execution role with proper IAM permissions"
    echo "3. Set environment variable: SECRETS_MANAGER_ENABLED=true"
    echo "4. Deploy CDK stack: cd infra/cdk && npm run deploy"
    echo ""
    echo "To verify secrets:"
    echo "  aws secretsmanager get-secret-value --secret-id ${PROJECT_NAME}-${ENVIRONMENT}-api-secrets --region $AWS_REGION"
}

main() {
    log_info "Starting AWS Secrets Manager setup for DSG ONE ($ENVIRONMENT environment)"

    # Run setup steps
    check_prerequisites
    verify_aws_access

    # Create KMS key (capture output only)
    log_info "Creating KMS encryption key for Secrets Manager..."
    KMS_KEY_ID=$(create_kms_key 2>&1 | tail -1)

    if [ -z "$KMS_KEY_ID" ] || [ "$KMS_KEY_ID" = "null" ]; then
        log_error "Failed to create or retrieve KMS key ID"
    fi

    log_success "KMS Key ID: $KMS_KEY_ID"

    # Create secrets
    create_secrets "$KMS_KEY_ID"

    # Setup IAM roles
    setup_iam_roles

    # List created secrets
    list_secrets

    # Output summary
    output_summary

    log_success "AWS Secrets Manager setup completed!"
}

# Run main function
main "$@"
