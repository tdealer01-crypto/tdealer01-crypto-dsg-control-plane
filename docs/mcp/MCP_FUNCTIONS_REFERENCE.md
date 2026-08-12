# DSG MCP Functions Reference

**Last Updated:** 2026-08-12  
**Scan Coverage:** 4 repositories (tdealer01-crypto-dsg-control-plane, dsg-one-v1, dsg-agi-simulation, DSG-Cinema-Proof-Agent)  
**MCP Protocol Version:** v2.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core MCP Functions](#core-mcp-functions)
4. [Supabase Tools](#supabase-tools)
5. [Governance & Spine Tools](#governance--spine-tools)
6. [Vercel Integration Tools](#vercel-integration-tools)
7. [Stripe Payment Tools](#stripe-payment-tools)
8. [Z3 Formal Proof Tools](#z3-formal-proof-tools)
9. [AIMO Integration Tools](#aimo-integration-tools)
10. [Grafana & Incident Response Tools](#grafana--incident-response-tools)
11. [Authentication & API Keys](#authentication--api-keys)
12. [Endpoints Summary](#endpoints-summary)

---

## Overview

The DSG ecosystem implements **Model Context Protocol (MCP)** across 4 repositories to enable AI assistants, agents, and external platforms to:

- **Execute governed AI actions** through the Spine runtime
- **Query and mutate database state** via Supabase RPC
- **Manage deployments** through Vercel
- **Handle payments** via Stripe
- **Verify formal proofs** using Z3 SMT solver
- **Monitor incidents** via Grafana
- **Verify AI decisions** deterministically

All MCP tools support Bearer token authentication and rate limiting. Mutation operations require approval proofs from the Spine governance pipeline.

---

## Architecture

### Two-Tier MCP Design

```
┌─────────────────────────────────────┐
│  HTTP Cloud Endpoints (Production)  │
├─────────────────────────────────────┤
│  dsg-one-v1-aimo.onrender.com/api/mcp-server
│  tdealer01-crypto-dsg-control-plane/api/mcp-server
└─────────────────────────────────────┘
              ▼
┌─────────────────────────────────────┐
│  Stdio Local Servers (Development)  │
├─────────────────────────────────────┤
│  dsg-context-discovery.ts
│  dsg-rca-analyzer.ts
│  dsg-gtm-pipeline.ts
│  dsg-proofgate.ts
└─────────────────────────────────────┘
```

### Authentication Flow

```
Client Request
    ↓
[Authorization: Bearer {token}]
    ↓
API Key Validation (Supabase RPC)
    ↓
Rate Limiting Check
    ↓
Tool Execution
    ↓
Usage Recording
    ↓
Response + Proof
```

---

## Core MCP Functions

These 8 functions are the primary entry points across both dsg-one-v1 and tdealer01-crypto-dsg-control-plane:

### 1. `get_proof`

**Description:** Generate an immutable audit proof + evidence chain for a completed execution

**Request:**
```json
{
  "execution_id": "exec_abc123",
  "include_trace": true,
  "include_lineage": true
}
```

**Response:**
```json
{
  "proof_hash": "sha256_abc123...",
  "audit_trail": [...],
  "evidence_chain": [...],
  "timestamp": "2026-08-12T10:30:00Z",
  "verified": true
}
```

**Auth:** Bearer token  
**Approval:** Not required (read-only)

---

### 2. `list_app_builder_jobs`

**Description:** List all app builder jobs with filtering and pagination

**Request:**
```json
{
  "status": "completed",
  "limit": 20,
  "offset": 0,
  "order_by": "created_at.desc"
}
```

**Response:**
```json
{
  "jobs": [
    {
      "job_id": "job_123",
      "name": "Build ML Dashboard",
      "status": "completed",
      "created_at": "2026-08-12T09:00:00Z",
      "progress": 100
    }
  ],
  "total": 42,
  "has_more": true
}
```

**Auth:** Bearer token  
**Approval:** Not required

---

### 3. `create_app_builder_job`

**Description:** Create a new app builder job with plan and configuration

**Request:**
```json
{
  "name": "New Feature Dashboard",
  "plan": {
    "type": "standard",
    "components": ["table", "chart", "form"],
    "database_tables": ["users", "transactions"]
  },
  "config": {
    "theme": "dark",
    "language": "th"
  }
}
```

**Response:**
```json
{
  "job_id": "job_124",
  "status": "pending",
  "created_at": "2026-08-12T10:30:00Z",
  "plan_hash": "deterministic_hash_xyz"
}
```

**Auth:** Bearer token  
**Approval:** ✅ Required (Spine governance)

---

### 4. `create_job_plan`

**Description:** Generate a deterministic execution plan for a job

**Request:**
```json
{
  "job_type": "app_builder",
  "requirements": {
    "data_sources": ["supabase"],
    "components": ["dashboard", "api"],
    "estimated_cost": 500
  }
}
```

**Response:**
```json
{
  "plan_hash": "deterministic_xyz",
  "steps": [
    {"step": 1, "action": "create_schema"},
    {"step": 2, "action": "deploy_api"},
    {"step": 3, "action": "sync_frontend"}
  ],
  "estimated_duration": 3600,
  "cost_estimate": 450
}
```

**Auth:** Bearer token  
**Approval:** Not required (analysis)

---

### 5. `route_agent_command`

**Description:** Route natural language commands to appropriate execution handlers

**Request:**
```json
{
  "command": "Create a new dashboard showing user activity for the past 30 days",
  "context": {
    "agent_id": "agent_001",
    "mode": "governed"
  }
}
```

**Response:**
```json
{
  "routed_to": "app_builder",
  "confidence": 0.95,
  "generated_plan": {...},
  "requires_approval": true,
  "next_action": "await_approval"
}
```

**Auth:** Bearer token  
**Approval:** Context-dependent

---

### 6. `get_autonomous_level`

**Description:** Check current autonomy level and agent capabilities

**Request:**
```json
{
  "agent_id": "agent_001"
}
```

**Response:**
```json
{
  "level": 3,
  "capabilities": [
    "read_database",
    "create_jobs",
    "deploy_changes"
  ],
  "rate_limit": "1000 req/hour",
  "mutation_approval_required": true
}
```

**Auth:** Bearer token  
**Approval:** Not required

---

### 7. `aimo_status`

**Description:** Get AIMO MCP gateway readiness and connection status (dsg-one-v1 only)

**Request:**
```json
{
  "check_external_services": true
}
```

**Response:**
```json
{
  "status": "ready",
  "mcp_gateway": "connected",
  "solver_backends": ["z3", "cadical"],
  "latency_ms": 45,
  "timestamp": "2026-08-12T10:30:00Z"
}
```

**Auth:** Bearer token  
**Approval:** Not required

---

### 8. `solve_aimo`

**Description:** Execute Ising Model Optimization (AIMO) solver with deterministic, replayable local path and independently re-verifiable Z3 feasibility evidence (dsg-one-v1 only)

**Request:**
```json
{
  "problem_type": "qubo",
  "matrix": [[1, 0.5], [0.5, 2]],
  "solver": "local_deterministic",
  "seed": 42,
  "constraints": ["hard_constraints_list"]
}
```

**Response:**
```json
{
  "solution": [1, 0],
  "energy": -1.5,
  "feasible": true,
  "qubo_hash": "sha256_qubo_abc",
  "solution_hash": "sha256_solution_def",
  "proof_hash": "sha256_proof_ghi",
  "z3_version": "4.12.1",
  "seed": 42,
  "solver_version": "ising-solver-core-v1.2.0",
  "execution_id": "exec_xyz"
}
```

**Guarantees:**
- ✅ Deterministic: When (Q, linear, seed, algorithm version) identical, solution and energy are reproducible
- ✅ Replayable: Given input, seed, and version, can reconstruct candidate and verify correctness
- ✅ Re-verifiable: Energy recalculated from QUBO; Z3 independently verifies hard constraint feasibility
- ❌ NOT guaranteed: Global optimality (Z3 verifies feasibility, not optimality)
- ❌ NOT guaranteed: External live Ising solver determinism (normalization and hashing applied to received results only)

**Auth:** Bearer token  
**Approval:** ✅ Required

---

## Supabase Tools

### 9. `query_database`

**Description:** Execute parameterized RLS-protected database queries

**Request:**
```json
{
  "table": "executions",
  "select": "*",
  "filters": {
    "agent_id": "eq.agent_001",
    "created_at": "gt.2026-08-01T00:00:00Z"
  },
  "order": "created_at.desc",
  "limit": 50
}
```

**Auth:** Bearer token + RLS policies  
**Approval:** Not required

---

### 10. `update_records`

**Description:** Perform governed mutations on Supabase records

**Request:**
```json
{
  "table": "agents",
  "filters": {"id": "eq.agent_001"},
  "data": {"status": "active"},
  "return": true
}
```

**Response:**
```json
{
  "updated_rows": 1,
  "approval_required": true,
  "approval_id": "app_xyz"
}
```

**Auth:** Bearer token  
**Approval:** ✅ Required

---

### 11. `list_tables`

**Description:** List all available database tables and their schemas

**Response:**
```json
{
  "tables": [
    {
      "name": "agents",
      "columns": ["id", "name", "status"],
      "rls_enabled": true
    }
  ]
}
```

**Auth:** Bearer token  
**Approval:** Not required

---

### 12. `manage_rls_policies`

**Description:** Query and audit Row-Level Security policies

**Request:**
```json
{
  "table": "executions",
  "action": "list_policies"
}
```

**Auth:** Bearer token  
**Approval:** Not required (audit only)

---

### 13. `execute_migrations`

**Description:** Apply or verify Supabase migrations (admin only)

**Request:**
```json
{
  "migration_file": "20260812000001_add_mcp_context.sql",
  "action": "apply"
}
```

**Auth:** Service role key  
**Approval:** ✅ Required

---

### 14. `check_auth_session`

**Description:** Verify current JWT session and actor context

**Response:**
```json
{
  "actor_id": "user_001",
  "org_id": "org_001",
  "permissions": ["read:all", "write:own"],
  "session_expires_at": "2026-08-13T10:30:00Z"
}
```

**Auth:** Bearer token  
**Approval:** Not required

---

## Governance & Spine Tools

### 15. `spine_execute_governed`

**Description:** Execute an action through the Spine governed execution pipeline

**Request:**
```json
{
  "action": "create_deployment",
  "params": {
    "service": "dsg-api",
    "version": "1.2.3"
  },
  "require_proof": true
}
```

**Response:**
```json
{
  "execution_id": "exec_xyz",
  "decision": "APPROVED",
  "policy_version": "v2.0",
  "proof": {...},
  "runtime_commit": "sha256_..."
}
```

**Auth:** Bearer token  
**Approval:** Built-in (Spine pipeline)

---

### 16. `spine_get_execution_status`

**Description:** Get real-time status of a Spine execution

**Request:**
```json
{
  "execution_id": "exec_xyz"
}
```

**Response:**
```json
{
  "status": "completed",
  "decision": "APPROVED",
  "reason": "Policy constraints satisfied",
  "trace": [...],
  "lineage": [...]
}
```

**Auth:** Bearer token  
**Approval:** Not required

---

### 17. `spine_commit_evidence`

**Description:** Commit audit evidence to the runtime ledger

**Request:**
```json
{
  "execution_id": "exec_xyz",
  "evidence": {
    "type": "z3_proof",
    "data": {...}
  }
}
```

**Auth:** Bearer token  
**Approval:** Context-dependent

---

### 18. `brain_analyze`

**Description:** Use DSG Brain for plan analysis and decision support

**Request:**
```json
{
  "question": "Is this deployment safe?",
  "context": {
    "execution_id": "exec_xyz",
    "risk_level": "high"
  }
}
```

**Response:**
```json
{
  "analysis": "Risk mitigation measures are in place...",
  "recommendation": "APPROVE_WITH_CAUTION",
  "confidence": 0.87
}
```

**Auth:** Bearer token  
**Approval:** Not required (advisory)

---

## Vercel Integration Tools

### 19. `list_deployments`

**Description:** List all Vercel deployments for the project

**Request:**
```json
{
  "limit": 20,
  "state": "READY",
  "env": "production"
}
```

**Response:**
```json
{
  "deployments": [
    {
      "id": "dep_xyz",
      "url": "https://dsg-one-v1.vercel.app",
      "state": "READY",
      "created_at": "2026-08-12T10:00:00Z",
      "commit": "sha123..."
    }
  ]
}
```

**Auth:** Bearer token + Vercel API key  
**Approval:** Not required

---

### 20. `trigger_deploy`

**Description:** Trigger a new Vercel deployment for a branch or commit

**Request:**
```json
{
  "branch": "main",
  "environment": "production",
  "reason": "Security fix"
}
```

**Response:**
```json
{
  "deployment_id": "dep_new",
  "status": "initializing",
  "estimated_duration": 120,
  "approval_required": true
}
```

**Auth:** Bearer token + Vercel API key  
**Approval:** ✅ Required

---

## Stripe Payment Tools

### 21. `stripe_create_product`

**Description:** Create a new Stripe product (governed)

**Request:**
```json
{
  "name": "DSG Premium Plan",
  "description": "Advanced governance features",
  "metadata": {
    "billing_cycle": "monthly"
  }
}
```

**Auth:** Bearer token + Stripe key  
**Approval:** ✅ Required (mutationApproved)

---

### 22. `stripe_create_price`

**Description:** Create pricing tier for a product

**Request:**
```json
{
  "product_id": "prod_xyz",
  "amount_cents": 99900,
  "currency": "usd",
  "billing_period": "month"
}
```

**Auth:** Bearer token + Stripe key  
**Approval:** ✅ Required

---

### 23. `stripe_create_payment_link`

**Description:** Generate a checkout link for customers

**Request:**
```json
{
  "price_id": "price_xyz",
  "quantity": 1,
  "customer_email": "user@example.com"
}
```

**Auth:** Bearer token + Stripe key  
**Approval:** ✅ Required

---

## Z3 Formal Proof Tools

### 24. `verify_proof`

**Description:** Verify Z3 hard constraint feasibility for a candidate binary assignment (pins solution and checks SAT/UNSAT)

**Request:**
```json
{
  "qubo_hash": "sha256_qubo_abc",
  "solution": [1, 0],
  "solution_hash": "sha256_solution_def",
  "constraints": ["hard_constraint_1", "hard_constraint_2"],
  "timeout_ms": 5000
}
```

**Response:**
```json
{
  "status": "SAT",
  "feasible": true,
  "unsat_core": [],
  "z3_version": "4.12.1",
  "proof_hash": "sha256_proof_ghi",
  "execution_time_ms": 45
}
```

**Guarantees:**
- ✅ Verifies: Candidate passes all hard constraints (SAT = feasible, UNSAT = infeasible)
- ❌ NOT verified: Candidate is globally optimal or best solution
- ✅ Re-verifiable: Z3 proof and version included for audit trail

**Auth:** Bearer token  
**Approval:** Not required

---

### 25. `generate_proof`

**Description:** Generate and pin Z3 proof artifact for a policy decision / action candidate

**Request:**
```json
{
  "policy_id": "policy_xyz",
  "candidate_action": {...},
  "solution_hash": "sha256_solution_def",
  "qubo_hash": "sha256_qubo_abc",
  "constraints": ["hard_constraint_1"],
  "timeout_ms": 5000
}
```

**Response:**
```json
{
  "proof_id": "proof_abc",
  "proof_hash": "sha256_proof_ghi",
  "status": "SAT",
  "feasible": true,
  "z3_version": "4.12.1",
  "candidate_pinned": true,
  "execution_id": "exec_xyz"
}
```

**Guarantees:**
- ✅ Proves: Candidate satisfies hard constraints at time of proof
- ❌ NOT proven: Candidate is optimal or remains feasible if constraints change
- ✅ Auditable: Proof hash + Z3 version recorded for replay

**Auth:** Bearer token  
**Approval:** ✅ Required

---

## AIMO Integration Tools

(dsg-one-v1 only)

### 26. `aimo_status`

See [Core MCP Functions - #7](#7-aimo_status)

### 27. `solve_aimo`

See [Core MCP Functions - #8](#8-solve_aimo)

---

## Grafana & Incident Response Tools

(DSG-Cinema-Proof-Agent only, via Python Google ADK + Grafana MCP)

### 28. `search_dashboards`

**Description:** Search Grafana dashboards

**Request:**
```json
{
  "query": "incident response",
  "limit": 10
}
```

**Response:**
```json
{
  "dashboards": [
    {
      "id": "dash_123",
      "title": "Incident Response Workflow",
      "url": "https://grafana.example.com/d/abc"
    }
  ]
}
```

**Auth:** Grafana OAuth token  
**Approval:** Not required

---

### 29. `get_dashboard_summary`

**Description:** Get summary metrics from a dashboard

**Request:**
```json
{
  "dashboard_id": "dash_123"
}
```

**Response:**
```json
{
  "title": "Incident Response Workflow",
  "datasources": ["prometheus", "loki"],
  "panels": 12,
  "last_refresh": "2026-08-12T10:30:00Z"
}
```

**Auth:** Grafana OAuth token  
**Approval:** Not required

---

### 30. `query_prometheus`

**Description:** Execute Prometheus queries for metrics

**Request:**
```json
{
  "query": "rate(http_requests_total[5m])",
  "time_range": "1h"
}
```

**Response:**
```json
{
  "results": [...],
  "execution_time_ms": 123
}
```

**Auth:** Grafana OAuth token  
**Approval:** Not required

---

### 31. `query_loki_logs`

**Description:** Query Loki logs for events

**Request:**
```json
{
  "query": "{job=\"cinema-agent\"}",
  "limit": 100
}
```

**Response:**
```json
{
  "streams": [...],
  "total_entries": 1000
}
```

**Auth:** Grafana OAuth token  
**Approval:** Not required

---

### 32. `list_incidents`

**Description:** List active and recent incidents

**Request:**
```json
{
  "status": "active",
  "limit": 20
}
```

**Response:**
```json
{
  "incidents": [
    {
      "id": "inc_123",
      "title": "High error rate detected",
      "severity": "critical",
      "created_at": "2026-08-12T10:15:00Z"
    }
  ]
}
```

**Auth:** Grafana OAuth token  
**Approval:** Not required

---

### 33. `get_incident`

**Description:** Get detailed incident information

**Request:**
```json
{
  "incident_id": "inc_123"
}
```

**Response:**
```json
{
  "id": "inc_123",
  "title": "High error rate detected",
  "severity": "critical",
  "timeline": [...],
  "status": "investigating",
  "assigned_to": "on-call-engineer"
}
```

**Auth:** Grafana OAuth token  
**Approval:** Not required

---

### 34. `verify_recovery_plan` (Cinema Gate)

**Description:** Use Z3 gate verification for AI action approval in incident recovery

**Request:**
```json
{
  "action": "rollback_deployment",
  "incident_id": "inc_123",
  "risk_level": "high"
}
```

**Response:**
```json
{
  "decision": "APPROVED",
  "reason": "Rollback authorized for critical incidents",
  "proof_hash": "sha256_xyz",
  "audit_event_hash": "sha256_abc"
}
```

**Auth:** Grafana OAuth token + Z3 verification  
**Approval:** Built-in (Z3 gate)

---

## Authentication & API Keys

### API Key Management Endpoints

**Location:** `/api/dsg/mcp/keys`

#### Create API Key

```http
POST /api/dsg/mcp/keys
Content-Type: application/json
Authorization: Bearer {user-jwt}

{
  "name": "my-agent",
  "permissions": ["read:all", "write:own"],
  "rate_limit": "1000 req/hour"
}
```

**Response:**
```json
{
  "api_key": "dsg_mcp_xyz...",
  "created_at": "2026-08-12T10:30:00Z",
  "expires_at": "2027-08-12T10:30:00Z"
}
```

#### Validate API Key

**Request Headers:**
```http
Authorization: Bearer dsg_mcp_xyz...
X-MCP-Client-ID: my-agent
```

**Validation Process:**
1. Hash the API key
2. Look up in `dsg_mcp_api_keys` table
3. Check rate limits
4. Record usage in billing table
5. Return `actor_id` and `org_id`

#### Rate Limiting

- **Default:** 1,000 requests/hour
- **Premium:** 10,000 requests/hour
- **Enterprise:** Unlimited

Rate limit headers in response:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1660291200
```

---

## Endpoints Summary

### Production Cloud Endpoints

| Repo | Endpoint | Protocol | Region | Status |
|------|----------|----------|--------|--------|
| **dsg-one-v1** | `https://dsg-one-v1-aimo.onrender.com/api/mcp-server` | HTTP/JSON-RPC | US (Render) | 🟢 Live |
| **control-plane** | `https://tdealer01-crypto-dsg-control-plane.onrender.com/api/mcp-server` | HTTP/JSON-RPC | US (Render) | 🟢 Live |
| **cinema-proof-agent** | `{DSG_BACKEND_BASE_URL}/v1/verify` | HTTP/REST | US (Cloud Run) | 🟢 Live |

### Development Endpoints

| Server | Transport | Purpose |
|--------|-----------|---------|
| `dsg-context-discovery` | Stdio (uvx) | Query memory events, policies, audit logs |
| `dsg-rca-analyzer` | Stdio (node) | Root cause analysis |
| `dsg-gtm-pipeline` | Stdio (node) | GTM/sales pipeline |
| `dsg-proofgate` | Stdio (uvx) | Proof gate functionality |

### Service Dependencies

```
MCP Client
    ↓
[dsg-one-v1 | control-plane] MCP Server
    ↓
┌─────────────────────────────┐
│  Internal Services          │
├─────────────────────────────┤
│  Supabase (RLS-protected)   │
│  Vercel API                 │
│  Stripe API                 │
│  Z3 SMT Solver              │
│  Grafana Cloud              │
└─────────────────────────────┘
```

---

## Usage Examples

### Example 1: Execute Governed Action

```bash
curl -X POST https://dsg-one-v1-aimo.onrender.com/api/mcp-server \
  -H "Authorization: Bearer dsg_mcp_xyz..." \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "create_app_builder_job",
    "params": {
      "name": "New Dashboard",
      "plan": {...}
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "job_id": "job_124",
    "status": "pending",
    "requires_approval": true
  }
}
```

### Example 2: Query Database

```bash
curl -X POST https://dsg-one-v1-aimo.onrender.com/api/mcp-server \
  -H "Authorization: Bearer dsg_mcp_xyz..." \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "query_database",
    "params": {
      "table": "executions",
      "filters": {"agent_id": "eq.agent_001"}
    }
  }'
```

### Example 3: Get Governance Status

```bash
curl -X POST https://dsg-one-v1-aimo.onrender.com/api/mcp-server \
  -H "Authorization: Bearer dsg_mcp_xyz..." \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "spine_get_execution_status",
    "params": {
      "execution_id": "exec_xyz"
    }
  }'
```

---

## Error Handling

### Standard Error Responses

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": {
      "available_methods": [...]
    }
  }
}
```

### Common Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| -32700 | Parse error | JSON was not valid |
| -32600 | Invalid Request | Request is missing method/params |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Params do not match method signature |
| -32603 | Internal error | Server error |
| -32000 | Auth error | Bearer token invalid/expired |
| -32001 | Approval required | Mutation needs governance approval |
| -32002 | Rate limit exceeded | Too many requests |

---

## Formal Proof Boundaries

### What is Proven ✅

**Local Deterministic Optimization Path (ising-solver-core.ts):**
- When `(Q, linear, seed, algorithm_version)` are identical, solution and energy are **bit-for-bit reproducible**
- No randomness except seeded PRNG; sweeps calculated from problem size (not wall-clock time)
- **Replayable**: Given input, seed, and version, can reconstruct the exact candidate

**Z3 Feasibility Verification:**
- Candidate binary assignment **satisfies all hard constraints** at time of proof (SAT/UNSAT decision)
- Proof includes Z3 version and can be **independently re-verified** by running Z3 with same constraints
- Energy is **recalculated from original QUBO** (does not trust external solver's energy value)

### What is NOT Proven ❌

- **Global Optimality**: Z3 verifies feasibility, NOT that the solution is optimal or best possible
- **Constraint Durability**: If constraints change after proof, feasibility does not carry forward
- **External Solver Determinism**: Live Ising solver backends are not guaranteed deterministic; results are normalized and hashed only
- **Convergence Guarantees**: Solver may timeout; UNSUPPORTED decisions must map to REVIEW/BLOCK, never PASS

### Intended Use

This system is designed for **auditable, replayable governance decisions with independently re-verifiable feasibility evidence**, not for claiming global optimality or external solver contract guarantees.

---

## Security Considerations

### 1. Bearer Token Management

- Tokens are validated against Supabase JWT secrets
- Tokens expire after 1 hour
- Refresh tokens available for long-lived sessions

### 2. API Key Hashing

- API keys are hashed with SHA-256 before storage
- Keys are salted with org_id
- Only key fingerprints are logged

### 3. RLS Protection

- All database queries enforce Supabase RLS
- Row-level access control by user/org
- No bypassing via SECURITY DEFINER

### 4. Approval Gates

- All mutations require Spine approval
- Governance policy version is returned
- Z3 formal proof is generated for critical actions

### 5. Rate Limiting

- Per-key rate limits enforced
- Sliding window over 1-hour buckets
- Burst capacity available for enterprise

---

## Integration Checklist

- [ ] Install `@modelcontextprotocol/sdk@^1.0.0`
- [ ] Store API key securely (env var, secrets manager)
- [ ] Implement Bearer token refresh logic
- [ ] Handle approval-required errors (code -32001)
- [ ] Log execution_id for audit trails
- [ ] Implement exponential backoff for retries
- [ ] Monitor rate limit headers
- [ ] Test with mock Supabase RLS policies first
- [ ] Validate proof hashes for critical operations
- [ ] Set up incident alerting for rate limit failures

---

## Support & Troubleshooting

### Common Issues

**Issue:** `error: "Auth error - token expired"`  
**Solution:** Refresh JWT token or re-authenticate

**Issue:** `error: "Approval required" (code -32001)`  
**Solution:** This is expected for mutations. Check Spine status to see if approval has been granted.

**Issue:** `error: "Rate limit exceeded"`  
**Solution:** Implement exponential backoff. Check rate limit headers for reset time.

**Issue:** `Method not found` (code -32601)`  
**Solution:** Verify method name matches exactly. Call `list_methods` to see available functions.

### Support Channels

- **GitHub Issues:** tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- **Documentation:** https://dsg-3.gitbook.io/dsg-docs
- **Email:** t.dealer01@dsg.pics

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-12  
**Maintainers:** DSG Engineering Team
