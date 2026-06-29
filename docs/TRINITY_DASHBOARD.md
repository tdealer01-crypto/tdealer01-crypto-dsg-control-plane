# Trinity AI Dashboard — Phase 2 Implementation

## Overview

The Trinity AI Dashboard is an interactive UI for controlling the 5-agent multi-agent orchestration system. Phase 2 connects the dashboard to real API endpoints, implements real-time updates, adds comprehensive testing, and polishes the user experience.

**Status**: ✅ Phase 2 Complete (Dashboard UI + Real APIs + E2E Tests)

## Architecture

### Components

```
Trinity Dashboard
├── Agent Status Monitor (5-agent grid)
├── Orchestration Form (with validation)
├── Execution Result Panel (dry-run outcomes)
├── Execution History Table
├── Job Discovery Panel (Mind Agent)
└── Real-time Connection Indicator
```

### Data Flow

```
User Input
    ↓
Form Validation (client-side)
    ↓
POST /api/trinity/orchestrate (with dry_run=true)
    ↓
Spine → Hand → Eye → Nerve → Audit Trail
    ↓
Display Result (governance, execution, verification, reputation)
```

### Real-time Updates

Two mechanisms available:

1. **SSE (Server-Sent Events)** — Recommended for Next.js
   - Endpoint: `GET /api/trinity/stream`
   - Works in Next.js natively
   - Used as fallback when WebSocket unavailable

2. **WebSocket** — Production deployments
   - Endpoint: `GET /api/trinity/ws`
   - Requires separate WebSocket server
   - Not directly supported in Next.js route handlers
   - Can be deployed via Vercel Edge Functions or standalone service

## Features

### 1. Form Validation

Real-time client-side validation:

- **Job Title**: Required, non-empty
- **Reward Amount**: Must be > 0 SOL
- **Agent Reputation**: Must be 0–100

Validation errors clear automatically when user fixes the field.

**Example**:
```typescript
const validateForm = (): boolean => {
  const errors: FormErrors = {};

  if (!jobTitle.trim()) {
    errors.jobTitle = 'Job title is required';
  }

  if (rewardAmount <= 0 || isNaN(rewardAmount)) {
    errors.rewardAmount = 'Reward must be greater than 0';
  }

  if (agentReputation < 0 || agentReputation > 100) {
    errors.agentReputation = 'Reputation must be between 0-100';
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### 2. Toast Notifications

Integrated with existing `ToastProvider`:

```typescript
toast.success('✨ Orchestration completed successfully');
toast.error('Orchestration blocked');
toast.info('Real-time connection established');
```

Notifications appear for:
- System status updates
- Orchestration completion/failure
- Validation errors
- Real-time connection changes

### 3. System Status Display

Displays all 5 Trinity agents and their status:

```
🧠 Mind    - Job discovery across 6 platforms     ✓ registered
✋ Hand    - Work execution and deliverable generation ✓ registered
👁️ Eye    - Quality verification and blockchain tx validation ✓ registered
⚡ Nerve  - Payment settlement and reputation management ✓ registered
🦴 Spine  - Orchestration, DSG governance, and audit trail ✓ registered
```

Refresh button available to reload status on demand.

### 4. Orchestration Execution (Dry-Run)

**Dry-run Mode**: All executions are simulated — no real SOL transfers.

**Inputs**:
- Job title
- Category (smart-contract-audit, frontend-dev, etc.)
- Reward amount (SOL)
- Agent reputation (0–100)

**Outputs**:
- Plan Hash (Spine deterministic plan)
- Governance Result (5 constraints: max_duration, max_cost, security_check, audit_trail, reputation_check)
- Hand Execution (deliverable length, quality score, proof hash, exec time)
- Eye Verification (passed/failed, quality score)
- Nerve Reputation (new reputation, change, tier changed)
- Audit Hash (immutable trail)

**Example Response**:
```json
{
  "ok": true,
  "dry_run": true,
  "planHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9",
  "governance": {
    "approved": true,
    "policyVersion": "1.0",
    "violations": [],
    "constraints": [
      { "name": "max_duration", "satisfied": true },
      { "name": "max_cost", "satisfied": true },
      { "name": "security_check", "satisfied": true },
      { "name": "audit_trail", "satisfied": true },
      { "name": "reputation_check", "satisfied": true }
    ]
  },
  "execution": {
    "deliverableLength": 1024,
    "qualityScore": 85,
    "proofHash": "b2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0",
    "executionTimeMs": 2500
  },
  "verification": {
    "passed": true,
    "qualityScore": 90,
    "issues": []
  },
  "reputation": {
    "newReputation": 82,
    "reputationChange": 2,
    "tierChanged": false
  },
  "auditHash": "c3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1",
  "completedAt": "2026-06-29T12:34:56Z"
}
```

### 5. Execution History

Displays past orchestration runs:

| Job Title | Status | Exec Time (ms) | Created |
|-----------|--------|----------------|---------|
| Smart Contract Security Audit | success | 2847 | Jun 29, 2026, 1:20 PM |
| Backend API Development | success | 5123 | Jun 29, 2026, 1:10 PM |

Refresh button available to reload history.

### 6. Job Discovery (Mind Agent)

Displays jobs discovered by Mind Agent across multiple platforms:

**Platforms**:
- GitHub Bounties
- Solana Bounties
- Internal Projects

**Job Card Shows**:
- Platform badge
- Difficulty badge (easy/medium/hard with color coding)
- Job title
- Category
- Reward (SOL + USD estimate)
- Status (open/closed)
- Deadline
- Source label (live/demo)

**Example**:
```
[github-bounties] [hard] [demo]
Fix reentrancy vulnerability in ERC-20 vault
smart-contract-audit • open
5.0 SOL ($750)
Due: Jul 6, 2026
```

**Note**: Demo jobs appear when real API credentials are not configured.

### 7. Real-time Connection

Indicator shows connection status:

```
● Real-time Connected
```

**Protocol**:
- Tries WebSocket first (`wss://` or `ws://`)
- Falls back to SSE if WebSocket unavailable
- Falls back to polling if SSE unavailable
- Dashboard remains functional without real-time (uses periodic refresh)

