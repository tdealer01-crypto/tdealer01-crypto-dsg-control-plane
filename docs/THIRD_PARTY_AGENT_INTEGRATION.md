# DSG Control Plane: Third-Party Agent Integration & Security

**Reference:** Office Agents 3P Architecture, DSG Isolation & Connectivity Framework  
**Last Updated:** July 19, 2026  
**Status:** Integration Architecture & Best Practices

---

## 1. Overview

The DSG Control Plane can be integrated into third-party agent platforms (e.g., Microsoft Office add-ins, Slack bots, autonomous agents) as a governance layer. This document maps the Office Agents 3P integration patterns to DSG's tenant isolation and connectivity model.

**Key principle:** DSG remains the policy gate; all data and execution decisions flow through the control plane before the agent acts.

---

## 2. Configuration Discovery Pattern

### 2.1 Three-Layer Configuration (Office Agents 3P Model)

The Office Agents 3P architecture uses a three-layer configuration discovery pattern:

```
① Manifest params (baseline, always present)
   ↓ overlay if condition
② Entra/IdP directory attributes (per-user)
   ↓ overlay if condition
③ Bootstrap endpoint (per-user/tenant, customer-hosted)
   ↓
Resolved configuration (precedence: ③ > ② > ①)
```

**Applicability to DSG:**
DSG could adopt this pattern for agent integration:

```
① Agent manifest (DSG control plane URL, policy version, rate limits)
   Baked into agent binary/config
   ↓ overlay if org_id and entra_sso=1
② Entra directory extension (org_id, policy_id, gateway_url, bootstrap_url)
   Admin sets via Microsoft Graph
   Add-in reads from Entra ID token
   ↓ overlay if bootstrap_url present
③ DSG bootstrap endpoint (customer-hosted or Anthropic-hosted)
   GET /api/agent/bootstrap?agent_id=... Authorization: Bearer <Entra ID token>
   Returns: org_id, policy_id, rate_limits, audit_sink_url
   ↓
Resolved DSG configuration
   - org_id (tenant scope)
   - policy_id (which policies apply)
   - gateway_url (governance endpoint)
   - audit_sink_url (where to send traces)
   - rate_limits (per-org throttling)
```

### 2.2 DSG Bootstrap Endpoint (Proposed)

**Current state:** DSG uses Bearer token middleware to resolve org_id from Supabase session.

**Proposed enhancement:** Support a bootstrap endpoint for third-party agents.

```typescript
// GET /api/agent/bootstrap
// Authorization: Bearer <IdP token (Entra, Google, Okta)>
// Returns: org-scoped configuration for the agent

interface AgentBootstrapResponse {
  org_id: string;
  policy_id: string;
  gateway_url: string; // DSG control plane URL
  rate_limits: {
    max_calls_per_minute: number;
    max_tokens_per_day: number;
  };
  audit_sink_url: string; // Where agent sends execution traces
  identity: {
    user_id: string;
    user_email: string;
    org_name: string;
  };
  feature_flags?: {
    deterministic_gates: boolean;
    formal_proofs: boolean;
    credential_broker: boolean;
  };
}
```

**Precedence:**
1. Entra/IdP directory attribute for `dsg_bootstrap_url` (customer override)
2. DSG default bootstrap endpoint (Anthropic-hosted)
3. Hardcoded in agent manifest (fallback)

---

## 3. Third-Party Agent Integration Flows

### 3.1 Gateway Flow (Agent → LLM Gateway → Cloud Backend)

**Similar to Office Agents 3P Gateway pattern:**

```
Third-Party Agent
  ↓ (HTTPS, TLS 1.2+)
DSG Gateway (Governance Layer)
  ├─ Verify org_id from Entra/IdP token
  ├─ Check rate limits (per-org)
  ├─ Enforce policies (deterministic gate)
  ├─ Log execution trace
  └─ Route to customer's LLM backend
      ↓
Customer LLM Gateway (LiteLLM/Portkey/Kong/custom)
  ├─ Customer manages auth, logging, rate limits
  └─ Routes to: Bedrock / Vertex / Azure / direct Anthropic API
      ↓
Claude Backend (customer's choice)
  └─ Inference → structured response (tool calls)
      ↓
DSG Control Plane (capture trace)
  ├─ Store execution in runtime_traces
  ├─ Commit to audit_logs
  └─ Send summary to agent
      ↓
Third-Party Agent (authorized action)
  └─ Executes the approved tool call
```

