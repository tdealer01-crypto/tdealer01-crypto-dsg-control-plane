# AWS Agent Registry namespace migration — 2026-09-09

## Scope

AWS Agent Registry is migrating from the public-preview `bedrock-agentcore` namespace to the dedicated `agent-registry` namespace before the 2026-09-17 shutdown of the old Registry namespace.

This migration applies only to AWS Agent Registry. Other Amazon Bedrock AgentCore services remain on the AgentCore namespace unless AWS documentation explicitly says otherwise.

## Verified account and region

- Region: `us-east-1`
- Source namespace: `bedrock-agentcore`
- Source registry ID: `cGcvetJOMzWh3xmj`
- Source registry name: `registry_zksrh`
- Source status at migration: `READY`
- Source record count: `0`

## Destination

- Namespace: `agent-registry`
- Registry ID: `Bq1kJxIL0SrRPIpe`
- Registry name: `dsg-agent-registry-dev`
- Registry ARN namespace: `arn:aws:agent-registry:...`
- Status after creation: `READY`
- Destination record count: `0`

The destination preserves the source discovery authorization semantics:

- authorizer type: `CUSTOM_JWT`
- existing Cognito discovery configuration retained
- source `autoApproval=true` transformed to `autoApprovalRules=["APPROVE_ALL"]`

No registry records required schema transformation because the source registry contained zero records.

## CloudFormation and IAM migration

`BedrockAgentCoreStack-dev` was updated through an inspected CloudFormation change set.

Verified post-update state:

- stack status: `UPDATE_COMPLETE`
- `RegistryId-dev` export points to `Bq1kJxIL0SrRPIpe`
- IAM role trust permits both `bedrock-agentcore.amazonaws.com` and `agent-registry.amazonaws.com` during cutover
- new `agent-registry:*` record/discovery permissions are present
- existing AgentCore permissions are retained for non-Registry AgentCore services
- CloudWatch log permissions include both `/aws/bedrock/agentcore/*` and `/aws/agent-registry/*`

The old registry is intentionally retained during the migration window. Do not delete it until all client/config/IaC references use the new namespace and a final verification pass succeeds.

## Source-of-truth code update

CDK source must prefer `AGENT_REGISTRY_ID`, retain `BEDROCK_REGISTRY_ID` only as a temporary compatibility alias, and default to the migrated registry ID above. Future CDK deployments must preserve the dual-principal cutover policy until the old namespace is retired.

## Final cutover gate

Before removing old namespace compatibility:

1. Confirm the new registry remains `READY`.
2. Confirm source and destination record counts still match.
3. Confirm all Registry SDK/CLI/IAM/EventBridge/CloudWatch references use `agent-registry` where applicable.
4. Confirm no application depends on the old Registry ARN or endpoint.
5. Remove only Registry-specific old permissions/trust after the cutover; do not remove AgentCore permissions required by Runtime, Gateway, Identity, or other AgentCore services.
