# Incident Response Plan
## DSG ONE / ProofGate Control Plane

**Effective Date:** July 16, 2026  
**Last Updated:** July 16, 2026  
**Classification:** INTERNAL - SOC 2 Type I

---

## 1. Overview

This Incident Response Plan establishes procedures for detecting, investigating, containing, and remediating security incidents affecting DSG ONE infrastructure, data, or operations. The plan defines roles, escalation paths, and recovery procedures to minimize impact and ensure regulatory compliance.

**Scope:**
- Data breaches (unauthorized access, exfiltration)
- Availability incidents (DDoS, outages >15 minutes)
- Integrity incidents (unauthorized modification, corruption)
- Confidentiality incidents (secret exposure, credential compromise)
- Compliance incidents (policy violation, audit failure)
- Third-party incidents (Stripe breach, Supabase compromise, Vercel attack)

---

## 2. Incident Classification

### 2.1 Severity Levels

| Level | Impact | Examples | Response Time | Escalation |
|-------|--------|----------|---|---|
| **P1 - Critical** | Production down, data at risk | Service outage >1h, DB compromise, customer data accessed | <15 minutes | CEO + CISO |
| **P2 - High** | Significant impact, active threat | Unauthorized access detected, API key exposed, 1 customer affected | <1 hour | CISO + VP Eng |
| **P3 - Medium** | Limited impact, no immediate threat | Failed login attempts (5+), policy violation, slow performance | <4 hours | Security team |
| **P4 - Low** | Minimal impact, informational | Single failed login, configuration drift, non-critical log error | <24 hours | Security team |

### 2.2 Classification Criteria

Assign severity by evaluating:

1. **Scope of Impact**
   - Critical: All users, all systems, customer data
   - High: Specific user/service, partial data
   - Medium: Limited users, internal data
   - Low: Single user, no data exposure

2. **Data Sensitivity**
   - Restricted/Confidential data involved → raise one level
   - Public data only → lower by one level

3. **Time to Recovery**
   - < 5 minutes → P4
   - 5-60 minutes → P3
   - 1-4 hours → P2
   - > 4 hours → P1

4. **Regulatory Impact**
   - GDPR/CCPA breach → minimum P2
   - SOC 2 control failure → minimum P2
   - No breach/regulatory → as-classified

---

## 3. Incident Detection

### 3.1 Detection Sources

**Automated alerts:**
```
- Vercel deployment failures (CI check failures)
- Supabase connection errors (connection pool exhausted)
- Auth failures (>5 failed logins in 1h per account)
- Rate limit triggers (>100 requests/min per key)
- CloudFlare WAF blocks (XSS, SQL injection patterns)
- Gitleaks scan (secrets in commit)
- CodeQL scan (code vulnerability)
```

**Manual monitoring:**
```
- Daily log review (security team)
- Weekly Vercel/Supabase health check
- Monthly audit log review
- Quarterly penetration testing results
```

**User reports:**
```
- support@dsg.pics (general)
- security@dsg.pics (security-specific)
```

### 3.2 Detection and Alert Process

```
Detection
  ↓
Initial Assessment (Severity?)
  ↓
P1/P2: Page on-call → Incident War Room
P3/P4: Email to security@dsg.pics
  ↓
Log ticket in incident_tracker
  ↓
Begin response timeline
```

### 3.3 Automated Alert Rules

**Supabase alerts:**

```sql
-- Trigger: Connection errors
SELECT COUNT(*) FROM pg_logs
WHERE level = 'ERROR' AND timestamp > NOW() - INTERVAL '5 minutes'
  AND message LIKE '%connection%';
-- Alert if count > 10

-- Trigger: Slow queries
SELECT COUNT(*) FROM pg_logs
WHERE level = 'LOG' AND duration_ms > 5000
  AND timestamp > NOW() - INTERVAL '10 minutes';
-- Alert if count > 5
```

**Vercel build alerts:**
- Deployment status = `ERROR` → Page on-call
- Build time > 10 minutes → Notify team
- Environment variable missing → Block deployment

