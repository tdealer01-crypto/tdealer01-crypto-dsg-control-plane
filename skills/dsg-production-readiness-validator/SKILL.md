---
name: dsg-production-readiness-validator
description: >-
  Validate DSG ONE / ProofGate control plane is production-ready across infrastructure,
  compliance, security, and governance dimensions. Run comprehensive checks on AWS
  resources, Supabase database, deterministic gates, evidence collection, audit trails,
  and compliance matrices. Use when preparing for production GO/NO-GO decision, audit
  preparation, certification compliance checks, or pre-deployment verification. Produces
  compliance evidence pack, audit readiness report, governance validation, and GO/NO-GO
  verdict with proof hash for deterministic replay.
version: 1.0.0
author: DSG Team
license: MIT
---

# DSG Production Readiness Validator

Complete production readiness validation for **DSG ONE / ProofGate Control Plane**.

Covers infrastructure health, security posture, compliance readiness, governance
functionality, evidence collection, audit trails, and regulatory compliance.

---

## When to invoke this skill

| Intent | Use this skill |
|---|---|
| "Is DSG production-ready?" | ✅ Yes — comprehensive validation |
| "Prepare for production GO/NO-GO" | ✅ Yes — run full checklist |
| "Generate compliance evidence pack" | ✅ Yes — evidence collection |
| "Verify governance gates work" | ✅ Yes — gate evaluation tests |
| "Check audit trail functionality" | ✅ Yes — audit readiness |
| "Verify evidence collection" | ✅ Yes — CCVS L1-L5 checks |
| "Prepare for SOC2/ISO27001 audit" | ✅ Yes — compliance mapping |
| "Quick health check (5 min)" | ❌ Use infrastructure-deployer verify action |

---

## Production Readiness Validation Framework

### Level 0: Infrastructure Health (15 min)

```
Checklist:

☐ AWS CloudFormation
  ✓ Stack status: CREATE_COMPLETE or UPDATE_COMPLETE
  ✓ 75+ resources created
  ✓ No failed or in-progress resources
  ✓ Stack outputs available (ALB DNS, ARNs, endpoints)
  ✓ Estimated monthly cost < $5,000 (dev/staging)
  ✓ Estimated monthly cost < $50,000 (production)

☐ ECS Cluster
  ✓ Cluster status: ACTIVE
  ✓ Running tasks = desired count (≥1)
  ✓ Task CPU/memory utilization healthy
  ✓ No crashed tasks or restart loops
  ✓ Task definition deployed successfully
  ✓ Service endpoint responding

☐ Application Load Balancer
  ✓ ALB status: active
  ✓ Listeners: 80 (HTTP) + 443 (HTTPS)
  ✓ Target groups healthy (all targets passing)
  ✓ Response times < 500ms (p99)
  ✓ Error rate < 0.1%
  ✓ Can reach /api/health → 200 OK
  ✓ Can reach /api/readiness → ready: true

☐ Database (Supabase / RDS)
  ✓ Connection successful
  ✓ Schema migrations applied
  ✓ CCVS tables exist (audit, evidence, compliance)
  ✓ RLS policies enabled
  ✓ Backups configured
  ✓ Query performance baseline established

☐ Secrets & Encryption
  ✓ All secrets in Secrets Manager or vault
  ✓ No hardcoded secrets in code
  ✓ KMS encryption keys active
  ✓ IAM roles follow least-privilege
  ✓ Certificate valid (TLS, not self-signed)
  ✓ API keys rotatable

☐ Monitoring & Logging
  ✓ CloudWatch logs collecting
  ✓ X-Ray tracing enabled
  ✓ CloudTrail audit logging active
  ✓ VPC Flow Logs enabled
  ✓ Custom metrics published
  ✓ Alarms configured for critical metrics
```

### Level 1: Security Posture (15 min)

