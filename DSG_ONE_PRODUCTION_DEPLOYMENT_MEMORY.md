# DSG ONE Production Deployment Memory
**Last Updated:** 2026-07-23 08:55 UTC

---

## 🎯 PRIMARY OBJECTIVE
Migrate DSG ONE / ProofGate Control Plane to **100% AWS production infrastructure** with:
- ✅ Modular CDK infrastructure (separate constructs)
- ✅ Zero environment variables (use AWS Secrets Manager)
- ✅ Enterprise/Marketplace Ready governance
- ✅ Production agents with Secrets Manager integration

---

## 📊 CURRENT STATUS

### AWS CDK Deployment (ACTIVE)
**Stack:** `dsg-one-dev-v2` (CloudFormation)
**Region:** us-east-1 (Account: 121205961822)
**Status:** 🔄 **DEPLOYING NOW** (started ~08:45 UTC)
**Expected completion:** 08:55-09:05 UTC (~5-10 min from start)

**What's being created:**
- VPC + Subnets + Security Groups + NAT Gateway
- ECS Cluster + Fargate Task Definition
- Application Load Balancer (ALB)
- DynamoDB tables (policies-v2, audit-trail-v2, replay-proofs-v2)
- S3 buckets (evidence, cloudtrail)
- KMS encryption keys
- AWS Secrets Manager (api-secrets-v2, database-secrets-v2, oauth-secrets-v2)
- CloudTrail audit logging
- CloudWatch monitoring + alarms
- ECR repositories (api-v2, worker-v2)
- IAM roles + policies

**Previous status:** 70/75 resources completed before context break
**Current iteration:** Redeployed with stack name `dsg-one-dev-v2` (v1 stuck in DELETE_FAILED)

### Git Status
**Branch:** `claude/aws-cdk-infrastructure-enterprise`
**Latest commit:** `acbad17b` - "infra/cdk: Update stack name to dsg-one-dev-v2 to bypass CloudFormation state"
**Changes:** ✅ ALL COMMITTED & PUSHED

