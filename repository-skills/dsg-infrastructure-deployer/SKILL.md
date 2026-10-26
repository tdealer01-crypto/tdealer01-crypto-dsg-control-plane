---
name: dsg-infrastructure-deployer
version: 1.0.0
author: DSG Team
license: MIT
description: >-
  Deploy and manage DSG ONE / ProofGate control plane infrastructure on AWS
  using CDK. Automate the complete deployment pipeline: CloudFormation stack
  creation, resource validation, and Secrets Manager configuration.
  Historical runbook for source inspection; AWS mutation requires an approved plan.
---

# DSG Infrastructure Deployer

Legacy AWS CDK deployment reference for **DSG ONE / ProofGate** infrastructure. This document is **not proof of a deployed or healthy control plane**, and it does not by itself authorize an AWS change.

> **Critical evidence and cost boundary (2026-10-26):** This skill is in `repository-skills/` on the PR #1247 branch, not among the three advertised marketplace skills. All stack names, topology, costs, resource counts, endpoints, credentials and success criteria below are historical examples/verification *targets*, not confirmed live AWS state. **Do not execute mutation or deletion commands from this guide without verifying the real AWS identity, region, stack, current CDK code, diff, cost impact, owner-approved bounded plan and audit capture.** Reuse an existing approved plan's scope without redundant approval; reject actions outside that scope. Read-only discovery can proceed without mutation authority. Prefer the current DSG AWS Spacetime runbook/provider over retired standalone control-plane deployment references.

***

## When to invoke this skill

| Intent                                           | Use this skill                              |
| ------------------------------------------------ | ------------------------------------------- |
| "Deploy DSG to AWS dev/staging/production"       | ✅ Yes — full CDK deployment pipeline        |
| "Verify AWS infrastructure is healthy"           | ✅ Yes — health checks and diagnostics       |
| "Check deployment status and resource count"     | ✅ Yes — CloudFormation status monitoring    |
| "Document AWS resource outputs"                  | ✅ Yes — automated capture and templating    |
| "Troubleshoot CloudFormation deployment failure" | ✅ Yes — error diagnosis and recovery        |
| "Update infrastructure configuration"            | ✅ Yes — CDK synth and targeted updates      |
| "Set up production AWS accounts"                 | ✅ Yes — account setup and IAM configuration |
| "Build a generic AWS app (not DSG)"              | ❌ Out of scope — use AWS CDK docs directly  |

***

## Core deployment workflow

### Phase 1: Pre-deployment validation

```
1. CHECK ENVIRONMENT
   ✓ AWS credentials available (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
   ✓ AWS region explicitly chosen and verified against the approved plan (do not assume us-east-1)
   ✓ AWS account ID known (AWS_ACCOUNT_ID)
   ✓ CDK CLI available (npm exec cdk)
   ✓ Node.js and npm installed

2. VALIDATE CONFIGURATION
   ✓ Environment type specified (dev, staging, prod)
   ✓ Stack name follows convention: dsg-one-{env}-v2
   ✓ No conflicting CloudFormation stacks
   ✓ Supabase connection configured (if database required)
   ✓ Docker registry configured (if ECR push needed)

3. REVIEW CONSTRUCTS
   ✓ Networking (VPC, subnets, NAT, security groups)
   ✓ ECS (cluster, Fargate task definition, service)
   ✓ ALB (load balancer, listeners, target groups)
   ✓ Database (DynamoDB tables)
   ✓ Storage (S3 buckets for evidence, CloudTrail logs)
   ✓ Security (KMS encryption keys, Secrets Manager)
   ✓ Monitoring (CloudWatch logs, X-Ray)
   ✓ Audit (CloudTrail, VPC Flow Logs)
```

### Phase 2: Synth and dry-run

```bash
cd infra/cdk
npx cdk synth --require-approval=never
# Review generated CloudFormation template
# Inspect actual generated templates; file name and size are not guaranteed.
```

### Phase 3: Deploy infrastructure

```bash
cd infra/cdk
npx cdk deploy --require-approval=any-change  # ONLY after an approved bounded DSG plan and reviewed diff
# Duration, resource count and outputs depend on the actual stack; do not assume them.
```

