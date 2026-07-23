---
name: dsg-secrets-manager-integrator
description: >-
  Integrate DSG agents and services with AWS Secrets Manager for production-grade
  secret management. Configure credential broker for Secrets Manager queries, create
  IAM policies for secret access, update ECS task definitions with secret environment
  variables, rotate API keys, manage secret versions, audit secret access, and test
  credential leasing. Use this skill when: configuring agents for AWS Secrets Manager,
  enabling Hermes controlled executor credential management, migrating from hardcoded
  secrets to vault-based secrets, setting up automated key rotation, or auditing
  credential access patterns. Removes hardcoded secrets, enables deterministic
  credential leasing with fingerprints, and creates audit trail of secret access.
version: 1.0.0
author: DSG Team
license: MIT
---

# DSG Secrets Manager Integrator

Production secrets management via **AWS Secrets Manager** integration with DSG agents,
credential broker, Hermes controlled executor, and deterministic governance.

---

## When to invoke this skill

| Intent | Use this skill |
|---|---|
| "Configure credential broker for Secrets Manager" | ✅ Yes — broker integration |
| "Set up Hermes executor with secret leasing" | ✅ Yes — controlled executor auth |
| "Remove hardcoded secrets from environment" | ✅ Yes — migration to vault |
| "Rotate API keys and database passwords" | ✅ Yes — key rotation |
| "Audit which service accessed which secret" | ✅ Yes — access audit trail |
| "Test credential lease expiration" | ✅ Yes — lease lifecycle |
| "Create IAM policy for secret access" | ✅ Yes — policy generation |
| "Enable ECS task to query Secrets Manager" | ✅ Yes — ECS integration |
| "Quick health check on a single secret" | ❌ Use AWS CLI or Console directly |

---

## Architecture overview

```
┌────────────────────────────────────────────────────────────┐
│                    DSG Agent / Service                      │
└─────────────────────┬──────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────┐
│              Credential Broker (Node.js)                    │
│  lib/dsg/brain/credential-broker.ts                        │
│                                                             │
│  ✓ Query Secrets Manager                                   │
│  ✓ Issue leases with expiration                            │
│  ✓ Return fingerprints (not raw secrets)                   │
│  ✓ Audit access in DynamoDB                               │
│  ✓ Support policy-based grants                            │
└─────────────────────┬──────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┬──────────────┐
        ▼                            ▼              ▼
  AWS Secrets Manager          DynamoDB         CloudTrail
  ┌─────────────────┐      (credential_leases) (audit logs)
  │ api-secrets-v2  │
  │ - API_KEY       │
  │ - JWT_SECRET    │
  │                 │
  │ db-secrets-v2   │
  │ - password      │
  │ - host          │
  │                 │
  │ oauth-secrets-v2│
  │ - client_id     │
  │ - client_secret │
  └─────────────────┘
```

---

## Secrets Manager structure

### Pre-deployment secrets (created by CDK)

```bash
# API Secrets
aws secretsmanager get-secret-value --secret-id dsg-one-dev-api-secrets-v2
# Returns: ANTHROPIC_API_KEY, JWT_SECRET, API_KEY

# Database Secrets
aws secretsmanager get-secret-value --secret-id dsg-one-dev-database-secrets-v2
# Returns: username, password, host, port, dbname

# OAuth Secrets
aws secretsmanager get-secret-value --secret-id dsg-one-dev-oauth-secrets-v2
# Returns: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, etc.
```

### Credential broker schema (DynamoDB)

