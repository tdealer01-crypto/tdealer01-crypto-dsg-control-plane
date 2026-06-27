# DSG Agent Execution Policy

**Policy ID:** `policy-dsg-v1`  
**Version:** 1.0  
**Last Updated:** 2026-06-16  
**Status:** Active

## Overview

This policy defines the governance rules for DSG Agent execution within the control plane. All agents must conform to these rules before executing any action.

## Core Principles

1. **Deterministic Evaluation** - All decisions must be reproducible and auditable
2. **Confidence Threshold** - Actions require minimum confidence score
3. **Evidence Preservation** - All execution traces must be recorded
4. **Policy Versioning** - Agent must check policy version before execution

## Execution Rules

{% PolicyRule 
  type="allow"
  condition="confidence >= 0.90"
  resource="user_data"
  action="read"
/%}

This rule allows agents to read user data when confidence score is 90% or higher.

{% PolicyRule
  type="review"
  condition="confidence >= 0.75 AND confidence < 0.90"
  resource="user_data"
  action="modify"
/%}

When confidence is between 75-90%, modifications require manual review before execution.

{% PolicyRule
  type="block"
  condition="confidence < 0.75"
  resource="sensitive_data"
/%}

Low-confidence actions on sensitive data are always blocked.

## Agent Capabilities

### Allowed Actions

- Read audit logs
- Execute deterministic gates
- Manage subagents (if parent agent)
- Access own execution history
- Emit compliance evidence

### Restricted Actions

- Modify policies (only via governance process)
- Access other agents' secrets
- Bypass deterministic gates
- Override manual reviews

## Policy Evaluation

{% GateEvaluator policyId="policy-dsg-v1" interactive=true /%}

Use the above evaluator to test this policy with your specific input parameters.

## Quota Management

{% Alert type="warning" title="Quota Limits" %}
Each agent has monthly execution quota limits. Exceeding quota will trigger rate limiting and block further execution until the quota period resets.
{% /Alert %}

**Monthly Quotas:**
- Free tier: 1,000 executions
- Pro tier: 100,000 executions
- Enterprise: Unlimited (contact sales)

## Compliance & Audit

All executions under this policy generate:

1. **Execution Hash** - SHA256 of execution parameters
2. **Policy Hash** - Version hash of this policy
3. **Proof Chain** - Cryptographic evidence of decision
4. **Audit Log** - Permanent execution record

```typescript
interface ExecutionProof {
  execution_id: string;
  agent_id: string;
  policy_id: string;
  policy_version: string;
  input_hash: string;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  confidence: number;
  timestamp: ISO8601;
  proof_hash: string;
}
```

## Governance

This policy can be updated through the governance process:

1. Policy revision is drafted by authorized users
2. Change hash is computed (`policyHash`)
3. Policy is tested in staging environment
4. Upon approval, policy is deployed with version increment
5. All active agents receive policy update notification

{% Alert type="info" title="Next Review" %}
This policy is scheduled for next review on 2026-09-16. Please submit feedback or improvement requests to your organization administrator.
{% /Alert %}

---

**Questions?** Contact your DSG administrator or visit the compliance documentation.