### Phase 4: Post-deployment verification

```
1. VERIFY CLOUDFORMATION
   ✓ Stack status: CREATE_COMPLETE or UPDATE_COMPLETE
   ✓ Resource count matches the actual reviewed CloudFormation template (no fixed target)
   ✓ No DELETE_FAILED or CREATE_FAILED resources
   ✓ Stack outputs available (ALB DNS, RDS endpoint, etc.)

2. HEALTH CHECKS
   ✓ curl GET /api/health → 200 OK
   ✓ curl GET /api/readiness → ready: true
   ✓ curl GET /api/agent/status → deployment info
   ✓ AWS ECS service running desired task count
   ✓ ALB health checks passing (target group healthy)
   ✓ RDS database accepting connections
   ✓ Secrets Manager secrets accessible

3. RESOURCE VALIDATION
   ✓ VPC CIDR: 10.0.0.0/16 (configurable)
   ✓ Subnets: 2 public + 2 private (multi-AZ)
   ✓ NAT Gateway: 1 per AZ (for private egress)
   ✓ ECS cluster: Running tasks = desired count
   ✓ ALB: Listening on :80 and :443
   ✓ DynamoDB tables: 3 tables (policies, audit, replay-proofs)
   ✓ S3 buckets: Evidence bucket + CloudTrail bucket + CDK bucket
   ✓ KMS keys: Master key + data key, rotation enabled
   ✓ Secrets: api-secrets, database-secrets, oauth-secrets

4. SECURITY VERIFICATION
   ✓ All data encrypted at rest (KMS)
   ✓ All data encrypted in transit (TLS)
   ✓ IAM roles follow least-privilege principle
   ✓ RLS policies on Supabase tables (if using)
   ✓ VPC endpoints for private service access
   ✓ Security groups restrict traffic to required ports
   ✓ CloudTrail logging enabled
   ✓ CloudWatch Logs retention configured

5. COMPLIANCE READINESS
   ✓ Audit trail tables created (DynamoDB)
   ✓ Evidence bucket configured (S3)
   ✓ Compliance matrix seeded
   ✓ CCVS pipeline ready for evidence collection
```

***

## Configuration by environment

### Development (dev)

```typescript
{
  environment: "dev",
  vpcCidr: "10.0.0.0/16",
  ecsDesiredCount: 1,           // Single task for cost savings
  ecsTaskMemory: 512,            // Minimal for dev
  rdsInstanceClass: "t3.micro",  // Minimal for dev
  enableAutoScaling: false,
  enableCloudTrail: true,
  cloudWatchRetention: 7,        // Days
  backupRetention: 7,
  tags: { Environment: "dev", ManagedBy: "CDK" }
}
```

### Staging

```typescript
{
  environment: "staging",
  vpcCidr: "10.0.0.0/16",
  ecsDesiredCount: 2,
  ecsTaskMemory: 1024,
  rdsInstanceClass: "t3.small",
  enableAutoScaling: true,
  enableCloudTrail: true,
  cloudWatchRetention: 30,
  backupRetention: 30,
  tags: { Environment: "staging", ManagedBy: "CDK" }
}
```

### Production (prod)

```typescript
{
  environment: "prod",
  vpcCidr: "10.0.0.0/16",
  ecsDesiredCount: 3,
  ecsTaskMemory: 2048,
  rdsInstanceClass: "t3.large",    // Or dedicated provisioned throughput
  enableAutoScaling: true,
  enableCloudTrail: true,
  enableVPCFlowLogs: true,
  cloudWatchRetention: 365,         // 1 year
  backupRetention: 90,
  enableMultiAZ: true,              // RDS multi-AZ for HA
  enableBackupVault: true,          // AWS Backup for disaster recovery
  tags: { Environment: "prod", ManagedBy: "CDK", CostCenter: "Engineering" }
}
```

***

## Stack naming and versioning

DSG uses a versioned stack naming convention to avoid CloudFormation conflicts:

```
Pattern:  dsg-one-{environment}-v{number}
Examples:
  dsg-one-dev-v1      (old, may be stuck in DELETE_FAILED)
  dsg-one-dev-v2      (current)
  dsg-one-dev-v3      (next version if v2 conflicts)
  
  dsg-one-staging-v1
  dsg-one-prod-v1
```

