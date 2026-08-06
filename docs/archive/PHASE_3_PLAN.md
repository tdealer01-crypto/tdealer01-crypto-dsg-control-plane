# Phase 3 Implementation Plan

**Live SOL Settlements, Production WebSocket, Agent Skills, Policy Editor**

---

## Phase 3 Features Overview

### Feature 1️⃣ : Live SOL Settlement (Most Critical)
**Impact**: Convert dry-run to production mode with real payments

**Components**:
- [ ] Enable real SOL transfers (from dry_run=true to dry_run=false)
- [ ] Stripe/Solana integration for payments
- [ ] Idempotency safeguards (prevent double-spending)
- [ ] Wallet management & balance checks
- [ ] Transaction verification & confirmation
- [ ] Rollback mechanisms for failed settlements

**Effort**: 3-4 days  
**Risk**: HIGH (financial transactions)  
**Files Affected**:
- `lib/spine/execute.ts` — Remove dry-run bypass
- `lib/agents/nerve-agent.ts` — Real payment logic
- `lib/solana/payment.ts` — New SOL transfer module
- Database migrations for payment ledger

---

### Feature 2️⃣ : Production WebSocket Setup
**Impact**: Real-time updates for production (not just SSE)

**Components**:
- [ ] Vercel Edge Functions for WebSocket
- [ ] Separate WebSocket server (Node.js or Bun)
- [ ] Connection pooling & heartbeats
- [ ] Message queuing (Redis or Upstash)
- [ ] Graceful degradation to SSE fallback
- [ ] Load balancing for multiple instances

**Effort**: 2-3 days  
**Risk**: MEDIUM (infrastructure)  
**Options**:
1. **Vercel Edge WebSocket** — Serverless, auto-scaling (recommended)
2. **Separate WS Server** — Full control, more complex
3. **Third-party service** — Easier but less control

---

### Feature 3️⃣ : Agent Skill Management UI
**Impact**: Agents can manage their own skills and availability

**Components**:
- [ ] Skill registry (smart contract or Supabase)
- [ ] Dashboard for skill CRUD
- [ ] Skill verification & approval workflow
- [ ] Skill marketplace discovery
- [ ] Rating & review system
- [ ] Skill-based job matching

**Effort**: 2-3 days  
**Risk**: LOW (UI only)  
**Pages**:
- `/dashboard/skills` — View/edit my skills
- `/marketplace/skills` — Browse all skills
- `/dashboard/skill-requests` — Approve new skills

---

### Feature 4️⃣ : Governance Policy Editor
**Impact**: Create and modify governance policies without code

**Components**:
- [ ] Policy builder UI (drag-drop or form)
- [ ] Constraint definition interface
- [ ] Policy versioning & rollback
- [ ] Policy testing/simulation environment
- [ ] Approval workflow for policy changes
- [ ] Policy audit trail

**Effort**: 3-4 days  
**Risk**: HIGH (governance)  
**Pages**:
- `/dashboard/policies/editor` — Create/edit policies
- `/dashboard/policies/versions` — View history
- `/dashboard/policies/test` — Simulation environment

---

### Feature 5️⃣ : Reputation Leaderboard
**Impact**: Public recognition and competitive incentives

**Components**:
- [ ] Leaderboard ranking algorithm
- [ ] Real-time score updates
- [ ] Filtering (by category, timeframe, region)
- [ ] Achievement badges
- [ ] Tier progression system
- [ ] Fraud detection (outliers)

**Effort**: 1-2 days  
**Risk**: LOW (display only)  
**Pages**:
- `/leaderboard` — Global rankings
- `/leaderboard/category/:cat` — Category-specific
- `/profile/:agent` — Agent detail page

---

## Phase 3 Implementation Roadmap

### Week 1: Foundation & Testing
```
Day 1-2: Live SOL Settlement Design
  ├─ Wallet security architecture
  ├─ Transaction idempotency
  ├─ Failure recovery patterns
  └─ Integration test suite

Day 3-4: WebSocket Production Setup
  ├─ Evaluate Vercel Edge vs Separate Server
  ├─ Connection management
  ├─ Message queue setup
  └─ Load testing

Day 5: Foundation Tests & Verification
  ├─ Unit tests
  ├─ Integration tests
  └─ Security audit
```

### Week 2: Core Features
```
Day 6-7: Live SOL Settlement Implementation
  ├─ Nerve agent payments
  ├─ Wallet balance checking
  ├─ Transaction signing
  ├─ Confirmation waiting
  └─ Ledger recording

Day 8-9: Agent Skill Management
  ├─ Skill data model
  ├─ Dashboard CRUD UI
  ├─ Skill verification
  └─ Job matching algorithm

Day 10: Integration & Testing
  ├─ E2E tests
  ├─ Load testing
  └─ UAT preparation
```

### Week 3: Polish & Deployment
```
Day 11-12: Policy Editor & Leaderboard
  ├─ Policy builder UI
  ├─ Simulation environment
  ├─ Leaderboard queries
  └─ Achievement system

Day 13-14: Production WebSocket
  ├─ Deploy WebSocket service
  ├─ Monitor & optimize
  ├─ Fallback testing
  └─ Performance tuning

Day 15: Final Testing & Documentation
  ├─ Full system test
  ├─ Documentation update
  ├─ Deployment runbook
  └─ Go/no-go decision
```

---

## Feature Priority Matrix

