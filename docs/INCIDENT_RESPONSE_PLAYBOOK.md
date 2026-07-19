# Incident Response Playbook

**DSG ONE / ProofGate Control Plane**

Procedures for detecting, investigating, and responding to security incidents.

---

## Detection Procedures

### Alert Channels

1. **Sentry** (Real-time)
   - Subscribe to alerts via email and Slack
   - Watch for: authentication failures, deployment errors, unhandled exceptions
   - Threshold: >5 failed login attempts per user in 10 minutes

2. **PostHog** (Real-time)
   - Anomaly detection on user cohorts
   - Unusual access patterns (off-hours, geographic anomalies)
   - Feature flag rollout issues

3. **Audit Trail** (Manual Review)
   - Daily audit log analysis for suspicious patterns
   - Permission escalations without authorization
   - Bulk deletions or data exports
   - Failed API calls with repeated errors

4. **Health Checks** (Automated)
   - `/api/health` and `/api/readiness` probes return degraded status
   - Vercel deployment dashboard shows build failures
   - Supabase monitoring alerts on slow queries or connection exhaustion

### Suspicious Activity Indicators

- ✋ **Red flags:**
  - Multiple failed login attempts for the same user
  - Permission assignment to unknown roles
  - Unusual API key usage (different IP, time of day, endpoint patterns)
  - SQL injection attempts in filter parameters
  - Mass deletion of audit logs or user records
  - Session tokens exposed in error logs

---

## Investigation Procedures

### Step 1: Immediate Assessment (< 5 minutes)

1. **Confirm the incident**
   ```bash
   # Check system status
   curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness
   
   # Check Sentry dashboard for recent errors
   # Check Vercel deployment status
   ```

2. **Determine severity**
   - 🔴 **CRITICAL:** Data breach, all services down, attacker detected
   - 🟠 **HIGH:** Partial service degradation, unauthorized access attempt
   - 🟡 **MEDIUM:** Single user affected, failed API call, configuration issue
   - 🟢 **LOW:** Informational, no customer impact

3. **Notify stakeholders** (if severity ≥ HIGH)
   - Slack #incident channel
   - On-call engineer
   - Product owner
   - Compliance officer (if data involved)

### Step 2: Evidence Collection (5-30 minutes)

1. **Gather audit logs**
   ```bash
   # Query audit logs around incident time
   curl -X GET "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/audit-trail?range=7d&format=json" \
     -H "Authorization: Bearer $ADMIN_API_KEY" | jq '.records[] | select(.timestamp > "2026-07-19T14:00:00Z")'
   
   # Export for analysis
   curl -X GET "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/audit-trail?range=7d&format=csv" \
     -H "Authorization: Bearer $ADMIN_API_KEY" > incident_audit.csv
   ```

2. **Trace correlation IDs**
   - Identify affected user(s) by email
   - Find correlation_id from first suspicious event
   - Query audit logs filtering on correlation_id to see full request chain
   ```sql
   SELECT * FROM audit_logs 
   WHERE correlation_id = 'trace-id-here'
   ORDER BY created_at ASC;
   ```

3. **Check session history**
   ```sql
   SELECT * FROM user_sessions 
   WHERE user_id = 'affected-user-id'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

4. **Review Sentry for errors**
   - Click timestamp of first alert
   - Check breadcrumbs leading up to error
   - Note any personally identifiable information (PII) in error context

5. **Capture screenshots**
   - Vercel deployment history (to identify suspect commit)
   - Sentry error details
   - PostHog user session recording (if available)

### Step 3: Containment (30+ minutes — in parallel)

#### For Unauthorized Access

1. **Revoke affected user's sessions** (immediate)
   ```bash
   curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/users/{userId}/revoke-sessions" \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Suspected unauthorized access - incident #123"}'
   ```

2. **Rotate API keys** (immediate)
   - Revoke all API keys for affected org/agent
   - Issue new keys to authorized service accounts
   - Update CI/CD secrets, deployment configs

3. **Disable SSO integration** (if IdP compromise suspected)
   ```bash
   curl -X PATCH "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/sso/config" \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'
   ```

4. **Block IP address** (if brute force detected)
   - Contact Vercel support to add WAF rule
   - Temporarily block IP via Vercel deployment settings

#### For Malicious Code

1. **Identify suspect commit**
   ```bash
   git log --oneline | head -5
   git show <commit-sha>  # Review changes
   ```

2. **Roll back deployment** (immediate)
   ```bash
   vercel rollback --confirm
   # This reverts to previous build
   ```

3. **Review commit in GitHub**
   - Check PR review comments
   - Verify committer identity
   - Check if signed with GPG

4. **Audit branch history**
   ```bash
   git log --graph --oneline --all | head -20
   git reflog  # See any force pushes
   ```

#### For Data Breach

1. **Snapshot affected data** (for forensics)
   - Export user profiles, API keys, sessions
   - Store encrypted in separate backup location
   - Do NOT email or post to Slack

2. **Notify affected parties**
   - Draft breach notification email per GDPR Article 34
   - Include: what was exposed, when discovered, mitigation steps, next steps
   - Approval from legal before sending

3. **Request database backup**
   ```bash
   # Via Supabase dashboard → Backups
   # Or via CLI:
   supabase db pull --file backup-$(date +%s).sql
   ```

---

## Investigation Results

### Document Findings

Create incident report with:

- **Timeline:** First detection → final containment (with timestamps)
- **Root cause:** What happened and why
- **Affected users/data:** Scope of exposure
- **Evidence:** Audit log exports, correlation IDs, Sentry traces
- **Remediation:** Actions taken to contain and recover
- **Prevention:** Changes to prevent recurrence

**Example incident report:**
```markdown
## Incident #123: Unauthorized Admin Access