```
Checklist:

☐ Network Security
  ✓ VPC configured (10.0.0.0/16)
  ✓ Public/private subnets separated
  ✓ Security groups restrict inbound to ports 80, 443
  ✓ NAT Gateway for private egress
  ✓ VPC Flow Logs enabled
  ✓ Network ACLs locked down
  ✓ No security group allowing 0.0.0.0/0 on privileged ports

☐ API Security
  ✓ CORS headers configured
  ✓ Rate limiting enabled
  ✓ Request body size limits enforced
  ✓ SQL injection protection active
  ✓ XSS protection headers present
  ✓ CSRF tokens enabled (if applicable)
  ✓ API key rotation policy documented

☐ Data Protection
  ✓ All data encrypted at rest (KMS)
  ✓ All data encrypted in transit (TLS 1.2+)
  ✓ S3 buckets: block public access
  ✓ S3 buckets: versioning enabled
  ✓ S3 buckets: lifecycle policies configured
  ✓ DynamoDB: point-in-time recovery enabled
  ✓ Database: automated backups (daily minimum)

☐ Access Control
  ✓ IAM users use temporary credentials
  ✓ No root user API keys
  ✓ MFA enabled on AWS console
  ✓ Service roles follow least-privilege
  ✓ Cross-account access denied by default
  ✓ Resource-based policies audited
  ✓ SSH/RDP access restricted

☐ Dependency Security
  ✓ npm audit --audit-level=high passes
  ✓ Docker images scanned for vulnerabilities
  ✓ No EOL dependencies
  ✓ Dependency updates on schedule
  ✓ Supply chain attack surface minimized
  ✓ Signed commits enforced
  ✓ Build artifacts verified

☐ Incident Response
  ✓ Incident response plan documented
  ✓ On-call rotation configured
  ✓ Escalation procedures defined
  ✓ Communication templates ready
  ✓ Backup/disaster recovery tested
  ✓ RTO/RPO defined and validated
```

### Level 2: Compliance Readiness (20 min)

```
Checklist:

☐ SOC 2 Type II
  ✓ Control: CC6.1 (Logical access) — IAM tested ✓
  ✓ Control: CC7.2 (System monitoring) — CloudWatch ✓
  ✓ Control: A1.2 (Risk assessment) — Documented ✓
  ✓ Control: A1.3 (Security awareness) — Training done ✓
  ✓ Control: CC6.2 (Need-to-know) — Least-privilege ✓
  ✓ Evidence: Audit logs covering 6+ months ✓
  ✓ Evidence: Change management record ✓
  ✓ Evidence: Incident response exercises ✓

☐ ISO 27001 (Information Security Management)
  ✓ Asset inventory maintained
  ✓ Risk assessment completed
  ✓ Information classification policy
  ✓ Access control policy implemented
  ✓ Incident management procedure
  ✓ Backup and recovery tested
  ✓ Third-party assessment scheduled

☐ EU AI Act Compliance
  ✓ AI system classification: High-risk? ✓
  ✓ Intended purpose clearly documented
  ✓ Risk assessment completed
  ✓ Data governance framework
  ✓ Model card/technical documentation
  ✓ Human oversight procedures
  ✓ Monitoring and logging of AI decisions
  ✓ Transparency and explainability verified

☐ NIST AI Risk Management Framework
  ✓ Map NIST Gov to DSG control plane functions
  ✓ Verify all 4 core functions (Govern, Map, Measure, Manage)
  ✓ Document AI risk register
  ✓ Establish metrics for effectiveness
  ✓ Review quarterly

☐ GDPR/Privacy
  ✓ Data processing agreement (DPA) in place
  ✓ Privacy impact assessment (PIA) done
  ✓ Retention policy defined (delete after 90 days default)
  ✓ Export/deletion procedures tested
  ✓ Privacy policy published
  ✓ Consent mechanism for data processing
  ✓ Data breach response plan documented

☐ HIPAA (if health data)
  ✓ Business associate agreement (BAA) signed
  ✓ Encryption (at rest and in transit)
  ✓ Access controls and audit logs
  ✓ Backup and recovery procedures
  ✓ Incident response plan
  ✓ Staff training on HIPAA
  ✓ Annual risk assessment

☐ PCI DSS (if payment card data)
  ✓ No credit card data stored or transmitted
  ✓ If needed: PCI scanning and certification
  ✓ Tokenization or encryption if applicable
  ✓ Access logging and monitoring
```

### Level 3: Governance & Evidence (20 min)

