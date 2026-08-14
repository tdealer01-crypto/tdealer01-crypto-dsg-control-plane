# DSG ONE — Trinity Dashboard Architecture Guide

**Complete integration of Pillars, Agents, and API layer**

---

## 📊 System Overview

| Component | Count | Purpose |
|-----------|-------|---------|
| Control Pillars | 7 | UI/UX surfaces for operator control |
| DSG Agents | 7 | Autonomous execution & revenue engines |
| API Endpoints | 12+ | Trinity Dashboard integration |
| Supabase Tables | 20+ | Data persistence & audit |

---

## 🎯 Layer 1: Control Pillars

The seven pillars represent the operator-facing control surfaces in the Trinity Dashboard.

### 📊 Monitor
**Real-time visibility layer**
- Real-time metrics dashboard
- Usage tracking by agent
- Provider health status
- Performance analytics

### 🛡️ Verify  
**Policy & proof validation layer**
- Policy management UI
- Decision visualization
- Z3 proof verification
- Constraint validation

### 📋 Audit
**Compliance & evidence layer**
- Immutable audit logs
- Compliance dashboard
- Delivery proof reports
- Evidence chain validation

### ⚡ Optimize
**Revenue & efficiency layer**
- Revenue analytics
- Billing management
- Cost optimization
- Marketplace integration

### 🤖 Agents
**Fleet management layer**
- Agent fleet dashboard
- Configuration UI
- Orchestration view
- Performance metrics

### 🔑 Identity
**Access control layer**
- Single sign-on (SSO)
- SCIM provisioning
- Role-based access (RBAC)
- Team management

---

## 🚀 Layer 2: DSG Agents & Revenue Model

Seven autonomous agents that power the governance and monetization engine.

### 🎯 Orchestrator
**Master coordinator**
- Controls all agents
- **Revenue model:** Reduces ops cost to zero
- Orchestrates execution flow
- Manages context sharing

### ⚙️ Policy Engine
**Governance layer**
- Designs AI policies
- Enforces constraints
- Validates decisions
- **Revenue model:** Governance-as-a-Service

### 💰 Revenue Agent
**Billing engine**
- Manages billing cycles
- Retry logic for failed charges
- Handles upgrades
- **Revenue model:** Auto MRR generation

### 🔒 Security Agent
**Compliance guardian**
- Audit trail management
- Compliance verification
- Proof generation
- **Revenue model:** Delivery Proof @ $99 per report

### 🔌 MCP Gateway
**Request router**
- Routes AI requests to agents
- Meters API access
- Tracks usage
- **Revenue model:** $14 per 10K API calls

### 📈 Customer Success
**Growth engine**
- Customer onboarding
- Upsell workflows
- Retention programs
- **Target:** NRR ≥ 110%

---

## 🔗 Layer 3: API Endpoints & Integration

Trinity Dashboard communicates with the backend through these standardized endpoints:

### Authentication & Health
```
GET  /api/health
     Returns: { status, uptime, version }
     Purpose: System health check
```

### Agent Management
```
GET  /api/agents/status
     Returns: { agents, total, healthy }
     Purpose: Fleet status overview

POST /api/agents/mode
     Body: { agentId, mode: 'sandbox' | 'live' }
     Returns: { success, previousMode, newMode }
     Purpose: Toggle agent execution mode

POST /api/agents/execute
     Body: { agentId, task }
     Returns: { success, result, duration }
     Purpose: Execute task on agent

POST /api/agents/chat
     Body: { agentId, message }
     Returns: { response, agentId, timestamp }
     Purpose: Chat with agent
```

### Cost & Usage Tracking
```
GET  /api/cost/tracker?period=24h
     Returns: { total_usd, budget, by_agent }
     Purpose: Cost breakdown and budget status

GET  /api/usage
     Returns: Usage analytics by agent, resource type
     Purpose: Detailed usage metrics
```

### Security & Audit
```
GET  /api/security/audit?limit=10
     Returns: { entries, chain_valid }
     Purpose: Audit log entries with risk scores

GET  /api/audit
     Returns: Compliance audit trail
     Purpose: Full compliance history
```

### Policy & Governance
```
GET  /api/policies
POST /api/policies
     Purpose: Read and update policies

GET  /api/capacity
     Returns: Quota limits and current usage
     Purpose: Capacity planning
```

### State Management
```
GET  /api/state/continuity
     Returns: { all_agents_running, context_sharing, fragmentation_risk, cost_per_hour }
     Purpose: System health and state metrics
```

---

## 🔄 Layer 4: Data Flow & Request Pipeline

### Request Lifecycle

```
Client Request
    ↓
Trinity Dashboard UI
    ↓
API Gateway (CORS, Auth)
    ↓
Authentication & RBAC Check
    ↓
Orchestrator Agent (routing)
    ↓
DSG Agents (execution)
    ↓
Execution Pipeline
    ↓
Supabase (persistence)
    ↓
Audit Trail (immutable log)
    ↓
Response to Dashboard
    ↓
User Display
```

