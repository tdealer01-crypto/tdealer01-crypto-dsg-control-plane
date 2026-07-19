# DSG Control Plane: Security Implementation & Verification Checklist

**Purpose:** Daily security verification checklist for developers, QA, and operations teams  
**Last Updated:** July 19, 2026  
**Owner:** DSG Security Team

---

## 1. Authentication & Authorization Checks

### 1.1 API Route Security

**Before shipping a new API route:**

```typescript
// ✅ Pattern: Protected route with org isolation
export async function POST(req: NextRequest) {
  // 1. Extract user from headers (set by middleware)
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Resolve organization from user context (never from request body)
  const supabase = getSupabaseAdmin();
  const { data: org, error } = await supabase
    .from('user_orgs')
    .select('org_id')
    .eq('user_id', userId)
    .single();

  if (error || !org?.org_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 });
  }

  // 3. Query/update data with org_id filter
  const { data, error: execError } = await supabase
    .from('executions')
    .select('*')
    .eq('org_id', org.org_id)  // ← Always include org filter
    .eq('id', req.nextUrl.searchParams.get('id'));

  if (execError || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

**Checklist:**
- [ ] Route checks `x-user-id` header
- [ ] Organization context resolved from database (not from request)
- [ ] All queries include `eq('org_id', userOrgId)` filter
- [ ] No user input (URL params, body, query string) influences org_id
- [ ] Unauthorized/unauthenticated requests return 401, not 500
- [ ] 403 (Forbidden) returned for cross-org access attempts
- [ ] Route is tested with both authorized and unauthorized users

---

### 1.2 Protected Page Routes

**Before deploying a protected page:**

```typescript
// ✅ Pattern: Protected dashboard page
// Verify in middleware.ts that your path is guarded:
function isProtectedPath(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

// Protected routes should:
// 1. Check Supabase session in middleware (automatic)
// 2. Redirect to /login if unauthenticated
// 3. Use server-side rendering or fetch org_id server-side
```

**Checklist:**
- [ ] Page path is listed in `isProtectedPath()` in `middleware.ts`
- [ ] Unauthenticated access redirects to `/login`
- [ ] Local dev bypass (localhost) is only for inspection UI
- [ ] No sensitive data in localStorage (always fetch from server)
- [ ] Organization context is loaded server-side, not from URL

---

## 2. Data Isolation Checks

### 2.1 Database Query Patterns

**Every customer-scoped query must include org_id filter:**

```typescript
// ❌ BAD: No org filter
const executions = await supabase
  .from('executions')
  .select('*')
  .eq('id', executionId);

// ✅ GOOD: Org filter included
const executions = await supabase
  .from('executions')
  .select('*')
  .eq('org_id', userOrgId)
  .eq('id', executionId)
  .single();
```

**Checklist:**
- [ ] All `.select()` queries on org-scoped tables include `.eq('org_id', ...)`
- [ ] No wildcard queries like `.select('*').limit(1000)`
- [ ] Admin operations use `getSupabaseAdmin()`, not user client
- [ ] Joins preserve org_id filtering (test with Supabase explain plan)
- [ ] Soft deletes (not real deletes) preserve audit trail
- [ ] No queries constructed from raw user input (use parameterized queries)

### 2.2 Supabase RLS Verification

**When schema changes are deployed:**

```bash
# Verify RLS is enabled on all customer tables
supabase db inspect

# Should show: "RLS: Enabled" for:
# - executions
# - policies
# - audit_logs
# - runtime_traces
# - dsg_secrets
# - user_orgs
# etc.
```

**Checklist:**
- [ ] RLS is enabled on all customer-scoped tables
- [ ] No tables have `"Security\": { "rls_enabled": false }`
- [ ] RLS policies checked in migration review
- [ ] Policies use `auth.uid()` to derive user, not request headers
- [ ] Policy logic verified: no overly permissive `USING true`
- [ ] `INSERT` policies include `WITH CHECK (org_id = current_org_id)`

---

## 3. Secrets & Credential Management

### 3.1 Environment Variables

**Checklist:**
- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] `.env.example` lists only variable names, never values
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is stored in Vercel secrets, not in git
- [ ] `NEXT_PUBLIC_*` variables contain no sensitive data
- [ ] API keys are rotated on discovery of compromise
- [ ] Logs never print secret values (use `safe-log.ts`)