**Key differences from Office Agents:**
- DSG is *always* in the data path (unlike Office Gateway where customer gateway can be optional)
- Agent must trust DSG's policy decisions before execution
- No Anthropic infrastructure in data path (customer LLM gateway owns routing)

### 3.2 Direct (Agent → DSG → Cloud Backend)

**Similar to Office Agents 3P Bedrock/Vertex Direct pattern:**

Third-party agent bypasses customer gateway, routes directly to DSG, which routes to cloud provider:

```
Third-Party Agent
  ↓
DSG Control Plane
  ├─ Verify org_id + agent credentials
  ├─ Check policies & rate limits
  ├─ Acquire cloud credentials (STS/OAuth)
  ├─ Route to Bedrock / Vertex / Azure
  └─ Log execution + return structured response
      ↓
Third-Party Agent
  └─ Execute approved action
```

**Supported cloud backends:**
- AWS Bedrock (via STS AssumeRoleWithWebIdentity + Entra ID)
- Google Vertex AI (via OAuth 2.0 + service account)
- Azure Foundry (via Entra ID + managed identity)
- Direct Anthropic API (via DSG API key)

---

## 4. Tenant Isolation in Third-Party Integration

### 4.1 Org-ID Derivation

**Pattern:** Always derive org_id from authenticated identity, never from agent-supplied parameters.

```typescript
// ❌ BAD: org_id from request param or header
const org_id = req.query.org_id || req.headers['x-org-id'];

// ✅ GOOD: org_id from verified identity token
const idpToken = req.headers.authorization.split(' ')[1];
const decoded = verify(idpToken, idpPublicKey);
const org_id = decoded.org_id || (
  await getOrgFromDirectory(decoded.sub) // sub = user_id
);
```

### 4.2 Policy Scope

Each DSG policy is scoped to an organization:

```sql
-- Policy is org-scoped
CREATE TABLE policies (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT,
  constraint_set JSONB,
  version INT,
  created_at TIMESTAMP,
  UNIQUE(org_id, name)
);

-- RLS: users can only read/write their org's policies
CREATE POLICY "org_isolation" ON policies
  USING (org_id = auth.uid()::org_id);
```

### 4.3 Audit Trail Isolation

All execution traces are org-scoped:

```sql
CREATE TABLE runtime_traces (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  agent_id TEXT,
  policy_id UUID,
  decision TEXT, -- ALLOW, BLOCK, REVIEW
  reason TEXT,
  input_hash TEXT,
  proof_hash TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (org_id, policy_id) REFERENCES policies(org_id, id)
);

-- Org can only query their own traces
CREATE POLICY "org_isolation" ON runtime_traces
  USING (org_id = current_org_id);
```

---

## 5. Authentication & Authorization

### 5.1 Identity Token Verification

**Three options for agent authentication:**

| Method | Trust Chain | Use Case |
|--------|-------------|----------|
| **Entra ID (Office Agents pattern)** | Agent ← Entra (MSAL) → DSG (verify JWT) | Microsoft ecosystem agents |
| **OAuth 2.0** | Agent ← IdP (Google/Okta) → DSG (verify JWT) | Public agent platforms |
| **API Key (DSG-native)** | Agent stores DSG API key → DSG rate-limits & audits | Internal agents, trusted parties |

### 5.2 Entra ID Integration (Recommended)

```typescript
// middleware.ts enhancement for 3P agents
async function verifyIdentityToken(token: string) {
  // 1. Verify JWT signature using Entra public key
  const decoded = jwt.verify(token, entraPublicKey);
  
  // 2. Validate token claims
  if (!decoded.aud || !decoded.aud.includes(CLAUDE_ADDON_CLIENT_ID)) {
    throw new Error('Invalid audience');
  }
  
  // 3. Extract org_id from Entra extension attribute
  const org_id = decoded['extn.dsg_org_id'];
  if (!org_id) {
    throw new Error('No DSG org_id in Entra attributes');
  }
  
  // 4. Verify user is active in organization
  const org = await getSupabaseAdmin()
    .from('user_orgs')
    .select('org_id')
    .eq('org_id', org_id)
    .eq('user_id', decoded.sub)
    .single();
  
  if (!org) {
    throw new Error('User not in organization');
  }
  
  return {
    user_id: decoded.sub,
    user_email: decoded.email,
    org_id: org_id,
    token_exp: decoded.exp,
  };
}
```