### Security Boundaries

✅ **Implemented throughout:**
- JWT token validation on all protected routes
- RBAC enforcement via Policy Engine
- Cost/quota checks before execution
- Audit trail for all actions
- Deterministic gate verification
- Z3 formal proof validation

---

## 🔐 Security & Compliance Architecture

### Authentication
- **Bearer token** JWT-based auth
- Token stored in `localStorage` (trinity_jwt_token)
- Validated on every protected request

### Authorization
- **RBAC** role-based access control
- Policy Engine validates permissions
- Org/workspace scoping enforced

### Audit & Evidence
- **Immutable audit logs** per action
- **Chain validation** on audit retrieval
- **Delivery Proof** reports for compliance
- Z3 formal proofs for policy decisions

### Cost Control
- **Pre-execution quota checks**
- **Per-agent cost tracking**
- **Budget limits enforcement**
- **Billing integration** for MRR

---

## 📦 Deployment & Configuration

### Required Environment Variables

```bash
# Public (can be in .env.local)
NEXT_PUBLIC_TRINITY_API_URL=https://api.dsg.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJxxx...

# Server-side only
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx...
```

### Deployment Options

1. **Vercel** (recommended)
   ```bash
   vercel deploy
   ```
   - Auto-connects to GitHub
   - Environment variables in Dashboard
   - Preview deployments for PRs

2. **Docker**
   ```bash
   docker build -t trinity-dashboard .
   docker run -d -p 3000:3000 \
     -e NEXT_PUBLIC_TRINITY_API_URL=https://api.dsg.local \
     trinity-dashboard
   ```

3. **Render / Railway / Custom K8s**
   - Set environment variables
   - Point to backend API
   - Enable CORS headers

---

## 🎯 Usage Workflows

### For Operators

1. **Monitor Agent Fleet**
   - Visit Monitor pillar
   - Check real-time status and health
   - Identify bottlenecks

2. **Verify Policies**
   - Visit Verify pillar
   - Review policy decisions
   - Validate Z3 proofs

3. **Audit Compliance**
   - Visit Audit pillar
   - Download Delivery Proof reports
   - Review compliance status

4. **Optimize Revenue**
   - Visit Optimize pillar
   - Track cost per agent
   - Adjust marketplace pricing

5. **Manage Agents**
   - Visit Agents pillar
   - Toggle sandbox/live mode
   - Execute tasks
   - Chat with agents

### For Developers

1. **Add API Endpoint**
   - Define route in backend
   - Update TrinityClient
   - Test in dashboard

2. **Create New Pillar**
   - Add card to grid
   - Connect to API
   - Add tests

3. **Integrate New Agent**
   - Define agent schema
   - Add to Orchestrator
   - Update cost tracking

---

## 📊 Revenue Streams

| Agent | Model | Example |
|-------|-------|---------|
| Policy Engine | Governance-as-a-Service | $29/mo base + per-policy |
| Revenue Agent | MRR automation | Auto-billing, no setup |
| Security Agent | Delivery Proof reports | $99 per audit report |
| MCP Gateway | Metered API access | $14 per 10K calls |
| Customer Success | NRR growth | Target ≥ 110% annually |

**Total revenue potential:** Flexible per-customer model combining recurring + transactional

---

## 🛠️ Development Workflow

### Local Setup

```bash
# 1. Clone repository
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
cd tdealer01-crypto-dsg-control-plane

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit NEXT_PUBLIC_TRINITY_API_URL and Supabase keys

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000
```

### Running Tests

```bash
# Type checking
npm run typecheck

# Unit tests
npm run test:unit

# Integration tests (requires backend running)
npm run test:integration

# Full test suite
npm run test
```

### Building for Production

```bash
# Build
npm run build

# Start production server
npm run start

# Verify build
npm run verify:policy
```

---

## 🐛 Troubleshooting

### Dashboard won't connect to API
- Check `NEXT_PUBLIC_TRINITY_API_URL` environment variable
- Verify CORS headers on backend
- Check JWT token in browser localStorage

### Agent status shows "error"
- Check backend logs
- Verify agent is running
- Validate API credentials

### Cost tracking not updating
- Verify `/api/cost/tracker` endpoint exists
- Check quota table in Supabase
- Review Cost Agent logs

### Audit logs missing
- Ensure audit table exists in Supabase
- Check `/api/audit` endpoint permissions
- Verify RLS policies allow read access

---

## 📚 Additional Resources

- **Repository:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- **CLAUDE.md:** Development guidelines and verification requirements
- **AGENTS.md:** Agent orchestration rules
- **Supabase Docs:** https://supabase.com/docs
- **Next.js 15 Docs:** https://nextjs.org/docs

---

**Generated:** 2026-08-14  
**Version:** Trinity Dashboard Export v1  
**Status:** Architecture consolidation complete
