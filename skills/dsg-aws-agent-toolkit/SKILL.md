---
name: dsg-aws-agent-toolkit
version: 1.0.0
description: Use AWS Agent Toolkit as the AWS inspection/execution adapter for DSG ONE while preserving plan alignment, approval, least privilege, and evidence capture.
---

# DSG AWS Agent Toolkit

Use this skill when a DSG ONE task needs AWS documentation, resource inspection, CDK planning, deployment diagnostics, or an approved AWS mutation.

## User-visible contract

The operator should see four things without reading raw logs:

1. **Plan** — what DSG intends to inspect or change.
2. **Gate** — `READY`, `BLOCKED`, or `NEEDS_APPROVAL`.
3. **Result** — `PASS` or `FAIL` for the requested AWS operation.
4. **Evidence** — CloudFormation/CDK output, AWS API response, GitHub Actions run/commit, and verification artifacts.

## Trust boundary

AWS Agent Toolkit is an execution/knowledge adapter. It is **not** the DSG truth gate.

For mutations:

```text
user-approved goal
  -> DSG plan
  -> DSG runtime/approval gate
  -> AWS Agent Toolkit or GitHub Actions executor
  -> AWS API
  -> AWS/CloudTrail + deployment evidence
  -> DSG verification result
```

A successful tool call is not enough to claim production readiness.

## Allowed execution modes

### Read/inspect

Allowed without a deployment approval when credentials permit read access:

- Read AWS documentation.
- Describe CloudFormation stacks and events.
- Describe ECS clusters and services.
- Read CloudWatch diagnostics.
- Inspect IAM policy shape without changing it.
- Run `cdk synth` and `cdk diff`.

### Mutation

Mutation must stay inside the approved plan. Prefer the repository deployment workflow rather than ad-hoc local writes.

For CDK deployment use:

```text
.github/workflows/cdk-deploy.yml
```

The workflow uses GitHub OIDC, a protected GitHub Environment, CDK diff artifacts, deployment outputs, and post-deployment evidence capture.

Do not perform delete/destroy actions as an automatic rollback. A failed deploy produces recovery guidance only; destructive recovery requires a separate approved plan.

## AWS MCP connection

Repository MCP configuration:

```text
.mcp.json -> mcpServers.aws-mcp
```

The connection uses the AWS-managed MCP endpoint through `mcp-proxy-for-aws` with SigV4-compatible local AWS credentials.

Local prerequisites for authenticated AWS API execution:

- `uvx`
- AWS credentials/profile with least privilege
- AWS CLI when using the setup wizard or local diagnostics

AWS documentation/discovery may work without mutation permissions. AWS API execution still depends on IAM.

## Deterministic verification

Run:

```bash
node scripts/verify-aws-agent-toolkit.mjs
```

Optional local prerequisite check:

```bash
DSG_VERIFY_AWS_LOCAL=1 node scripts/verify-aws-agent-toolkit.mjs
```

The verifier checks that:

- AWS MCP is present.
- MCP proxy version is pinned.
- Managed AWS MCP endpoint is configured.
- CDK workflow grants GitHub OIDC token permission.
- CDK workflow targets the actual `DSGOneStack-${environment}` stack ID.
- AWS credential configuration exists in the deployment workflow.

## Evidence produced by deployment workflow

The deploy workflow uploads:

- synthesized CDK templates;
- CDK deployment plan;
- CDK deployment outputs;
- CloudFormation stack JSON;
- ECS cluster JSON;
- verification manifest with environment, region, GitHub run ID, and commit SHA.

The verification manifest can say `PASS` only after the CloudFormation stack is in an accepted completed state and the ECS cluster is `ACTIVE`.

## Known current boundary

The current `ECSConstruct` creates the ECS cluster but does not define a Fargate service. Therefore this integration verifies the cluster only and must not claim that an ECS application service is running unless a real service is added and independently verified.

The current DSG CDK configuration defaults to `us-east-1` when `AWS_REGION` is not provided. Keep MCP target-region assumptions aligned with the actual deployment configuration before changing regions.