### 3.2 Secrets in Logs

**All logging must use safe-log helpers:**

```typescript
// ❌ BAD: Prints token
console.log('Auth token:', token);
logger.info('Bearer token', { token });

// ✅ GOOD: Redacts sensitive data
import { safeLogs } from '@/lib/security/safe-log';
logger.info('Auth successful', safeLogs.user(userData));
```

**Checklist:**
- [ ] No API keys in `console.log()` or error messages
- [ ] No Supabase tokens logged in full
- [ ] No customer data logged in plaintext
- [ ] Error responses don't leak stack traces in production
- [ ] Audit logs redact sensitive columns (passwords, keys, tokens)

---

## 4. Request & Response Security

### 4.1 Body Size Limits

**Verify middleware enforces limits:**

```typescript
// middleware.ts: 1 MB limit
const API_BODY_SIZE_LIMIT = 1_048_576;

if (cl && parseInt(cl, 10) > API_BODY_SIZE_LIMIT) {
  return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
}
```

**Checklist:**
- [ ] 1 MB limit is enforced for POST/PUT/PATCH
- [ ] Large file uploads use chunked transfer or dedicated endpoint
- [ ] No unlimited streaming from user input
- [ ] Timeout is enforced (5 seconds for Supabase calls)

### 4.2 CORS & Content-Type

**Verify CORS policy in `lib/security/cors.ts`:**

```typescript
// ✅ Pattern: Restrict to known origins
const ALLOWED_ORIGINS = ['https://tdealer01-crypto-dsg-control-plane.vercel.app'];

export function buildCorsHeaders(origin?: string) {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return {}; // No CORS headers if origin not allowed
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
```

**Checklist:**
- [ ] CORS origins are whitelisted (not `*`)
- [ ] Content-Type is validated (only allow JSON/form)
- [ ] OPTIONS preflight is handled correctly
- [ ] No access to sensitive headers exposed in CORS
- [ ] Credentials mode is correct (include/omit based on auth method)

### 4.3 Response Headers

**All responses should include security headers:**

```typescript
// ✅ Pattern in next.config.js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Content-Security-Policy', value: "default-src 'self'" },
];
```

