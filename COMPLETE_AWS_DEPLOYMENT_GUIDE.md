# Complete AWS Deployment Guide — DSG ONE + AgentCore + AWS Agent Registry

**Status:** CURRENT — 2026-09-09

This guide supersedes the July 2026 Registry instructions. AWS Agent Registry moved from the public-preview `bedrock-agentcore` Registry namespace to the dedicated `agent-registry` namespace. The old Registry namespace is scheduled to shut down on **2026-09-17**.

> Namespace boundary: only **AWS Agent Registry** moves to `agent-registry`. AgentCore Runtime, Gateway, Identity and other AgentCore services remain under their AgentCore namespaces unless AWS documentation explicitly changes them.

## Current verified dev state

- Region: `us-east-1`
- Agent Registry ID: `Bq1kJxIL0SrRPIpe`
- Registry name: `dsg-agent-registry-dev`
- Registry status: `READY`
- Registry ARN namespace: `arn:aws:agent-registry:...`
- Source preview Registry ID: `cGcvetJOMzWh3xmj` — retained temporarily for rollback during cutover
- Source records: `0`
- Destination records: `0`
- CloudFormation stack: `BedrockAgentCoreStack-dev` — `UPDATE_COMPLETE` after namespace migration

Detailed migration evidence: [`docs/AWS_AGENT_REGISTRY_MIGRATION_20260909.md`](docs/AWS_AGENT_REGISTRY_MIGRATION_20260909.md).

---

## 1. Authentication and credentials

Do not store long-lived AWS access keys in this repository or GitHub Actions.

For local/manual AWS work, prefer a supported short-lived AWS login/session. Verify the active identity before deployment:

```bash
aws sts get-caller-identity
```

For GitHub Actions deployment, use GitHub OIDC and an AWS IAM role with short-lived credentials. The workflow should have:

```yaml
permissions:
  id-token: write
  contents: read
```

Do not add `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` as long-lived repository secrets.

---

## 2. Registry and AgentCore architecture

### Registry-specific namespace

Use the dedicated AWS Agent Registry namespace for Registry APIs and IAM actions:

```text
Control plane endpoint: agent-registry-control.us-east-1.api.aws
Data plane endpoint:    agent-registry.us-east-1.api.aws
IAM prefix:             agent-registry:
Service principal:      agent-registry.amazonaws.com
CloudWatch namespace:   AWS/AgentRegistry
EventBridge source:     aws.agent-registry
```

### AgentCore namespace retained

Do not mechanically replace every `bedrock-agentcore` reference. Existing AgentCore Runtime/Gateway/Identity operations remain separate from the Registry migration.

The current CDK role intentionally trusts both service principals during cutover:

```text
bedrock-agentcore.amazonaws.com
agent-registry.amazonaws.com
```

The old Registry-specific compatibility can be removed only after final cutover verification.

---

## 3. CDK source of truth

Primary files:

```text
infra/cdk/bin/dsg-one.ts
infra/cdk/lib/stacks/bedrock-agentcore-stack.ts
infra/cdk/lib/config/dev.ts
infra/cdk/lib/config/staging.ts
infra/cdk/lib/config/prod.ts
scripts/setup-github-aws-secrets.sh
```

Registry ID resolution is:

```text
AGENT_REGISTRY_ID
  ↓ fallback during cutover
BEDROCK_REGISTRY_ID
  ↓ default
Bq1kJxIL0SrRPIpe
```

`BEDROCK_REGISTRY_ID` is a temporary compatibility alias. New automation should use `AGENT_REGISTRY_ID`.

### Current environment configuration

For the existing AWS account/region deployment, the migrated Registry is:

```yaml
enableAgentCore: true
registryId: Bq1kJxIL0SrRPIpe
cognitoUserPoolId: us-east-1_ZtxWdHzFJ
cognitoClientId: 7njqeoh6bq64s6u44oo9vghfcg
```

Do not assume this Registry ID is valid for a different AWS account or region. Provision or discover the correct Registry there first.

---

## 4. Build and synthesize