**Auth alerts:**
```javascript
// app/api/middleware/auth-monitor.ts
if (failedAttempts > 5 && timeWindow < 3600) {
  slack.notify({
    channel: '#security-alerts',
    message: `⚠️ ${actor_id}: 5+ failed logins in past hour`,
    severity: 'high',
  });
}
```

---

## 4. Incident Response Timeline

### 4.1 T+0 Minutes: Detection & Initial Triage

**Actions (first 15 minutes):**

1. **Receive report** or detect automated alert
2. **Assess severity** using classification criteria (section 2.1)
3. **Page on-call** (P1/P2) or notify team (P3/P4)
4. **Create incident ticket** with:
   - Incident ID (INC-YYYYMMDD-001)
   - Title and summary
   - Severity and scope
   - Detection timestamp
   - Initial responder name

5. **Preserve evidence:**
   - Snapshot logs (save to S3 or secure storage)
   - Take database backup (if not auto-running)
   - Screenshot error messages
   - Record timeline of events

**Example incident ticket:**

```
INC-20260716-001: Unauthorized API Key Access

Severity: P2 - High
Scope: 1 customer affected (100 executions accessed)
Detected: 2026-07-16 14:32:45 UTC
Responder: security-team@dsg.pics
Status: Triage in progress

Summary:
  API key leaked in GitHub commit. 47 API calls made with key
  between T-30 minutes and detection. Accessing runtime_executions
  table for customer-123.

Initial Actions:
  [ ] Revoke compromised key
  [ ] Query what data was accessed
  [ ] Notify affected customer
  [ ] Review for exfiltration
```

### 4.2 T+1 Hour: Investigation & Containment

**Actions (hour 1):**

1. **Investigate scope:**
   - Query audit_log for all actions by compromised key
   - Verify no data exfiltration (download >100KB?)
   - Check if key is still active (revoke immediately if yes)
   - Determine access window (start time to detection)

2. **Containment:**
   - Revoke API key: `UPDATE dsg_mcp_api_keys SET status = 'REVOKED'`
   - If credential exposed: Rotate in infrastructure (env vars, Stripe key)
   - If data access: Prepare customer notification

3. **Root cause hypothesis:**
   - Was key committed to GitHub?
   - Was key logged in error messages?
   - Was key exposed via third-party?
   - Was key weak/guessable?

4. **Notify stakeholders:**
   - **P1/P2:** CEO, VP Eng, VP Security (phone call)
   - **P3:** Security team (email)
   - **P4:** Logging only (ticket comment)

**Example containment query:**

```sql
-- What did the leaked key access?
SELECT action, resource_type, resource_id, result, timestamp
FROM audit_log
WHERE api_key_prefix = 'mcp_abc123'
  AND timestamp BETWEEN '2026-07-16 14:00:00' AND '2026-07-16 14:32:45'
ORDER BY timestamp DESC;

-- Did it download data?
SELECT COUNT(*) as access_count, SUM(rows_accessed) as total_rows
FROM audit_log
WHERE api_key_prefix = 'mcp_abc123'
  AND action IN ('SELECT', 'EXPORT', 'DOWNLOAD');
```

### 4.3 T+4 Hours: Root Cause Analysis (RCA)

**Actions (hours 1-4):**

1. **Determine root cause:**
   - Git commit hash + time
   - How long was key exposed (commit time to revocation)
   - Was key in `git log` history?
   - Was key in backup?
   - Was key indexed by search engines?

2. **Assess damage:**
   - Data accessed: Customer IDs, execution data, audit logs
   - Data modified: Any unauthorized changes?
   - Service availability: Was availability impacted?
   - Trust: Customer data confidentiality compromised?

3. **Verify fix:**
   - Key revoked and no longer active
   - If code-based: Commit rewriting history (via git-filter-repo)
   - If infrastructure: Verify new secrets in use
   - Monitoring: Set up alerts to prevent recurrence

4. **Update incident ticket:**

