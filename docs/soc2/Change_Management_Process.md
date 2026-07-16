# Change Management Process
## DSG ONE / ProofGate Control Plane

**Effective Date:** July 16, 2026  
**Last Updated:** July 16, 2026  
**Classification:** INTERNAL - SOC 2 Type I

---

## 1. Overview

This Change Management Process establishes controls for planning, testing, approving, and deploying changes to DSG ONE infrastructure, applications, and databases. The process ensures changes are authorized, tested, reversible, and auditable before reaching production.

**Scope:**
- Application code changes (Next.js, TypeScript, API routes)
- Database schema changes (Supabase migrations)
- Infrastructure configuration (Vercel, environment variables)
- Dependency updates (npm, security patches)
- Security policy or access control changes
- Documentation and runbook updates

---

## 2. Change Classification

### 2.1 Change Types

| Type | Risk | Approval | Testing | Deployment | Rollback |
|------|------|----------|---------|-----------|----------|
| **Code** | High | 1 tech lead | Unit + integration | CI → preview → prod | Revert commit |
| **Migration** | Critical | VP Eng + DB owner | Dry-run + restore test | Manual apply + backup | Point-in-time restore |
| **Config** | Medium | Tech lead | Manual verification | Direct via Vercel | Revert in console |
| **Dependency** | Medium | Tech lead | Full build + test suite | CI gated merge | npm revert + rebuild |
| **Security** | Critical | CISO + VP Eng | Penetration test | Manual + notification | Incident response |
| **Docs** | Low | Single review | Markdown validation | Push to main | Revert commit |

### 2.2 Risk Assessment

Classify change by answering:

1. **Does it touch production data?**
   - YES → Minimum P2 (High risk)
   - NO → Consider other factors

2. **Does it affect customer-facing functionality?**
   - YES → Minimum P2 (High risk)
   - NO → Could be P3/P4

3. **Does it involve security/authentication?**
   - YES → Minimum P2 (High risk)
   - NO → Could be P3/P4

4. **Can it be rolled back easily?**
   - NO → Higher risk, more testing needed
   - YES → Lower risk, faster approval

5. **Is it a dependency update?**
   - YES → Run full test suite + npm audit
   - NO → Consider other factors

**Risk score = (data impact × 3) + (functionality impact × 2) + (security impact × 3) + (rollback difficulty × 2)**

- Score > 10 = Critical (Approval required from CISO)
- Score 6-10 = High (Approval from VP Eng)
- Score < 6 = Medium/Low (Tech lead approval)

---

## 3. Change Request Workflow

### 3.1 Change Request Form

Every change starts with a written request.

**Template:**

```markdown
# Change Request: [Title]

**ID:** CHG-20260716-001
**Type:** Code | Migration | Config | Dependency | Security | Docs
**Risk Level:** Critical | High | Medium | Low

## Description
[What is changing and why?]

## Business Justification
[Why is this change needed? What problem does it solve?]

## Affected Systems
- [ ] Frontend (Next.js)
- [ ] API Routes
- [ ] Database
- [ ] Infrastructure (Vercel)
- [ ] Third-party integrations

## Implementation Details
- **Commits/PRs:** [List git hashes or PR links]
- **Database changes:** [List migrations]
- **Environment variables:** [List new/changed vars]
- **Dependencies:** [List added/updated packages]

## Testing Performed
- [x] Unit tests (npm run test:unit)
- [x] Integration tests (npm run test:integration)
- [x] Typecheck (npm run typecheck)
- [x] Build test (npm run build)
- [ ] Manual testing (describe)
- [ ] Staging environment (describe)
- [ ] Performance test (describe)

## Testing Results
- All automated tests: PASSED
- Manual testing: [Describe results]
- Performance impact: [Negligible | Minor | Moderate | High]

## Rollback Plan
[How will we revert if things go wrong?]

## Approval
**Requested by:** [Name]
**Requested date:** 2026-07-16
**Risk assessed by:** [Security/Tech lead]
**Approved by:** [VP Eng or CISO]
**Approved date:** 2026-07-16

## Deployment
**Deployment window:** 2026-07-16, 14:00-15:00 UTC
**Expected duration:** 15 minutes
**Monitoring:** [What will we watch?]
**Success criteria:** [How do we know it worked?]
```