```sql
-- Table: credential_leases
CREATE TABLE credential_leases (
  id TEXT PRIMARY KEY,                          -- UUID
  secret_name TEXT NOT NULL,                    -- which secret
  secret_version TEXT,                          -- version of secret
  requester_id TEXT NOT NULL,                   -- agent/service requesting
  grant_policy_hash TEXT,                       -- hash of approval gate
  lease_issued_at TIMESTAMP NOT NULL,           -- when issued
  lease_expires_at TIMESTAMP NOT NULL,          -- when expires (15 min default)
  credential_fingerprint TEXT NOT NULL,         -- hash of secret value
  access_log_id TEXT,                           -- pointer to audit log
  status TEXT NOT NULL,                         -- ACTIVE, EXPIRED, REVOKED
  revoked_at TIMESTAMP,                         -- if revoked early
  revoke_reason TEXT
);

-- Table: credential_access_audit
CREATE TABLE credential_access_audit (
  id TEXT PRIMARY KEY,                          -- UUID
  timestamp TIMESTAMP NOT NULL,                 -- when accessed
  requester_id TEXT NOT NULL,                   -- who requested
  secret_name TEXT NOT NULL,                    -- which secret
  action TEXT NOT NULL,                         -- GET, LEASE, REVOKE
  outcome TEXT NOT NULL,                        -- SUCCESS, DENIED, EXPIRED
  denial_reason TEXT,                           -- if denied
  gate_policy_hash TEXT,                        -- governance gate used
  fingerprint_returned TEXT,                    -- fingerprint sent to requester
  request_context TEXT                         -- caller context
);
```

---

## Credential broker implementation

### Current state (Supabase-backed)

`lib/dsg/brain/credential-broker.ts` currently queries:

```typescript
// Queries dsg_secrets table in Supabase
async function getSecret(secretName: string, policyHash: string) {
  // 1. Validate policy gate approval
  const gateStatus = await evaluateGate(policyHash);
  if (gateStatus !== "PASS") throw new Error("Gate denied");

  // 2. Query Supabase dsg_secrets table
  const secret = await supabase
    .from("dsg_secrets")
    .select("*")
    .eq("name", secretName)
    .single();

  // 3. Issue lease (fingerprint, not raw secret)
  const fingerprint = sha256(secret.value);
  const lease = await createLease(secretName, fingerprint);

  // 4. Audit access
  await auditAccess("GET", secretName, "SUCCESS", lease.id);

  // 5. Return fingerprint + lease ID (NEVER raw secret)
  return { fingerprint, leaseId: lease.id, expiresAt: lease.expiresAt };
}
```

### Target: Secrets Manager migration

```typescript
// Updated: Query AWS Secrets Manager instead
async function getSecret(secretName: string, policyHash: string) {
  // 1. Validate policy gate approval
  const gateStatus = await evaluateGate(policyHash);
  if (gateStatus !== "PASS") throw new Error("Gate denied");

  // 2. Query AWS Secrets Manager
  const secretsManager = new SecretsManagerClient({ region: "us-east-1" });
  const secret = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  // 3. Parse secret value (JSON or plain text)
  const secretValue = JSON.parse(secret.SecretString || "");

  // 4. Issue lease (fingerprint, not raw secret)
  const fingerprint = sha256(JSON.stringify(secretValue));
  const lease = await createLease(secretName, fingerprint);

  // 5. Audit access to DynamoDB
  await auditAccess("GET", secretName, "SUCCESS", lease.id, policyHash);

  // 6. Return fingerprint + lease ID (NEVER raw secret)
  return {
    fingerprint,
    leaseId: lease.id,
    expiresAt: lease.expiresAt,
    version: secret.VersionId,
  };
}
```

---

## Integration patterns

### Pattern 1: Direct service authentication

```typescript
// ECS task execution role can query Secrets Manager
const secretsManager = new SecretsManagerClient({ region: "us-east-1" });

async function getApiKey() {
  try {
    const response = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: "dsg-one-prod-api-secrets-v2",
      })
    );

    const secrets = JSON.parse(response.SecretString || "{}");
    return secrets.ANTHROPIC_API_KEY;
  } catch (error) {
    console.error("Failed to fetch secret:", error);
    throw error;
  }
}
```

### Pattern 2: Agent credential leasing (via broker)

```typescript
// Agent requests credential through broker
const broker = new CredentialBroker({ backendUrl: "..." });

async function executePlan(plan: Plan) {
  // 1. Evaluate deterministic gate
  const gateResult = await broker.evaluateGate(plan, policyHash);
  if (gateResult.status !== "PASS") throw new Error("Gate denied");

  // 2. Request credential lease from broker
  const lease = await broker.leaseCredential(
    "dsg-one-prod-api-secrets-v2",
    gateResult.proofHash,
    { expirySeconds: 900 } // 15 min default
  );

  // 3. Use fingerprint for compliance, not raw secret
  console.log(`Using credential (fingerprint: ${lease.fingerprint})`);

  // 4. Credential broker stores raw secret internally
  // 5. Agent never touches raw secret
}
```