```
RCA Complete (T+3h):

Root Cause:
  Developer accidentally committed API key to GitHub in config file.
  Key was exposed for 47 minutes before Gitleaks scan detected it.

Scope of Impact:
  - 1 compromised API key (mcp_abc123)
  - 1 customer's data (runtime_executions for customer-123)
  - 47 API calls made (SELECT only, no data modification)
  - ~500 rows of execution data potentially accessed

Containment:
  [x] Key revoked
  [x] Git history rewritten (commit removed)
  [x] No data exfiltration detected

Fix Applied:
  [x] Added .gitignore rule for *.keys
  [x] Enabled pre-commit hook to catch secrets
  [x] Notified customer
```

### 4.4 T+24 Hours: Recovery & Communication

**Actions (hours 4-24):**

1. **Notify affected parties:**
   - **Customer:** Email + phone call within 4 hours if breach
   - **Regulators:** (if GDPR/CCPA applicable) file report
   - **Status page:** Update incident status
   - **Team:** Post-incident call scheduled

2. **Recovery verification:**
   - Confirm system fully operational
   - Verify no residual access remaining
   - Confirm customers can operate normally
   - Verify monitoring/alerts are active

3. **Preventive measures:**
   - Pre-commit hook installed (prevent secret commits)
   - Gitleaks scan added to CI (detect on push)
   - Rotation policy for API keys (max 90 days)
   - Alert rule for old keys (notify before expiry)

4. **Update incident status:**

```
RESOLVED (T+24h)

Resolution:
  API key revoked, git history cleaned, customer notified.
  No data exfiltration confirmed. Service fully operational.

Follow-up Actions:
  - [x] Pre-commit hook deployed
  - [x] Gitleaks scan integrated
  - [x] Customer contacted + apology
  - [ ] Post-incident review scheduled (T+7d)
  - [ ] Customer gets 1 month free service credit
```

### 4.5 T+7 Days: Post-Incident Review

**Actions (after 1 week):**

1. **Conduct blameless post-mortem:**
   - What happened? (timeline)
   - Why did it happen? (root cause)
   - What did we learn? (insights)
   - What will we change? (action items)

2. **Assign action items:**
   ```
   AI-001: Add pre-commit secrets scanning (Owner: VP Eng, Due: 2026-07-30)
   AI-002: Implement key rotation policy (Owner: Security, Due: 2026-07-23)
   AI-003: Improve onboarding security training (Owner: HR, Due: 2026-08-16)
   ```

3. **Review for systemic issues:**
   - Is this a class of problems? (other devs at risk?)
   - Are similar secrets exposed elsewhere?
   - Do we have visibility into all key creation?
   - What's our secret rotation SLA?

4. **Document lessons learned:**
   - Add to security runbook
   - Update engineering handbook
   - Include in training materials
   - Share across team

5. **Close incident ticket:**
   ```
   STATUS: CLOSED
   Resolution Date: 2026-07-23
   Action Items: 3 (all assigned)
   Customer Impact: $50K revenue saved (credit offered)
   Learning: Secret detection too slow; pre-commit prevents future
   ```

---

## 5. Specific Incident Types

### 5.1 Data Breach (Unauthorized Access)

**Scenario:** Customer data accessed without authorization

**Detection:**
- Gitleaks finds exposed key
- Suspicious IP in audit_log
- Customer reports unauthorized access

**Investigation:**
```sql
-- Find all unauthorized access
SELECT actor_id, COUNT(*) as access_count, MIN(timestamp) as first_access
FROM audit_log
WHERE api_key_prefix = '<compromised_key>'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY actor_id;

-- Determine data accessed
SELECT DISTINCT table_name, COUNT(*) as row_count
FROM audit_log
WHERE api_key_prefix = '<compromised_key>'
  AND action = 'SELECT'
GROUP BY table_name;
```

**Containment:**
1. Revoke key immediately
2. Check backup/archive for exfiltration
3. Notify affected customers within 4 hours
4. Provide 30-day credit + free upgrade

**Regulatory:**
- GDPR: Notify authorities within 72 hours if personal data accessed
- CCPA: Notify California residents if SSNs/financial data accessed