### 3.2 Change Request Lifecycle

```
Request Created
    ↓
Triage (Risk Assessment)
    ↓
Approval Gate (Based on risk level)
    ↓
Testing/QA Sign-off
    ↓
Deployment Scheduling
    ↓
Pre-deployment Checklist
    ↓
Deployment Execution
    ↓
Post-deployment Verification
    ↓
Monitoring (24h-7d)
    ↓
Closure & Documentation
```

---

## 4. Testing Requirements

### 4.1 Automated Testing

**All code changes require:**

```bash
npm run typecheck              # TypeScript compilation
npm run test:unit             # Unit tests (vitest)
npm run test:integration      # Integration tests
npm run build                 # Next.js build
npm audit --audit-level=high  # Dependency security
```

**Success criteria:**
- TypeScript: 0 errors
- Unit tests: ≥90% pass rate
- Integration tests: 100% pass rate
- Build: Completes without warnings
- Audit: 0 high/critical vulnerabilities

**CI/CD enforcement:**
```yaml
# .github/workflows/ci.yml
- name: TypeCheck & Lint
  run: npm run typecheck
  if: failure()
    run: echo "::error::TypeScript check failed"

- name: Unit Tests
  run: npm run test:unit
  if: failure()
    run: echo "::error::Unit tests failed"

- name: Build
  run: npm run build
  if: failure()
    run: echo "::error::Build failed; will not deploy"
```

### 4.2 Migration Testing

**Database migrations require dry-run + restore verification.**

```bash
# Step 1: Create branch of production DB
supabase db pull --branch=test-migration-20260716

# Step 2: Apply migration in dry-run mode
supabase migration up --dry-run

# Step 3: Run SQL queries to verify schema
SELECT * FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = '<new_table>';

# Step 4: Restore from backup to confirm point-in-time recovery works
supabase db restore --backup-id=<backup_id>

# Step 5: Check data integrity
SELECT COUNT(*) FROM <critical_table>;
```

**Success criteria:**
- Dry-run completes without errors
- Schema objects exist as expected
- Restore from backup succeeds
- Data counts match pre-migration

### 4.3 Manual Testing

**For significant features, require manual QA:**

```
Test Cases:
☐ Positive path (happy path — feature works)
☐ Negative path (error handling — rejects invalid input)
☐ Edge cases (boundary conditions — large numbers, empty, null)
☐ Regression (existing features still work)
☐ Performance (no significant slowdown)
☐ Security (no credential exposure, proper validation)

QA Sign-off:
Tester: [Name]
Date: 2026-07-16
Results: [PASS | FAIL]
```

### 4.4 Staging Environment Testing

**For high-risk changes, deploy to staging first:**

```
Staging URL: https://staging.dsg.pics

1. Deploy to staging (automated via git branch)
2. Run full test suite against staging
3. Execute manual QA tests
4. Load test (simulate expected traffic)
5. Security scan (OWASP top 10)
6. Check logs for errors
7. Verify all integrations work
8. Get sign-off from QA lead
9. Schedule production deployment
```

---

## 5. Approval Workflow

### 5.1 Approval By Risk Level

**Critical Risk (Score > 10):**
```
Change Request
    ↓
CISO Review (Security implications)
    ↓
VP Engineering Review (Technical feasibility)
    ↓
CEO Review (Business impact)
    ↓
Approved (All 3 sign off)
```

**High Risk (Score 6-10):**
```
Change Request
    ↓
VP Engineering Review
    ↓
Tech Lead Review (Implementation quality)
    ↓
Approved (Both sign off)
```

**Medium/Low Risk (Score < 6):**
```
Change Request
    ↓
Tech Lead Review
    ↓
Approved (Single sign-off)
```

### 5.2 Approval Criteria

**Checklist before approval:**

