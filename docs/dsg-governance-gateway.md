# DSG Governance Gateway

DSG is a governance, invariant, and audit gateway for AI agents.

It does not replace the agent runtime. It sits between existing agents and high-risk tool execution, enforcing policy checks before execution and writing audit-grade proof after execution.

## Product positioning

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

## Why this matters

Most AI agent systems can call tools, APIs, webhooks, and business apps.

The problem is not tool access. The problem is governed execution.

DSG adds the missing control layer:

- deterministic policy decisions
- invariant checks
- risk classification
- approval routing
- gateway execution
- audit ledger commit
- request and record hashing
- proof export for customers and auditors

## Runtime model

Agents keep their own runtime.

Apps keep their own APIs.

DSG controls high-risk action flow.

This avoids forcing customers to migrate their agents or rebuild their app stack before adoption.

## Lock points

The DSG gateway locks the critical points around high-risk execution.

### 1. Tool Registry

A registry of known tools, apps, actions, and connector targets.

Examples:

```text
stripe.refund
stripe.invoice.finalize
gmail.send
slack.post_message
bank.transfer
hubspot.update_deal
zapier.webhook.invoke
```

### 2. Risk Classification

Each tool/action is classified by risk.

```text
low       = read-only or harmless operation
medium    = write operation with low business impact
high      = money movement, external communication, customer data mutation
critical  = irreversible or regulated action
```

### 3. Gateway Execution

High-risk actions must either:

- pass through DSG before the agent executes; or
- be executed directly by DSG after approval.

Execution modes:

```text
Monitor Mode  = agent executes after DSG allow, then commits result
Gateway Mode  = DSG executes tool call directly
Critical Mode = human approval required before execution
```

### 4. Audit Commit

After execution, DSG commits the result into an immutable audit ledger.

The audit record stores:

- org id
- case id
- approval id
- action
- actor
- result
- target
- message
- next status
- request hash
- record hash
- payload
- timestamp

### 5. Proof Export

DSG can export evidence for customers, auditors, and internal governance reviews.

Export forms:

```text
JSON Evidence Pack
CSV / Excel
PDF Report
Record Hash Verification
```

## Current first surface: Finance Governance

The first production surface is Finance Governance.

Verified backend capabilities:

```text
Readiness endpoint          ✅
Supabase runtime tables     ✅
RBAC / entitlement gate     ✅
Approve action smoke test   ✅
Audit ledger proof write    ✅
Request hash / record hash  ✅
```

Finance Governance proves the gateway pattern for controlled approval workflows before expanding into broader connector execution.

## SaaS expansion path

DSG can expand from finance approval governance into a universal AI action governance gateway.

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