**Why versioning?**

* CloudFormation can get stuck in `DELETE_FAILED` if the old stack can't clean up resources
* Incrementing version allows immediate redeployment without waiting
* Old stacks can be manually cleaned up later
* Resource naming also uses `-v{N}` suffix (e.g., `dsg-policy-table-v2`)

***

## Common deployment scenarios

### Scenario 1: Fresh deployment to dev

```bash
# 1. Verify environment
echo "${AWS_REGION:?Set the approved AWS region}"
aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output json
# Compare returned identity with the approved plan. Never assume an account ID.

# 2. Synth
cd infra/cdk && npx cdk synth --require-approval=never

# 3. Deploy
npx cdk deploy --require-approval=any-change  # ONLY after an approved bounded DSG plan and reviewed diff

# 4. Verify
curl https://<ALB_DNS>/api/health
npm run go:no-go https://<ALB_DNS>
```

### Scenario 2: Update existing infrastructure

```bash
# Make changes to CDK constructs
# e.g., update infra/cdk/lib/constructs/ecs.ts

# Synth to see what will change
cd infra/cdk && npx cdk synth --require-approval=never

# Review the diff (CDK shows what will be added/modified/removed)

# Deploy targeted stack
npx cdk deploy DSGOneStack-dev --require-approval=any-change  # Approved plan + exact stack only

# Verify changes
curl https://<ALB_DNS>/api/agent/status
```

### Scenario 3: Troubleshoot deployment failure

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name dsg-one-dev-v2 --region us-east-1

# If stack is in CREATE_FAILED or DELETE_FAILED:
# Option 1: Rename stack and redeploy (dsg-one-dev-v3)
# Option 2: Manually delete via AWS Console → CloudFormation → Delete Stack

# Check specific resource failure
aws cloudformation describe-stack-resources \
  --stack-name dsg-one-dev-v2 \
  --query 'StackResources[?ResourceStatus==`CREATE_FAILED`]' \
  --region us-east-1

# Review CDK build errors
cd infra/cdk && npx cdk synth --require-approval=never
npm run typecheck
```

***

## Post-deployment tasks

### 1. Capture infrastructure outputs

```bash
# Use the provided capture script
./scripts/capture-aws-outputs.sh \
  --stack-name dsg-one-dev-v2 \
  --region us-east-1 \
  --environment dev

# Generates:
# - docs/infrastructure/DSG_AWS_Infrastructure_Outputs.md
# - docs/infrastructure/dsg-aws-outputs.json
# - docs/infrastructure/dsg-aws-outputs.env (for reference only, never commit)
```

### 2. Build and deploy application

```bash
# Build Next.js app
npm run build

# Build Docker image
docker build -t dsg-control-plane:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker tag dsg-control-plane:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/dsg-api:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/dsg-api:latest

# Update ECS task definition and service
aws ecs update-service \
  --cluster dsg-one-dev-v2 \
  --service dsg-service \
  --force-new-deployment
```

### 3. Configure DNS and TLS

```bash
# Add Route53 record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://route53-change.json

# Request ACM certificate (if not using AWS-managed)
# Or use existing certificate in ALB listener
```

### 4. Set up monitoring and alerts

```bash
# Enable detailed CloudWatch metrics
aws cloudwatch put-metric-alarm \
  --alarm-name dsg-alb-unhealthy-targets \
  --alarm-description "Alert if ALB has unhealthy targets" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold

# Set up SNS notifications
aws sns subscribe \
  --topic-arn <SNS_TOPIC> \
  --protocol email \
  --notification-endpoint ops@dsg.pics
```

***

## Troubleshooting

### CloudFormation stack stuck in UPDATE\_IN\_PROGRESS

**Cause:** Previous CDK deploy didn't complete or is still running

**Solution:**

```bash
# Option 1: Wait for process to finish
ps aux | grep cdk
# If still running, wait 30+ minutes

# Option 2: Check stack events for specific resource
aws cloudformation describe-stack-events \
  --stack-name dsg-one-dev-v2 \
  --query 'StackEvents[0:10]' \
  --region us-east-1

