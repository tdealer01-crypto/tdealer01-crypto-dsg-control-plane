# DSG Governance Gateway

DSG is a governance, invariant, and audit gateway for AI agents.

It does not replace the agent runtime. It sits between existing agents and high-risk tool execution, enforcing policy checks before execution and writing audit-grade proof after execution.

## Positioning

```text
DSG = Governance / Invariant / Audit Gateway
Zapier = Universal Connector to external apps
Agent = Existing runtime that must submit plans/tool calls through DSG first
```

## Core flow

```text
Agent
→ DSG Plan Check
→ Policy / Invariant / Risk
→ DSG Connector
→ Zapier / Make / n8n / MCP / REST
→ App destination
→ Result back to DSG
→ Audit Ledger / Proof Export
```

## Lock points

The DSG gateway locks the critical points around high-risk execution:

1. Tool Registry
2. Risk Classification
3. Gateway Execution
4. Audit Commit
5. Proof Export

## Execution modes

```text
Monitor Mode  = agent executes after DSG allow, then commits result
Gateway Mode  = DSG executes tool call directly
Critical Mode = human approval required before execution
```

## Current first surface

Finance Governance is the first production surface.

Verified backend capabilities:

```text
Readiness endpoint          OK
Supabase runtime tables     OK
RBAC / entitlement gate     OK
Approve action smoke test   OK
Audit ledger proof write    OK
Request hash / record hash  OK
```

## SaaS expansion path

Near-term connector targets:

```text
Zapier
Make
n8n
Stripe
Gmail
Slack
HubSpot
Shopify
Bank API
Custom HTTP API
MCP tools
```

## Product claim

```text
DSG does not replace your agents or apps.
DSG governs high-risk AI actions before they execute, then records proof after execution.
```
