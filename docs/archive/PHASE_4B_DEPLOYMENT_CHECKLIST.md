# Phase 4B Deployment Checklist

**Status:** Infrastructure merged to main (commit: bc407313)  
**Date:** 2026-07-12  
**Next Phase:** Phase 4C Team Training

---

## ✅ Completed Infrastructure

All Phase 4B telemetry validation code is now deployed on main:

### Code & Endpoints
- ✅ Phase 4B test user creation endpoint (`POST /api/phase4b/create-test-user`)
- ✅ Event injection script (21 custom telemetry events)
- ✅ Signup route Content-Type fix (JSON + FormData support)
- ✅ Security: Centralized error handling (no message leakage)

### Documentation
- ✅ Phase 4B Validation Guide (`docs/PHASE_4B_VALIDATION.md`)
- ✅ Phase 4B Test Setup Guide (`docs/PHASE_4B_TEST_SETUP.md`)
- ✅ Event taxonomy and schema documentation

### PostHog Configuration
- ✅ 3 dashboards configured (Conversion, Operational, Compliance)
- ✅ 14 widgets across all dashboards
- ✅ 4 alert rules configured and enabled

### CI Pipeline
- ✅ All checks passed (44 total, 100% success rate)
- ✅ Z3 Gate Verification: ✅ pass
- ✅ CCVS Evidence Tests: ✅ 3391 tests pass
- ✅ CodeQL: ✅ pass
- ✅ Security Audit: ✅ pass
- ✅ Smoke tests: ✅ pass
- ✅ Fast gate: ✅ pass

---

## 🚀 Required Actions for Phase 4B Sign-Off

### 1. Set Environment Variable (Immediate - 2 min)

**Action:** Add `PHASE_4B_TEST_KEY` to Vercel production environment

**Location:** Vercel Project Settings → Environment Variables

**Steps:**
1. Go to https://vercel.com/dashboard
2. Select `tdealer01-crypto-dsg-control-plane` project
3. Settings → Environment Variables
4. Add new variable:
   - Name: `PHASE_4B_TEST_KEY`
   - Value: (create a secure random string, e.g., `tr -dc A-Za-z0-9 </dev/urandom | head -c 32`)
   - Environments: Production
5. Save and wait for deployment to complete
6. Verify: `curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health`

### 2. Create Test User (5 min)

**Action:** Use the pre-confirmed user endpoint to create a test account

**Command:**
```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/phase4b/create-test-user" \
  -H "x-phase4b-key: <your-PHASE_4B_TEST_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "phase4b-test-'$(date +%s)'@example.com",
    "full_name": "Phase 4B Test User"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "user": {
    "id": "uuid-...",
    "email": "phase4b-test-...",
    "full_name": "Phase 4B Test User"
  },
  "next_steps": [
    "Visit https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login",
    "Sign in with: phase4b-test-...",
    "Password: Phase4BTest!{timestamp}",
    "User will trigger organization_created and workspace_created events"
  ]
}
```

### 3. Sign In & Trigger Events (5 min)

**Action:** Sign in with test credentials to trigger telemetry events

**Steps:**
1. Visit https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login
2. Enter email and password from create-test-user response
3. On first login, the system will:
   - Create organization → triggers `organization_created` ✅
   - Create workspace → triggers `workspace_created` ✅
   - Create default agent → triggers `agent_created` ✅

**Expected time:** < 2 minutes

### 4. Validate Events in PostHog (10 min)

**Action:** Verify events appear in PostHog dashboards

**Steps:**

1. **Check Event Capture:**
   - Visit https://us.posthog.com/project/479488/events
   - Filter by recent events (last 5 minutes)
   - Look for:
     - `organization_created` ✅
     - `workspace_created` ✅
     - `agent_created` ✅

2. **Check Dashboard Widgets:**
   - Visit https://us.posthog.com/project/479488/dashboards
   
   **Conversion Funnel (1835443):**
   - "New Organizations" widget → should show 1+
   - "First Policy Created" → ready for test
   - "Agents Created" → should show 1+
   
   **Operational Metrics (1835444):**
   - "Active Workspaces" → should show 1+
   - "Team Size" → ready for test
   - "Policy Activity" → ready for test
   
   **Compliance & Audit (1835445):**
   - "Compliance Reports" → ready for test
   - "Audit Trail Queries" → ready for test
   - "Proof Verifications" → ready for test

3. **Check Alert Rules:**
   - Visit https://us.posthog.com/project/479488/site-apps?tab=alerts
   - Verify 4 alert rules are enabled:
     - ✅ High Execution Rate (threshold: 5+/hour)
     - ✅ Approval Queue Backlog (threshold: >10 pending)
     - ✅ Team Growth Spike (threshold: 3+/day)
     - ✅ Compliance Report Surge (threshold: 5+/hour)

### 5. Run Automated Event Injection (Optional - 5 min)

**Action:** Inject all 21 events programmatically to stress-test dashboards

**Command:**
```bash
bash ./scripts/phase-4b-event-injection.sh
```