---

## 6. Execution Flow: End-to-End Example

### 6.1 Office Add-In → DSG → Bedrock (Entra ID + AWS STS)

```
1. User opens Excel, add-in loads
   ↓
2. Add-in discovers config (manifest → Entra → bootstrap endpoint)
   org_id = "org_abc123"
   policy_id = "policy_xyz789"
   gateway_url = "https://dsg.example.com/api/execute"
   aws_role_arn = "arn:aws:iam::123456789012:role/dsg-claude-bedrock"
   ↓
3. User: "Analyze this spreadsheet"
   Add-in: MSAL acquires Entra ID token
   ↓
4. POST /api/execute
   Authorization: Bearer <Entra ID token>
   {
     "agent_id": "excel-addon",
     "policy_id": "policy_xyz789",
     "input": { "cells": [...] },
     "mode": "bedrock_direct"
   }
   ↓
5. DSG verifies:
   - Token signature ✓
   - org_id from extn.dsg_org_id ✓
   - Policy exists for org ✓
   - Rate limit: 10/min, current: 3/min ✓
   ↓
6. DSG acquires AWS STS credentials
   AWS STS AssumeRoleWithWebIdentity (Entra token + role ARN)
   ← AccessKeyId, SecretAccessKey, SessionToken
   ↓
7. DSG invokes Bedrock
   POST https://bedrock-runtime.us-west-2.amazonaws.com/...
   SigV4-signed with acquired credentials
   Prompt + cell data (encrypted in transit, TLS 1.2+)
   ↓
8. Bedrock returns structured response (Claude tool calls)
   ↓
9. DSG evaluates policy against response
   - Tool call deterministic gate: ALLOW ✓
   - Tool call in whitelist: ["analyze_cells", "summarize"] ✓
   ↓
10. DSG stores execution trace
    INSERT INTO runtime_traces (
      org_id, agent_id, policy_id, decision, reason, ...
    ) VALUES (
      'org_abc123', 'excel-addon', 'policy_xyz789', 'ALLOW', '...'
    )
    ↓
11. DSG returns to add-in
    {
      "decision": "ALLOW",
      "proof": { "hash": "0x...", "constraints": [...] },
      "response": { "tool_calls": [...] },
      "trace_id": "trace_..."
    }
    ↓
12. Add-in executes the approved tool call
    Updates cells with analysis result
    ↓
13. Add-in sends audit event to DSG
    POST /api/audit/event
    {
      "trace_id": "trace_...",
      "event": "tool_executed",
      "result": "success"
    }
```

---

## 7. Security Considerations for 3P Integration

### 7.1 Token Validation Checklist

When integrating third-party agents, always validate:

```typescript
// Token validation checklist
const validationChecks = [
  // 1. Signature
  ✓ "JWT signature valid (JWKS endpoint)",
  
  // 2. Expiration
  ✓ "Token not expired (exp claim)",
  
  // 3. Audience
  ✓ "Audience matches DSG add-in client ID (aud claim)",
  
  // 4. Org Scope
  ✓ "Org ID present in Entra extension (extn.dsg_org_id)",
  
  // 5. Active Membership
  ✓ "User is active member of org (user_orgs table)",
  
  // 6. Rate Limits
  ✓ "Org not over rate limit (executed this minute)",
  
  // 7. Policy Presence
  ✓ "Policy exists and is active for org",
];
```

### 7.2 Data Isolation in 3P Context

**Three data boundaries:**

| Boundary | Mechanism | Verification |
|----------|-----------|--------------|
| **Org isolation** | RLS policies filter by org_id | SQL audit of SELECT * policies |
| **User audit trail** | All executions logged with user_id + org_id | CloudTrail / Supabase audit logs |
| **Cloud provider isolation** | Agent credentials scoped to customer's AWS/GCP account | IAM role trust policy review |

### 7.3 Credential Handling

**DO NOT:**
- Log or print AWS access keys, OAuth tokens, or Entra ID tokens
- Store long-lived credentials in browser local storage
- Cache credentials beyond their TTL (e.g., AWS STS tokens: 1 hour max)
- Share credentials across organizations

**DO:**
- Use short-lived credentials (STS: 1 hour, OAuth: token + refresh token)
- Refresh credentials silently before expiration
- Store credentials in memory only, cleared after use
- Audit every credential acquisition and release

