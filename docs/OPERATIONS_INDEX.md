# Operations Index

Central reference for all operational runbooks, incident response procedures, and troubleshooting guides for DSG ONE / ProofGate Control Plane.

---

## Quick Navigation

### For Deployments
- **docs/DEPLOYMENT_RUNBOOK.md** — Quick reference for deploying code to production
  - Pre-deployment checklist
  - One-command deployment
  - Environment variables management
  - Database migrations
  - Endpoint testing
  - Webhook debugging

### For Incidents
- **docs/INCIDENT_RESPONSE.md** — Complete incident playbooks for 6 common scenarios
  - Severity classification
  - Service outage response
  - Database failure recovery
  - Stripe API incident handling
  - Webhook processing failures
  - High latency troubleshooting
  - Security incidents
  - Communication templates

### For Troubleshooting
- **docs/TROUBLESHOOTING_GUIDE.md** — Diagnostic procedures for 10 common issues
  - Quick health checks
  - Error message interpretation
  - Log access procedures
  - Debug enablement
  - Escalation procedures

### For Emergency Recovery
- **scripts/emergency-restore.sh** — Automated rollback script
  - Interactive or automated deployment selection
  - Rollback to previous deployment
  - Redis cache clearing
  - Health verification
  - Summary reporting

---

## Decision Tree: Which Document to Use?

```
Start here: Is there an active production issue?
│
├─ YES, SERVICE DOWN (Red alert)
│  └─→ INCIDENT_RESPONSE.md
│      1. Read "Immediate Incident Detection"
│      2. Choose matching incident playbook
│      3. Follow 4-phase response
│      4. Use communication templates
│
├─ YES, SLOW RESPONSES (Yellow alert)
│  └─→ INCIDENT_RESPONSE.md → High Latency section
│      OR TROUBLESHOOTING_GUIDE.md → Common Issues section
│
├─ YES, SPECIFIC ERROR MESSAGE
│  └─→ TROUBLESHOOTING_GUIDE.md
│      1. Start with Quick Diagnostics
│      2. Find error message in table
│      3. Follow solution steps
│      4. Escalate if needed
│
├─ NO, DEPLOYING TO PRODUCTION
│  └─→ DEPLOYMENT_RUNBOOK.md
│      1. Review pre-deployment checklist
│      2. Use quick deploy section
│      3. Run smoke tests
│      4. Use go/no-go gate
│
└─ NO, NEED TO ROLLBACK
   └─→ scripts/emergency-restore.sh
       ./scripts/emergency-restore.sh --deploy-id <id>
       OR for interactive: ./scripts/emergency-restore.sh
```

---

## Typical Incident Response Flow

### Phase 1: Detection (< 2 minutes)
```
User reports issue
  ↓
Check: docs/TROUBLESHOOTING_GUIDE.md → Quick Diagnostics
  ↓
Run: curl -s https://.../api/health
  ↓
Determine severity: SEV-1, SEV-2, or SEV-3
```

### Phase 2: Assessment (< 5 minutes)
```
Choose incident type from INCIDENT_RESPONSE.md
  ↓
Read: "Immediate Checks" section
  ↓
Collect error logs from Vercel/Supabase
  ↓
Identify root cause (Triage phase)
```

### Phase 3: Mitigation (< 15 minutes for SEV-1)
```
Choose matching "Root Cause Analysis" section
  ↓
Execute Phase 2: Root Cause Analysis steps
  ↓
Execute Phase 3: Mitigation steps
  ↓
Verify: Test endpoint health
```

### Phase 4: Recovery (< 30 minutes total)
```
Execute Phase 4: Recovery steps
  ↓
Verify all checks green
  ↓
Send status update to team
  ↓
Schedule post-incident review
```

---

## Command Quick Reference

### Health Checks
```bash
# Basic availability
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Dependency status
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# Full readiness gate
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

### Deployment
```bash
# Check recent deployments
npx vercel ls

# View deployment logs
npx vercel logs <deployment-url>

# Deploy to production
npm run deploy:prod

# Rollback (interactive)
./scripts/emergency-restore.sh

# Rollback (automated)
./scripts/emergency-restore.sh --deploy-id <id> --force
```

### Environment Variables
```bash
# List production vars
npx vercel env ls production

# Add/update var
npx vercel env add VAR_NAME production

# Redeploy after env change
npm run deploy:prod
```

### Database
```bash
# Apply migrations
supabase link --project-ref <PROJECT_REF>
supabase db push

# Check migration status
supabase db pull

# Fix runtime RPC
npm run ops:runtime-rpc-fix
```

### Logs
```bash
# Vercel deployment logs
npx vercel logs https://tdealer01-crypto-dsg-control-plane.vercel.app