```
┌─────────────────────────────────────────┐
│                                         │
│  HIGH PRIORITY & HIGH EFFORT            │
│  ┌──────────────────────────────────┐   │
│  │ 1. Live SOL Settlement      [P1] │   │
│  │ 4. Policy Editor            [P2] │   │
│  └──────────────────────────────────┘   │
│                                         │
│  HIGH PRIORITY & LOW EFFORT             │
│  ┌──────────────────────────────────┐   │
│  │ 2. WebSocket Production      [P1] │   │
│  │ 5. Reputation Leaderboard    [P3] │   │
│  └──────────────────────────────────┘   │
│                                         │
│  MEDIUM PRIORITY & LOW EFFORT           │
│  ┌──────────────────────────────────┐   │
│  │ 3. Agent Skills              [P2] │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

Legend:
P1 = Start immediately (blocks other work)
P2 = Start after P1 (supports main features)
P3 = Nice to have (bonus feature)
```

---

## Recommended Execution Order

### Path A: Aggressive (All in 3 weeks)
```
1. Live SOL Settlement (P1) — Days 1-5
2. WebSocket Production (P1) — Days 6-8
3. Agent Skills (P2) — Days 9-11
4. Policy Editor (P2) — Days 12-13
5. Leaderboard (P3) — Days 14-15
```

### Path B: Conservative (Prioritize Rock-Solid)
```
1. Live SOL Settlement (P1) — Days 1-7
2. Thorough Testing (P0) — Days 8-10
3. WebSocket Production (P1) — Days 11-13
4. Agent Skills (P2) — Days 14-18
5. Policy Editor (P2) — Days 19-22
6. Leaderboard (P3) — Days 23-24
```

### Path C: Balanced (Mix Quick Wins & Deep Work)
```
1. Live SOL Settlement (P1) — Days 1-5
2. Reputation Leaderboard (Quick) — Days 6-7
3. WebSocket Production (P1) — Days 8-11
4. Agent Skills (P2) — Days 12-14
5. Policy Editor (P2) — Days 15-18
6. Full Testing & Deploy — Days 19-21
```

---

## Success Criteria per Feature

### Live SOL Settlement
- ✅ Real SOL transfers execute without errors
- ✅ Idempotent: same request → same result always
- ✅ No double-spending possible
- ✅ Failed transactions can be recovered
- ✅ Audit trail complete
- ✅ E2E tests pass

### Production WebSocket
- ✅ <100ms latency for real-time updates
- ✅ Reconnection automatic on disconnect
- ✅ Falls back to SSE gracefully
- ✅ Handles 1000+ concurrent connections
- ✅ Message delivery guaranteed (no loss)
- ✅ Load testing shows stability

### Agent Skills
- ✅ Agents can create/edit skills
- ✅ Skills appear in job matching
- ✅ Skill ratings visible
- ✅ Verification workflow complete
- ✅ Marketplace searchable
- ✅ UI responsive & intuitive

### Policy Editor
- ✅ Non-technical users can create policies
- ✅ Simulation shows outcomes
- ✅ Version history preserved
- ✅ Rollback working
- ✅ Approval workflow enforced
- ✅ Changes audited

### Reputation Leaderboard
- ✅ Rankings update in real-time
- ✅ Filtering works (category, time, etc.)
- ✅ Fraud detection catches outliers
- ✅ Badges awarded correctly
- ✅ Mobile responsive
- ✅ Performance <200ms query time

---

## Risk Mitigation

### Live SOL Settlement
| Risk | Mitigation |
|------|-----------|
| Double spending | Idempotency keys + DB constraints |
| Network failure | Retry with exponential backoff |
| Wallet compromise | Hardware wallet support |
| Insufficient funds | Pre-flight balance checks |

### WebSocket Production
| Risk | Mitigation |
|------|-----------|
| Connection loss | Auto-reconnect with exponential backoff |
| Message loss | Message queue (Redis) |
| Overload | Rate limiting + connection pooling |
| Regional latency | CDN + edge functions |

### Policy Editor
| Risk | Mitigation |
|------|-----------|
| Broken policies | Simulation before deploy |
| Unintended changes | Approval workflow + audit trail |
| Rollback failures | Version control + time-based rollback |

---

## Dependencies & Blockers

### Live SOL Settlement
- Requires: Solana RPC endpoint configured
- Requires: Wallet management infrastructure
- Blocks: Revenue features

### WebSocket Production
- Requires: Decision on Vercel Edge vs Separate Server
- Requires: Message queue setup
- Blocks: Real-time leaderboard updates

### Agent Skills
- Depends on: Agent profile schema (done)
- Blocks: Advanced job matching

### Policy Editor
- Depends on: Policy schema (done)
- Blocks: Dynamic governance changes

### Reputation Leaderboard
- Depends on: Reputation calculation (done)
- Can proceed: In parallel with others

---

## Deliverables per Phase

### End of Week 1
- [ ] Live SOL settlement design document
- [ ] WebSocket architecture decision
- [ ] Test plan for all features
- [ ] Risk register updated

### End of Week 2
- [ ] Live SOL settlement implemented & tested
- [ ] Agent skills UI complete
- [ ] E2E tests passing
- [ ] Performance benchmarks

### End of Week 3
- [ ] WebSocket production deployed
- [ ] Policy editor working
- [ ] Leaderboard live
- [ ] All features documented
- [ ] Go/no-go decision made

---

## Questions for Your Approval

1. **Execution Path**: A (aggressive), B (conservative), or C (balanced)?
2. **WebSocket**: Vercel Edge, Separate Server, or Third-party?
3. **Timeline**: 3 weeks, 4 weeks, or longer?
4. **Team Size**: Solo, pair programming, or full team?
5. **Priority**: Start with which feature first?

---

**Last Updated**: 2026-06-29  
**Status**: Ready for Approval  
**Next Step**: Select execution path & start Phase 3