**Discovery:** 2026-07-19 14:30 UTC (Sentry alert)
**Detection:** Multiple failed login attempts (user: attacker@example.com)
**Containment:** 14:45 UTC (sessions revoked, IP blocked)
**Root Cause:** Weak password policy + no MFA required for admins

**Timeline:**
- 14:15 UTC: First failed login attempt (10.20.30.40)
- 14:16 UTC: Sentry alert triggered (>5 failures)
- 14:30 UTC: Engineer notified via Slack
- 14:31 UTC: Confirmed unauthorized access attempt
- 14:45 UTC: User sessions revoked, IP blocked

**Affected:** 0 users (attack blocked before access gained)

**Evidence:**
- Sentry trace: [link]
- Audit log export: incident_audit.csv
- Correlation ID: trace-2026-07-19-14-30-xyz

**Remediation:**
1. Revoked all sessions for attacker user
2. Added IP 10.20.30.40 to WAF blocklist
3. Required MFA for admin role

**Prevention:**
1. Enforce strong password policy (12+ chars, special chars)
2. Require MFA for admin and operator roles
3. Rate-limit login attempts to 5 per 10min per user
4. Alert on multiple failed login attempts
```

---

## Communication Plan

### Immediate Notification (within 15 minutes)

- [ ] Slack #incident channel (status + severity)
- [ ] On-call engineer (phone call if CRITICAL)
- [ ] Engineering lead
- [ ] CTO/Security lead

### Status Updates (every 30 minutes during incident)

- [ ] Slack thread with containment actions taken
- [ ] ETA for resolution
- [ ] Customer impact assessment

### Post-Incident Notification (after containment)

**For non-data-breach incidents:**
- Email update to affected users (if applicable)
- Public status page update
- Internal retrospective scheduled

**For data breaches:**
- Legal review of notification (GDPR Article 34)
- Regulatory notification if required
- Credit monitoring offer (if PII exposed)
- Detailed notification 72 hours after discovery

### External Communications

- [ ] Status page update: "We detected and contained unauthorized access. Customer data was not accessed. No action required."
- [ ] Blog post (post-incident): "Incident Report: Unauthorized Access Attempt - What We Learned"
- [ ] Regulatory filing (if required by law)

---

## Recovery Procedures

### Database Recovery

**If data was compromised/deleted:**

1. Identify backup point (PITR)
   ```bash
   # Via Supabase dashboard → Backups
   # Select recovery point before incident
   ```

2. Initiate restore (via Supabase dashboard)
   - Specify target time
   - Confirm data loss timeline
   - Execute restore

3. Verify integrity
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM audit_logs;
   -- Compare with pre-incident counts
   ```

### Application Recovery

**If code was modified:**

1. Deploy clean version
   ```bash
   vercel rollback --confirm
   ```

2. Verify deployment
   ```bash
   curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   ```

3. Monitor for errors
   - Check Sentry for new errors
   - Monitor Vercel logs
   - Verify API calls succeed

---

## Post-Incident Activities

### Retrospective (within 48 hours)

Schedule meeting with:
- On-call engineer who responded
- Security/infrastructure lead
- Product/platform owner

**Agenda:**
1. What happened and why?
2. What worked well in our response?
3. What could be improved?
4. What do we change to prevent recurrence?

### Action Items

Create GitHub issues for:
1. **Detection:** Add monitoring to catch earlier
2. **Response:** Improve playbook, reduce MTTR
3. **Prevention:** Fix root cause (e.g., MFA, rate limiting)

### Training

- [ ] Document incident (redact PII)
- [ ] Share with team as learning example
- [ ] Update incident response playbook with lessons learned

---

## Escalation Matrix

| Severity | Response Time | Notify | Approval |
|----------|---------------|--------|----------|
| **CRITICAL** | < 5 min | On-call + CTO | CTO can authorize emergency measures |
| **HIGH** | < 30 min | Engineering lead + Security | Security lead approval for containment |
| **MEDIUM** | < 4 hours | Team lead | Team lead can authorize fix |
| **LOW** | < 1 day | Team lead | Team lead prioritizes in backlog |

---

## Tools & Access

**Required for incident response:**

- [ ] Supabase admin credentials (read-only, if possible)
- [ ] Vercel project access (deployment/logs)
- [ ] Sentry admin dashboard
- [ ] GitHub admin access (review commits)
- [ ] Slack incident channel
- [ ] Email account with API key authority (for password resets)

**Backup contacts:**
- CTO: [contact]
- Security Lead: [contact]
- On-call: [escalation number]

---

## Testing & Updates

### Quarterly Drills

- [ ] Simulate breach detection
- [ ] Test session revocation
- [ ] Practice audit log analysis
- [ ] Verify backup restore works

### Annual Review

- [ ] Update escalation contacts
- [ ] Refresh team training
- [ ] Incorporate lessons from actual incidents
- [ ] Test new detection methods

---

**Last Updated:** 2026-07-19  
**Next Review:** 2027-01-19