### Pattern 3: Hermes controlled executor

```typescript
// Hermes executes plan with secret leasing
const executor = new HermesExecutor({ credentialBroker: broker });

async function executeControlledPlan(plan: Plan) {
  // 1. Plan proposes: "execute shell command X with database credential"
  // 2. Hermes evaluates gate with policy
  // 3. Hermes requests credential lease from broker
  // 4. Broker issues lease with fingerprint
  // 5. Hermes injects lease ID (not secret!) into execution context
  // 6. Execution code uses lease to authenticate
  // 7. Broker translates lease → actual secret (server-side only)
  // 8. Execution completes, lease expires
  // 9. Audit trail records: plan hash, gate approval, credential access
}
```

---

## Setup: Step-by-step

### Step 1: IAM Policy for ECS Task Execution Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerReadAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:dsg-one-dev-*"
      ]
    },
    {
      "Sid": "KmsDecryptAccess",
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:DescribeKey"],
      "Resource": [
        "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KMS_KEY_ID"
      ]
    },
    {
      "Sid": "DynamoDBAccessForAudit",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/credential_leases",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/credential_access_audit"
      ]
    }
  ]
}
```

### Step 2: Update ECS Task Definition

```json
{
  "containerDefinitions": [
    {
      "name": "dsg-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/dsg-api:latest",
      "secrets": [
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:dsg-one-prod-api-secrets-v2:ANTHROPIC_API_KEY::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:dsg-one-prod-database-secrets-v2:password::"
        }
      ],
      "environment": [
        {
          "name": "CREDENTIAL_BROKER_URL",
          "value": "http://localhost:3001/api/credential-broker"
        },
        {
          "name": "SECRETS_MANAGER_ENABLED",
          "value": "true"
        }
      ]
    }
  ],
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole"
}
```

### Step 3: Update credential broker (Node.js)

```typescript
// lib/dsg/brain/credential-broker.ts

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManagerClient({ region: "us-east-1" });

export async function getSecretFromVault(
  secretName: string,
  version?: string
): Promise<Record<string, string>> {
  try {
    const response = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionId: version,
      })
    );

    if (response.SecretString) {
      try {
        return JSON.parse(response.SecretString);
      } catch {
        // Plain text secret
        return { value: response.SecretString };
      }
    } else if (response.SecretBinary) {
      // Binary secret (rare)
      return { value: Buffer.from(response.SecretBinary).toString("utf-8") };
    }

    throw new Error("Secret has no value");
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error);
    throw error;
  }
}

// Update lease issuance
export async function issueLease(
  secretName: string,
  policyHash: string,
  options?: { expirySeconds?: number }
) {
  // 1. Get secret from Secrets Manager (server-side only)
  const secret = await getSecretFromVault(secretName);

  // 2. Issue lease
  const fingerprint = sha256(JSON.stringify(secret));
  const expirySeconds = options?.expirySeconds || 900;

  const lease = {
    id: generateUUID(),
    secretName,
    fingerprint,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + expirySeconds * 1000),
    status: "ACTIVE",
  };

  // 3. Store lease in DynamoDB
  await dynamodb
    .from("credential_leases")
    .insert([
      {
        id: lease.id,
        secret_name: secretName,
        requester_id: getRequesterId(),
        grant_policy_hash: policyHash,
        credential_fingerprint: fingerprint,
        lease_expires_at: lease.expiresAt,
        status: "ACTIVE",
      },
    ]);

  // 4. Audit access
  await auditSecretAccess("LEASE", secretName, "SUCCESS", lease.id, policyHash);

  // 5. Return lease (NOT secret!)
  return {
    leaseId: lease.id,
    fingerprint,
    expiresAt: lease.expiresAt,
  };
}
```

### Step 4: Enable in application

```typescript
// app/api/execute/route.ts or similar

