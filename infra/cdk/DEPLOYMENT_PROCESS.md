# AWS CDK Infrastructure Deployment Process

This document provides the complete process for deploying DSG ONE / ProofGate infrastructure using AWS CDK.

## Prerequisites

### Required AWS Setup
1. **AWS Account**: Active AWS account with appropriate billing setup
2. **AWS Credentials**: Configured with `aws configure` or environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (default: us-east-1)
3. **IAM Permissions**: User/role must have permissions to:
   - Create/manage CloudFormation stacks
   - Create/manage EC2 resources (VPC, subnets, security groups)
   - Create/manage ECS resources (clusters, services, task definitions)
   - Create/manage RDS resources (databases, parameter groups)
   - Create/manage S3 buckets
   - Create/manage IAM roles and policies
   - Create/manage KMS keys
   - Create/manage CloudTrail
   - Create/manage CloudWatch resources
   - Create/manage Application Load Balancers

### Required Local Tools
- Node.js 18+ (for CDK build)
- npm 8+ (package manager)
- AWS CDK CLI v2+
- AWS CLI v2+ (for manual verification steps)

### Environment Variables
```bash
export AWS_ACCOUNT_ID="121205961822"      # Your AWS account ID
export AWS_REGION="us-east-1"              # Primary region
export AWS_PROFILE="default"                # AWS CLI profile to use
```

## Deployment Steps

### Phase 1: Pre-Deployment Validation

#### 1.1 Verify AWS Account Configuration
```bash
# Check AWS credentials are configured
aws sts get-caller-identity

# Expected output shows:
# - Account: 121205961822
# - UserId: ...
# - Arn: arn:aws:iam::121205961822:user/... or role/...
```

#### 1.2 Verify CDK Environment
```bash
cd infra/cdk

# Set environment variables
export AWS_ACCOUNT_ID="121205961822"
export AWS_REGION="us-east-1"

# Verify environment is set
echo "Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
```

#### 1.3 Validate CDK Configuration
```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Verify no TypeScript errors
npm run build 2>&1 | grep -i error || echo "✓ No TypeScript errors"
```

### Phase 2: Stack Synthesis and Planning

#### 2.1 Synthesize CloudFormation Template
```bash
# Synthesize the CDK stack
npx cdk synth 2>&1

# This generates CloudFormation JSON in cdk.out/
# Expected output ends with "Successfully synthesized..."
```

#### 2.2 Review Infrastructure Changes
```bash
# Show what will be created/changed
npx cdk diff

# Review the diff carefully before proceeding
# Look for unexpected deletions or changes
```

#### 2.3 Review Generated CloudFormation
```bash
# Examine the generated template
cat cdk.out/DSGOneStack-dev.template.json | jq '.Resources | keys | length'

# Count resource types
cat cdk.out/DSGOneStack-dev.template.json | \
  jq '[.Resources[].Type] | group_by(.) | map({type: .[0], count: length}) | sort_by(.count) | reverse[]'
```

### Phase 3: Bootstrap AWS Environment (First Time Only)

The AWS CDK needs to bootstrap certain resources in your AWS account before first deployment.

```bash
# Bootstrap the AWS environment
# This creates an S3 bucket and IAM roles needed by CDK
npx cdk bootstrap aws://121205961822/us-east-1

# Expected output:
# - "Environment bootstrapped successfully"
# - S3 bucket created: cdk-hnb659fds-assets-121205961822-us-east-1
```

### Phase 4: Deploy Infrastructure

#### 4.1 First-Time Deployment

**WARNING**: This deployment creates ~75 AWS resources and may incur costs.

```bash
# Deploy the stack with approval
npx cdk deploy --require-approval never

# Monitor deployment progress
# Expected duration: 20-30 minutes
# Watch for:
# - CREATE_IN_PROGRESS resources
# - No CREATE_FAILED resources
# - Final status: CREATE_COMPLETE
```

#### 4.2 Monitor Deployment

While deployment is running, monitor in the AWS Console:

```bash
# Option 1: Watch CloudFormation stack in AWS Console
# https://console.aws.amazon.com/cloudformation

# Option 2: Use AWS CLI to monitor
aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --query 'Stacks[0].StackStatus' \
  --region us-east-1

# Option 3: Watch events
aws cloudformation describe-stack-events \
  --stack-name dsg-one-dev \
  --region us-east-1 \
  --query 'StackEvents[0:5]' \
  --output table
```