### 5.2 Service Outage (Availability)

**Scenario:** Service unavailable >15 minutes

**Detection:**
- Vercel deployment fails
- Supabase connection errors
- CloudFlare detects high error rate

**Timeline:**

```
T+0:  Error detected by monitoring
T+5:  On-call paged
T+10: Root cause identified (DB connection limit hit)
T+15: Mitigation started (scale DB connection pool)
T+30: Service restored
T+45: Communication sent to customers
T+1h: RCA meeting
```

**Recovery steps:**
1. Verify Vercel deployment status
2. Check Supabase health dashboard
3. Increase connection pool or restart service
4. Monitor error rate until baseline
5. Communicate recovery + ETA

### 5.3 Credential Compromise (Access Threat)

**Scenario:** Admin password leaked or key exposed

**Detection:**
- Multiple failed login attempts (>5 in 1h)
- Pre-commit hook detects key in code
- Employee reports phishing

**Immediate response:**
1. Reset compromised password (force logout all sessions)
2. Revoke compromised API keys
3. Check audit_log for unauthorized access
4. Enable MFA if not already enabled
5. Notify affected users

**Investigation:**
```sql
-- Find all access by potentially compromised account
SELECT * FROM audit_log
WHERE actor_id = '<compromised_user>'
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- Check for privilege escalation attempts
SELECT * FROM audit_log
WHERE actor_id = '<compromised_user>'
  AND action IN ('ADMIN_GRANT', 'ROLE_CHANGE', 'SECRET_READ')
  AND result = 'SUCCESS';
```

### 5.4 Third-Party Incident (Vendor Breach)

**Scenario:** Stripe, Supabase, or Vercel reports compromise

**Detection:**
- Vendor sends security notification
- Public disclosure of vendor vulnerability
- CVE affects our stack

**Response:**
1. **Immediate:** Assess if we're affected (version, features used)
2. **Within 1 hour:** Check for exploitation attempts in logs
3. **Within 4 hours:** Apply patches or workarounds
4. **Within 24 hours:** Verify fix effectiveness
5. **Post-incident:** Update incident log + communicate to customers

**Example: Supabase vulnerability**

```
T+0:   Supabase announces CVE in auth module (not affecting us)
T+10:  Review CVE details — affects only PostgreSQL <12 (we use v14)
T+15:  Confirm in logs — no suspicious auth patterns detected
T+20:  Post to status page: "Not affected by Supabase CVE-2026-XXXX"
T+30:  Monitor for 24h to catch any edge cases
T+24h: Close incident, update vendor risk assessment
```

---

## 6. Communication & Escalation

### 6.1 Escalation Matrix

| Severity | Immediate | Notify | Update Frequency |
|----------|-----------|--------|---|
| **P1** | Page on-call + CEO + CISO | VP Eng, customers | Every 30 min |
| **P2** | CISO + VP Eng + Security Lead | VP Product, VP Sales | Every 1 hour |
| **P3** | Security Lead + team | Logging, team Slack | Every 2 hours |
| **P4** | Security team | Team Slack channel | End of day |

### 6.2 Customer Notification Template

**For data breaches:**

```
Subject: Security Incident Notification — Incident #INC-20260716-001

Dear Valued Customer,

We are writing to inform you of a security incident affecting your account.

INCIDENT DETAILS:
- Date: 2026-07-16, 14:32 UTC
- Impact: Your execution logs may have been accessed
- Status: RESOLVED — our team has contained the incident

WHAT HAPPENED:
An API key was inadvertently exposed in our code repository. The key was
revoked within 47 minutes of detection. Investigation shows that your data
was accessed but not copied or modified.

WHAT WE'RE DOING:
1. [x] Revoked the compromised key
2. [x] Removed the key from code history
3. [x] Verified no data exfiltration
4. [x] Added secret scanning to our CI/CD pipeline
5. [x] Deployed pre-commit security hooks

YOUR ACTIONS:
- No action required on your part
- Your existing API keys remain valid and secure
- We recommend rotating credentials (security best practice)
- Complimentary upgrade to higher tier for next 30 days

QUESTIONS:
Contact us at security@dsg.pics or support@dsg.pics

We apologize for this incident and remain committed to your data security.

Best regards,
DSG Security Team
```