## API Endpoints

### GET /api/trinity/status
System status of all 5 agents.

```bash
curl -X GET http://localhost:3000/api/trinity/status
```

### POST /api/trinity/orchestrate
Execute orchestration in dry-run mode.

```bash
curl -X POST http://localhost:3000/api/trinity/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": true,
    "job": {
      "title": "Smart Contract Audit",
      "category": "smart-contract-audit",
      "rewardAmount": 2.5,
      "rewardCurrency": "SOL",
      "deadline": "2026-07-06T00:00:00Z"
    },
    "agent": {
      "agentId": "test-agent-001",
      "reputation": 80,
      "skills": ["smart-contract-audit", "security-review"]
    }
  }'
```

### GET /api/trinity/discover
Job discovery with optional filtering.

```bash
curl -X GET 'http://localhost:3000/api/trinity/discover?category=smart-contract-audit&limit=10'
```

### GET /api/trinity/history
Execution history.

```bash
curl -X GET http://localhost:3000/api/trinity/history
```

### GET /api/trinity/stream
Server-Sent Events for real-time updates (fallback when WebSocket unavailable).

```bash
curl -X GET http://localhost:3000/api/trinity/stream
```

### GET /api/trinity/ws
WebSocket endpoint information (returns 501 Not Implemented in Next.js).

```bash
curl -X GET http://localhost:3000/api/trinity/ws
```

## Testing

### Unit Tests

Form validation tests: `tests/integration/trinity-dashboard.test.ts`

```bash
npm run test:integration -- trinity-dashboard.test.ts
```

### E2E Tests

UI end-to-end tests: `tests/e2e/trinity-dashboard.spec.ts`

```bash
npm run test:e2e -- trinity-dashboard.spec.ts
```

**Test Coverage**:
- ✅ Page load and header display
- ✅ Agent status cards
- ✅ Form validation (empty, invalid, boundary)
- ✅ Validation error clearing
- ✅ Orchestration execution
- ✅ Execution result display
- ✅ Governance constraints
- ✅ Agent-specific results (Hand, Eye, Nerve)
- ✅ Execution history loading
- ✅ Job discovery loading
- ✅ Real-time connection attempts
- ✅ Toast notifications
- ✅ Button states during execution
- ✅ Responsive layout
- ✅ Footer disclaimer

### System Tests

Full API test suite: `tests/e2e/trinity-agent-system.spec.ts`

```bash
npm run test:e2e -- trinity-agent-system.spec.ts
```

## Local Development

### Start Dev Server

```bash
npm run dev
```

### Navigate to Dashboard

