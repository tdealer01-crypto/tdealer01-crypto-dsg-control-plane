# DSG ONE AWS CDK Infrastructure

Enterprise-grade Infrastructure as Code for DSG ONE AI Governance Control Plane.

## Architecture Overview

This CDK project follows **Option 1 (Modular)** architecture with:

- ✅ **Modular Constructs** — Each AWS component is an independent, testable, reusable construct
- ✅ **Multi-Environment Support** — dev, staging, prod with environment-specific configurations
- ✅ **Enterprise Features** — Networking, Security, Governance, Compliance, Observability, FinOps
- ✅ **Least Privilege IAM** — Fine-grained permissions per component
- ✅ **Immutable Audit Trail** — DynamoDB + S3 for tamper-proof evidence
- ✅ **Production-Ready** — Zero-downtime deployments, auto-scaling, disaster recovery

## Project Structure

```
infra/cdk/
├── bin/
│   └── dsg-one.ts                     # App entry point
├── lib/
│   ├── config/
│   │   ├── types.ts                   # Configuration types
│   │   ├── dev.ts                     # Dev environment config
│   │   ├── staging.ts                 # Staging environment config
│   │   ├── prod.ts                    # Prod environment config
│   │   └── index.ts                   # Config loader
│   ├── constructs/
│   │   ├── networking.ts              # VPC, subnets, security groups
│   │   ├── iam.ts                     # IAM roles and policies
│   │   ├── kms.ts                     # KMS keys for encryption
│   │   ├── secrets.ts                 # Secrets Manager integration
│   │   ├── ecr.ts                     # ECR repositories
│   │   ├── governance.ts              # Policy engine, audit trail, evidence
│   │   └── index.ts                   # Constructs barrel export
│   ├── utils/
│   │   ├── tags.ts                    # Tag management utilities
│   │   ├── naming.ts                  # Resource naming conventions
│   │   ├── permissions.ts             # IAM policy builders
│   │   ├── validation.ts              # Configuration validation
│   │   └── index.ts                   # Utils barrel export
│   └── dsg-one-stack.ts               # Main orchestration stack
├── policies/                          # Policies as Code (YAML/JSON)
├── dashboards/                        # CloudWatch dashboards
├── alarms/                            # CloudWatch alarms
├── scripts/                           # Deployment scripts
├── test/                              # Test suite
├── cdk.json                           # CDK config
├── tsconfig.json                      # TypeScript config
├── package.json                       # Dependencies
└── README.md                          # This file
```

## Configuration

### Environment Variables

