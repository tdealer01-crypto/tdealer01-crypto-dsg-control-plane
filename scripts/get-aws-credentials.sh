#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SECRET_NAME="${1:-dsg-aws-creds}"
AWS_REGION="${AWS_REGION:-us-east-1}"
OUTPUT_FORMAT="${2:-env}"  # env, export, or json

echo -e "${BLUE}Retrieving AWS Credentials${NC}"
echo ""

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq not found${NC}"
    exit 1
fi

# Retrieve secret
echo -e "${YELLOW}Retrieving secret: $SECRET_NAME${NC}"

SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text 2>/dev/null || echo "")

if [ -z "$SECRET_JSON" ]; then
    echo -e "${RED}❌ Secret not found or not accessible${NC}"
    echo ""
    echo "To create the secret, run:"
    echo ""
    echo "${YELLOW}aws secretsmanager create-secret \\${NC}"
    echo "${YELLOW}  --name dsg-aws-creds \\${NC}"
    echo "${YELLOW}  --secret-string '{${NC}"
    echo "${YELLOW}    \"access_key\": \"YOUR_ACCESS_KEY\",${NC}"
    echo "${YELLOW}    \"secret_key\": \"YOUR_SECRET_KEY\",${NC}"
    echo "${YELLOW}    \"region\": \"us-east-1\"${NC}"
    echo "${YELLOW}  }'${NC}"
    exit 1
fi

# Parse secret
ACCESS_KEY=$(echo "$SECRET_JSON" | jq -r '.access_key // .access_key_id // empty')
SECRET_KEY=$(echo "$SECRET_JSON" | jq -r '.secret_key // .secret_access_key // empty')
REGION=$(echo "$SECRET_JSON" | jq -r '.region // "us-east-1"')

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo -e "${RED}❌ Invalid secret format${NC}"
    echo ""
    echo "Secret must contain: access_key, secret_key, region"
    exit 1
fi

# Output based on format
case "$OUTPUT_FORMAT" in
    "export")
        # Format for shell sourcing
        echo "export AWS_ACCESS_KEY_ID='$ACCESS_KEY'"
        echo "export AWS_SECRET_ACCESS_KEY='$SECRET_KEY'"
        echo "export AWS_DEFAULT_REGION='$REGION'"
        echo "export AWS_REGION='$REGION'"
        echo -e "${GREEN}# Credentials loaded. Ready to deploy!${NC}"
        ;;
    "json")
        # Format as JSON
        echo "{\"access_key_id\": \"$ACCESS_KEY\", \"secret_access_key\": \"$SECRET_KEY\", \"region\": \"$REGION\"}"
        ;;
    *)
        # Default env format with display
        echo -e "${GREEN}✅ Credentials retrieved${NC}"
        echo ""
        echo -e "${BLUE}Credentials:${NC}"
        echo "  Region: $REGION"
        echo "  Access Key ID: ${ACCESS_KEY:0:10}...${ACCESS_KEY: -4}"
        echo ""
        echo -e "${BLUE}To load these credentials, run:${NC}"
        echo ""
        echo "${YELLOW}eval \"\$(./scripts/get-aws-credentials.sh $SECRET_NAME export)\"${NC}"
        echo ""
        echo -e "${BLUE}Or add to your shell profile:${NC}"
        echo ""
        echo "${YELLOW}alias load-aws='eval \"\$(./scripts/get-aws-credentials.sh $SECRET_NAME export)\"'${NC}"
        ;;
esac