import { getSecretFromVault } from "@/lib/dsg/brain/credential-broker";

export async function POST(request: Request) {
  // 1. Extract intent from request
  const { agentId, plan } = await request.json();

  // 2. Evaluate deterministic gate
  const gateResult = await evaluateGate(plan);
  if (gateResult.status !== "PASS") {
    return NextResponse.json({ status: "BLOCK" }, { status: 403 });
  }

  // 3. Request credential if needed
  if (plan.requiresCredential) {
    const lease = await issueLease(plan.credentialName, gateResult.proofHash);
    console.log(`Credential lease: ${lease.fingerprint}`);
    // Pass lease ID to execution context
  }

  // 4. Execute plan
  // 5. Audit execution
  // 6. Return result
}
```

---

## Security best practices

### ✅ DO

- Store secrets in Secrets Manager (never hardcoded)
- Issue leases with short expiry (15 min default)
- Return fingerprints to callers (never raw secrets)
- Audit every secret access (who, what, when, why)
- Use IAM roles (not API keys) for ECS task authentication
- Rotate keys on schedule (90 days minimum)
- Use KMS encryption for Secrets Manager
- Enable CloudTrail for secret access audit trail
- Test credential broker under load
- Monitor lease expiration and renewal

### ❌ DON'T

- Hardcode secrets in environment variables
- Print secrets in logs (use fingerprints instead)
- Return raw secrets to untrusted code
- Allow unlimited lease duration
- Skip audit logging
- Use root credentials in applications
- Store backup secrets in unencrypted files
- Ignore secret rotation deadlines
- Bypass the credential broker for "quick access"
- Grant overly broad IAM permissions

---

## Testing & verification

### Test 1: Secrets Manager connectivity

```bash
# Verify ECS task can query Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id dsg-one-prod-api-secrets-v2 \
  --region us-east-1

# Expected: Returns secret JSON (with ANTHROPIC_API_KEY, JWT_SECRET, etc.)
```

### Test 2: Credential broker lease issuance

```typescript
// Test lease creation
const lease = await issueLease("dsg-one-prod-api-secrets-v2", policyHash);
expect(lease.fingerprint).toBeDefined();
expect(lease.leaseId).toBeDefined();
expect(lease.expiresAt.getTime() > Date.now()).toBe(true);
```

### Test 3: Lease expiration

```typescript
// Test lease expires
const lease = await issueLease("...", policyHash, {
  expirySeconds: 1,
});
await sleep(2000);

// Should fail after expiry
const result = await useLease(lease.leaseId);
expect(result.status).toBe("EXPIRED");
```

### Test 4: Audit trail

```typescript
// Verify access is logged
const auditRecords = await queryAudit({
  secretName: "dsg-one-prod-api-secrets-v2",
  action: "LEASE",
  status: "SUCCESS",
});

expect(auditRecords.length).toBeGreaterThan(0);
expect(auditRecords[0].fingerprint).toBeDefined();
expect(auditRecords[0].requester_id).toBeDefined();
```

---

## Rollback procedure

If Secrets Manager integration causes issues:

```bash
# 1. Revert to environment variables (temporary)
# Set ECS task environment: SECRETS_MANAGER_ENABLED=false

# 2. Redeploy task
aws ecs update-service \
  --cluster dsg-one-prod \
  --service dsg-service \
  --force-new-deployment

# 3. Once stable, investigate root cause
# 4. Fix credential broker
# 5. Re-enable Secrets Manager
```

---

## Maintenance & monitoring

### Key metrics to track

- **Lease issuance rate** (leases/min) — should be < 10/min for most services
- **Lease expiration rate** (expirations/min) — should match or exceed issuance
- **Access denial rate** (denials/day) — investigate any denial spikes
- **Secret rotation lag** (days since last rotation) — should be < 90
- **Broker latency** (milliseconds) — p99 < 100ms

### Scheduled tasks

- **Daily**: Review credential access audit logs
- **Weekly**: Check lease expiration health
- **Monthly**: Rotate long-lived API keys
- **Quarterly**: Review and update IAM policies
- **Annually**: Audit complete credential lifecycle