---

## 8. Roadmap: Third-Party Integration Support

### Phase 1: Entra ID + Bedrock (Q3 2026)

- [ ] Implement bootstrap endpoint (`GET /api/agent/bootstrap`)
- [ ] Support Entra ID token verification in middleware
- [ ] Extend policy evaluation for 3P agents
- [ ] Add AWS STS credential acquisition
- [ ] Test: Office add-in → DSG → Bedrock flow

### Phase 2: Multi-Cloud + OAuth (Q4 2026)

- [ ] Add Google Vertex AI support (OAuth 2.0)
- [ ] Add Azure Foundry support (Entra managed identity)
- [ ] Implement generic OAuth 2.0 token verification
- [ ] Add policy templates for common 3P patterns

### Phase 3: Audit & Compliance (Q1 2027)

- [ ] Formalize 3P agent audit trail format
- [ ] Publish SIEM export for 3P agent traces
- [ ] Add 3P agent tenancy validation test suite
- [ ] Pen test: cross-3P-agent data isolation

---

## 9. Example: Custom Third-Party Agent Integration

### 9.1 Custom Agent Implementation

```typescript
// custom-agent.ts — example 3P agent integration

import { DSGClient } from '@dsg/sdk';

async function executeWithDSGGovernance(
  input: string,
  idpToken: string // Entra ID / Google / Okta token
) {
  // 1. Initialize DSG client
  const dsg = new DSGClient({
    baseUrl: process.env.DSG_GATEWAY_URL,
    token: idpToken, // Identity provider token, not API key
  });
  
  // 2. Resolve config (bootstrap endpoint)
  const config = await dsg.bootstrap();
  console.log(`✓ Org: ${config.org_id}, Policy: ${config.policy_id}`);
  
  // 3. Submit execution to DSG
  const result = await dsg.execute({
    agent_id: 'my-custom-agent',
    policy_id: config.policy_id,
    input: { data: input },
    mode: config.inference_mode, // 'gateway' | 'bedrock_direct' | 'vertex_direct'
  });
  
  // 4. Check policy decision
  if (result.decision !== 'ALLOW') {
    console.error(`❌ Policy decision: ${result.decision}`);
    console.error(`   Reason: ${result.reason}`);
    return;
  }
  
  // 5. Execute approved action
  for (const toolCall of result.response.tool_calls) {
    console.log(`✓ Executing: ${toolCall.name}`);
    const output = await executeTool(toolCall);
    
    // 6. Report back to DSG
    await dsg.audit({
      trace_id: result.trace_id,
      event: 'tool_executed',
      tool_name: toolCall.name,
      result: output,
    });
  }
}
```

### 9.2 Deployment Checklist

Before deploying a 3P agent integration:

```typescript
// ✓ Authentication
- [ ] IdP token verification implemented
- [ ] Token refresh logic handles expiration
- [ ] Credentials never logged or cached

// ✓ Organization Scoping
- [ ] org_id derived from token, not user input
- [ ] Org membership verified (user_orgs table)
- [ ] All queries filtered by org_id

// ✓ Policy Evaluation
- [ ] Policy exists and is active for org
- [ ] Rate limits enforced before execution
- [ ] Deterministic gate validates response

// ✓ Audit Trail
- [ ] Every execution logged to runtime_traces
- [ ] Audit events include user_id, org_id, trace_id
- [ ] Credential acquisitions logged (STS, OAuth)

// ✓ Error Handling
- [ ] Invalid tokens return 401 (not 500)
- [ ] Rate limits return 429 (not 500)
- [ ] Policy failures return detailed reason
- [ ] No secrets in error messages
```

---

## 10. References

- **Office Agents 3P Architecture** — Config discovery, auth flows (Entra, AWS STS, Google OAuth)
- **DSG Isolation & Connectivity Framework** — Tenant isolation, verification model
- **SECURITY_CHECKLIST.md** — Daily ops checklist (apply to 3P integration)
- **middleware.ts** — Current DSG auth implementation (pattern to extend)

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Title** | DSG Control Plane: Third-Party Agent Integration & Security |
| **Audience** | Integration engineers, security teams, 3P platform developers |
| **Status** | Architecture & Implementation Guide |
| **Last Updated** | July 19, 2026 |
| **Owner** | DSG Security Team |
| **Related** | Isolation & Connectivity Framework, SECURITY_CHECKLIST, middleware.ts |