```
Security Review:
☐ No secrets in code
☐ No SQL injection vulnerabilities
☐ No XSS or CSRF issues
☐ Authentication/authorization correct
☐ Rate limiting working
☐ Data encryption in transit/at rest

Technical Review:
☐ Code follows patterns
☐ Tests are comprehensive
☐ Build passes cleanly
☐ No major performance regressions
☐ Rollback plan is clear
☐ Dependencies are up-to-date

Operational Review:
☐ Change documented
☐ Monitoring in place
☐ Deployment window scheduled
☐ Stakeholders notified
☐ Runbook updated
☐ On-call briefed
```

**Approval comment template:**

```
✅ APPROVED

Risk: High
Approver: VP Engineering
Date: 2026-07-16

Security: Looks good, no credential exposure detected
Technical: Implementation is solid, tests comprehensive
Operational: Ready for production deployment

Approved for deployment in next available window.
Notify #devops when ready to proceed.
```

---

## 6. Deployment Procedures

### 6.1 Deployment Windows

**Code/Config changes:** Any time (continuous deployment via GitHub)

**Database migrations:** Scheduled maintenance windows only
```
Monday-Thursday: 14:00-15:30 UTC (0 customer impact)
Friday: No deployments (reduced team on-call)
Saturday-Sunday: Emergency only
Public holidays: No deployments
```

### 6.2 Pre-Deployment Checklist

**Before hitting "Deploy":**

```
1 hour before:
☐ Notify #devops slack channel
☐ Alert on-call engineer
☐ Verify stakeholders are available for questions

30 minutes before:
☐ Create incident ticket (CHG-20260716-001)
☐ Confirm all tests are passing
☐ Backup database (automated, verify completion)
☐ Have rollback command ready in terminal

5 minutes before:
☐ Review deployment plan one more time
☐ Ensure monitoring is active
☐ Have status page update ready

Deployment:
☐ Record start time
☐ Deploy code/migration
☐ Monitor error rate (should stay < 0.5%)
☐ Check application logs for errors
☐ Verify critical endpoints responding

Post-deployment:
☐ Record end time
☐ Run smoke tests
☐ Update status page
☐ Notify stakeholders
☐ Monitor for 30 minutes
```

### 6.3 Code Deployment (CI/CD)

**Process:**

```
1. Create PR with change
2. Automated tests run (CI pipeline)
   ├─ Lint + format
   ├─ TypeScript check
   ├─ Unit tests
   ├─ Integration tests
   ├─ Build test
   └─ Security scan (CodeQL, Gitleaks)

3. Manual code review (1+ approver)
   ├─ Implementation quality
   ├─ Security implications
   └─ Test coverage

4. Approval (tech lead sign-off)

5. Merge to main (auto-triggers deployment)

6. Vercel builds and deploys
   ├─ Build stage (~5 minutes)
   ├─ Generate preview URL
   ├─ Deploy to staging
   ├─ Deploy to production
   └─ Run edge function tests

7. Monitor for errors (30+ minutes)
   ├─ Vercel analytics
   ├─ Sentry error tracking
   ├─ Application logs
   └─ Uptime monitoring
```

**Success criteria:**
- Deployment status: ✅ Ready
- Error rate: < 0.5%
- No critical errors in logs
- All API endpoints responding
- Database connections healthy

### 6.4 Database Migration Deployment

**Manual process for schema changes:**

```bash
# Step 1: Prepare (in staging env)
supabase migration list
supabase migration up --dry-run

# Step 2: Notify
slack notify "#devops" "Deploying migration CHG-20260716-001"

# Step 3: Backup production
supabase db backup create --project-ref=prod

# Step 4: Apply to production
supabase migration up --project-ref=prod

# Step 5: Verify
psql -U postgres -d postgres -c "SELECT * FROM pg_tables WHERE schemaname='public';"

# Step 6: Monitor
tail -f logs/supabase_query.log | grep ERROR

# Step 7: Confirm
echo "Migration deployed successfully"
```

### 6.5 Configuration Changes

**Environment variables via Vercel:**