```
Checklist:

☐ Deterministic Gates
  ✓ /api/dsg/v1/gates/evaluate reachable
  ✓ Sample policy evaluation returns PASS/BLOCK/REVIEW
  ✓ proofHash generation working
  ✓ Gate decisions replayable
  ✓ UNSUPPORTED never maps to PASS
  ✓ Policy version pinning working

☐ Compliance Evidence Pack
  ✓ Evidence schema version: ccvs-makk8-v1 (or later)
  ✓ L1 unit evidence collected (test coverage ≥80%)
  ✓ L2 integration evidence collected (API tests pass)
  ✓ L3 adversarial evidence (replay tests pass)
  ✓ L4 mutation evidence (code review checklist)
  ✓ L5 provenance evidence (build logs signed)
  ✓ Evidence chain hash verifiable
  ✓ Compliance matrix generated and accessible

☐ Audit Trail
  ✓ All decisions logged (when, what, why, who)
  ✓ Audit table non-repudiable (immutable log)
  ✓ Audit table queryable by date/user/action
  ✓ Sample audit queries return expected records
  ✓ Retention policy enforced (365 days minimum)
  ✓ Export to compliance system working

☐ Runtime Governance
  ✓ Before-execution: policy evaluation working
  ✓ During-execution: conformance checking active
  ✓ After-execution: evidence collection functional
  ✓ Execution lifecycle spans Before/During/After
  ✓ Proof hash stored with execution record

☐ Replay Governance
  ✓ Old execution can be replayed from proof + policy version
  ✓ Replay produces same decision as original
  ✓ Replay evidence matches original evidence
  ✓ Replay timestamp preserved
  ✓ Sample: Replay execution from 30 days ago successfully

☐ Credential Management
  ✓ Credential broker queries secrets correctly
  ✓ Secrets never exposed in logs/returns
  ✓ Leases issued with fingerprints (not raw secrets)
  ✓ Lease expiration enforced
  ✓ Credentials rotatable
  ✓ Credential audit log maintained
```

### Level 4: Operational Excellence (15 min)

```
Checklist:

☐ Runbooks & Documentation
  ✓ Deployment runbook (docs/RUNBOOK_DEPLOY.md)
  ✓ Incident response runbook
  ✓ Scaling runbook
  ✓ Disaster recovery runbook
  ✓ Troubleshooting guide
  ✓ Architecture documentation
  ✓ Post-mortems of past incidents

☐ Monitoring & Alerting
  ✓ Dashboard setup (CloudWatch or Datadog)
  ✓ Key metrics dashboard: latency, error rate, throughput
  ✓ Alerts for: high error rate (>5%), high latency (>1s p99)
  ✓ On-call rotation: PagerDuty / Opsgenie configured
  ✓ Alert escalation policy defined
  ✓ Alert fatigue < 3 false positives per week

☐ Change Management
  ✓ Change log maintained (git + GitHub releases)
  ✓ Semantic versioning (MAJOR.MINOR.PATCH)
  ✓ Breaking changes documented
  ✓ Migration guides for major versions
  ✓ Rollback procedures tested
  ✓ Blue-green or canary deployment available

☐ Cost Management
  ✓ Monthly cost < budget (dev: $2k, staging: $5k, prod: $50k)
  ✓ Cost anomaly detection enabled
  ✓ Reserved capacity purchased (if steady-state)
  ✓ Spot instances used for non-critical workloads
  ✓ Cost tags applied to all resources
  ✓ Cost forecasting reviewed monthly

☐ Performance Baselines
  ✓ P50 latency: < 100ms
  ✓ P99 latency: < 500ms
  ✓ Error rate: < 0.1%
  ✓ Availability: > 99.5% uptime (4.3 hours downtime/month)
  ✓ Throughput: > 100 req/sec
  ✓ Database query performance: < 50ms p99
```

### Level 5: Audit & Certification (10 min)

```
Checklist:

☐ Third-Party Audit
  ✓ SOC 2 Type II audit scheduled
  ✓ Auditor access provisioned
  ✓ Audit scope defined (systems in scope)
  ✓ Evidence collection ongoing
  ✓ Audit findings tracked
  ✓ Remediation plan for findings
  ✓ Report delivery expected (target date)

☐ Certifications
  ✓ ISO 27001: certification achieved (or in progress)
  ✓ SOC 2 Type II: report available
  ✓ FedRAMP (if gov contract): authorization status
  ✓ HIPAA BAA (if health data): signed
  ✓ PCI DSS (if payment data): certification current

☐ Compliance Matrix
  ✓ Compliance matrix maps requirements → controls
  ✓ Each control has evidence link
  ✓ Evidence freshness: < 30 days old
  ✓ Matrix reviewed by compliance officer
  ✓ Matrix version tracked
  ✓ Matrix exportable to audit systems

☐ Continuous Compliance
  ✓ Compliance checks automated (CCVS pipeline)
  ✓ Weekly evidence collection runs
  ✓ Monthly compliance report generated
  ✓ Quarterly compliance review with stakeholders
  ✓ Annual compliance re-certification
  ✓ New regulations monitored
```