# Supabase database logs
# Dashboard → Logs → Database

# Filter for errors
npx vercel logs | grep -i error
```

---

## Service Components Status

To diagnose issues, check each component:

| Component | Health Check | Docs |
|-----------|---|---|
| **Vercel Deployment** | `npx vercel ls` | DEPLOYMENT_RUNBOOK.md |
| **Supabase Database** | `/api/core/monitor` | INCIDENT_RESPONSE.md |
| **DSG Core** | `/api/core/monitor` | INCIDENT_RESPONSE.md |
| **Stripe** | Manual check | INCIDENT_RESPONSE.md → Stripe section |
| **Redis Cache** | App logs | TROUBLESHOOTING_GUIDE.md → Latency |
| **Application Code** | `/api/health` | DEPLOYMENT_RUNBOOK.md |

---

## Common Issues by Severity

### SEV-1 (Page on-call immediately)
- All endpoints down (5xx errors)
- Database completely unreachable
- Authentication completely broken
- Security incident (API keys exposed)

**Response:** INCIDENT_RESPONSE.md + emergency-restore.sh

### SEV-2 (Notify within 15 minutes)
- Partial outage (some endpoints slow)
- Webhook processing backlog
- Stripe sync failures
- High error rate (> 5%)

**Response:** INCIDENT_RESPONSE.md relevant playbook

### SEV-3 (Log ticket, discuss later)
- Single user can't log in
- Slow response on one endpoint
- Minor data inconsistency
- Non-critical feature broken

**Response:** TROUBLESHOOTING_GUIDE.md

---

## Runbook Index

### Canonical Deployment & Operations Docs
1. **docs/RUNBOOK_DEPLOY.md** — Primary deployment guide (comprehensive)
2. **docs/RUNBOOK_ROLLBACK.md** — Rollback procedures (database considerations)
3. **docs/RUNBOOK_INCIDENT_RESPONSE.md** — Incident severity model (baseline)

### New Operations Docs (This Package)
4. **docs/DEPLOYMENT_RUNBOOK.md** — Quick reference (operations-focused)
5. **docs/INCIDENT_RESPONSE.md** — Detailed incident playbooks (procedures)
6. **docs/TROUBLESHOOTING_GUIDE.md** — Common issues & solutions (diagnostics)
7. **scripts/emergency-restore.sh** — Automated recovery script (tools)

### Related Documentation
- **CLAUDE.md** — AI assistant operating guide
- **docs/RUNBOOK_COMMANDS.md** — Command reference
- **docs/agents/CLAUDE_TOOL_API_CONTRACT.md** — API boundaries

---

## Operating Procedures by Role

### On-Call Engineer (First responder)

**When paged:**
1. Read INCIDENT_RESPONSE.md → Immediate Incident Detection
2. Run health checks from TROUBLESHOOTING_GUIDE.md → Quick Diagnostics
3. Choose incident playbook based on symptoms
4. Execute Triage and Root Cause Analysis phases
5. Escalate to Team Lead if mitigation not clear

**Tools:**
- INCIDENT_RESPONSE.md (incident playbooks)
- TROUBLESHOOTING_GUIDE.md (error diagnosis)
- scripts/emergency-restore.sh (emergency rollback)
- DEPLOYMENT_RUNBOOK.md (health checks)

### Team Lead (Incident commander)

**When notified of SEV-1/2:**
1. Open incident channel in Slack
2. Gather on-call engineer status update
3. Assign tasks if needed
4. Track time-to-mitigation vs SLA
5. Authorize emergency procedures (e.g., disabling features)
6. Schedule post-incident review within 24 hours

**Reference:**
- INCIDENT_RESPONSE.md → Incident Communication Template
- INCIDENT_RESPONSE.md → Incident Checklist

### DevOps Engineer

**For deployments:**
1. Review DEPLOYMENT_RUNBOOK.md pre-deployment checklist
2. Execute deployment commands
3. Run post-deploy smoke checks
4. Monitor Vercel logs for errors
5. Update OPERATIONS_INDEX.md if procedures change

**For infrastructure issues:**
1. Use INCIDENT_RESPONSE.md → relevant playbook
2. Check Vercel/Supabase dashboards for service status
3. Execute recovery steps
4. Document changes for post-incident review

### Product Owner

**When incident impacts users:**
1. Monitor incident channel updates
2. Prepare status page message (if public status required)
3. Coordinate customer communication
4. Collect feedback for improvements

**Reference:**
- INCIDENT_RESPONSE.md → Incident Communication Template
- INCIDENT_RESPONSE.md → Escalation Contacts (update with your name)

---

## Incident Response Checklist

Use this during active incident:

```
DETECTION (< 2 min)
☐ Alert received and confirmed
☐ Severity classified (SEV-1/2/3)
☐ On-call engineer paged (if SEV-1/2)

