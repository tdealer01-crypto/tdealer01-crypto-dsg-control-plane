# Zapier Provider Roadmap

Zapier should be integrated as a connector/provider behind the DSG Governance Gateway.

The goal is not to rebuild every app connector inside DSG. The goal is to govern access to Zapier-powered actions.

## Positioning

```text
DSG = Governance / Invariant / Audit Gateway
Zapier = Universal Connector
Agent = Existing runtime
```

## Target flow

```text
Agent submits plan + requested tool call
→ DSG Plan Check
→ Policy / Invariant / Risk decision
→ DSG Connector Provider
→ Zapier webhook/action
→ App destination
→ Result returns to DSG
→ Audit Commit
→ Evidence Export
```

## Provider interface

A DSG connector provider should expose a stable interface:

```ts
export type GatewayToolRequest = {
  orgId: string;
  actorId: string;
  actorRole: string;
  planId?: string;
  toolName: string;
  action: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  input: Record<string, unknown>;
};

export type GatewayToolResult = {
  ok: boolean;
  provider: string;
  toolName: string;
  action: string;
  target?: string;
  result?: Record<string, unknown>;
  error?: string;
};
```

## Required DSG checks before Zapier execution

```text
org entitlement
actor role
tool registry allowlist
risk classification
policy decision
invariant check
approval requirement
payload validation
```

## Implementation phases

### Phase 1: Webhook provider

- Add `lib/gateway/providers/zapier-webhook-provider.ts`
- Support one configured Zapier webhook URL per tool
- Require DSG access gate before provider execution
- Commit result to audit ledger

### Phase 2: Tool Registry

- Add DB-backed tool registry
- Add risk classification
- Add allowlist/denylist
- Add per-org provider configuration

### Phase 3: Gateway Execution API

- Add `POST /api/gateway/tools/execute`
- Validate request
- Run plan/policy/risk checks
- Call provider if allowed
- Commit result

### Phase 4: Customer-facing SaaS controls

- Tool registry UI
- Connector setup UI
- Risk policy UI
- Audit proof export UI

## Non-goals

Do not replace Zapier.

Do not rebuild every app connector.

Do not force customers to migrate their agents.

Do not let agents bypass DSG for high-risk actions.

## SaaS claim

```text
Use your existing agents.
Use your existing apps.
Route high-risk actions through DSG.
Execute through Zapier.
Export proof when auditors ask.
```
