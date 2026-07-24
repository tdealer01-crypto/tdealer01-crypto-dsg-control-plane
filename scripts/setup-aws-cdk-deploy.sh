#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
GITHUB_REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//')
REPO_OWNER=$(echo "$GITHUB_REPO" | cut -d'/' -f1)
REPO_NAME=$(echo "$GITHUB_REPO" | cut -d'/' -f2)
IAM_ROLE_NAME="cdk-deploy-github-actions"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}AWS CDK Deployment Setup${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first:${NC}"
    echo "  https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi
echo -e "${GREEN}✅ AWS CLI found${NC}"

# Check jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq not found. Please install it first:${NC}"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    exit 1
fi
echo -e "${GREEN}✅ jq found${NC}"

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not found. Please install it first:${NC}"
    echo "  https://cli.github.com/"
    exit 1
fi
echo -e "${GREEN}✅ GitHub CLI found${NC}"

echo ""

# Get AWS Account ID
echo -e "${YELLOW}Retrieving AWS Account ID...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS Account ID. Check your AWS credentials.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AWS Account ID: $AWS_ACCOUNT_ID${NC}"
echo ""

# Step 1: Create OIDC Provider (if doesn't exist)
echo -e "${YELLOW}Step 1: Setting up AWS OIDC Provider...${NC}"

OIDC_PROVIDER_URL="https://token.actions.githubusercontent.com"
PROVIDER_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

# Check if OIDC provider already exists
if aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?OpenIDConnectProviderArn=='${PROVIDER_ARN}']" --output json | jq -e '.[]' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OIDC Provider already exists${NC}"
else
    echo -e "${BLUE}Creating OIDC Provider...${NC}"

    # Get thumbprint
    THUMBPRINT=$(echo | openssl s_client -servername token.actions.githubusercontent.com -showcerts -connect token.actions.githubusercontent.com:443 2>/dev/null | openssl x509 -fingerprint -noout | cut -d'=' -f2 | tr -d ':' | awk '{print tolower($0)}')

    aws iam create-open-id-connect-provider \
        --url "$OIDC_PROVIDER_URL" \
        --client-id-list "sts.amazonaws.com" \
        --thumbprint-list "$THUMBPRINT" \
        --region "$AWS_REGION" > /dev/null 2>&1 || true

    echo -e "${GREEN}✅ OIDC Provider configured${NC}"
fi
echo ""

# Step 2: Create IAM Role
echo -e "${YELLOW}Step 2: Creating IAM Role...${NC}"

# Check if role exists
if aws iam get-role --role-name "$IAM_ROLE_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ IAM Role already exists: $IAM_ROLE_NAME${NC}"
else
    echo -e "${BLUE}Creating IAM role...${NC}"

    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_REPO}:*"
        }
      }
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "$IAM_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "Role for CDK deployment from GitHub Actions" \
        --region "$AWS_REGION" > /dev/null 2>&1

    # Attach policy
    aws iam attach-role-policy \
        --role-name "$IAM_ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
        --region "$AWS_REGION"

    rm -f /tmp/trust-policy.json

    echo -e "${GREEN}✅ IAM Role created: $IAM_ROLE_NAME${NC}"
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "$IAM_ROLE_NAME" --query 'Role.Arn' --output text)
echo "   Role ARN: $ROLE_ARN"
echo ""

# Step 3: Setup GitHub Secrets
echo -e "${YELLOW}Step 3: Configuring GitHub Secrets...${NC}"

# Check if we can access the repo
if ! gh repo view "$GITHUB_REPO" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot access GitHub repository: $GITHUB_REPO${NC}"
    echo "   Make sure you're authenticated with GitHub CLI:"
    echo "   gh auth login"
    exit 1
fi

# Set secrets
echo -e "${BLUE}Setting GitHub secrets...${NC}"

# Set AWS_ROLE_TO_ASSUME
echo "$ROLE_ARN" | gh secret set AWS_ROLE_TO_ASSUME --repo "$GITHUB_REPO" 2>/dev/null || true
echo -e "${GREEN}✅ AWS_ROLE_TO_ASSUME set${NC}"

# Set AWS_REGION
echo "$AWS_REGION" | gh secret set AWS_REGION --repo "$GITHUB_REPO" 2>/dev/null || true
echo -e "${GREEN}✅ AWS_REGION set${NC}"

echo ""

# Step 4: Test configuration
echo -e "${YELLOW}Step 4: Testing AWS configuration...${NC}"

# Test AWS credentials
if aws sts get-caller-identity --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AWS credentials valid${NC}"
else
    echo -e "${RED}❌ AWS credentials invalid${NC}"
    exit 1
fi

# Test CloudFormation permissions
if aws cloudformation validate-template --template-body file:///dev/null --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CloudFormation access confirmed${NC}"
elif aws cloudformation list-stacks --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CloudFormation access confirmed${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify CloudFormation access${NC}"
fi

echo ""

# Step 5: Display summary and next steps
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

echo -e "${BLUE}Configuration Summary:${NC}"
echo "  AWS Account ID:        $AWS_ACCOUNT_ID"
echo "  AWS Region:            $AWS_REGION"
echo "  IAM Role:              $IAM_ROLE_NAME"
echo "  Role ARN:              $ROLE_ARN"
echo "  GitHub Repository:     $GITHUB_REPO"
echo ""

echo -e "${BLUE}GitHub Secrets Configured:${NC}"
echo "  ✅ AWS_ROLE_TO_ASSUME"
echo "  ✅ AWS_REGION"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Trigger deployment manually:"
echo "   ${YELLOW}gh workflow run deploy-cdk.yml -f environment=dev${NC}"
echo ""
echo "2. Or push to main branch to trigger automatic deployment:"
echo "   ${YELLOW}git push origin main${NC}"
echo ""
echo "3. Monitor deployment:"
echo "   ${YELLOW}gh run list --workflow=deploy-cdk.yml -L 10${NC}"
echo ""

# Save configuration to file
cat > ~/.aws-cdk-deploy.env << EOF
#!/bin/bash
# AWS CDK Deploy Configuration
export AWS_ACCOUNT_ID="$AWS_ACCOUNT_ID"
export AWS_REGION="$AWS_REGION"
export IAM_ROLE_NAME="$IAM_ROLE_NAME"
export ROLE_ARN="$ROLE_ARN"
export GITHUB_REPO="$GITHUB_REPO"
EOF

echo -e "${GREEN}Configuration saved to: ~/.aws-cdk-deploy.env${NC}"
echo ""
echo "Load configuration anytime:"
echo "   ${YELLOW}source ~/.aws-cdk-deploy.env${NC}"
echo ""