ASSESSMENT (< 5 min)
☐ Health checks run (quick diagnostics)
☐ Root cause hypothesized
☐ Right incident playbook opened

MITIGATION (< 15 min for SEV-1)
☐ Root cause analysis executed
☐ Mitigation steps begun
☐ Status update sent to team

RECOVERY (< 30 min)
☐ Recovery steps executed
☐ Health checks verify success
☐ Status update: RESOLVED

POST-INCIDENT (< 24 hours)
☐ Root cause documented
☐ Incident timeline recorded
☐ Prevention measures identified
☐ Post-incident review scheduled
☐ Runbooks updated if gaps found
```

---

## Document Versions

| Document | Location | Updated | Purpose |
|----------|----------|---------|---------|
| DEPLOYMENT_RUNBOOK.md | docs/ | 2026-06-07 | Quick deploy reference |
| INCIDENT_RESPONSE.md | docs/ | 2026-06-07 | Incident playbooks |
| TROUBLESHOOTING_GUIDE.md | docs/ | 2026-06-07 | Troubleshooting procedures |
| emergency-restore.sh | scripts/ | 2026-06-07 | Automated rollback |
| OPERATIONS_INDEX.md | docs/ | 2026-06-07 | This index |

---

## How to Contribute

Found an issue with the runbooks?

1. **Report the issue:**
   - File GitHub issue with tag `runbook-feedback`
   - Include: what went wrong, how you fixed it

2. **Suggest improvement:**
   - Create PR with updated documentation
   - Include: what changed, why it's better

3. **Share incident learnings:**
   - During post-incident review, capture gaps
   - Update relevant runbook section
   - Share with team

4. **Request new playbook:**
   - Comment on GitHub issue: `New incident type: [description]`
   - Include: symptoms, typical root causes, resolution steps

---

## Training & Onboarding

### For New Team Members
1. Read: OPERATIONS_INDEX.md (this file)
2. Read: DEPLOYMENT_RUNBOOK.md (understand deployment process)
3. Watch: Demo deployment to staging (get familiar with commands)
4. Study: INCIDENT_RESPONSE.md (understand incident model)
5. Practice: Run emergency-restore.sh on staging (get comfortable with recovery)
6. Test: Trigger test incident (practice incident response)

### For On-Call Engineer Rotation
1. Confirm access to all tools (Vercel CLI, Supabase, GitHub)
2. Review: All 3 playbooks (INCIDENT_RESPONSE.md focus)
3. Know: Escalation contacts (update Incident Contacts section)
4. Practice: Run emergency-restore.sh interactively
5. Read: Recent post-incident reviews (understand common issues)

### For First Deployment
1. Review: DEPLOYMENT_RUNBOOK.md pre-deployment checklist
2. Get: Approval from team lead
3. Use: DEPLOYMENT_RUNBOOK.md quick deploy section
4. Monitor: Vercel logs until deployment settles
5. Run: `npm run go:no-go <url>` to verify readiness

---

## Support & Escalation

**Can't find the answer?**
1. Check TROUBLESHOOTING_GUIDE.md error message table
2. Search docs/ for related keyword
3. Check GitHub issues/discussions
4. Page on-call engineer (SEV-1/2)
5. File new GitHub issue with reproduction steps

**Want to improve this documentation?**
- Create PR with updates
- Include: what changed, why
- Get review from team lead

---

## External Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Stripe API Reference**: https://stripe.com/docs/api
- **Next.js Documentation**: https://nextjs.org/docs
- **GitHub Status**: https://www.githubstatus.com
- **Vercel Status**: https://vercel.com/statuspage
- **Supabase Status**: https://supabase.com/status
- **Stripe Status**: https://status.stripe.com

---

## Related Reading

- `CLAUDE.md` — AI assistant operating guide (rules for this repo)
- `docs/RUNBOOK_DEPLOY.md` — Comprehensive deployment guide
- `docs/RUNBOOK_ROLLBACK.md` — Rollback procedures
- `docs/RUNBOOK_INCIDENT_RESPONSE.md` — Incident severity model
- `.github/workflows/` — Automated deployment workflows
- `vercel.json` — Vercel deployment configuration
- `supabase/migrations/` — Database schema evolution

---

**Last updated:** 2026-06-07
**Maintained by:** Operations Team
**Review cycle:** Quarterly (or after each major incident)