### 6.3 Status Page Updates

**Vercel-hosted status page:** `https://status.dsg.pics`

```
INCIDENT: Service Degradation (Resolved)

2026-07-16 14:32 UTC — Incident started
2026-07-16 15:10 UTC — Root cause identified (DB connection limit)
2026-07-16 15:47 UTC — Service restored
2026-07-16 16:00 UTC — Incident closed

Impact: API requests had 15% error rate for 30 minutes.
Approximately 1,500 failed requests (0.01% of total).

Resolution: Increased database connection pool from 20 to 50 connections.
Monitoring alerts updated to trigger at 80% capacity.
```

---

## 7. Compliance & Regulatory Notifications

### 7.1 GDPR Breach Notification

**Requirement:** Notify within 72 hours if personal data breach

**Steps:**
1. Determine if personal data was accessed (PII)
2. Notify data protection authority (DPA) within 72 hours
3. Notify affected individuals within 72 hours
4. Document notification + response

**Example notification to DPA:**

```
Data Protection Authority Notification

Incident Date: 2026-07-16
Notification Date: 2026-07-18

Organization: DSG One, Inc.
Data Controller Contact: security@dsg.pics

Nature of Breach:
  Unauthorized access to customer execution logs via exposed API key.
  Personal data: User IDs, execution timestamps, action descriptions.
  Non-sensitive PII (no names, emails, or financial data exposed).

Scope:
  1 customer affected, ~500 rows of execution data accessed.
  Data was not copied or modified; read-only access.

Measures Taken:
  - Compromised API key revoked immediately
  - Code history cleaned via git-filter-repo
  - Pre-commit secret scanning deployed
  - Affected customers notified
  - Investigation completed within 24 hours

Ongoing Measures:
  - Monitoring for 30 days for any residual access
  - Enhanced authentication and authorization controls
  - Regular security training for development team
```

### 7.2 CCPA Breach Notification

**Requirement:** Notify California residents within 60 days if SSN/financial data accessed

**Trigger:** If breach involves:
- Social security numbers
- Financial account numbers
- Driver's license numbers
- Passport numbers

**Steps:**
1. Determine if California residents affected
2. Send notification letter (certified mail + email)
3. Document proof of notification
4. Report to California Attorney General (if >500 residents)

---

## 8. Monitoring & Prevention

### 8.1 Preventive Controls

**To prevent data breaches:**
- [ ] Pre-commit hooks (secrets scanning)
- [ ] Gitleaks in CI/CD pipeline
- [ ] Code scanning (CodeQL)
- [ ] Dependency scanning (npm audit)
- [ ] Rate limiting (429 after 100 req/min)
- [ ] WAF rules (CloudFlare)

**To prevent availability issues:**
- [ ] Database backup + restore testing (monthly)
- [ ] Disaster recovery drill (quarterly)
- [ ] Load testing (simulate 2x peak traffic)
- [ ] Geographic failover testing (yearly)

**To prevent credential compromise:**
- [ ] MFA required for admin accounts
- [ ] Session timeout (24 hours)
- [ ] API key rotation policy (90-day max)
- [ ] Pre-commit secret scanning

### 8.2 Incident Drill Schedule

**Monthly:** Tabletop exercise (discuss P2 scenario)  
**Quarterly:** Full incident response drill (page on-call, response time check)  
**Yearly:** External penetration test + incident simulation

---

## 9. Contact & Escalation

**On-Call Rotation:** PagerDuty (auto-pages CISO + VP Eng for P1/P2)  
**Incident Slack Channel:** #security-incidents  
**Security Email:** security@dsg.pics (24/7 monitored)  
**CEO (critical only):** Triggered by P1 page  

**Last Reviewed:** July 16, 2026  
**Next Review:** January 16, 2027  
**Approved By:** Engineering & Security Leadership