#### 4.3 Handle Deployment Failures

If deployment fails, review the error:

```bash
# Get the failure reason
aws cloudformation describe-stack-events \
  --stack-name dsg-one-dev \
  --region us-east-1 \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'

# Common failures and fixes:
# - S3 bucket already exists: Manually delete or use different suffix
# - ECR repository conflict: Delete old repositories or rename
# - IAM role issues: Verify IAM permissions
# - VPC CIDR conflict: Change VPC CIDR in lib/config/dev.ts
```

### Phase 5: Post-Deployment Verification

#### 5.1 Retrieve Stack Outputs
```bash
# Get all stack outputs
aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output table

# Key outputs to note:
# - LoadBalancerDNS: Application Load Balancer endpoint
# - ECSClusterName: ECS cluster identifier
# - RDSEndpoint: Database endpoint
# - CloudTrailBucketName: CloudTrail S3 bucket
```

#### 5.2 Verify Network Connectivity
```bash
# Test ALB endpoint
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

echo "Testing ALB: $ALB_DNS"
curl -I "http://${ALB_DNS}"

# Expected: HTTP 200 or 502 (if service not running yet)
```

#### 5.3 Check ECS Services
```bash
# List ECS clusters
aws ecs list-clusters --region us-east-1

# Describe ECS services
aws ecs describe-services \
  --cluster dsg-one-dev \
  --services dsg-service \
  --region us-east-1 \
  --query 'services[0].[serviceName,status,runningCount,desiredCount]'

# Expected: serviceName=dsg-service, status=ACTIVE
```

#### 5.4 Verify RDS Database
```bash
# Describe RDS instance
aws rds describe-db-instances \
  --db-instance-identifier dsg-one-dev-db \
  --region us-east-1 \
  --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Engine,AllocatedStorage]'

# Expected: status should be "available"
```

#### 5.5 Verify Security Groups and IAM
```bash
# List security groups
aws ec2 describe-security-groups \
  --filters "Name=tag:Environment,Values=dev" \
  --region us-east-1 \
  --query 'SecurityGroups[*].[GroupName,GroupId]'

# List IAM roles
aws iam list-roles \
  --query "Roles[?contains(RoleName, 'dsg-one-dev')].RoleName"
```

### Phase 6: Application Deployment

#### 6.1 Create/Update ECS Task Definition
```bash
# Task definition is automatically created by CDK
# Verify it exists
aws ecs describe-task-definition \
  --task-definition dsg-control-plane:1 \
  --region us-east-1
```

#### 6.2 Build and Push Docker Image
```bash
# Get ECR repository URI
ECR_REPO=$(aws ecr describe-repositories \
  --repository-names dsg-one-dev-api-v2 \
  --region us-east-1 \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository: $ECR_REPO"

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPO

# Build and push Docker image (from project root)
cd /home/user/tdealer01-crypto-dsg-control-plane
docker build -t ${ECR_REPO}:latest .
docker push ${ECR_REPO}:latest
```

#### 6.3 Update ECS Service
```bash
# Force new deployment of ECS service
aws ecs update-service \
  --cluster dsg-one-dev \
  --service dsg-service \
  --force-new-deployment \
  --region us-east-1

# Monitor service update
aws ecs describe-services \
  --cluster dsg-one-dev \
  --services dsg-service \
  --region us-east-1 \
  --query 'services[0].[runningCount,desiredCount,status]'

# Wait for tasks to become running
aws ecs wait services-stable \
  --cluster dsg-one-dev \
  --services dsg-service \
  --region us-east-1
```

### Phase 7: Health Checks and Monitoring

#### 7.1 Verify Application Health
```bash
# Test health endpoint through ALB
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

curl "http://${ALB_DNS}/api/health" -v

# Expected: 200 OK
```

#### 7.2 Check CloudWatch Logs
```bash
# View ECS task logs
aws logs tail /ecs/dsg-control-plane --follow --region us-east-1

# View ALB access logs (after configured)
aws logs tail /aws/dsg-one/dev/alb --follow --region us-east-1
```

#### 7.3 Monitor CloudTrail Events
```bash
# Verify CloudTrail is logging
aws cloudtrail get-event-selectors \
  --trail-name dsg-one-dev-trail \
  --region us-east-1
```