**Checklist:**
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN` present
- [ ] `X-XSS-Protection: 1; mode=block` present
- [ ] CSP header restricts script sources
- [ ] Vercel security headers enabled in `vercel.json`

---

## 5. Rate Limiting & Quota

### 5.1 Per-Organization Rate Limits

**Verify rate limiting in `lib/security/rate-limit.ts`:**

```typescript
export async function checkRateLimit(orgId: string, endpoint: string) {
  const key = `rate-limit:${orgId}:${endpoint}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60); // 1-minute window
  }
  
  if (count > LIMIT_PER_MINUTE) {
    throw new Error('Rate limit exceeded');
  }
}
```

**Checklist:**
- [ ] Rate limits are enforced per organization, not globally
- [ ] Limits are tuned by endpoint (execute route is stricter than list routes)
- [ ] 429 (Too Many Requests) is returned when limit is exceeded
- [ ] Rate limit info is returned in response headers
- [ ] Limits are documented in API docs
- [ ] No bypass for unauthenticated requests

### 5.2 Quota Enforcement

**Billing quota gates before execution:**

```typescript
// ✅ Pattern: Check quota before spine execution
const quota = await getOrgQuota(orgId);
const usage = await getOrgUsage(orgId);

if (usage.calls >= quota.max_calls) {
  return NextResponse.json(
    { error: 'Usage quota exceeded' },
    { status: 429 }
  );
}
```

**Checklist:**
- [ ] Quota is checked before governed execution (spine)
- [ ] Overage is logged for billing review
- [ ] Customer is notified via audit log when approaching quota
- [ ] Hard quota enforcement prevents execution
- [ ] Soft quota (warning) notifies customer at 80%

---

## 6. Audit & Logging

### 6.1 Audit Log Coverage

**Every sensitive action must be logged:**

| Action | Logged? | Log Entry |
|--------|---------|-----------|
| API call (execution route) | ✅ | user_id, org_id, resource_id, decision, timestamp |
| Policy update | ✅ | user_id, org_id, policy_id, old_value, new_value |
| Secret access (credential broker) | ✅ | user_id, org_id, secret_id, timestamp, result |
| User added to organization | ✅ | user_id, org_id, new_user_id, timestamp |
| Audit log export | ✅ | user_id, org_id, export_id, timestamp, row_count |
| Authentication failure | ✅ | email (not password), reason, timestamp |
| Rate limit exceeded | ⚠️ | org_id, endpoint, timestamp (optional per design) |

**Checklist:**
- [ ] All execution traces are stored in `runtime_traces`
- [ ] All policy changes are logged in `audit_logs`
- [ ] Login/logout events are recorded
- [ ] Administrative actions (role changes, org deletion) are logged
- [ ] Logs are immutable (no modification after creation)
- [ ] Logs include timestamp, actor, resource, action, result

### 6.2 Audit Log Export

**Customers must be able to export audit logs:**

```bash
# Example: Export logs for compliance review
GET /api/audit?org_id=...&start_date=2026-07-01&end_date=2026-07-31

# Returns JSON-L (one JSON object per line):
# {"timestamp": "2026-07-19T10:30:00Z", "user_id": "...", "action": "execute", ...}
# {"timestamp": "2026-07-19T10:30:05Z", "user_id": "...", "action": "policy_update", ...}
```

**Checklist:**
- [ ] Audit export is scoped to authenticated user's organization
- [ ] Export is available in JSON, CSV, and SIEM-compatible formats
- [ ] Timestamp format is ISO 8601 (UTC)
- [ ] Export includes all required fields (user_id, org_id, resource_id, action, result)
- [ ] Large exports are paginated or streamed
- [ ] Export logs the export action itself (audit of audit)

---

## 7. Incident Response & Recovery

### 7.1 Security Incident Checklist

**If a potential breach is discovered:**

1. [ ] **Immediate:** Stop and isolate the affected service
2. [ ] **Within 1 hour:** Engage security team & legal
3. [ ] **Within 6 hours:** Determine scope (which orgs, what data, when)
4. [ ] **Within 24 hours:** Notify affected customers
5. [ ] **Within 48 hours:** Submit official breach notification (per DPA)
6. [ ] **Within 1 week:** Publish post-incident review
7. [ ] **Within 2 weeks:** Deploy fixes & verification

**Verification:**
- [ ] Breach notification template is prepared and tested
- [ ] Customer contact list is current (email addresses verified)
- [ ] Legal team has approved notification language
- [ ] Incident response runbook is reviewed quarterly

### 7.2 Secret Rotation

**When secrets are compromised:**

```bash
# 1. Rotate the credential
# - Supabase service role key
# - Vercel API token
# - Stripe secret key
# etc.

# 2. Update all services
supabase secrets:set SUPABASE_SERVICE_ROLE_KEY=<new_value>
vercel secrets:add STRIPE_SECRET_KEY=<new_value>

# 3. Verify no old credential is in logs
git log --all -S 'old_secret_value' --source

# 4. Force re-deployment
vercel deploy --prod

# 5. Monitor logs for any auth failures
tail -f logs/auth-errors.log
```

**Checklist:**
- [ ] Secret rotation SOP is documented
- [ ] Rotation can be completed in < 1 hour
- [ ] All secrets are rotated quarterly (minimum)
- [ ] No rotated secrets remain in git history
- [ ] Monitoring alerts on auth failures after rotation

---

## 8. Deployment Security Verification

### 8.1 Pre-Deployment Checklist

**Before merging to `main` and deploying to production:**

```bash
# 1. Typecheck passes
npm run typecheck

# 2. All tests pass
npm run test

# 3. No secrets in diff
git diff HEAD~1 | grep -i 'key\|secret\|token\|password'
# Should return nothing

# 4. No auth bypass
git log -p -1 | grep -E '(ignore auth|bypass|TODO.*auth)'

# 5. Dependency audit passes
npm audit --audit-level=high
# No vulnerabilities
```

**Checklist:**
- [ ] Code review completed (minimum 2 approvals for security changes)
- [ ] Automated tests pass (GitHub Actions)
- [ ] No new security warnings in dependency audit
- [ ] No commented-out security code
- [ ] No `TODO` comments in auth paths
- [ ] No hardcoded IP addresses or origins
- [ ] CLAUDE.md is updated if behavior changed

### 8.2 Post-Deployment Verification

**After Vercel deployment is complete:**

```bash
# 1. Verify deployment
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health"
# Should return 200 OK

# 2. Check agent status
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status" | jq .

# 3. Test protected route (should require auth)
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/executions" | grep -i 'unauthorized\|401'

# 4. Verify Supabase connection
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness" | jq .

# 5. Check logs for errors
vercel logs --prod --tail
```

**Checklist:**
- [ ] Health check returns 200 OK
- [ ] Agent status shows correct commit hash
- [ ] Protected routes return 401 without auth token
- [ ] Readiness probe shows all dependencies OK
- [ ] No error spikes in logs
- [ ] Performance metrics are within baseline
- [ ] Monitoring dashboards show normal traffic

---

## 9. Quarterly Security Review

**Every 90 days, verify:**

### 9.1 Penetration Test Status

- [ ] Is the most recent pen test < 1 year old?
- [ ] Were all findings remediated?
- [ ] Is a new pen test scheduled for the next quarter?

### 9.2 Dependency Security

- [ ] Run `npm audit` — any high/critical vulnerabilities?
- [ ] Are dependencies up-to-date (within 2 versions)?
- [ ] Are transitive dependencies pinned in `package.json` overrides?
- [ ] Have security advisories been reviewed (github.com/advisories)?

### 9.3 Access Control Review

- [ ] Verify who has access to production secrets
- [ ] Confirm Vercel team members are still active
- [ ] Review Supabase service-role key usage logs
- [ ] Audit customer API key usage (no abandoned keys)

### 9.4 Incident Review

- [ ] Were there any security incidents in the past 90 days?
- [ ] Were all incidents properly documented?
- [ ] Have fixes been deployed and verified?
- [ ] Are customers still trusting the system?

---

## 10. Security Contacts & Escalation

**When to escalate:**

| Severity | Response Time | Who to Contact |
|----------|---------------|-----------------|
| **Critical** (ongoing breach, active attack) | Immediate | Security lead + CTO + Legal |
| **High** (likely vulnerability, unpatched system) | < 2 hours | Security lead + Engineering |
| **Medium** (potential issue, requires review) | < 24 hours | Security lead |
| **Low** (recommendation, informational) | < 1 week | Engineering team |

**Contact info:**
- **Security Lead:** t.dealer01@dsg.pics
- **On-call:** [On-call rotation schedule]
- **Legal:** [Legal team contact]
- **Customers:** [Support escalation process]

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Title** | DSG Control Plane: Security Checklist |
| **Audience** | Developers, QA, Ops, Security team |
| **Purpose** | Daily security verification & incident response |
| **Last Updated** | July 19, 2026 |
| **Review Frequency** | Quarterly |
| **Owner** | DSG Security Team |