# Option 3: If truly stuck, increment version
# Edit infra/cdk/bin/dsg-one.ts
# Change stackName from dsg-one-dev-v2 to dsg-one-dev-v3
# Only after approved plan + reviewed diff: npx cdk deploy --require-approval=any-change
```

### ALB target group reports "Unhealthy"

**Cause:** ECS task is crashing or not responding to health checks

**Solution:**

```bash
# Check ECS task logs
aws ecs describe-tasks \
  --cluster dsg-one-dev-v2 \
  --tasks <TASK_ARN> \
  --region us-east-1

# Get CloudWatch logs
aws logs tail /ecs/dsg-control-plane --follow

# Common issues:
# - Missing environment variables (check ECS task definition)
# - Database connection failed (check Supabase)
# - Port mismatch (ALB expects :3000, ECS using :8080?)
```

### S3 bucket deletion failed

**Cause:** CloudFormation tries to delete non-empty S3 buckets

**Solution:**

```bash
# Option 1: Empty buckets before deletion
# Destructive bucket emptying is NOT a default recovery operation.
# Inventory objects and retention/Object Lock/CloudTrail obligations first:
aws s3 ls s3://dsg-cloudtrail-bucket-<approved-account>/ --recursive
aws s3 ls s3://dsg-evidence-bucket-<approved-account>/ --recursive
# Deletion requires a separately approved, exact-scope retention-aware plan.

# Option 2: Disable auto-deletion in CDK
# Edit infra/cdk/lib/constructs/s3.ts
// removalPolicy: cdk.RemovalPolicy.DESTROY,
// → removalPolicy: cdk.RemovalPolicy.RETAIN,

# Then retry stack deletion
aws cloudformation describe-stacks --stack-name dsg-one-dev-v2
# Deletion is not automated here; review dependencies and obtain exact-scope approval.
```

### DynamoDB table naming conflicts

**Cause:** Table names like `dsg-policy-table` already exist from previous deployment

**Solution:**

```bash
# Update table names with -v2 suffix in CDK
# infra/cdk/lib/constructs/governance.ts
// tableName: 'dsg-policy-table-v2',

# Or use auto-generated names (recommended)
// CDK auto-generates unique names without explicit tableName

# Then deploy new version (dsg-one-dev-v3)
npx cdk deploy --require-approval=any-change  # ONLY after an approved bounded DSG plan and reviewed diff
```

***

## Deployment success criteria

**Deployment acceptance checklist (not a statement that any checks passed):**

* [ ] CloudFormation stack status: `CREATE_COMPLETE`
* [ ] CloudFormation resource inventory matches the approved synthesized template
* [ ] ECS cluster running ≥1 task
* [ ] ALB health checks passing
* [ ] `GET /api/health` returns 200 OK
* [ ] `GET /api/readiness` returns `ready: true`
* [ ] `GET /api/agent/status` returns deployment info
* [ ] All Secrets Manager secrets accessible
* [ ] CloudTrail logging active
* [ ] CloudWatch metrics being published
* [ ] No DLQ messages or error logs

**Additional production-readiness checklist (requires independently observed evidence):**

* [ ] All dev success criteria met
* [ ] Compliance evidence pack generated
* [ ] Security audit checklist completed
* [ ] Load test passed (throughput/latency targets)
* [ ] Disaster recovery tested (RDS backup/restore)
* [ ] On-call rotation configured
* [ ] Monitoring and alerting verified
* [ ] Cost tracking enabled
* [ ] `npm run go:no-go https://<PROD_URL>` passes

***

## Next steps

1. **Review the approved stack plan and real CDK diff; execute deployment only under the authorized scope**
2. **Verify infrastructure health** (run health checks and diagnostics)
3. **Capture AWS outputs** (document resources created)
4. **Build and deploy application** (Docker → ECR → ECS)
5. **Configure DNS and TLS** (Route53 + ACM)
6. **Set up monitoring** (CloudWatch alarms, SNS)
7. **Run production readiness validator** (compliance checks)
8. **Document runbooks** (deployment, scaling, recovery procedures)
9. **Schedule runbook reviews** (monthly for prod)