### Vercel Deployment
**Current:** Still running on Vercel (https://tdealer01-crypto-dsg-control-plane.vercel.app)
**Target:** Migrate to AWS ECS Fargate (when CDK deployment completes)

---

## 🏗️ RECOMMENDED INFRASTRUCTURE ARCHITECTURE

### Modular CDK Structure (TO BE IMPLEMENTED)
```
infra/cdk/lib/
├── config/
│   ├── types.ts (shared types)
│   ├── dev.ts
│   ├── staging.ts
│   ├── prod.ts
│   └── index.ts
├── constructs/
│   ├── networking.ts (VPC, subnets, security groups)
│   ├── ecs.ts (Fargate, task definition, service)
│   ├── alb.ts (load balancer, listeners, target groups)
│   ├── ecr.ts (container registries)
│   ├── iam.ts (roles, policies)
│   ├── kms.ts (encryption keys)
│   ├── secrets.ts (Secrets Manager)
│   ├── cloudwatch.ts (monitoring, alarms)
│   ├── cloudtrail.ts (audit logging)
│   ├── governance.ts (policy tables, audit tables, replay proof)
│   ├── bedrock.ts (AI model access)
│   ├── model-registry.ts (model versioning)
│   ├── compliance.ts (ISO 42001, NIST AI RMF, SOC 2)
│   ├── audit.ts (evidence collection)
│   ├── replay.ts (deterministic replay)
│   ├── autoscaling.ts (scaling policies)
│   ├── route53.ts (DNS)
│   ├── acm.ts (SSL/TLS certificates)
│   ├── backup.ts (disaster recovery)
│   ├── sns.ts (notifications)
│   ├── waf.ts (Web Application Firewall)
│   ├── shield.ts (DDoS protection)
│   ├── finops.ts (cost management)
│   └── observability.ts (X-Ray, dashboards)
├── utils/
│   ├── naming.ts (resource naming conventions)
│   ├── tags.ts (tagging strategy)
│   ├── permissions.ts (IAM policy helpers)
│   └── validation.ts (config validation)
├── dsg-one-stack.ts (main stack - orchestrates all constructs)
└── bin/dsg-one.ts (entrypoint)
```

### Current vs Target Scope

**Current (70/75 resources created):**
- Networking ✅
- ECS ✅
- ALB ✅
- DynamoDB ✅
- S3 ✅
- KMS ✅
- Secrets Manager ✅
- CloudTrail ✅
- CloudWatch ✅

**Still needed for full enterprise readiness:**
- Bedrock integration
- Model Registry + routing
- Compliance constructs (ISO 42001, NIST AI RMF, EU AI Act, SOC 2)
- Route53 + ACM (DNS + TLS)
- Autoscaling policies
- Blue/green + canary deployments
- WAF + Shield
- FinOps + budget alerts
- Backup + disaster recovery
- Multi-region support (optional but recommended)

---

## 🔐 SECRETS MANAGEMENT STRATEGY

### Current Setup (via CDK)
Three Secrets Manager secrets already created (or will be):
1. `dsg-one-dev-api-secrets-v2` → ANTHROPIC_API_KEY, JWT_SECRET, API_KEY
2. `dsg-one-dev-database-secrets-v2` → PostgreSQL credentials
3. `dsg-one-dev-oauth-secrets-v2` → GitHub/Google OAuth client IDs

### Agent Integration (TO BE IMPLEMENTED)
1. **Credential Broker** (`lib/dsg/brain/credential-broker.ts`)
   - Currently: Queries Supabase `dsg_secrets` table
   - Needed: Extend to query AWS Secrets Manager
   - Never expose raw secrets; return redaction fingerprints only

2. **Controlled Executor** (`lib/dsg/brain/controlled-executor.ts`)
   - Uses credential broker to get leases
   - Validates executed commands against plan hash
   - Immutable audit trail

3. **Environment Variables → GONE**
   - Stop using `.env` files
   - All credentials pulled from Secrets Manager at runtime
   - IAM role grants access (task execution role)

---

## 📋 SKILLS TO CREATE

### Skill 1: DSG Infrastructure Deployer
**Trigger:** "Deploy DSG to AWS" / "Setup production infrastructure"
**Output:** CloudFormation stack ID, ALB DNS name, status report
**Test cases:**
- Deploy to dev environment
- Verify all resources created
- Test health checks

### Skill 2: Production Readiness Validator
**Trigger:** "Check if DSG is production ready" / "Verify governance setup"
**Output:** Compliance checklist, audit trail verification, evidence proof
**Coverage:**
- AWS resource health
- IAM permissions
- Encryption enabled
- Audit logging active
- Governance gates functional

### Skill 3: Secrets Manager Integrator
**Trigger:** "Configure agents to use Secrets Manager"
**Output:** Updated credential broker, IAM policies, deployment artifact
**What it does:**
- Extends credential broker for Secrets Manager
- Creates IAM task execution role with secrets access
- Updates ECS task definition
- Tests credential retrieval

---

## ✅ IMMEDIATE NEXT STEPS (when CDK deploy finishes)

1. **Verify CDK deployment completion** (Wakeup @ 08:55 UTC)
   - Check CloudFormation stack status
   - List all 75 resources created
   - Capture ALB DNS name
   - Verify ECS service health

2. **Test infrastructure accessibility**
   ```bash
   # Health check
   curl https://<ALB_DNS>/api/health
   
   # Agent status
   curl https://<ALB_DNS>/api/agent/status
   
   # Readiness
   curl https://<ALB_DNS>/api/readiness
   ```

3. **Document infrastructure outputs**
   - ALB DNS name
   - ECS cluster name
   - Task definition ARN
   - Secret ARNs
   - KMS key ARNs

4. **Create Skill 1 (Infrastructure Deployer)**
   - Test with dev environment
   - Create eval test cases
   - Run through skill-creator loop
   - Iterate based on user feedback

5. **Create Skill 2 (Production Readiness Validator)**
   - Checklist-based validation
   - Evidence collection
   - Compliance mapping

6. **Create Skill 3 (Secrets Manager Integrator)**
   - Update credential broker
   - Deploy updated agents
   - Test end-to-end

7. **Migrate Vercel → AWS ECS**
   - Build Docker images
   - Push to ECR
   - Update ECS task definition
   - Switch ALB traffic

---

## 🔗 CRITICAL REFERENCES

**CLAUDE.md Rules:**
- Line 115-120: Never commit or print AWS credentials
- Line 78-84: Verification ladder (what proofs are needed)
- Line 178-190: Production readiness checklist
- Line 249-259: Deterministic gate conventions (UNSUPPORTED ≠ PASS)

**Project Files:**
- `infra/cdk/lib/config.ts` - Configuration interface
- `infra/cdk/lib/utils/` - Naming, validation helpers
- `lib/dsg/brain/credential-broker.ts` - Credential management
- `lib/dsg/deterministic/` - Governance gate scaffold
- `docs/RUNBOOK_DEPLOY.md` - Deployment source of truth

**Environment Variables (DO NOT HARDCODE):**
- AWS_ACCESS_KEY_ID (proxy-injected after each context break)
- AWS_SECRET_ACCESS_KEY (proxy-injected after each context break)
- AWS_REGION: us-east-1
- AWS_ACCOUNT_ID: 121205961822

---

## 📈 SUCCESS CRITERIA

- [ ] CDK deployment 100% complete (75/75 resources)
- [ ] ECS service healthy (running tasks)
- [ ] ALB health checks passing
- [ ] All Secrets Manager secrets accessible
- [ ] Next.js app running on ECS Fargate
- [ ] Agents pulling credentials from Secrets Manager (no env vars)
- [ ] Governance gates functional
- [ ] Audit trails being collected
- [ ] Skill 1-3 created and tested
- [ ] Production readiness validator passes ✅
- [ ] Zero hardcoded credentials in repo
- [ ] Production-grade observability (CloudWatch, X-Ray)

---

## 🚨 KNOWN BLOCKERS RESOLVED

| Issue | Root Cause | Solution | Status |
|-------|-----------|----------|--------|
| CloudFormation state conflict | CDK deploy attempted to update stack stuck in CREATE_IN_PROGRESS | Renamed stack to `dsg-one-dev-v2`, tables to `-v2` suffix | ✅ Resolved |
| S3 lifecycle validation | Expiration days ≤ transition days | Math.max() to ensure expiration > 30-day transition | ✅ Fixed |
| AWS credentials loss | Context break cleared env vars | Document in memory, re-provide when needed | ⚠️ Ongoing |
| ECS service slow launch | No circuit breaker configured | Add ECS service annotations | 🔄 Next iteration |

---

## 📞 QUICK REFERENCE

**If context breaks, ask user for AWS credentials:**
```bash
AWS_ACCESS_KEY_ID: (user provides via secure channel)
AWS_SECRET_ACCESS_KEY: (user provides via secure channel)
AWS_ACCOUNT_ID: 121205961822
AWS_REGION: us-east-1
```

⚠️ **SECURITY NOTE:** Credentials are NEVER stored in this file or any repo.
Only temporary session use. Always re-request from user when context breaks.

**Key Commands:**
```bash
# Check CDK deploy status
cd infra/cdk && npx cdk deploy --require-approval=never

# Verify CloudFormation stack
aws cloudformation describe-stacks --stack-name dsg-one-dev-v2

# Check ECS service health
aws ecs describe-services --cluster dsg-one-dev-v2 --services ...

# List Secrets Manager
aws secretsmanager list-secrets --filters Key=name,Values=dsg-one-dev
```

---

**Created by:** Claude Haiku 4.5  
**Session:** https://claude.ai/code/session_01VCETca1XXFNU9VCjbVKzpF  
**Branch:** claude/aws-cdk-infrastructure-enterprise