**Expected Output:**
```
✓ Injected 21 events via PostHog API
✓ All events accepted (HTTP 200)
✓ Indexing in progress (5-10 min to appear in dashboards)
```

---

## 📋 Phase 4B Sign-Off Validation Checklist

Before approving Phase 4B sign-off, verify:

### Code Quality
- [x] All CI checks passed (100% success rate)
- [x] Code review standards met
- [x] No security vulnerabilities
- [x] Error handling centralized (no message leakage)

### Infrastructure
- [ ] `PHASE_4B_TEST_KEY` environment variable is set in Vercel production
- [ ] Test user created successfully
- [ ] Login works and triggers events
- [ ] Events appear in PostHog within 5-10 minutes

### Telemetry
- [ ] `organization_created` event appears in PostHog
- [ ] `workspace_created` event appears in PostHog
- [ ] `agent_created` event appears in PostHog
- [ ] Dashboard widgets begin displaying data

### Documentation
- [x] Phase 4B Validation Guide complete
- [x] Phase 4B Test Setup Guide complete
- [x] Troubleshooting guide available
- [x] 4 testing approaches documented

### Readiness for Phase 4C
- [ ] All Phase 4B validation checks passed
- [ ] Team has access to PostHog dashboards
- [ ] Documentation reviewed and understood
- [ ] Training schedule confirmed

---

## 🚀 Phase 4C: Team Training Preparation

Once Phase 4B validation is complete, proceed to Phase 4C:

**5 Training Sessions (30 min each):**

1. **Telemetry Basics** (30 min)
   - How events are captured
   - Event schema and properties
   - PostHog dashboard walkthrough

2. **Operational Dashboards** (30 min)
   - Using Conversion Funnel dashboard
   - Interpreting Operational Metrics
   - Identifying bottlenecks

3. **Compliance & Audit** (30 min)
   - Audit trail navigation
   - Evidence export workflow
   - Compliance reporting

4. **Alert Management** (30 min)
   - Setting up custom alerts
   - Alert threshold tuning
   - Incident response workflows

5. **Case Studies & Best Practices** (30 min)
   - Real-world event analysis
   - Performance optimization
   - Team troubleshooting

**Total Training Time:** 2.5 hours

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: "Unauthorized - invalid or missing PHASE_4B_TEST_KEY"**
- Verify `PHASE_4B_TEST_KEY` is set in Vercel Project Settings
- Check header is exactly `x-phase4b-key: <value>`
- Verify no trailing whitespace in key

**Q: "Failed to create user"**
- Check email is valid format (contains @)
- Check email not already in use
- Verify Supabase service role key is set

**Q: Events not appearing in PostHog**
- Wait 5-10 minutes for indexing
- Check Events tab filter/search settings
- Verify event timestamp is recent (within last hour)
- Check PostHog project ID is 479488

**Q: Dashboard widgets showing no data**
- Hard refresh page (Ctrl+Shift+R on Chrome)
- Verify events appear in Events tab first
- Check widget filters match event names
- Wait 15-20 minutes for full indexing

### Contact

For additional support, refer to:
- `/docs/PHASE_4B_VALIDATION.md` — detailed validation steps
- `/docs/PHASE_4B_TEST_SETUP.md` — complete test setup procedures
- `/scripts/phase-4b-event-injection.sh` — programmatic event testing

---

## Timeline

| Step | Status | Owner | ETA |
|------|--------|-------|-----|
| Merge to main | ✅ Complete | Claude Code | 2026-07-12 14:07 |
| Set PHASE_4B_TEST_KEY | ⏳ Pending | DevOps/Admin | 2026-07-12 14:20 |
| Create test user | ⏳ Pending | QA/Tester | 2026-07-12 14:25 |
| Validate events | ⏳ Pending | QA/Tester | 2026-07-12 14:35 |
| Phase 4B sign-off | ⏳ Pending | Product Lead | 2026-07-12 15:00 |
| Phase 4C training | ⏳ Pending | Engineering | 2026-07-12 15:30+ |

---

## Summary

**What's Ready:**
- ✅ Complete Phase 4B telemetry infrastructure
- ✅ Pre-confirmed user creation endpoint (bypasses email verification)
- ✅ 21 custom telemetry events (7 + 8 + 6)
- ✅ 3 PostHog dashboards with 14 widgets
- ✅ 4 alert rules for operational monitoring
- ✅ Comprehensive validation and test documentation
- ✅ All CI checks passing

**What's Next:**
1. Set `PHASE_4B_TEST_KEY` in Vercel (2 min)
2. Create test user and sign in (5 min)
3. Validate events in PostHog (10 min)
4. Approve Phase 4B sign-off (5 min)
5. Begin Phase 4C team training (2.5 hours)

**Total Time to Phase 4B Sign-Off:** ~30 minutes  
**Total Time to Phase 4C Complete:** ~3 hours

---

**Status:** Ready for Phase 4B deployment and team sign-off  
**Next Owner:** DevOps/Admin → QA/Tester → Product Lead → Engineering  
**Estimated Completion:** 2026-07-12 15:30