---

## Validation output

The validator produces:

### 1. Production Readiness Report

```json
{
  "timestamp": "2026-07-23T09:00:00Z",
  "environment": "production",
  "overallStatus": "GO" | "NO-GO" | "CONDITIONAL_GO",
  "readinessScore": 0.0,
  "maximumScore": 100.0,
  "sections": {
    "infrastructure": {
      "status": "PASS" | "FAIL",
      "score": 95,
      "checks": 20,
      "passed": 19,
      "failed": 1,
      "issues": ["ALB health check response time >500ms"]
    },
    "security": { ... },
    "compliance": { ... },
    "governance": { ... },
    "operations": { ... }
  },
  "blockers": [],
  "warnings": [],
  "recommendations": [],
  "approvedBy": "platform-lead@dsg.pics",
  "approvedAt": "2026-07-23T10:00:00Z",
  "validUntil": "2026-08-23T09:00:00Z",
  "proofHash": "sha256:...",
  "compliancePackage": "s3://dsg-evidence/.../compliance-pack-2026-07-23.json"
}
```

### 2. Compliance Evidence Pack

```
CCVS Schema: ccvs-makk8-v1
├── L1: Unit Evidence
│   ├── Test Coverage Report
│   ├── Code Review Checklist
│   └── Type Checking Results
├── L2: Integration Evidence
│   ├── API Test Results
│   ├── Database Migration Verification
│   └── Third-party API Responses
├── L3: Adversarial Evidence
│   ├── Replay Test Results
│   ├── Fault Injection Tests
│   └── Security Scanning Results
├── L4: Mutation Evidence
│   ├── Code Review Sign-offs
│   ├── Architecture Review
│   └── Change Approval
└── L5: Provenance Evidence
    ├── Build Logs (signed)
    ├── Dependency Tree
    └── Container Image Attestation
```

### 3. GO/NO-GO Verdict

```
Status: GO ✓
  - All infrastructure checks pass
  - Security posture verified
  - Compliance ready for audit
  - Governance gates functional
  - Evidence collection operational
  - Production readiness score: 95/100

OR

Status: NO-GO ✗
  - Blocking issues:
    1. CloudFormation stack in CREATE_FAILED (resource: DynamoDB table)
    2. SSL certificate expired
    3. Audit logs not collecting
  - Remediation: Follow RUNBOOK_DEPLOY.md section "Troubleshooting"
  - Re-run validation after fixes
```

---

## CLI invocation examples

```bash
# Quick validation (5 min)
/dsg-production-readiness-validator \
  --environment prod \
  --depth quick

# Full validation (60 min, all checks)
/dsg-production-readiness-validator \
  --environment prod \
  --depth full

# Compliance-focused validation
/dsg-production-readiness-validator \
  --environment prod \
  --focus compliance

# Generate evidence pack only
/dsg-production-readiness-validator \
  --environment prod \
  --action evidence-only

# Pre-GO/NO-GO decision
/dsg-production-readiness-validator \
  --environment prod \
  --action go-no-go
```

---

## Success criteria

✅ **Production GO when:**

- All infrastructure checks pass
- No security vulnerabilities (P0-P1)
- Governance gates functional
- Evidence collection active
- Audit trail working
- Compliance checklist ≥ 90% complete
- Third-party audit in progress
- Readiness score ≥ 90
- Validated by platform lead

❌ **Production NO-GO when:**

- Infrastructure health score < 80
- Any P0 security vulnerability
- Governance gates returning BLOCK
- Evidence collection not working
- Audit trail gaps > 24 hours
- Compliance violations unfixed
- No third-party audit scheduled
- Readiness score < 70

⚠️ **Conditional GO when:**

- Readiness score 70-89
- Minor compliance gaps with remediation plan
- Governance audit scheduled
- Production monitoring not fully mature
- Requires executive sign-off before launch
