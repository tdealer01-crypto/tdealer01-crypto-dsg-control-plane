# DSG ONE AWS CDK Deployment Guide

This guide provides step-by-step instructions for deploying DSG ONE infrastructure using AWS CDK. It covers all environments (dev, staging, production) and includes verification checkpoints to prevent deployment errors.

## Table of Contents

1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [Environment Configuration](#environment-configuration)
3. [CloudFormation Synthesis](#cloudformation-synthesis)
4. [Stack Deployment](#stack-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)
7. [Cleanup Procedures](#cleanup-procedures)

---

## Pre-Deployment Setup

### 1. Verify AWS Credentials

**Objective**: Confirm AWS credentials are properly configured and have required permissions.

```bash
# Check current AWS identity
aws sts get-caller-identity

# Expected output should show:
# {
#     "UserId": "...",
#     "Account": "<AWS_ACCOUNT_ID>",
#     "Arn": "arn:aws:iam::..."
# }
```

**Checklist**:
- [ ] AWS CLI is installed (`aws --version`)
- [ ] AWS credentials are configured (`~/.aws/credentials` or environment variables)
- [ ] Current AWS account matches target environment (dev/staging/prod)
- [ ] IAM user/role has permissions: CloudFormation, CDK, EC2, RDS, DynamoDB, Lambda, KMS, Secrets Manager

### 2. Install Node.js and npm

**Objective**: Ensure Node.js and npm are available.

```bash
# Verify Node.js version (should be 18+)
node --version

# Verify npm version (should be 8+)
npm --version
```

**Checklist**:
- [ ] Node.js 18.0.0 or higher installed
- [ ] npm 8.0.0 or higher installed

### 3. Install AWS CDK CLI

**Objective**: Install CDK toolkit globally.

```bash
# Install CDK CLI
npm install -g aws-cdk

# Verify CDK installation
cdk --version

# Should output: X.Y.Z (e.g., 2.50.0)
```

**Checklist**:
- [ ] CDK CLI installed globally
- [ ] CDK version is compatible with project (see `package.json`)

### 4. Install Project Dependencies

**Objective**: Install all npm dependencies for the CDK project.

```bash
cd /home/user/tdealer01-crypto-dsg-control-plane

# Install dependencies
npm ci

# Verify installation completed without errors
echo "Installation status: $?"
```

**Checklist**:
- [ ] All npm dependencies installed successfully
- [ ] No security vulnerabilities in `npm audit` (or acceptable overrides in place)
- [ ] `node_modules` directory exists and is populated

### 5. Bootstrap AWS Environment

**Objective**: Prepare AWS account for CDK deployments.

```bash
# Bootstrap the AWS account/region combination
# This must be done ONCE per account/region before first CDK deployment
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>

# Example for development environment:
# cdk bootstrap aws://123456789012/us-east-1

# Expected output should show CloudFormation stack creation
```

**Important Notes**:
- Bootstrap creates an S3 bucket for CDK artifacts (named `cdk-hnb659fds-assets-<account>-<region>`)
- This S3 bucket is used to store CloudFormation templates and Lambda code
- Bootstrap can be run safely multiple times (it is idempotent)
- For production, consider using a custom bootstrap role/policy

**Checklist**:
- [ ] Bootstrap command executed successfully
- [ ] CDK bootstrap S3 bucket exists in AWS console
- [ ] Bootstrap CloudFormation stack visible in AWS CloudFormation console

---

## Environment Configuration

### 1. Verify Configuration Files Exist

**Objective**: Ensure all environment configuration files are present.

```bash
# List configuration files
ls -la lib/config/

# Should show:
# - index.ts (configuration loader)
# - types.ts (DSGConfig interface)
# - dev.ts (development environment)
# - staging.ts (staging environment)
# - prod.ts (production environment)
```

**Checklist**:
- [ ] `lib/config/index.ts` exists
- [ ] `lib/config/types.ts` exists
- [ ] `lib/config/dev.ts` exists
- [ ] `lib/config/staging.ts` exists
- [ ] `lib/config/prod.ts` exists

### 2. Verify Environment Variables

**Objective**: Confirm required environment variables are set.

```bash
# For development
export ENVIRONMENT=dev
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

# For staging
export ENVIRONMENT=staging
export AWS_ACCOUNT_ID=234567890123
export AWS_REGION=us-east-1

# For production
export ENVIRONMENT=prod
export AWS_ACCOUNT_ID=345678901234
export AWS_REGION=us-east-1

# Verify variables are set
env | grep -E "ENVIRONMENT|AWS_ACCOUNT_ID|AWS_REGION"
```

**Optional but Recommended**:
- `SLACK_WEBHOOK_URL` - for notifications (production recommended)
- `CDK_DEFAULT_ACCOUNT` - AWS account ID
- `CDK_DEFAULT_REGION` - AWS region

**Checklist**:
- [ ] `ENVIRONMENT` variable set to target environment (dev/staging/prod)
- [ ] `AWS_ACCOUNT_ID` matches target account
- [ ] `AWS_REGION` set to deployment region
- [ ] (Production) Slack webhook configured for alerts

### 3. Validate Configuration

**Objective**: Test configuration loading and validation.

```bash
# Run configuration validation
npm run typecheck

# Verify TypeScript compilation succeeds
echo "Typecheck status: $?"
```

**Checklist**:
- [ ] TypeScript compilation succeeds
- [ ] No configuration validation errors
- [ ] All types are correctly resolved

---

## CloudFormation Synthesis

### 1. Generate CloudFormation Template

**Objective**: Convert CDK code to CloudFormation template for review.

```bash
# Synthesize CloudFormation template
cdk synth --no-staging > cdk.out/template.json

# Verify template was generated
ls -lh cdk.out/template.json

# Review template size (should be reasonable, typically < 10MB)
wc -l cdk.out/template.json
```

**What This Does**:
- Compiles TypeScript CDK code to JavaScript
- Executes CDK app to generate CloudFormation resources
- Outputs a JSON CloudFormation template
- Creates asset files if Lambda/Docker images are included

**Checklist**:
- [ ] Synthesis completed without errors
- [ ] `cdk.out/` directory exists with generated files
- [ ] `template.json` is valid JSON (can parse it)
- [ ] Template contains expected resources for target environment

### 2. Review Generated Template

**Objective**: Inspect CloudFormation template before deployment.

```bash
# Count resource types in template
cat cdk.out/template.json | jq '.Resources | keys | length'

# List all resource types
cat cdk.out/template.json | jq '.Resources | keys[] | split("/")[0]' | sort | uniq

# For production: manually review critical resources
cat cdk.out/template.json | jq '.Resources | keys[] | select(contains("Kms") or contains("RDS") or contains("SecurityGroup"))'
```

**Critical Resources to Verify** (Production Only):
- KMS keys (encryption)
- RDS/DynamoDB tables (data)
- IAM roles and policies (permissions)
- Security groups (network access)
- Backup policies (retention)

**Checklist**:
- [ ] Template contains expected resource count (roughly 150-200+ for Phase 1-4)
- [ ] No unexpected deletions of critical resources
- [ ] (Production) All KMS encryption settings present
- [ ] (Production) All backup policies configured correctly
- [ ] (Production) All IAM policies follow least-privilege principle

### 3. Estimate Costs (Optional but Recommended)

**Objective**: Get cost estimate before deployment.

```bash
# This requires AWS Pricing API access
# Alternative: manually review resource types against AWS pricing:
# - ECS on Fargate (compute cost)
# - DynamoDB (storage + read/write capacity)
# - RDS (database instance type)
# - ALB (load balancing)
# - NAT Gateway (data transfer)
# - KMS (key + requests)

# For production environment, cross-reference with:
# AWS Pricing Console -> EC2 (for Fargate pricing)
# AWS Pricing Console -> DynamoDB (for table pricing)
# AWS Pricing Console -> RDS (for database pricing)
```

**Environment-Specific Cost Targets**:
- Dev: ~$100-300/month (minimal resources)
- Staging: ~$500-1500/month (intermediate resources)
- Prod: ~$5000+/month (high-availability, backups, monitoring)

**Checklist**:
- [ ] Cost estimate reviewed
- [ ] Estimated costs align with budget
- [ ] (Production) Cost anomaly detection configured

---

## Stack Deployment

### 1. Deployment for Development

**Objective**: Deploy to development environment.

```bash
# Set environment
export ENVIRONMENT=dev
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

# Show what will be deployed (deployment preview)
cdk diff

# Deploy with auto-approval (development only)
cdk deploy --require-approval never

# Or with manual approval (recommended for staging/prod)
cdk deploy
```

**Expected Duration**: 15-30 minutes

**What Happens**:
1. CDK sends CloudFormation template to AWS
2. CloudFormation creates/updates resources in dependency order
3. ECS clusters, databases, Lambda functions, etc. are provisioned
4. Security groups, IAM roles, and KMS keys are configured

**Checklist**:
- [ ] `cdk deploy` command completed successfully
- [ ] CloudFormation stack shows `CREATE_COMPLETE` or `UPDATE_COMPLETE` status
- [ ] Stack name is `DSGOneStack-dev` (or appropriate environment)
- [ ] No rollback occurred

### 2. Deployment for Staging

**Objective**: Deploy to staging environment.

```bash
# Set environment
export ENVIRONMENT=staging
export AWS_ACCOUNT_ID=234567890123
export AWS_REGION=us-east-1

# Show deployment preview
cdk diff

# Deploy with approval prompt (requires manual confirmation)
cdk deploy

# When prompted: Type "y" and press Enter to confirm deployment
```

**Expected Duration**: 20-40 minutes

**Additional Considerations**:
- Staging should closely mirror production configuration
- All compliance frameworks should be enabled
- Backups should be configured with 30-day retention
- Cost anomaly detection should be active

**Checklist**:
- [ ] Deployment approved manually (not auto-approved)
- [ ] CloudFormation stack shows `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] All compliance policies deployed and active
- [ ] Backup retention set to 30 days

### 3. Deployment for Production

**Objective**: Deploy to production environment (highest caution).

```bash
# Set environment
export ENVIRONMENT=prod
export AWS_ACCOUNT_ID=345678901234
export AWS_REGION=us-east-1

# CRITICAL: Preview changes before deployment
cdk diff > /tmp/prod-changes.txt

# Review changes carefully
cat /tmp/prod-changes.txt

# CRITICAL: Require manual approval
cdk deploy

# When prompted: Review changes carefully, type "y" only if confident
```

**Pre-Deployment Checklist for Production**:
- [ ] `cdk diff` output reviewed for destructive changes
- [ ] No unexpected resource deletions
- [ ] Backup configuration preserved
- [ ] All KMS keys retained
- [ ] All security policies intact
- [ ] Team lead approval obtained
- [ ] Deployment window scheduled during low-traffic hours

**Expected Duration**: 30-60 minutes

**Critical Configuration Verified**:
- [ ] SOC 2 compliance enabled
- [ ] ISO 42001 compliance enabled
- [ ] NIST AI RMF enabled
- [ ] EU AI Act compliance enabled
- [ ] 365-day backup retention
- [ ] Cross-region replication enabled
- [ ] WAF enabled with OWASP rules
- [ ] GuardDuty threat detection enabled
- [ ] SecurityHub aggregating findings
- [ ] Monthly budget alert set to $50,000

**Rollback Procedure** (if deployment fails):
```bash
# Do NOT force-delete resources
# Instead, trigger rollback through CloudFormation console or CLI:
aws cloudformation cancel-update-stack --stack-name DSGOneStack-prod

# Or delete stack (only if absolutely necessary and approved):
aws cloudformation delete-stack --stack-name DSGOneStack-prod
```

---

## Post-Deployment Verification

### 1. Verify Stack Status

**Objective**: Confirm CloudFormation stack created successfully.

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name DSGOneStack-${ENVIRONMENT} \
  --query 'Stacks[0].StackStatus'

# Expected output: CREATE_COMPLETE or UPDATE_COMPLETE

# List all resources in stack
aws cloudformation list-stack-resources \
  --stack-name DSGOneStack-${ENVIRONMENT} \
  --query 'StackResourceSummaries[].{Type:ResourceType,Status:ResourceStatus}' \
  --output table
```

**Checklist**:
- [ ] Stack status is `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] All resources show `CREATE_COMPLETE` status
- [ ] No resources in `CREATE_FAILED` state
- [ ] Stack outputs are visible

### 2. Verify KMS Keys

**Objective**: Ensure encryption keys are created and available.

```bash
# List KMS keys
aws kms list-keys --query 'Keys[].KeyId'

# Get key details
aws kms describe-key --key-id <key-id> \
  --query 'KeyMetadata.{KeyId:KeyId,Enabled:Enabled,Description:Description}'

# Verify key is enabled
aws kms get-key-rotation-status --key-id <key-id>
```

**Checklist**:
- [ ] KMS key created for environment
- [ ] Key is enabled
- [ ] Key rotation is enabled (or explicitly disabled with justification)
- [ ] Key policy grants appropriate access to IAM roles

### 3. Verify Networking

**Objective**: Confirm VPC, subnets, and security groups configured.

```bash
# List VPCs
aws ec2 describe-vpcs --query 'Vpcs[].{VpcId:VpcId,CidrBlock:CidrBlock}' --output table

# List subnets
aws ec2 describe-subnets --query 'Subnets[].{SubnetId:SubnetId,CidrBlock:CidrBlock,AvailabilityZone:AvailabilityZone}' --output table

# List security groups
aws ec2 describe-security-groups --query 'SecurityGroups[].{GroupId:GroupId,GroupName:GroupName}' --output table

# Verify NAT Gateway (if applicable)
aws ec2 describe-nat-gateways --query 'NatGateways[].{NatGatewayId:NatGatewayId,State:State}' --output table
```

**Environment-Specific VPC CIDRs**:
- Dev: `10.0.0.0/16`
- Staging: `10.1.0.0/16`
- Prod: `10.2.0.0/16`

**Checklist**:
- [ ] VPC created with correct CIDR block
- [ ] Public and private subnets in multiple AZs
- [ ] NAT Gateway for private subnet internet access
- [ ] Route tables properly configured
- [ ] Security groups created with expected rules

### 4. Verify ECS Cluster and Services

**Objective**: Confirm ECS cluster, task definitions, and services running.

```bash
# List ECS clusters
aws ecs list-clusters --query 'clusterArns' --output table

# Describe cluster
aws ecs describe-clusters --clusters DSGOneStack-${ENVIRONMENT} \
  --query 'clusters[0].{ClusterName:clusterName,Status:status,RegisteredContainerInstancesCount:registeredContainerInstancesCount}'

# List services
aws ecs list-services --cluster DSGOneStack-${ENVIRONMENT} \
  --query 'serviceArns' --output table

# Check service status
aws ecs describe-services --cluster DSGOneStack-${ENVIRONMENT} \
  --services <service-arn> \
  --query 'services[0].{ServiceName:serviceName,Status:status,DesiredCount:desiredCount,RunningCount:runningCount}'

# View task definitions
aws ecs list-task-definitions --query 'taskDefinitionArns' --output table

# Check running tasks
aws ecs list-tasks --cluster DSGOneStack-${ENVIRONMENT} \
  --query 'taskArns' --output table

# Describe task
aws ecs describe-tasks --cluster DSGOneStack-${ENVIRONMENT} \
  --tasks <task-arn> \
  --query 'tasks[0].{TaskArn:taskArn,Status:lastStatus,LaunchType:launchType}'
```

**Expected Task Counts**:
- Dev: 1 running task
- Staging: 2 running tasks
- Prod: 3 running tasks (minimum)

**Checklist**:
- [ ] ECS cluster created and active
- [ ] Task definitions registered
- [ ] Services created and running
- [ ] Correct number of tasks running for environment
- [ ] Task health checks passing
- [ ] No tasks in `STOPPED` state (unless expected)

### 5. Verify Database Tables

**Objective**: Confirm DynamoDB tables created with correct configuration.

```bash
# List all DynamoDB tables
aws dynamodb list-tables --query 'TableNames' --output table

# Describe specific table
aws dynamodb describe-table --table-name <table-name> \
  --query 'Table.{TableName:TableName,TableStatus:TableStatus,ItemCount:ItemCount,BillingModeSummary:BillingModeSummary,PointInTimeRecoveryDescription:PointInTimeRecoveryDescription}'

# Verify key tables exist:
# - audit-logs (immutable audit trail)
# - policies (policy definitions)
# - model-registry (model catalog)
# - runtime-executions (execution logs)
# - evidence-ccvs (compliance evidence)

# Check table backup configuration
aws dynamodb describe-backup --table-name <table-name> 2>/dev/null || echo "No backups found yet"
```

**Critical Tables to Verify**:
- `dsg-one-<env>-audit-logs` (with DynamoDB Streams enabled)
- `dsg-one-<env>-policies` (with TTL disabled for immutability)
- `dsg-one-<env>-policy-versions` (immutable changelog)
- `dsg-one-<env>-model-registry` (model catalog)
- `dsg-one-<env>-runtime-executions` (execution records)
- `dsg-one-<env>-hash-chain` (Merkle tree for audit verification)
- `dsg-one-<env>-evidence-ccvs` (compliance framework evidence)

**Checklist**:
- [ ] All expected tables created
- [ ] Tables are in `ACTIVE` status
- [ ] Point-in-time recovery enabled (especially production)
- [ ] DynamoDB Streams enabled on audit tables
- [ ] Billing mode set correctly (PAY_PER_REQUEST or PROVISIONED)
- [ ] TTL disabled on immutable tables (audit, policies, versions)
- [ ] Global secondary indexes created if needed

### 6. Verify RDS Database (if deployed)

**Objective**: Confirm RDS instance created and accessible.

```bash
# List RDS instances
aws rds describe-db-instances --query 'DBInstances[].{DBInstanceIdentifier:DBInstanceIdentifier,DBInstanceStatus:DBInstanceStatus,Engine:Engine}' --output table

# Describe instance details
aws rds describe-db-instances --db-instance-identifier <db-instance-id> \
  --query 'DBInstances[0].{Engine:Engine,EngineVersion:EngineVersion,DBInstanceClass:DBInstanceClass,AllocatedStorage:AllocatedStorage,StorageType:StorageType,BackupRetentionPeriod:BackupRetentionPeriod}'

# Check security group associations
aws rds describe-db-security-groups --query 'DBSecurityGroups[].GroupName' --output table
```

**Environment-Specific Backup Retention**:
- Dev: 7 days
- Staging: 30 days
- Prod: 365 days with multi-region replication

**Checklist**:
- [ ] RDS instance created and available
- [ ] Database engine is expected version
- [ ] Backup retention period matches environment
- [ ] Multi-AZ enabled (especially production)
- [ ] Automatic minor version upgrade enabled
- [ ] Database is accessible (test connection)

### 7. Verify S3 Buckets

**Objective**: Confirm S3 buckets for artifacts, logs, and audit created.

```bash
# List S3 buckets
aws s3 ls --query 'Buckets[].Name' --output table

# List buckets with dsg prefix
aws s3 ls | grep dsg-one

# Verify bucket encryption
aws s3api head-bucket --bucket <bucket-name> \
  && aws s3api get-bucket-encryption --bucket <bucket-name>

# Verify versioning enabled
aws s3api get-bucket-versioning --bucket <bucket-name>

# Verify lifecycle policies (object retention)
aws s3api get-bucket-lifecycle-configuration --bucket <bucket-name> 2>/dev/null || echo "No lifecycle policy found"

# Verify object lock (audit bucket should have lock enabled)
aws s3api get-object-lock-configuration --bucket <bucket-name> 2>/dev/null || echo "Object lock not enabled"
```

**Expected Buckets**:
- `dsg-one-<env>-artifacts` (CDK artifacts, policy definitions)
- `dsg-one-<env>-audit-logs` (audit trail with 7-year retention)
- `dsg-one-<env>-backups` (database backups)
- `cdk-hnb659fds-assets-<account>-<region>` (CDK bootstrap bucket)

**Checklist**:
- [ ] All expected buckets created
- [ ] Versioning enabled on audit buckets
- [ ] Object lock enabled on audit buckets (production)
- [ ] Encryption enabled (KMS or AES-256)
- [ ] Lifecycle policies configured for retention
- [ ] Public access blocked (must not be public)

### 8. Verify IAM Roles and Policies

**Objective**: Confirm IAM roles and policies created correctly.

```bash
# List IAM roles
aws iam list-roles --query 'Roles[].{RoleName:RoleName,Arn:Arn}' --output table | grep dsg

# Describe role
aws iam get-role --role-name <role-name> --query 'Role.{RoleName:RoleName,Arn:Arn,CreateDate:CreateDate}'

# List attached policies
aws iam list-attached-role-policies --role-name <role-name> --query 'AttachedPolicies[].PolicyName' --output table

# Get inline policies
aws iam list-role-policies --role-name <role-name> --query 'PolicyNames' --output table

# Review policy document
aws iam get-role-policy --role-name <role-name> --policy-name <policy-name> --query 'RolePolicyDocument' | jq .
```

**Expected Roles**:
- ECS task execution role (allows pulling images, accessing logs)
- ECS task role (allows application access to services)
- Lambda execution role (for policy engine, deterministic replay)
- Audit trail role (immutable trail writer)

**Checklist**:
- [ ] All expected IAM roles created
- [ ] Policies follow least-privilege principle
- [ ] Trust relationships configured correctly
- [ ] No overly permissive policies (avoid `"Action": "*"`)
- [ ] Service principals are restricted to specific services

### 9. Verify Monitoring and Logging

**Objective**: Confirm CloudWatch logs and monitoring configured.

```bash
# List CloudWatch log groups
aws logs describe-log-groups --query 'logGroups[].logGroupName' --output table | grep dsg

# Get log group details
aws logs describe-log-groups --log-group-name-prefix /dsg-one \
  --query 'logGroups[0].{LogGroupName:logGroupName,RetentionInDays:retentionInDays,StoredBytes:storedBytes}'

# List CloudWatch alarms
aws cloudwatch describe-alarms --query 'MetricAlarms[].{AlarmName:AlarmName,StateValue:StateValue}' --output table

# Check X-Ray tracing (if enabled)
aws xray list-traces --query 'Traces[].{Id:Id,Duration:Duration}' --max-results 5
```

**Environment-Specific Log Retention**:
- Dev: 7 days
- Staging: 30 days
- Prod: 365 days

**Checklist**:
- [ ] CloudWatch log groups created for ECS, Lambda, API Gateway
- [ ] Log retention set to environment-specific value
- [ ] CloudWatch alarms configured for critical metrics
- [ ] X-Ray tracing enabled (production)
- [ ] CloudTrail logging enabled for API calls

### 10. Verify Compliance and Security

**Objective**: Confirm compliance frameworks and security services activated.

```bash
# Check GuardDuty status
aws guardduty list-detectors --query 'DetectorIds' --output table

# Describe GuardDuty detector
aws guardduty get-detector --detector-id <detector-id> \
  --query 'Detector.{Status:Status,FindingPublishingFrequency:FindingPublishingFrequency}'

# Check SecurityHub status
aws securityhub describe-hub --query 'HubArn' --output text

# List enabled standards
aws securityhub describe-standards --query 'Standards[].{StandardsArn:StandardsArn,Name:Name}' --output table

# Check AWS Config status
aws configservice describe-configuration-recorders --query 'ConfigurationRecorders[].{Name:name,Status:status}' --output table

# Check WAF rules (if applicable)
aws wafv2 list-web-acls --scope REGIONAL --query 'WebACLs[].{Name:Name,ARN:ARN}' --output table
```

**Environment-Specific Compliance**:

**Development**:
- ISO 42001: Not required
- NIST AI RMF: Not required
- EU AI Act: Not required
- SOC 2: Not required

**Staging**:
- ISO 42001: Enabled
- NIST AI RMF: Enabled
- EU AI Act: Enabled
- SOC 2: Not required (optional)

**Production**:
- ISO 42001: Enabled ✓
- NIST AI RMF: Enabled ✓
- EU AI Act: Enabled ✓
- SOC 2: Enabled ✓

**Checklist**:
- [ ] GuardDuty detector created and active
- [ ] SecurityHub hub created and standards enabled
- [ ] AWS Config recorder running (if enabled)
- [ ] WAF web ACL associated with ALB
- [ ] CloudTrail logging enabled
- [ ] Config compliance dashboard shows passing rules
- [ ] (Prod) All compliance frameworks enabled

### 11. Application Health Check

**Objective**: Verify application endpoints are responding.

```bash
# Get ALB DNS name from stack outputs
aws cloudformation describe-stacks \
  --stack-name DSGOneStack-${ENVIRONMENT} \
  --query 'Stacks[0].Outputs[?OutputKey==`ALBDns`].OutputValue' \
  --output text

# Set ALB_DNS to the output above
ALB_DNS=<alb-dns-from-above>

# Health check
curl -fsSL "http://${ALB_DNS}/api/health"

# Expected response: HTTP 200 with JSON health status
# {
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00Z",
#   "version": "1.0.0"
# }

# Agent status check
curl -fsSL "http://${ALB_DNS}/api/agent/status"

# Expected: HTTP 200 with deployment info
# {
#   "deployment": "claude-dsg-one",
#   "version": "...",
#   "environment": "dev|staging|prod",
#   "database": "connected"
# }

# Readiness check
curl -fsSL "http://${ALB_DNS}/api/readiness"

# Expected: HTTP 200 when all services ready, 503 if not ready
```

**Checklist**:
- [ ] ALB is active and reachable
- [ ] `/api/health` returns 200 OK
- [ ] `/api/agent/status` shows correct environment
- [ ] `/api/readiness` returns 200 OK
- [ ] Response times are acceptable (< 1 second)
- [ ] No SSL/TLS certificate errors

### 12. Database Connectivity Test

**Objective**: Verify application can connect to databases.

```bash
# This typically requires authenticated API calls or direct database access
# Using ECS task exec (requires AWS permissions):

# Get running task ID
TASK_ID=$(aws ecs list-tasks \
  --cluster DSGOneStack-${ENVIRONMENT} \
  --query 'taskArns[0]' \
  --output text | xargs basename)

# Execute database connectivity test in ECS task
aws ecs execute-command \
  --cluster DSGOneStack-${ENVIRONMENT} \
  --task ${TASK_ID} \
  --container dsg-one-app \
  --command "node -e \"console.log('DB connection test')\""
```

**Alternative**: Check DynamoDB access from Lambda

```bash
# Invoke policy engine Lambda to test DynamoDB access
aws lambda invoke \
  --function-name dsg-one-${ENVIRONMENT}-policy-engine \
  --payload '{"test": true}' \
  /tmp/lambda-response.json

cat /tmp/lambda-response.json
```

**Checklist**:
- [ ] ECS task can execute commands
- [ ] DynamoDB tables are readable
- [ ] KMS key access working
- [ ] No connection timeout errors
- [ ] Lambda invocation successful

---

## Troubleshooting

### CloudFormation Stack Creation Fails

**Symptom**: `cdk deploy` fails with CloudFormation error

```bash
# Check stack events for detailed errors
aws cloudformation describe-stack-events \
  --stack-name DSGOneStack-${ENVIRONMENT} \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].{Resource:LogicalResourceId,Reason:ResourceStatusReason}' \
  --output table

# Check stack status
aws cloudformation describe-stacks \
  --stack-name DSGOneStack-${ENVIRONMENT} \
  --query 'Stacks[0].StackStatus'

# Get detailed failure reason
aws cloudformation describe-stacks \
  --stack-name DSGOneStack-${ENVIRONMENT} \
  --query 'Stacks[0].StackStatusReason'
```

**Common Issues**:
1. **KMS key permission denied**: IAM role lacks `kms:*` permissions
2. **VPC CIDR conflict**: Another VPC uses same CIDR (change in config)
3. **Service quota exceeded**: Account limit reached (request increase)
4. **Invalid account ID**: Environment variables don't match actual account

### ECS Tasks Not Starting

**Symptom**: ECS service shows 0 running tasks

```bash
# Check task definition
aws ecs describe-task-definition \
  --task-definition <task-def-name> \
  --query 'taskDefinition.{Status:status,ContainerDefinitions:containerDefinitions}'

# Check service status
aws ecs describe-services \
  --cluster DSGOneStack-${ENVIRONMENT} \
  --services <service-arn> \
  --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,Deployments:deployments}'

# Check task logs
aws logs tail /ecs/dsg-one-${ENVIRONMENT}-app --follow

# Check for placement constraints
aws ecs describe-services \
  --cluster DSGOneStack-${ENVIRONMENT} \
  --services <service-arn> \
  --query 'services[0].placementConstraints'
```

**Common Issues**:
1. **Container image not found**: ECR image doesn't exist or role lacks pull permission
2. **Insufficient capacity**: Not enough EC2 instances (for EC2 launch type)
3. **Memory/CPU exceeded**: Task definition exceeds available resources
4. **Health check failing**: Application not responding on expected port

### DynamoDB Access Denied

**Symptom**: Application logs show DynamoDB permission errors

```bash
# Verify IAM role has DynamoDB permissions
aws iam get-role-policy \
  --role-name <ecs-task-role> \
  --policy-name <policy-name> \
  --query 'RolePolicyDocument.Statement[?Action[?contains(@, `dynamodb`)]]'

# Check KMS key access
aws kms describe-key --key-id <kms-key-id> \
  --query 'KeyMetadata.{KeyId:KeyId,Enabled:Enabled}'

# List key grants
aws kms list-grants --key-id <kms-key-id> \
  --query 'Grants[].{GrantId:GrantId,GranteePrincipal:GranteePrincipal,Operations:Operations}'
```

**Common Issues**:
1. **Missing `dynamodb:*` action**: Policy too restrictive
2. **KMS key deny policy**: Key policy denies IAM role access
3. **Table-level encryption mismatch**: Table uses different KMS key

### ALB Health Check Failing

**Symptom**: ALB target shows "unhealthy"

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn <tg-arn> \
  --query 'TargetHealthDescriptions[].{Target:Target,State:TargetHealth,Reason:TargetHealth.Reason}'

# Check health check configuration
aws elbv2 describe-target-groups \
  --target-group-arns <tg-arn> \
  --query 'TargetGroups[0].{HealthCheckEnabled:HealthCheckEnabled,HealthCheckPath:HealthCheckPath,HealthCheckProtocol:HealthCheckProtocol,HealthyThresholdCount:HealthyThresholdCount,UnhealthyThresholdCount:UnhealthyThresholdCount}'

# Check ECS task logs
aws logs tail /ecs/dsg-one-${ENVIRONMENT}-app --follow
```

**Common Issues**:
1. **Health check path incorrect**: ALB checking wrong endpoint
2. **Security group blocking port**: Task can't receive ALB traffic
3. **Application not ready**: App crashing or slow to start

### Budget Alert Not Receiving Notifications

**Symptom**: Cost anomalies not detected or alerts not sent

```bash
# Check budget configuration
aws budgets describe-budgets \
  --account-id <account-id> \
  --query 'Budgets[?BudgetName==`dsg-one-${ENVIRONMENT}-budget`]'

# Check SNS topic subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn <sns-topic-arn> \
  --query 'Subscriptions[].{Protocol:Protocol,Endpoint:Endpoint,SubscriptionArn:SubscriptionArn}'

# Check email subscription confirmation
# (Verify email inbox for SNS confirmation message)

# Check cost anomaly detector
aws ce describe-anomalies \
  --query 'Anomalies[].{AnomalyDate:AnomalyDate,Impact:Impact,Feedback:AnomalyFeedback}'
```

**Common Issues**:
1. **Email not confirmed**: SNS subscription pending approval
2. **Budget threshold too high**: No anomalies detected at current threshold
3. **Anomaly detector not enabled**: Cost Anomaly Detection service not active

---

## Cleanup Procedures

### Temporary Cleanup (For Testing)

**Objective**: Remove stack while preserving data (dev environment).

```bash
# This deletes all AWS resources except data in S3 and DynamoDB backups
cdk destroy

# When prompted: Type "y" and press Enter to confirm
```

**Important Notes**:
- DynamoDB backups are retained (can be restored later)
- S3 buckets with versioning may retain old versions
- RDS automated backups are retained per backup retention policy
- Do NOT use `cdk destroy` for production without backup verification

### Full Cleanup (Destructive)

**Objective**: Remove all resources including data (only for dev/testing).

```bash
# WARNING: This is destructive and cannot be undone!
# Only use this if you are absolutely certain data should be deleted.

# Method 1: CloudFormation deletion (recommended)
aws cloudformation delete-stack --stack-name DSGOneStack-${ENVIRONMENT}

# Monitor deletion progress
aws cloudformation wait stack-delete-complete --stack-name DSGOneStack-${ENVIRONMENT}

# Method 2: CDK destroy
cdk destroy --force

# Verify deletion
aws cloudformation describe-stacks --stack-name DSGOneStack-${ENVIRONMENT} 2>&1 | grep "does not exist"
```

**Manual Cleanup Tasks** (if deletion fails):

```bash
# 1. Empty S3 buckets (required before deletion)
aws s3 rm s3://<bucket-name> --recursive

# 2. Disable RDS deletion protection
aws rds modify-db-instance --db-instance-identifier <db-id> --no-deletion-protection

# 3. Delete RDS snapshot if blocking deletion
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>

# 4. Remove ECR images (if blocking deletion)
aws ecr batch-delete-image --repository-name <repo-name> --image-ids imageTag=latest

# 5. Retry stack deletion
aws cloudformation delete-stack --stack-name DSGOneStack-${ENVIRONMENT}
```

### Data Retention for Production

**Objective**: Preserve audit trail and backups when decommissioning.

```bash
# PRODUCTION ONLY: Before deleting stack, backup critical data

# 1. Export DynamoDB audit table
aws dynamodb scan \
  --table-name dsg-one-prod-audit-logs \
  --output json > /tmp/prod-audit-backup-$(date +%Y%m%d).json

# 2. Backup RDS database
aws rds create-db-snapshot \
  --db-instance-identifier dsg-one-prod \
  --db-snapshot-identifier dsg-one-prod-final-backup-$(date +%Y%m%d)

# 3. Copy audit S3 bucket to archive bucket
aws s3 sync s3://dsg-one-prod-audit-logs \
  s3://dsg-one-prod-archive-$(date +%Y%m%d)

# 4. Lock audit bucket for legal hold (immutable)
aws s3api put-object-legal-hold \
  --bucket dsg-one-prod-audit-logs \
  --key audit-trail.json \
  --legal-hold Status=ON

# Only after backups verified, proceed with deletion
```

**Post-Deletion Verification**:

```bash
# Verify stack deleted
aws cloudformation list-stacks \
  --stack-status-filter DELETE_COMPLETE \
  --query 'StackSummaries[?StackName==`DSGOneStack-prod`]'

# Verify S3 buckets deleted (except archive/backup buckets)
aws s3 ls | grep dsg-one

# Verify IAM roles cleaned up
aws iam list-roles --query 'Roles[?contains(RoleName, `dsg-one`)].RoleName'

# Verify KMS keys scheduled for deletion
aws kms list-keys --query 'Keys[].KeyId' | xargs -I{} aws kms describe-key --key-id {} --query 'KeyMetadata.{KeyId:KeyId,KeyState:KeyState}'
```

---

## Summary Checklist

Use this checklist as a final verification before considering deployment complete:

### Pre-Deployment ✓
- [ ] AWS credentials configured and verified
- [ ] Node.js and npm installed
- [ ] CDK CLI installed globally
- [ ] Project dependencies installed (`npm ci`)
- [ ] AWS account bootstrapped for CDK

### Configuration ✓
- [ ] Environment variable set (`dev|staging|prod`)
- [ ] Configuration files exist and validated
- [ ] AWS account ID matches environment
- [ ] AWS region correctly specified

### Synthesis ✓
- [ ] CloudFormation template generated successfully
- [ ] Template size reasonable (< 50MB)
- [ ] No obvious resource misconfigurations

### Deployment ✓
- [ ] Deployment approval obtained (production)
- [ ] `cdk deploy` completed without errors
- [ ] CloudFormation stack shows `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] All stack resources show `CREATE_COMPLETE` status

### Post-Deployment Verification ✓
- [ ] Stack outputs visible and correct
- [ ] KMS keys created and enabled
- [ ] VPC and networking configured
- [ ] ECS cluster and services running (expected task count)
- [ ] DynamoDB tables active with correct settings
- [ ] RDS database (if applicable) accessible
- [ ] S3 buckets created with correct policies
- [ ] IAM roles and policies follow least privilege
- [ ] CloudWatch logs and alarms configured
- [ ] Compliance frameworks enabled (environment-appropriate)
- [ ] Application health check passing (`/api/health`)
- [ ] Agent status check successful (`/api/agent/status`)
- [ ] Readiness check passing (`/api/readiness`)

### Final Steps
- [ ] Document deployment details and timestamp
- [ ] Create backup/snapshot if production
- [ ] Notify relevant teams of deployment
- [ ] Schedule post-deployment review
- [ ] Begin monitoring for anomalies (production)

---

## Emergency Contacts and Escalation

For issues during deployment:

1. **AWS Support**: Open case at console.aws.amazon.com/support
2. **CDK Documentation**: https://docs.aws.amazon.com/cdk/
3. **DSG ONE Team**: Internal Slack/email
4. **On-Call Engineer**: (Check internal runbook)

---

## References

- AWS CDK Developer Guide: https://docs.aws.amazon.com/cdk/
- AWS CloudFormation User Guide: https://docs.aws.amazon.com/cloudformation/
- DSG ONE Infrastructure Code: `infra/cdk/`
- DSG ONE Documentation: `docs/`

---

**Last Updated**: 2026-07-23
**Version**: 1.0
**Maintained By**: DSG ONE Infrastructure Team