```
http://localhost:3000/dashboard/trinity
```

### Monitor Real-time Connection

Open browser DevTools Console and look for:

```
Trinity WebSocket connected
Trinity SSE connected
Failed to connect WebSocket (expected in Next.js)
```

### Test Orchestration Flow

1. Fill in form with valid data
2. Click "Run Orchestration"
3. Monitor console for status
4. View execution result
5. Check execution history for new entry

## Deployment

### Vercel

On Vercel, WebSocket is not natively supported in route handlers. The dashboard uses SSE as fallback.

For production WebSocket support, consider:

1. **Vercel Edge Functions** with custom WebSocket server
2. **Separate Node.js service** for WebSocket handling
3. **Third-party WebSocket provider** (Firebase Realtime, Supabase, etc.)

### Production Checklist

- [ ] Real API credentials configured (GITHUB_TOKEN, SOLANA_EARN_API_KEY)
- [ ] Database migrations applied (supabase migrate up)
- [ ] Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GITHUB_TOKEN` (optional, for real job discovery)
  - `SOLANA_EARN_API_KEY` (optional, for real job discovery)
- [ ] `/api/trinity/status` returns 200
- [ ] `/api/trinity/orchestrate` accepts POST and returns dry-run results
- [ ] `/api/trinity/discover` returns job listings
- [ ] Dashboard loads and is responsive
- [ ] Form validation works
- [ ] Toasts display correctly
- [ ] E2E tests pass in staging

## Troubleshooting

### WebSocket Connection Fails

**Expected behavior**: Dashboard still works. Falls back to SSE.

Check console for:
```
WebSocket error, falling back to SSE
SSE connected
```

### Jobs Not Discovered

**Cause**: Missing API credentials.

**Solution**: Set environment variables:
```bash
GITHUB_TOKEN=ghp_...
SOLANA_EARN_API_KEY=solana_...
```

**Fallback**: Demo jobs appear when credentials are missing.

### Form Submission Takes Too Long

**Cause**: Network latency or slow compute.

**Solution**: Dashboard shows "Running..." state. Wait for completion (timeout: 15s).

### Execution History Empty

**Cause**: No past executions recorded.

**Solution**: Run an orchestration to populate history. Click "Refresh" to reload.

### Validation Errors Don't Clear

**Cause**: Field not updated properly.

**Solution**: Ensure input `onChange` handler is connected to state setter that clears error.

Current implementation: Error clears on field change.

## Architecture Decisions

### Why SSE over WebSocket?

- ✅ Works natively in Next.js
- ✅ No custom server required on Vercel
- ✅ Automatic reconnection
- ✅ Simpler than WebSocket
- ❌ One-directional (server → client)

For production, consider WebSocket when:
- Two-way real-time communication needed
- High-frequency updates required
- Dedicated WebSocket server available

### Why Dry-Run Only?

- ✅ Safe for testing without SOL transfer
- ✅ Deterministic results for testing
- ✅ Full governance pipeline validation
- ✅ Audit trail recording

Live mode with real SOL transfers planned for Phase 3.

### Form Validation Strategy

- ✅ Client-side validation (fast feedback)
- ✅ Server-side validation (POST /api/trinity/orchestrate)
- ✅ Real-time error clearing (improved UX)
- ✅ Toast notifications (user awareness)

## Future Enhancements (Phase 3+)

- [ ] Live mode with real SOL settlements
- [ ] WebSocket production deployment
- [ ] Agent skill management UI
- [ ] Governance policy editor
- [ ] Reputation leaderboard
- [ ] Execution timeline visualization
- [ ] Export execution proof as PDF
- [ ] Mobile-responsive improvements
- [ ] Dark/light theme toggle
- [ ] Multi-agent job coordination UI

## Links

- **Dashboard**: `/dashboard/trinity`
- **API Docs**: See endpoint descriptions above
- **Test Files**:
  - Unit: `tests/integration/trinity-dashboard.test.ts`
  - E2E: `tests/e2e/trinity-dashboard.spec.ts`
  - System: `tests/e2e/trinity-agent-system.spec.ts`
- **Agent System**: `docs/agents/CLAUDE_TOOL_API_CONTRACT.md`
- **Governance**: `docs/REPO_TRUTH.md`

## Questions?

Refer to CLAUDE.md for project guidelines, AGENTS.md for agent rules, and the tool API contract for integration details.