```
1. Document change in change request
2. Approval from tech lead
3. Access Vercel dashboard
4. Project → Settings → Environment Variables
5. Add/update variable
6. Vercel auto-triggers rebuild
7. Monitor preview → production promotion
8. Verify in running application (console.log or /api/health)
```

---

## 7. Rollback Procedures

### 7.1 Rollback Triggers

**Immediate rollback required if:**
- Error rate > 5% (from <1% baseline)
- API response time > 10 seconds (from <500ms)
- Database connection pool exhausted
- Customer reports data loss or corruption
- Security incident detected
- Critical audit log error

### 7.2 Rollback for Code

**If deployment introduced bugs:**

```bash
# Option 1: Revert single commit
git revert <commit-hash>
git push origin main
# Vercel auto-deploys new commit (fast)

# Option 2: Revert entire PR
git revert -m 1 <merge-commit-hash>
git push origin main

# Option 3: Reset to previous commit
git reset --hard <previous-commit>
git push -f origin main
# (Use only for hotfix, not typical flow)

# Verify
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
# Should show previous commit hash
```

**Timeline:**
- Detection: < 5 minutes (automated alerts)
- Rollback execution: < 2 minutes
- Deployment confirmation: < 3 minutes
- **Total: < 10 minutes**

### 7.3 Rollback for Database

**If migration corrupts data:**

```bash
# Option 1: Rollback migration
supabase migration down --project-ref=prod

# Verify rollback applied
psql -U postgres -d postgres -c "SELECT version();"

# Option 2: Restore from backup (if migration can't be reversed)
supabase db restore --project-ref=prod --backup-id=<backup_id>

# Restore takes 5-30 minutes depending on DB size

# Verify data integrity post-restore
SELECT COUNT(*) FROM runtime_executions;
SELECT MAX(created_at) FROM runtime_executions;
```

**Rollback criteria:**
- Data loss > 10 rows
- Corrupt data detected in critical tables
- Migration irreversible (can't rollback)

### 7.4 Rollback for Configuration

**If environment variable change breaks application:**

```
1. Vercel dashboard → Project → Environment Variables
2. Revert to previous value
3. Trigger rebuild (Vercel auto-detects change)
4. Verify application responds
5. Monitor for 15 minutes
```

**Timeline:**
- Change applied: < 1 minute
- Rebuild: 2-5 minutes
- Verification: < 2 minutes
- **Total: < 10 minutes**

---

## 8. Change Tracking & Audit

### 8.1 Change Log

**Maintained in:** `docs/CHANGELOG.md`

```markdown
## [Unreleased]

### Added
- MCP integration guides for PostHog, Supabase, Vercel, AWS
- SOC 2 audit documentation (Data Security, Access Control, Incident Response)
- API key rotation policy enforcement

### Changed
- Updated pricing tiers UI to match system configuration (Pro, Business, Enterprise)
- Improved error handling in runtime spine routes

### Fixed
- TypeScript type annotations for pricing page (fixes build failures)
- Fixed unused imports in complete-page.tsx

### Deprecated
- Legacy Developer/Professional tiers (replaced with Pro/Business/Enterprise)

### Security
- Added pre-commit secret scanning
- Implemented rate limiting on auth endpoints
- Enhanced RLS policies for runtime_executions table

## [1.0.0] - 2026-07-16
### Added
- Initial DSG ONE / ProofGate Control Plane release
- AI runtime governance engine
- Deterministic policy evaluation
- Audit trail and compliance evidence
```

### 8.2 Git Commit Conventions

**Every commit message includes:**

```
<type>(<scope>): <subject>

<body>

<footer>

---

Examples:

feat(pricing): align UI tiers with system configuration (Pro/Business/Enterprise)

Fixes TypeScript strictness issues by:
- Adding explicit PricingTier type annotation
- Adding FeatureItem and FeatureCategory types
- Removing unused Link import

Resolves issue #933. Closes PR #933.

---

fix(auth): revoke expired API keys in cron job

Automatically revoke API keys older than 90 days
to enforce key rotation policy per Access Control Policy.

Adds scheduled cron job: `/api/cron/revoke-expired-keys`

---

docs(soc2): add Incident Response Plan

Comprehensive incident response procedures covering:
- P1-P4 severity classification
- Detection and alerting
- Investigation and containment steps
- GDPR/CCPA notification requirements
```

**Commit type prefixes:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting, missing semicolons)
- `refactor:` Code refactoring (no feature/bug change)
- `perf:` Performance improvement
- `test:` Adding or updating tests
- `chore:` Build, dependency, config changes
- `security:` Security-related changes
- `ci:` CI/CD configuration changes