```bash
cd infra/cdk
npm ci --legacy-peer-deps
npm run build
npx cdk synth --context environment=dev
```

Before deployment, inspect the CDK diff:

```bash
npx cdk diff --context environment=dev
```

For the Registry migration, expected IAM behavior is:

- preserve AgentCore permissions still used by non-Registry services;
- add `agent-registry` record/discovery permissions;
- use `agent-registry.amazonaws.com` for Registry service trust;
- keep the old principal only during the cutover window;
- output the migrated Registry ID.

Unexpected resource replacement, Registry deletion, or broad unrelated infrastructure changes must be investigated before deployment.

---

## 5. GitHub configuration

The helper script now configures both the preferred variable and temporary compatibility alias:

```bash
./scripts/setup-github-aws-secrets.sh \
  <AWS_ACCOUNT_ID> \
  us-east-1 \
  Bq1kJxIL0SrRPIpe \
  us-east-1_ZtxWdHzFJ \
  7njqeoh6bq64s6u44oo9vghfcg
```

It sets:

```text
AWS_ACCOUNT_ID
AWS_REGION
AGENT_REGISTRY_ID
BEDROCK_REGISTRY_ID   # temporary compatibility alias
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
```

The Registry ID is not a credential, but deployment configuration should still be sourced consistently rather than duplicated across workflows.

---

## 6. Deploy

Manual CDK deployment:

```bash
cd infra/cdk
npm run build
npx cdk diff --context environment=dev
npx cdk deploy BedrockAgentCoreStack-dev \
  --context environment=dev
```

Do not use `--require-approval never` as a default for security-sensitive IAM changes. Review the diff/change set first.

For GitHub Actions, use the repository's deployment workflow only when the required runner/capacity and change-control evidence are available.

---

## 7. Post-deployment verification

Verify CloudFormation:

```bash
aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack-dev \
  --region us-east-1 \
  --query 'Stacks[0].[StackStatus,Outputs]'
```

Expected current output includes:

```text
RegistryId: Bq1kJxIL0SrRPIpe
```

Verify the new Registry with the current AWS Agent Registry CLI/SDK surface:

```bash
aws agent-registry-control list-registries --region us-east-1
```

Then verify records for the migrated Registry. At the 2026-09-09 migration checkpoint, both source and destination record counts were zero.

Do not use the old preview Registry as the canonical target after the migration cutoff.

---

## 8. Final cutover before 2026-09-17

The migration is safe to decommission only after all of the following are true:

1. The new Registry remains `READY`.
2. Source and destination record counts match.
3. Registry clients use `agent-registry` endpoints/SDK/CLI.
4. Registry IAM policies use `agent-registry:*` actions and `arn:aws:agent-registry:...` resources.
5. Registry EventBridge/CloudWatch/CloudTrail integrations, if any, use the new namespace.
6. No code, deployment configuration, or active application requires the old Registry ID/ARN/endpoint.
7. AgentCore Runtime/Gateway/Identity permissions that legitimately remain under AgentCore are preserved.

Only after that verification should the old preview Registry compatibility be removed.

---

## 9. Troubleshooting

### Browser sign-in asks for additional MFA/passkey verification

This is an AWS sign-in/MFA flow and is separate from an already-authenticated CLI/MCP session. Complete the account's configured passkey/security-key challenge for console access. Do not weaken MFA to work around the prompt.

### New Registry not visible

Check the region and namespace first. The migrated dev Registry is in `us-east-1` and uses the dedicated `agent-registry` service.

### Registry sync role fails

If a synchronized Registry record uses an IAM-role credential, the role must trust:

```text
agent-registry.amazonaws.com
```

The migration tool cannot repair a failed asynchronous synchronization solely by copying the record.

### Do not change these blindly

Do not replace AgentCore Runtime/Gateway/Identity service references merely because they contain `bedrock-agentcore`. The Registry namespace migration is intentionally narrower.

---

## Current truth boundary

The AWS migration evidence proves the Registry namespace/infrastructure cutover state. It does not by itself prove every DSG Spacetime runtime, Marketplace publication, or customer execution path. Those remain separate deployment and acceptance gates.