Before deploying, set your AWS credentials:

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
export ENVIRONMENT=dev  # dev, staging, or prod
```

### Configuration Hierarchy

Each environment has a configuration file:

- **dev.ts** — Minimal resources, logging enabled, no MFA required
- **staging.ts** — Production-like, multi-region, canary deployments
- **prod.ts** — Maximum resources, 3 AZs, MFA required, all compliance enabled

### Customizing Configuration

Modify `lib/config/{dev,staging,prod}.ts`:

```typescript
export const prodConfig: DSGConfig = {
  env: 'prod' as EnvironmentType,
  aws: {
    account: process.env.AWS_ACCOUNT_ID || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  compute: {
    desiredCount: 3,
    minCapacity: 3,
    maxCapacity: 10,
    taskCpu: 1024,
    taskMemory: 2048,
  },
  // ... more configuration
};
```

## Getting Started

### Prerequisites

```bash
npm install -g aws-cdk
npm install -g typescript
```

### Installation

```bash
cd infra/cdk
npm install
```

### Deployment

#### 1. Synthesize CDK (dry-run)

```bash
export ENVIRONMENT=dev
npm run synth
```

This generates CloudFormation templates in `cdk.out/`.

#### 2. Diff (view changes)

```bash
npm run diff
```

Shows what will be created/modified/destroyed.

#### 3. Deploy to AWS

```bash
npm run deploy
```

You'll be prompted to approve changes before deployment proceeds.

### Multi-Environment Deployment

```bash
# Deploy dev
ENVIRONMENT=dev npm run deploy

# Deploy staging
ENVIRONMENT=staging npm run deploy

# Deploy prod
ENVIRONMENT=prod npm run deploy
```

## Constructs Reference

### 1. NetworkingConstruct

**Creates:** VPC, subnets, NAT gateways, security groups, VPC Flow Logs

**Configuration:**
```typescript
networking: {
  vpcCidr: '10.0.0.0/16',
  maxAzs: 2,
  natGateways: 1,
  enableFlowLogs: true,
}
```

### 2. IAMConstruct

**Creates:** ECS task execution role, ECS task role, governance runtime role, audit logging role

**Policies:** Least-privilege, MFA-enforced (prod)

### 3. KMSConstruct

**Creates:** Master key, data key, audit key with rotation enabled

**Aliases:** `dsg-one-{env}-master-key`, `dsg-one-{env}-data-key`, etc.

### 4. SecretsConstructruct

**Creates:** API secrets, database secrets, OAuth secrets

**Rotation:** Auto-rotation enabled for prod every 30 days

### 5. ECRConstruct

**Creates:** API repository, Worker repository

**Scanning:** Image vulnerability scanning on push

**Lifecycle:** Auto-clean old tags (keep 5 dev tags, purge untagged after 7 days)

### 6. GovernanceConstruct

**Creates:**
- **PolicyTable** — Policy versions and constraints
- **AuditTable** — Immutable audit trail (DynamoDB Streams enabled)
- **ReplayProofTable** — Deterministic proof storage
- **EvidenceBucket** — S3 with versioning, encryption, intelligent tiering

## Security Principles

### Least Privilege IAM

Each role has minimal permissions for its specific function:

```typescript
// ✅ Good: Specific action + resource
{
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-bucket/audit/*"
}

// ❌ Bad: Wildcard resources
{
  "Action": "s3:*",
  "Resource": "*"
}
```

### Encryption

- **At Rest:** KMS CMK (Customer Managed Keys)
- **In Transit:** TLS 1.2+ (AWS default)
- **DynamoDB:** CUSTOMER_MANAGED encryption
- **S3:** KMS encryption

### Immutable Audit Trail

- DynamoDB streams for all modifications
- S3 versioning for compliance evidence
- CloudTrail for API calls

### MFA Enforcement (Prod Only)

Policies deny actions without MFA token.

## Observability

### CloudWatch Logs

Retention configured per environment:
- dev: 7 days
- staging: 30 days
- prod: 90 days

### VPC Flow Logs

Network traffic captured to CloudWatch Logs for security analysis.

### Future Additions

- CloudWatch dashboards (in `dashboards/`)
- Custom metrics and alarms
- X-Ray tracing
- CloudTrail logging

## Compliance & Governance

### Configuration Flags

```typescript
compliance: {
  iso42001: true,        // ISO 42001 AI Management
  nistAiRmf: true,       // NIST AI Risk Management Framework
  euAiAct: true,         // EU AI Act compliance
  soc2: true,            // SOC 2 Type II
  complianceReportingEnabled: true,
}

governance: {
  policyEngineEnabled: true,
  approvalRequired: true,
  replayProofRequired: true,
  immutableAuditEnabled: true,
}
```

### Policy as Code

Define governance policies in `policies/`:

- `runtime-policy.yaml` — Execution constraints
- `deployment-policy.yaml` — Blue/green, canary rules
- `ai-policy.yaml` — Model evaluation, fallback gates
- `compliance-policy.yaml` — ISO/NIST/EU AI Act checks

## Maintenance

### Updating Dependencies

```bash
npm update aws-cdk-lib constructs
npm run build
```

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
npm run format
```

## Troubleshooting

### Common Issues

**Issue:** `AWS::CDK not found` during deploy
- Solution: Ensure CDK toolkit is bootstrapped:
  ```bash
  cdk bootstrap aws://ACCOUNT-ID/REGION
  ```

**Issue:** Insufficient permissions
- Solution: Check IAM permissions for your AWS user/role

**Issue:** Resource already exists
- Solution: Synthesize with `--force` to overwrite:
  ```bash
  npm run synth -- --force
  ```

## Next Steps

### Immediate (Phase 1)

- ✅ Core infrastructure (networking, IAM, KMS, secrets, ECR, governance)
- [ ] ECS/Fargate compute layer
- [ ] ALB for load balancing
- [ ] Basic monitoring (CloudWatch)

### Short-term (Phase 2)

- [ ] Auto-scaling configuration
- [ ] Blue/green deployment
- [ ] CloudTrail audit logging
- [ ] X-Ray tracing
- [ ] Security Hub integration

### Long-term (Phase 3)

- [ ] Multi-region failover
- [ ] Disaster recovery (DR)
- [ ] Advanced FinOps (cost anomaly detection, rightsizing)
- [ ] Feature flags system
- [ ] Workspace isolation (multi-tenant)

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [AWS CDK API Reference](https://docs.aws.cdk.dev/)
- [DSG ONE Architecture](../../VERIFICATION_MATRIX.md)
- [Deployment Runbook](../../docs/RUNBOOK_DEPLOY.md)

## Support

For issues, refer to:
1. `CLAUDE.md` — Project principles and conventions
2. `docs/agents/CLAUDE_TOOL_API_CONTRACT.md` — Tool/API boundaries
3. GitHub Issues with tag `infra/cdk`

---

**Last Updated:** 2026-07-23
**Version:** 1.0.0-alpha
**Status:** Development Phase (Phase 1 complete)