### 8.3 Change Audit Trail

**All changes tracked in:**
1. **Git commits** — source of truth for code
2. **GitHub PRs** — review history + approvals
3. **Vercel deployments** — which commit deployed when
4. **Supabase audit** — database schema evolution
5. **audit_log table** — application-level access changes
6. **Change ticket system** — structured change tracking

**Query change history:**

```bash
# Recent code changes
git log --oneline -20

# Who deployed what and when
vercel ls --project=dsg-control-plane | head -20

# Database schema changes
supabase migration list

# Configuration changes
# (Stored in Vercel Environment Variables dashboard)
```

---

## 9. Communication & Notification

### 9.1 Change Announcement

**Before deployment:**

```
Slack: #devops
"🚀 Deploying CHG-20260716-001: Pricing page fixes
 - Update UI tiers (Pro/Business/Enterprise)
 - Fix TypeScript errors blocking build
 - Merge PR #933
 ETA: 14:30 UTC, ~5 minutes downtime"
```

**During deployment:**

```
Slack: #devops
"⏳ Deployment in progress (started 14:30 UTC)
 [████░░░░░░] 40% complete
 Vercel build stage: ✅ complete
 Production deployment: in progress..."
```

**After deployment:**

```
Slack: #devops
"✅ Deployment complete (finished 14:35 UTC, 5 min duration)
 Commit: 32737cf
 Error rate: 0.1% (baseline <1%)
 Monitoring: Active for next 30 minutes"
```

### 9.2 Stakeholder Notification

**Status page update (if customer-facing):**

```
🔧 Maintenance Complete

We successfully deployed improvements to our pricing page
and fixed TypeScript compilation issues. No customer
data was affected. Service was unavailable for 5 minutes
while Vercel redeployed. Thank you for your patience.

Deployment completed: 2026-07-16 at 14:35 UTC
```

**Customer email (if high-impact change):**

```
Subject: Upcoming Maintenance: 2026-07-16 14:30-15:00 UTC

Dear Valued Customers,

We will be performing scheduled maintenance on 2026-07-16
at 14:30 UTC. Expected duration: 15 minutes.

During this time:
- API requests may be slow or fail
- Dashboard may be unavailable
- No data will be lost

We appreciate your patience and will complete this
as quickly as possible.

DSG Operations Team
```

---

## 10. Compliance & Review

### 10.1 Change Audit

**Monthly:**
- Review all deployed changes
- Verify audit trail is complete
- Confirm all approvals were documented
- Check for unauthorized changes

**Quarterly:**
- Effectiveness review (Are reviews catching bugs?)
- Rollback frequency (How many rollbacks needed?)
- Deployment success rate (What % of deployments succeeded?)
- Process improvements

### 10.2 Policy Compliance

**Verified:**
- ☑ All production changes reviewed before merge
- ☑ All changes tested (unit + integration)
- ☑ All database migrations have restore test
- ☑ All deployments logged with commit hash + timestamp
- ☑ Rollback procedures documented and tested
- ☑ Stakeholders notified before/after changes

### 10.3 Violations

**Unauthorized production change detected:**
1. Immediately rollback
2. Alert security + VP Engineering
3. Audit who made change and why
4. Lock down deployment access if needed
5. Implement additional controls

---

## 11. Contact & Questions

**Change Manager:** devops@dsg.pics  
**Deployment Support:** #devops on Slack  
**Emergency Hotline:** [on-call contact from PagerDuty]  

**Last Reviewed:** July 16, 2026  
**Next Review:** January 16, 2027  
**Approved By:** Engineering & Security Leadership
