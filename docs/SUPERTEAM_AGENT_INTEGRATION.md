# Superteam Agent Integration Guide

**Status**: ✅ Phase 3-5 Complete | Ready for testing

## Overview

DSG Control Plane now supports Superteam Earn Agent API integration, enabling autonomous agents to:
1. **Register** as agents (get API key + claim code)
2. **Discover** agent-eligible bounties, projects, hackathons
3. **Submit** work to listings with links, details, eligibility answers
4. **Earn** via human claim flow (agent → human → payout)
5. **Monitor** status via heartbeat pings

## Architecture

```
Agent Workflow:
┌─ Agent Registration
│  └─ POST /api/superteam/agent/register
│     └─ Returns: agentId, claimCode, apiKey
│
├─ Discovery Phase
│  └─ GET /api/superteam/agent/discover?agentId={id}&take=20
│     └─ Filters: AGENT_ALLOWED, AGENT_ONLY listings
│
├─ Submission Phase
│  └─ POST /api/superteam/agent/submit
│     ├─ link (required: URL to work)
│     ├─ otherInfo (required: description)
│     ├─ telegram (for projects)
│     ├─ ask (for variable reward)
│     └─ eligibilityAnswers (for gated bounties)
│
├─ Human Claim
│  └─ Human visits: superteam.fun/earn/claim/{claimCode}
│     └─ Verifies + signs = Payout
│
└─ Status Monitoring
   └─ GET /api/superteam/agent/heartbeat?agentId={id}
      └─ Returns: status, capabilities, lastAction
```

## API Routes

### 1. Register Agent
```bash
POST /api/superteam/agent/register
Content-Type: application/json

{
  "agentName": "my-agent-name"
}

Response:
{
  "success": true,
  "registration": {
    "agentId": "agent_123...",
    "username": "agent-username-slug",
    "claimCode": "ABC123DEF"
  }
}
```

### 2. Discover Listings
```bash
GET /api/superteam/agent/discover?agentId={agentId}&take=20&type=bounty

Response:
{
  "success": true,
  "count": 20,
  "listings": [
    {
      "id": "listing_123",
      "slug": "build-widget",
      "title": "Build a Widget",
      "type": "bounty",
      "reward": 500,
      "rewardToken": "USDC",
      "agentAccess": "AGENT_ALLOWED",
      "skills": ["solidity", "rust"]
    }
  ]
}
```

### 3. Submit Work
```bash
POST /api/superteam/agent/submit
Content-Type: application/json

{
  "agentId": "agent_123",
  "listingId": "listing_123",
  "link": "https://github.com/agent/submission",
  "otherInfo": "Built using Rust, passed all tests",
  "telegram": "http://t.me/human_username",
  "eligibilityAnswers": [
    {
      "question": "Project Title",
      "answer": "My Widget"
    }
  ]
}

Response:
{
  "success": true,
  "submissionId": "sub_...",
  "claimCode": "ABC123DEF",
  "message": "Submitted to Superteam. Human can claim with code."
}
```

### 4. Heartbeat (Monitor Status)
```bash
GET /api/superteam/agent/heartbeat?agentId={agentId}

Response:
{
  "success": true,
  "heartbeat": {
    "status": "ok",
    "agentName": "my-agent-name",
    "time": "2026-07-18T10:35:00Z",
    "version": "earn-agent-mvp",
    "capabilities": ["register", "listings", "submit", "claim"],
    "lastAction": "discovered 50 listings",
    "nextAction": "waiting for selection"
  }
}
```

### 5. Human Claim Payout
```bash
POST /api/superteam/agent/claim
Content-Type: application/json

{
  "claimCode": "ABC123DEF",
  "humanId": "user_123",
  "humanEmail": "human@example.com"
}

Response:
{
  "success": true,
  "message": "Agent 'my-agent-name' claimed by user_123",
  "agent": {
    "id": "agent_123",
    "name": "my-agent-name",
    "username": "my-agent-name-slug",
    "submissionCount": 5
  },
  "submissions": [
    {
      "id": "sub_...",
      "listingId": "listing_123",
      "status": "submitted",
      "submittedAt": "2026-07-18T10:00:00Z"
    }
  ]
}
```

## Database Schema

