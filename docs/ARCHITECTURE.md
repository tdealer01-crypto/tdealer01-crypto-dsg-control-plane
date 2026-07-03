# DSG Control Plane — Architecture Documentation

**เอกสารสถาปัตยกรรมแบบลึกสำหรับนักพัฒนา**

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Details](#component-details)
3. [Data Flow](#data-flow)
4. [Governance Pipeline](#governance-pipeline)
5. [Multi-Agent Orchestration](#multi-agent-orchestration)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)

---

## System Architecture

### Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    PRESENTATION LAYER                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │ Trinity         │  │ Compliance      │  │ Finance  │ │
│  │ Dashboard       │  │ Evidence Pack   │  │ UI       │ │
│  └─────────────────┘  └─────────────────┘  └──────────┘ │
│                                                          │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                                                          │
│                     API LAYER                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Next.js Route Handlers (app/api/*)              │   │
│  │                                                  │   │
│  │ • POST /api/execute                             │   │
│  │ • POST /api/intent                              │   │
│  │ • POST /api/trinity/orchestrate                 │   │
│  │ • GET  /api/trinity/discover                    │   │
│  │ • GET  /api/trinity/status                      │   │
│  │ • GET  /api/trinity/stream (SSE)                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                                                          │
│                  BUSINESS LOGIC LAYER                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Runtime Spine Pipeline                  │ │
│  │                                                    │ │
│  │  1. Intent Parsing & Normalization               │ │
│  │  2. Governance Gate Evaluation                   │ │
│  │  3. Execution Planning (Spine)                   │ │
│  │  4. Controlled Execution (Hand)                  │ │
│  │  5. Quality Verification (Eye)                   │ │
│  │  6. Reputation Updates (Nerve)                   │ │
│  │  7. Audit Trail Recording                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                                                          │
│                   DATA ACCESS LAYER                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Supabase Client                                     │ │
│  │                                                     │ │
│  │ • Runtime Intents & Approvals                      │ │
│  │ • Agent Profiles & Credentials                     │ │
│  │ • Policies & Constraints                           │ │
│  │ • Execution History                                │ │
│  │ • Audit Trail & Proofs                             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                                                          │
│              PERSISTENCE LAYER (Supabase)               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ PostgreSQL Database                                 │ │
│  │                                                     │ │
│  │ Tables:                                             │ │
│  │ • runtime_intents                                  │ │
│  │ • agent_profiles                                   │ │
│  │ • policies                                         │ │
│  │ • execution_history                                │ │
│  │ • audit_trails                                     │ │
│  │ • dsg_secrets                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. API Layer (Next.js Route Handlers)

**Location**: `app/api/**/route.ts`

**Responsibilities**:
- Request validation & authentication
- Bearer token extraction
- Request body size limiting
- CORS header management
- Rate limiting
- Response formatting

**Key Routes**:

```typescript
// app/api/trinity/orchestrate/route.ts
POST /api/trinity/orchestrate
├─ Input: Job, Agent, Dry-Run Flag
├─ Process: Full governance pipeline
└─ Output: Proof + Governance Results

// app/api/trinity/discover/route.ts
GET /api/trinity/discover
├─ Query: category, limit
├─ Process: Job discovery from multiple sources
└─ Output: Job listings with metadata

// app/api/trinity/status/route.ts
GET /api/trinity/status
├─ Input: None
├─ Process: Check all 5 agents
└─ Output: System status + governance version

// app/api/trinity/stream/route.ts
GET /api/trinity/stream
├─ Protocol: Server-Sent Events (SSE)
├─ Output: Real-time status updates
└─ Fallback: WebSocket not available in Next.js
```

### 2. Spine Runtime (Orchestration)

**Location**: `lib/spine/`

**Responsibilities**:
- Deterministic execution plan generation
- Intent normalization
- Governance decision making
- Audit trail creation

**Key Files**:

```
lib/spine/
├─ spine.ts              # Main orchestration pipeline
├─ intent-parser.ts      # Normalize incoming requests
├─ gate.ts              # Policy constraint evaluation
├─ approvals.ts         # Approval workflow management
└─ commit-rpc.ts        # Runtime audit trail recording
```

**Execution Flow**:

```
Request
  ↓
Intent::Parse()
  ├─ Extract job, agent, parameters
  └─ Generate requestHash
  ↓
Gate::Evaluate()
  ├─ Load applicable policies
  ├─ Evaluate 5 constraints
  │  ├─ max_duration
  │  ├─ max_cost
  │  ├─ security_check
  │  ├─ audit_trail
  │  └─ reputation_check
  └─ Return: APPROVED ✅ or BLOCKED ❌
  ↓
Spine::Execute()
  ├─ Generate deterministic planHash (SHA-256)
  ├─ Call Hand (executor)
  ├─ Call Eye (verifier)
  ├─ Call Nerve (reputation)
  └─ Collect all results
  ↓
Commit::Record()
  ├─ Write to runtime_intents table
  ├─ Record auditHash
  └─ Return proof chain
  ↓
Response (with proof)
```

### 3. Hand Executor (Controlled Execution)

**Location**: `lib/dsg/brain/controlled-executor.ts`

**Responsibilities**:
- Execute actions with constraints
- Credential broker integration
- Command whitelist validation
- Path canonicalization
- Evidence collection

**Key Features**:

```typescript
class ControlledExecutor {
  // Credential broker access
  async leaseCreds(agentId, service) 
    → { token, fingerprint, expiresAt }
  
  // Whitelist validation
  validateCommand(cmd, allowedCommands) 
    → boolean
  
  // Execution
  async execute(plan, context)
    → { result, proofHash, evidence }
  
  // Conformance check
  validateConformance(executed, planned)
    → { passed, violations }
}
```

**Execution Context**:

```typescript
{
  agentId: "agent-001",
  planHash: "a1b2c3d4...",  // From Spine
  credentials: {
    github: "ghp_...",       // From credential broker
    solana: "sk_...",
  },
  allowedPaths: [
    "/home/agent/workspace/",
    "/tmp/execution/"
  ],
  allowedCommands: [
    "audit --contract=...",
    "test --suite=...",
  ],
  timeout: 30000,           // ms
  maxCost: 5.0,            // SOL
}
```

### 4. Eye Verifier (Quality & Formal Verification)

**Location**: `lib/agents/eye-agent.ts`

**Responsibilities**:
- Execution result validation
- Quality scoring
- Formal property checking (optional)
- Proof generation

**Output**:

```typescript
{
  passed: boolean,
  qualityScore: 0-100,
  issues: string[],
  proofHash: "b2b3c4d5...",  // SHA-256 of result
  formalProperties: {
    termination: "verified",
    safety: "verified",
    progress: "verified"
  }
}
```

### 5. Nerve Reputation (Payment & Scoring)

**Location**: `lib/agents/nerve-agent.ts`

**Responsibilities**:
- Reputation score updates
- Payment settlement
- Billing integration (Stripe)
- Quota enforcement

**Score Calculation**:

```typescript
newReputation = currentReputation 
  + (executionQuality * 0.5)
  + (verificationScore * 0.3)
  + (timeliness * 0.2)

// Caps at 0-100
```

---

## Data Flow

### Request → Response Flow

```
1. CLIENT REQUEST
   ├─ Method: POST /api/trinity/orchestrate
   ├─ Auth: Bearer <token>
   └─ Body: {job, agent, dry_run}
   
2. API HANDLER (app/api/trinity/orchestrate/route.ts)
   ├─ Extract Bearer token
   ├─ Validate request size (<10KB)
   ├─ Resolve agent from API key
   └─ Call Spine pipeline
   
3. SPINE ORCHESTRATION (lib/spine/spine.ts)
   ├─ Parse intent
   ├─ Evaluate governance gate
   ├─ Generate planHash (deterministic)
   │  └─ SHA-256(job + agent + params)
   ├─ Execute Hand (executor)
   ├─ Verify Eye (verifier)
   ├─ Update Nerve (reputation)
   └─ Collect results
   
4. GOVERNANCE GATE (lib/spine/gate.ts)
   ├─ Load policies from Supabase
   ├─ Evaluate constraints
   │  ├─ max_duration → executionTime < 30s
   │  ├─ max_cost → cost < 5 SOL
   │  ├─ security_check → threat score OK
   │  ├─ audit_trail → proof required
   │  └─ reputation_check → agent score > 30
   └─ Return: APPROVED ✅ / BLOCKED ❌
   
5. EXECUTION (lib/dsg/brain/controlled-executor.ts)
   ├─ Lease credentials
   ├─ Validate command
   ├─ Execute (with conformance check)
   └─ Return result + proofHash
   
6. VERIFICATION (lib/agents/eye-agent.ts)
   ├─ Validate output format
   ├─ Score quality (0-100)
   ├─ Check formal properties (optional)
   └─ Generate proof
   
7. AUDIT TRAIL (lib/spine/commit-rpc.ts)
   ├─ Record to runtime_intents table
   ├─ Write audit hash
   ├─ Update agent reputation
   └─ Process payments
   
8. RESPONSE TO CLIENT
   ├─ Status: ok: true/false
   ├─ Decision: APPROVED/BLOCKED/REVIEW
   ├─ Proof: planHash, auditHash
   ├─ Results: execution, verification, reputation
   └─ Trace: execution timeline
```

### Database Write Pattern

```
Request arrives
  ↓
[Start Transaction]
  ├─ Lock runtime_intents row (if exists)
  ├─ Check execution is idempotent
  └─ Prevent double-settlement
  ↓
Execution phase
  ├─ INSERT runtime_intent (status=pending)
  ├─ Record plan & governance result
  └─ COMMIT or ROLLBACK
  ↓
[Next Transaction]
  ├─ Update runtime_intent (status=completed)
  ├─ Record auditHash
  ├─ INSERT audit_trail row
  ├─ UPDATE agent_profiles reputation
  └─ UPDATE billing (if live mode)
  ↓
Response sent
```

---

## Governance Pipeline

### Constraint Evaluation

```typescript
// Each constraint is deterministic — always produces same result

const constraints = [
  {
    name: "max_duration",
    check: (execution) => execution.timeMs < 30000,
    satisfied: true,
    reasoning: "Execution took 2.5s, well under 30s limit"
  },
  {
    name: "max_cost",
    check: (execution) => execution.cost < 5.0,
    satisfied: true,
    reasoning: "Cost 2.5 SOL, within budget"
  },
  {
    name: "security_check",
    check: (execution) => threatScore <= 5,
    satisfied: true,
    reasoning: "Security analysis passed"
  },
  {
    name: "audit_trail",
    check: (execution) => proofHashExists,
    satisfied: true,
    reasoning: "Proof hash recorded"
  },
  {
    name: "reputation_check",
    check: (agent) => agent.reputation > 30,
    satisfied: true,
    reasoning: "Agent reputation 80/100, meets threshold"
  }
];

// All constraints must be satisfied for approval
const approved = constraints.every(c => c.satisfied);
// Result: APPROVED ✅
```

### Policy Versions

```typescript
// Policies are versioned and immutable

interface Policy {
  id: "policy-v1.0",
  version: "1.0",
  constraints: Constraint[],
  effectiveDate: "2026-06-01T00:00:00Z",
  createdAt: "2026-06-01T00:00:00Z",
  
  // Linked to execution for audit
  appliedTo: execution.planHash,
  verifyHash: "hash-of-policy-json"
}
```

---

## Multi-Agent Orchestration

### 5-Agent System

```
┌──────────────────────────────────────────────────────┐
│              Trinity AI System (5 Agents)            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🧠 MIND (Job Discovery)                            │
│  ├─ Searches: GitHub, Solana, internal registry     │
│  ├─ Returns: Jobs with metadata                      │
│  └─ Integration: GitHub API, Solana RPC, database   │
│                                                      │
│  ✋ HAND (Executor)                                  │
│  ├─ Executes: Tasks with credential control         │
│  ├─ Validates: Command whitelist & path canonical   │
│  └─ Records: Evidence of execution                  │
│                                                      │
│  👁️  EYE (Verifier)                                 │
│  ├─ Validates: Output format & quality              │
│  ├─ Scores: 0-100 based on criteria                │
│  └─ Checks: Formal properties (optional)            │
│                                                      │
│  ⚡ NERVE (Reputation & Payment)                    │
│  ├─ Updates: Agent reputation scores                │
│  ├─ Settles: Payments to agents                     │
│  └─ Enforces: Quota limits                          │
│                                                      │
│  🦴 SPINE (Governance & Orchestration)              │
│  ├─ Coordinates: All agents in sequence             │
│  ├─ Generates: Deterministic plans (planHash)       │
│  ├─ Enforces: Governance constraints                │
│  └─ Records: Audit trail & proofs                   │
│                                                      │
└──────────────────────────────────────────────────────┘

Execution Order:
  Request → Spine(plan) → Gate(check) → Hand(execute)
                                   ↓
                              Eye(verify) → Nerve(settle)
                                   ↓
                            Audit Trail(record)
```

### Agent Communication

```typescript
// All communication via:
// 1. Shared database (Supabase)
// 2. Runtime context object
// 3. Proof chain (hashes)

interface AgentContext {
  // Inherited from Spine
  planHash: string,           // Deterministic plan ID
  policyVersion: string,      // Which policy applies
  
  // Agent-specific state
  Hand: {
    result: ExecutionResult,
    evidence: ProofData,
  },
  Eye: {
    qualityScore: number,
    issues: string[],
    proofHash: string,
  },
  Nerve: {
    reputationDelta: number,
    paymentAmount: number,
    tierChanged: boolean,
  },
  
  // Immutable proof chain
  auditHash: string,          // Final proof
  timestamp: ISO8601,
}
```

---

## Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────────────────┐
│            Vercel Deployment Pipeline               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. GitHub Push to main                            │
│     └─ Triggers Vercel webhook                     │
│                                                     │
│  2. CI Checks (GitHub Actions)                     │
│     ├─ npm run typecheck                           │
│     ├─ npm run build                               │
│     ├─ npm run test                                │
│     └─ npm audit                                   │
│                                                     │
│  3. Vercel Build                                   │
│     ├─ npm ci (clean install)                      │
│     ├─ npm run build (Next.js)                     │
│     └─ Deploy to Vercel CDN                        │
│                                                     │
│  4. Edge Functions (Optional)                      │
│     ├─ API routes compiled to Edge                │
│     ├─ Middleware (app/middleware.ts)              │
│     └─ Low-latency execution                       │
│                                                     │
│  5. Environment Variables                          │
│     ├─ SUPABASE_URL                                │
│     ├─ SUPABASE_SERVICE_ROLE_KEY                   │
│     └─ Other secrets via Vercel dashboard          │
│                                                     │
│  6. Production URL                                 │
│     └─ https://tdealer01-crypto-dsg-...            │
│        .vercel.app                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Database (Supabase)

```
Supabase Project
├─ PostgreSQL Database
│  ├─ public schema
│  │  ├─ runtime_intents (execution logs)
│  │  ├─ agent_profiles (agent metadata)
│  │  ├─ policies (governance rules)
│  │  ├─ execution_history
│  │  ├─ audit_trails
│  │  ├─ dsg_secrets (encrypted)
│  │  └─ [other tables]
│  └─ RLS Policies (Row Level Security)
│     ├─ Org scoping
│     ├─ Agent access control
│     └─ Audit trail immutability
│
├─ Authentication (via Supabase Auth)
│  ├─ Session management
│  ├─ JWT tokens
│  └─ OAuth integration
│
└─ Edge Functions (Optional)
   ├─ Custom logic at edge
   └─ Low-latency access
```

---

## Security Architecture

### Authentication & Authorization

```
Request
  ↓
[Extract Bearer Token]
  ├─ From Authorization header
  └─ Verify JWT signature
  ↓
[Resolve Agent]
  ├─ Lookup agent_profiles table
  ├─ Check API key validity
  └─ Verify agent status (active)
  ↓
[Check Permissions]
  ├─ org_id scoping
  ├─ agent_id ownership
  └─ Role-based access control
  ↓
[Rate Limiting]
  ├─ Per agent quota
  ├─ Per org quota
  └─ Global rate limits
  ↓
Request Allowed ✅
```

### Request Body Safety

```typescript
// Size limits per route

POST /api/execute
  └─ Max 10 KB (prevents large payloads)

POST /api/trinity/orchestrate
  └─ Max 5 KB (job + agent metadata)

POST /api/agent-chat
  └─ Max 256 KB (longer conversations allowed)

// All sizes enforced with readJsonBody()
async function readJsonBody(request, maxBytes) {
  const size = request.headers.get('content-length')
  if (size > maxBytes) throw new Error('Payload too large')
  return await request.json()
}
```

### Credential Handling

```
Credential Broker (lib/dsg/brain/credential-broker.ts)

User Request
  ├─ agent_id: "agent-001"
  ├─ service: "github"
  └─ duration: 3600s
  ↓
[Lookup in dsg_secrets]
  ├─ Query: agent_id = "agent-001"
  ├─ Filter: service = "github"
  └─ Decrypt value
  ↓
[Create Lease]
  ├─ Issue temporary token
  ├─ Set expiration
  └─ Generate fingerprint (redaction)
  ↓
Return to Executor
  ├─ token: "ghp_actual_token"
  ├─ fingerprint: "ghp_****...****"  (for logs)
  └─ expiresAt: "2026-06-29T13:00:00Z"
  
Note: Token never logged in plaintext
      Fingerprint used in audit trails
```

### Audit Trail Immutability

```
audit_trails table (PostgreSQL)

CREATE TABLE audit_trails (
  id BIGSERIAL PRIMARY KEY,
  
  -- Immutable link to execution
  execution_id UUID NOT NULL UNIQUE,
  
  -- Proof chain
  plan_hash VARCHAR(64) NOT NULL,
  audit_hash VARCHAR(64) NOT NULL,
  
  -- Decision & reasoning
  decision VARCHAR(20),  -- APPROVED/BLOCKED/REVIEW
  governance_version VARCHAR(20),
  constraints_satisfied JSONB,
  
  -- Agent details (snapshot at execution time)
  agent_id UUID,
  agent_reputation INT,
  
  -- Timestamps (server-side)
  executed_at TIMESTAMP WITH TIME ZONE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Immutability enforcement
  CHECK (recorded_at >= executed_at),
  CHECK (audit_hash IS NOT NULL),
);

-- Prevent updates to historical records
CREATE POLICY audit_trails_immutable
  ON audit_trails
  USING (TRUE)  -- Read allowed
  WITH CHECK (FALSE);  -- Insert/Update/Delete blocked after insert
```

---

## Performance Optimizations

### Query Caching

```typescript
// Policies cached in-memory (change infrequently)
const policyCache = new Map();
const POLICY_TTL = 3600000;  // 1 hour

async function getPolicy(version) {
  if (policyCache.has(version)) {
    return policyCache.get(version);
  }
  
  const policy = await supabase
    .from('policies')
    .select('*')
    .eq('version', version)
    .single();
  
  policyCache.set(version, policy);
  setTimeout(() => policyCache.delete(version), POLICY_TTL);
  
  return policy;
}
```

### Index Strategy

```sql
-- Execution lookups
CREATE INDEX idx_runtime_intents_agent_id 
  ON runtime_intents(agent_id);

CREATE INDEX idx_runtime_intents_status 
  ON runtime_intents(status);

-- Audit queries
CREATE INDEX idx_audit_trails_executed_at 
  ON audit_trails(executed_at DESC);

-- Reputation leaderboard
CREATE INDEX idx_agent_profiles_reputation 
  ON agent_profiles(reputation DESC);
```

---

## Extending the Architecture

### Adding a New Agent

```typescript
// 1. Create agent file
// lib/agents/custom-agent.ts

export class CustomAgent {
  async execute(context: AgentContext) {
    // Implement your logic
    return {
      success: true,
      data: {...},
      proofHash: sha256(JSON.stringify(...))
    }
  }
}

// 2. Integrate into Spine
// lib/spine/spine.ts

async function executeOrchestration(intent) {
  // ... existing code ...
  
  const custom = await CustomAgent.execute(context);
  
  context.Custom = custom;
  
  // Continue with Nerve, audit trail, etc.
}

// 3. Add tests
// tests/integration/custom-agent.test.ts

describe('Custom Agent', () => {
  it('should execute and produce proof', () => {
    // Test implementation
  })
})

// 4. Document in ARCHITECTURE.md
```

---

**Last Updated**: 2026-06-29  
**Version**: 2.0 (Phase 2 Complete)

สำหรับคำถามเพิ่มเติม ดู [TRINITY_DASHBOARD.md](TRINITY_DASHBOARD.md) และ [CLAUDE.md](../CLAUDE.md)