## Rollback Procedure

### Emergency Rollback (Full Stack Deletion)

```bash
# WARNING: This deletes all infrastructure

# Verify stack exists
aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --region us-east-1

# Delete the stack
npx cdk destroy --force

# Monitor deletion
aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --region us-east-1 \
  --query 'Stacks[0].StackStatus'

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name dsg-one-dev \
  --region us-east-1
```

### Partial Rollback (Specific Resources)

```bash
# Revert to previous stack version (if multiple versions exist)
aws cloudformation cancel-update-stack \
  --stack-name dsg-one-dev \
  --region us-east-1
```

## Deployment Configuration

### Environment-Specific Configurations

The CDK supports multiple environments:

```bash
# Dev environment (small, low-cost)
npm run deploy -- -e dev

# Staging environment (medium, moderate-cost)
npm run deploy -- -e staging

# Production environment (large, high-cost)
npm run deploy -- -e prod
```

Each environment has different configurations in `lib/config/`:
- **dev.ts**: 1 ECS task, 2 AZs, minimal redundancy, 7-day retention
- **staging.ts**: 2 ECS tasks, 3 AZs, medium redundancy, 30-day retention
- **prod.ts**: 3 ECS tasks, 4 AZs, full redundancy, 365-day retention

### Customizing Configuration

Edit `lib/config/{env}.ts` to customize:
- VPC CIDR blocks
- ECS task count and sizing
- Database configuration
- Retention policies
- Feature flags

## Cost Estimation

Estimated monthly costs (approximate):

**Dev Environment**:
- ECS Fargate: $20-30 (1 task, 1 vCPU, 2GB RAM)
- RDS: $15-20 (db.t3.micro)
- Data transfer: $5-10
- **Total: $40-60/month**

**Staging Environment**:
- ECS Fargate: $40-50 (2 tasks)
- RDS: $30-40 (db.t3.small)
- Data transfer: $10-15
- **Total: $80-105/month**

**Production Environment**:
- ECS Fargate: $60-80 (3 tasks, HA setup)
- RDS: $60-100 (db.t3.medium, multi-AZ)
- Data transfer: $20-30
- NAT Gateways: $45 (3 gateways)
- CloudTrail: $5-10
- **Total: $200-300/month**

## Troubleshooting

### Issue: "Resource already exists"

```bash
# List existing resources
aws ec2 describe-vpcs --region us-east-1 | grep dsg-one
aws ecr describe-repositories --region us-east-1 | grep dsg-one

# Delete conflicting resources manually, then redeploy
```

### Issue: "Insufficient IAM permissions"

```bash
# Verify IAM user has CloudFormation permissions
aws iam get-user-policy --user-name $(aws sts get-caller-identity --query User --output text) --policy-name ...

# Add required permissions via IAM policy
```

### Issue: "VPC CIDR already in use"

```bash
# Change VPC CIDR in lib/config/dev.ts
# Edit: networking.vpcCidr: '10.0.0.0/16'
# To: networking.vpcCidr: '10.1.0.0/16'

# Redeploy
```

### Issue: "Deployment timeout"

```bash
# Increase CloudFormation timeout
# Default is 0 (no timeout) - check actual limit

# Check stack creation timeout
aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --region us-east-1 \
  --query 'Stacks[0].TimeoutInMinutes'
```

## Next Steps After Deployment

1. **Configure DNS**: Point domain to ALB DNS
2. **Set up SSL/TLS**: Create ACM certificate and update ALB listener
3. **Deploy Application**: Push Docker image and update ECS service
4. **Configure Secrets**: Store credentials in AWS Secrets Manager
5. **Enable Monitoring**: Set up CloudWatch alarms and dashboards
6. **Configure Backups**: Set up RDS backup policies
7. **Test High Availability**: Verify service recovery after instance failure
8. **Load Testing**: Validate performance under expected load

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [CloudFormation Best Practices](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html)
- [ECS Launch Type Comparison](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)

## Support

For issues:
1. Check CloudFormation events: `aws cloudformation describe-stack-events --stack-name dsg-one-dev`
2. Review CDK debug output: `CDK_DEBUG=1 npx cdk deploy`
3. Check AWS IAM permissions: `aws iam get-user-policy`
4. Review CloudWatch logs: `aws logs tail /ecs/dsg-control-plane --follow`