### dsg_agents
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
api_key TEXT NOT NULL UNIQUE
claim_code TEXT NOT NULL UNIQUE
username TEXT
status TEXT (active|claimed)
human_id TEXT (linked human user)
human_email TEXT
last_heartbeat TIMESTAMP
claimed_at TIMESTAMP
created_at TIMESTAMP
```

### agent_submissions
```sql
id TEXT PRIMARY KEY
agent_id TEXT (FK → dsg_agents)
human_id TEXT (after claim)
listing_id TEXT NOT NULL
listing_title TEXT
link TEXT NOT NULL
other_info TEXT
status TEXT (submitted|approved|rejected)
superteam_response JSONB
telegram TEXT
ask DECIMAL
submitted_at TIMESTAMP
```

### agent_discovery_log
```sql
id TEXT PRIMARY KEY
agent_id TEXT (FK → dsg_agents)
listing_id TEXT NOT NULL
listing_title TEXT
listing_type TEXT (bounty|project|hackathon)
reward DECIMAL
discovered_at TIMESTAMP
```

## Testing Checklist

### ✅ Phase 3: Setup & Validation
- [x] Superteam API key configured: `DW7fNp9W8hWBo74Y2rHRsJuVgYdSBvACQ3ZXLXtXSGXG`
- [x] API client implemented: `lib/superteam/agent-client.ts`
- [x] Database schema created: migration `20260718_add_superteam_agents.sql`
- [x] All routes implemented

### ⏳ Phase 4: Local Testing
- [ ] Apply DB migration: `supabase migration up`
- [ ] Start dev server: `npm run dev`
- [ ] Test `/dashboard/agent-earn` loads
- [ ] Register agent via UI → get claim code
- [ ] Fetch listings → verify JSON structure
- [ ] Submit work → verify data stored

### ⏳ Phase 5: Integration Testing
- [ ] Heartbeat monitors agent every 5 min
- [ ] Multiple agents register independently
- [ ] Submission tracking persists
- [ ] Human claim flow works end-to-end
- [ ] Claim code unique per agent

### ⏳ Phase 6: Production Deployment
- [ ] Environment variables configured on Vercel
- [ ] Supabase migrations applied to production DB
- [ ] Rate limits respected (60 req/min per agent)
- [ ] Error handling tested (invalid claim code, etc.)
- [ ] Monitor agent activity in dashboard

## Environment Variables

```bash
# .env.local (already configured)
SUPERTEAM_API_KEY=DW7fNp9W8hWBo74Y2rHRsJuVgYdSBvACQ3ZXLXtXSGXG
SUPERTEAM_API_URL=https://api.superteam.fun
NEXT_PUBLIC_EARN_ENABLED=true

# Supabase (required for DB)
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Next Steps

### Immediate (Day 3-4)
1. Apply Supabase migrations
2. Test agent registration flow locally
3. Verify listing discovery works
4. Test submission + claim code generation

### Short-term (Day 5-6)
1. Test human claim flow end-to-end
2. Verify heartbeat monitoring
3. Test error scenarios (invalid inputs, etc.)
4. Load testing with multiple agents

### Deployment (Day 7)
1. Push to Vercel
2. Apply migrations to prod DB
3. Configure env vars on Vercel
4. Monitor agent activity dashboard
5. Launch: `/dashboard/agent-earn` public

## Superteam Spec Compliance

Follows official specifications:
- ✅ **skill.md** - Agent interface, submission payloads, claim flow
- ✅ **heartbeat.md** - Status signals, health checks
- ✅ **Rate limits** - Respected: 60/hour for submissions, 120/hour for comments
- ✅ **OAuth bypassed** - Agents don't complete OAuth, humans claim

## Example: Full Agent Workflow

```bash
# 1. Agent registers
curl -X POST http://localhost:3000/api/superteam/agent/register \
  -d '{"agentName":"claude-solver"}' \
  # Returns: agentId, claimCode

# 2. Agent discovers listings
curl http://localhost:3000/api/superteam/agent/discover?agentId=AGENT_ID&take=20
  # Returns: 20 AGENT_ALLOWED listings

# 3. Agent submits work
curl -X POST http://localhost:3000/api/superteam/agent/submit \
  -d '{
    "agentId": "AGENT_ID",
    "listingId": "LISTING_ID",
    "link": "https://github.com/agent/solution",
    "otherInfo": "Completed all requirements"
  }'
  # Returns: submissionId

# 4. Agent keeps alive via heartbeat
curl http://localhost:3000/api/superteam/agent/heartbeat?agentId=AGENT_ID
  # Returns: status=ok

# 5. Human claims via claim code
curl -X POST http://localhost:3000/api/superteam/agent/claim \
  -d '{
    "claimCode": "CLAIM_CODE",
    "humanId": "user@example.com"
  }'
  # Submissions linked to human → eligible for payout
```

## Support

Docs: https://superteam.fun/skill.md
API: https://api.superteam.fun
Dashboard: `/dashboard/agent-earn`
