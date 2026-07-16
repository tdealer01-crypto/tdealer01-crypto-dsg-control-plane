# Access Control Policy
## DSG ONE / ProofGate Control Plane

**Effective Date:** July 16, 2026  
**Last Updated:** July 16, 2026  
**Classification:** INTERNAL - SOC 2 Type I

---

## 1. Overview

This Access Control Policy establishes procedures for granting, maintaining, and revoking access to DSG ONE systems, data, and infrastructure. The policy enforces the principle of least privilege, role-based access control (RBAC), and continuous audit trails for all authenticated access.

**Scope:** All user roles, API consumers, service accounts, and privileged operations that access:
- Supabase PostgreSQL database (cloud storage)
- Vercel deployment and build infrastructure
- GitHub repository and code artifacts
- AWS/Stripe integration accounts
- Operator dashboards and admin functions
- Runtime execution pipelines

---

## 2. Access Control Principles

### 2.1 Least Privilege (LPP)

Every user and service account receives only the minimum permissions necessary to perform their assigned function.

**Implementation:**
- Supabase RLS policies restrict row-level read/write by actor ID and role
- Service roles bypass RLS only for authenticated backend operations
- Client SDKs use anon/authenticated clients, never service-role keys
- API endpoints enforce Bearer token validation before query execution

**Verification:**
- Weekly audit of active role assignments and RLS policies
- Quarterly review of privilege escalation events
- Spot checks: Query users with admin/operator roles (should be ≤3 people)

### 2.2 Role-Based Access Control (RBAC)

Four primary roles structure system access:

| Role | Function | Examples | Permissions |
|------|----------|----------|-------------|
| **anonymous** | Unauthenticated consumer | Public pricing view, health checks | Read public_* tables only |
| **authenticated** | Registered API consumer | AI agent, app user | Read/write own rows, limited by RLS |
| **admin** | Operator/support staff | Security team, billing review | Read all user data, write audit_log |
| **service-role** | Backend processes only | Migrations, cron, webhooks | Full database access (server-side only) |

**RLS Policy Pattern:**

```sql
-- Authenticated user sees only their own data
CREATE POLICY "user_sees_own_data" ON runtime_executions
  USING (auth.uid() = actor_id);

-- Admin sees everything
CREATE POLICY "admin_sees_all" ON runtime_executions
  USING (auth.role() = 'admin');

-- Service-role bypasses RLS (server-side only)
-- Policy not needed; service-role is exempt
```

### 2.3 Audit Trail (Accountability)

All access is logged with:
- WHO (user ID, API key prefix, role)
- WHAT (table, operation, row IDs affected)
- WHEN (timestamp to millisecond precision)
- WHY (request context, approval ID if applicable)
- RESULT (success/failure, error message)

**Logging tables:**
```
- runtime_executions     → governance decisions and execution results
- runtime_evidence       → proof/audit artifacts per execution
- audit_log              → manual admin actions
- dsg_mcp_usage          → MCP API call tracking
- (Vercel/GitHub logs)   → build/deployment/code access
```

### 2.4 Time-Limited Access

Long-lived credentials are prohibited except where unavoidable.

**Credential types and limits:**

| Credential | Lifetime | Renewal | Example |
|----------|----------|---------|---------|
| **JWT token (user)** | 1 hour | Refresh token (30 days) | `/api/execute` Bearer token |
| **JWT token (session)** | 24 hours | Auto-refresh via middleware | Operator dashboard cookie |
| **API key (DSG agent)** | Indefinite | Revokable anytime | `dsg_sk_*` key with org/agent scope |
| **MCP API key** | Indefinite | Revokable anytime | `mcp_key_*` tied to 10K calls/month |
| **Stripe webhook secret** | Indefinite | Rotatable via Stripe | Server-side environment only |
| **Database credential** | Indefinite | Locked to service-role only | `SUPABASE_SERVICE_ROLE_KEY` |

**Credential rotation:**
- User-initiated revocation via `/api/keys/revoke`
- Automatic invalidation at logout
- Service-role keys never expire but are environment-locked
- Webhook secrets may be rotated via Stripe dashboard and environment update

---

## 3. Authentication Methods

### 3.1 API Authentication (Bearer Token)

Standard for public and private API consumers (agents, SDKs, third-party apps).

**Flow:**

```
POST /api/execute
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "agent_id": "agent-xyz-123",
  "action": "governance-check",
  ...
}
```

**JWT Composition (RS256 signature):**

```json
{
  "sub": "user-123",
  "agent_id": "agent-xyz-123",
  "org_id": "org-abc-456",
  "role": "authenticated",
  "iat": 1721138400,
  "exp": 1721142000
}
```

**Validation (per request):**
1. Extract token from `Authorization: Bearer <token>`
2. Verify RS256 signature against published JWKS endpoint
3. Check expiration (`now < exp`)
4. Verify `sub` matches Supabase `auth.users.id`
5. Verify `agent_id` matches calling agent
6. Verify agent is active and not revoked
7. Proceed to authorization (quota/policy checks)

**Implementation:**
```typescript
// app/api/middleware/auth.ts (common pattern)
const token = request.headers.get('Authorization')?.split('Bearer ')[1];
if (!token) throw new ApiError('Unauthorized', 401);

const decoded = await supabase.auth.verifyJWT(token);
if (!decoded) throw new ApiError('Invalid token', 401);

const actor = await db.user.findById(decoded.sub);
if (!actor) throw new ApiError('User not found', 404);
```

### 3.2 Session Authentication (Dashboard)

Operator dashboards use Supabase session cookies managed by Next.js middleware.

**Flow:**

```
1. User logs in via /auth/login (email + password)
2. Supabase returns refresh_token + access_token
3. middleware.ts stores tokens in cookie (encrypted)
4. On each request, middleware validates and refreshes if needed
5. Expired session → redirect to /auth/login
```

**Enforcement:**
- `middleware.ts` blocks unauthenticated access to `/dashboard/**`
- `app/dashboard/layout.tsx` wraps protected pages
- Session timeout: 24 hours (auto-refresh via middleware)
- Logout: `DELETE /auth/logout` clears cookie and invalidates session

### 3.3 API Key (MCP and Custom Integrations)

Long-lived keys for daemon processes, scripts, and third-party integrations.

**Format:**
```
dsg_sk_<random>  (DSG platform key, 32-byte random)
mcp_key_<random> (MCP API key, scoped to 10K calls/month)
```

**Management:**
```
POST   /api/keys/create        → Generate new key
GET    /api/keys               → List user's keys
DELETE /api/keys/<key_id>      → Revoke key
```

**Storage:**
```
Supabase table: dsg_mcp_api_keys
- key_hash      TEXT NOT NULL UNIQUE  (bcrypt or SHA-256)
- key_prefix    TEXT NOT NULL         (first 8 chars, visible in UI)
- actor_id      UUID NOT NULL         (owner)
- status        TEXT ('ACTIVE'|'REVOKED')
- created_at    TIMESTAMPTZ
- revoked_at    TIMESTAMPTZ
```

**Usage (validation per call):**
1. Extract key from request header or query param
2. Hash key using bcrypt/SHA-256
3. Look up key_hash in dsg_mcp_api_keys
4. Verify status = 'ACTIVE' and not expired
5. Check calls_used < calls_limit for the period
6. Log to dsg_mcp_usage table
7. Return 429 if quota exceeded

---

## 4. Supabase Row-Level Security (RLS)

### 4.1 Policy Architecture

Every data table has explicit ALLOW or DENY policies per role. RLS is enabled on all tables except public_* views.

**Policy categories:**

| Type | Purpose | Example |
|------|---------|---------|
| **Ownership** | User sees own rows | `actor_id = auth.uid()` |
| **Organization** | Team sees team rows | `org_id = (SELECT org_id FROM users WHERE id = auth.uid())` |
| **Admin override** | Operator sees all | `auth.role() = 'admin'` |
| **Public read** | Anonymous sees public | `is_public = true` |
| **Temporal** | Time-locked access | `now() < expires_at` |

### 4.2 Core Tables and Policies

**runtime_executions** (Agent governance decisions)

```sql
-- Agents see their own executions
CREATE POLICY "agent_sees_own_executions" ON runtime_executions
  FOR SELECT USING (agent_id = auth.uid());

-- Admins see all
CREATE POLICY "admin_sees_all_executions" ON runtime_executions
  FOR SELECT USING (auth.role() = 'admin');

-- Agents can INSERT their own executions (not external write)
CREATE POLICY "agent_can_record_own" ON runtime_executions
  FOR INSERT WITH CHECK (agent_id = auth.uid());
```

**runtime_evidence** (Audit artifacts)

```sql
CREATE POLICY "evidence_actor_scoped" ON runtime_evidence
  FOR SELECT USING (actor_id = auth.uid() OR auth.role() = 'admin');
```

**dsg_mcp_api_keys** (API keys)

```sql
CREATE POLICY "owner_sees_own_keys" ON dsg_mcp_api_keys
  FOR SELECT USING (actor_id = auth.uid() OR auth.role() = 'admin');

CREATE POLICY "owner_can_revoke" ON dsg_mcp_api_keys
  FOR UPDATE USING (actor_id = auth.uid() OR auth.role() = 'admin');
```

**billing_subscriptions** (Customer plans)

```sql
CREATE POLICY "org_sees_own_subscription" ON billing_subscriptions
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR auth.role() = 'admin'
  );
```

**dsg_secrets** (Credential vault)

```sql
-- NO direct table SELECT allowed; only via Credential Broker RPC
CREATE POLICY "deny_all_direct_select" ON dsg_secrets
  FOR SELECT USING (false);

-- Broker RPC can read and write (runs as service-role)
-- See section 5.3 Credential Broker
```

### 4.3 RLS Verification

**Weekly audit:**
```sql
-- List all policies
SELECT schemaname, tablename, policyname, permissive, qual
FROM pg_policies
ORDER BY tablename;

-- Verify critical tables have ≥2 policies
SELECT table_name, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY table_name
HAVING COUNT(*) < 2;
```

---

## 5. Privileged Access Management (PAM)

### 5.1 Admin Role Requirements

Only 3 people may have admin role at any given time.

**Approval process:**
1. Engineering lead or VP Security nominates person
2. Written approval from both VP Engineering and VP Security required
3. Onboarding: Security policy sign-off + MFA verification
4. Supabase: Role changed via `GRANT admin TO <user>` by service-role-only script
5. Audit log entry records approver, timestamp, and scope

**Removal:**
1. Resignation or role change triggers automatic review
2. Last admin to know: Deactivate in Supabase + revoke auth keys
3. Audit log entry records timestamp and reason

**Monitoring:**
```sql
-- Admins currently active
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin'
AND deleted_at IS NULL;

-- Should return ≤3 rows
```

### 5.2 Service Role Isolation

The service-role key bypasses all RLS and must NEVER be exposed to client-side code.

**Allowed:**
- Backend API routes (Next.js `app/api/**/route.ts` with `dynamic = 'force-dynamic'`)
- Supabase Edge Functions (Node.js runtime)
- CI/CD migrations and scheduled jobs
- Credential Broker RPC (isolated function)

**Prohibited:**
- Client-side React components
- Browser console or dev tools
- Public environment variables
- Client SDKs
- Mobile app code
- Log output

**Enforcement:**
```bash
# CI check: Grep for service-role key in client-facing files
npm run verify:policy:no-service-key

# Should return: 0 matches
```

### 5.3 Credential Broker (Secret Management)

Supabase-backed secret lookup with fingerprinting and lease tracking.

**Architecture:**

```
User/Agent Request
        ↓
    [Auth Gate]  ← Verify Bearer token
        ↓
[Rate Limit]  ← Check quota
        ↓
credential_broker.ts (server-side)
        ↓
  query_secret() RPC  ← Calls service-role function
        ↓
  dsg_secrets table  ← Encrypted + HSM-protected
        ↓
  Fingerprint + Lease  ← User gets lease, not raw secret
        ↓
  audit_log entry  ← WHO, WHEN, WHAT, WHY
        ↓
User Response (with lease ID only)
```

**Example usage:**

```typescript
// app/api/dsg/v1/agent/secret/route.ts
export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  const { agent_id, secret_key } = await req.json();

  // Verify token + agent
  const actor = await verifyToken(token);
  if (actor.agent_id !== agent_id) throw new ApiError('Forbidden', 403);

  // Query secret via broker (service-role, inside backend only)
  const lease = await supabase.rpc('query_secret', {
    p_actor_id: actor.sub,
    p_secret_key: secret_key,
  });

  // Return lease, not secret
  return NextResponse.json({
    lease_id: lease.lease_id,
    expires_at: lease.expires_at,
    fingerprint: lease.fingerprint,  // Proof of secret without exposing it
  });
}
```

**Broker rules:**
- One credential per request
- Lease lifetime: 15 minutes (one-time use or expire)
- Fingerprint proves credential access without storing raw value
- Every access logged to audit_log with reason code
- Revocation: Invalidate all leases immediately

---

## 6. Multi-Factor Authentication (MFA)

### 6.1 MFA Requirement

MFA is required for:
- **All admin/operator accounts** (mandatory)
- **API key generation** (must verify identity first)
- **Production dashboard access** (24+ hour sessions)

### 6.2 MFA Methods

Supported authenticators (via Supabase Auth):

| Method | Supported | Requirement |
|--------|-----------|-------------|
| TOTP (Google Authenticator, Authy) | ✓ Yes | Mandatory for admins |
| SMS (OTP via SMS) | ✓ Yes | Secondary backup |
| WebAuthn (YubiKey, Windows Hello) | ✓ Yes | Recommended for power users |
| Email OTP | ✓ Yes | Backup only |

### 6.3 MFA Enforcement

```typescript
// middleware.ts
if (user.role === 'admin' && !user.mfa_enabled) {
  return NextResponse.redirect(new URL('/setup-mfa', req.url));
}

if (requestPath.includes('/dashboard') && sessionAge > 24h) {
  return NextResponse.redirect(new URL('/verify-mfa', req.url));
}
```

---

## 7. Audit Logging

### 7.1 Audit Log Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,           -- 'LOGIN', 'API_KEY_CREATE', 'SECRET_READ', etc.
  resource_type TEXT,             -- 'execution', 'user', 'key', etc.
  resource_id TEXT,               -- ID of affected resource
  result TEXT NOT NULL,           -- 'SUCCESS', 'FAILURE'
  error_reason TEXT,              -- If FAILURE, why
  ip_address INET,                -- Requester IP (from CF header or socket)
  user_agent TEXT,                -- Browser/client info
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB                  -- Additional context
);

CREATE INDEX audit_log_actor_idx ON audit_log(actor_id, timestamp DESC);
CREATE INDEX audit_log_action_idx ON audit_log(action, timestamp DESC);
```

### 7.2 Audit Events

**Critical events** logged automatically:

| Event | Trigger | Log Fields |
|-------|---------|-----------|
| User Login | Successful password + MFA | actor_id, ip, timestamp |
| API Key Created | `/api/keys/create` call | actor_id, key_prefix, scope |
| API Key Revoked | `/api/keys/<id>/revoke` call | actor_id, key_id, reason |
| Admin Role Granted | Supabase role change | admin_id, user_id, approver |
| Secret Access | `credential_broker.query_secret()` | actor_id, secret_key, lease_id |
| Execution Approved | Policy gate PASS | actor_id, execution_id, policy_version |
| Execution Blocked | Policy gate BLOCK | actor_id, execution_id, reason |
| Privilege Escalation Attempt | Unauthorized admin access | actor_id, attempted_action, result=FAILURE |

### 7.3 Audit Retention

- **Audit logs**: 3 years (regulatory requirement)
- **Runtime executions**: 1 year (compliance audit trail)
- **Access logs (Vercel/GitHub)**: 180 days (platform retention)
- **MFA recovery codes**: 1 year (if used, delete immediately)

### 7.4 Audit Review

**Daily:**
```bash
# Check for failed login attempts (>5 in 1h = possible attack)
SELECT actor_id, COUNT(*) as failures
FROM audit_log
WHERE action = 'LOGIN' AND result = 'FAILURE'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY actor_id
HAVING COUNT(*) > 5;
```

**Weekly:**
```bash
# Review all admin actions
SELECT actor_id, action, COUNT(*) as count
FROM audit_log
WHERE actor_id IN (SELECT id FROM users WHERE role = 'admin')
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY actor_id, action;
```

**Monthly:**
```bash
# Verify no orphaned API keys (revoked but still active in dsg_mcp_api_keys)
SELECT key_id, actor_id
FROM dsg_mcp_api_keys
WHERE status = 'ACTIVE'
  AND actor_id NOT IN (SELECT id FROM auth.users WHERE deleted_at IS NULL);
```

---

## 8. Privilege Escalation Prevention

### 8.1 Authorization Checks

Every request is checked against:

1. **Authentication** — Is token valid? Is user active?
2. **Authorization** — Does user have permission for this resource?
3. **Quota** — Has user exceeded rate/monthly limits?
4. **Policy** — Does action comply with governance policies?

**Diagram:**

```
Request
  ↓
[Auth Valid?] ←NO→ 401 Unauthorized
  ↓ YES
[Role Authorized?] ←NO→ 403 Forbidden
  ↓ YES
[Quota OK?] ←NO→ 429 Too Many Requests
  ↓ YES
[Policy Pass?] ←NO→ 403 Policy Violation
  ↓ YES
[Execute]
  ↓
[Commit to audit_log]
```

### 8.2 Prevent Direct Table Mutation

Service-role-only tables prevent unauthorized modification:

```sql
-- dsg_secrets: No direct UPDATE; only via Credential Broker RPC
CREATE POLICY "deny_all_updates" ON dsg_secrets
  FOR UPDATE USING (false);

-- dsg_plan_contracts: No direct UPDATE; only via approval RPC
CREATE POLICY "deny_direct_update" ON dsg_plan_contracts
  FOR UPDATE USING (false);

-- Correct way: Use RPC function (runs as service-role)
CREATE OR REPLACE FUNCTION approve_plan_contract(
  p_contract_id UUID,
  p_approved_by UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE dsg_plan_contracts
  SET approved_by = p_approved_by, approved_at = NOW()
  WHERE id = p_contract_id;
END;
$$;
```

### 8.3 No Public Admin Access

Admin-only operations require:
- MFA token
- IP allowlist (optional, for ops team only)
- Audit log recording
- Explicit reason code

```typescript
// app/api/admin/users/<id>/revoke/route.ts
export async function POST(req: Request) {
  const token = extractToken(req);
  const actor = await verifyToken(token);

  // Verify admin
  if (actor.role !== 'admin') throw new ApiError('Forbidden', 403);

  // Verify MFA
  if (!actor.mfa_verified_at || actor.mfa_verified_at < Date.now() - 15m) {
    throw new ApiError('MFA required', 403);
  }

  const { reason } = await req.json();
  const { id } = await params;

  // Perform action
  await revokeUser(id);

  // Log with reason
  await auditLog({
    actor_id: actor.sub,
    action: 'USER_REVOKE',
    resource_id: id,
    result: 'SUCCESS',
    metadata: { reason },
  });

  return NextResponse.json({ status: 'revoked' });
}
```

---

## 9. Access Termination

### 9.1 Offboarding Process

When an employee or contractor leaves:

1. **Immediate** (T+0):
   - Disable Supabase auth account
   - Revoke all API keys (dsg_mcp_api_keys.status = 'REVOKED')
   - Revoke GitHub access
   - Disable MFA recovery codes

2. **Within 1 hour** (T+1h):
   - Audit all actions in past 7 days
   - Ensure no production secrets copied to personal accounts
   - Revoke Stripe/AWS access if applicable

3. **Within 24 hours** (T+24h):
   - Update dsg_plan_contracts to remove as approver (if admin)
   - Archive personal notes/docs in shared drive
   - Verify all sessions terminated

4. **Monthly**:
   - Query for orphaned api keys (actor deleted but key still active)
   - Query for policy approval references pointing to deleted users

### 9.2 Contractor Access

Contractors use temporary API keys with:
- Limited lifetime (contract duration + 30 days grace)
- Explicit scopes (e.g., "testing only", "read-only audit")
- Auto-revocation at contract end

```sql
INSERT INTO dsg_mcp_api_keys (
  actor_id, key_hash, key_prefix, label, status,
  created_at, revoked_at
)
VALUES (
  'contractor-123',
  sha256('contractor_key_...'),
  'ctr_abc',
  'Contractor Testing (expires 2026-08-16)',
  'ACTIVE',
  NOW(),
  NULL
);

-- Auto-revoke via cron (scheduled in vercel.json)
UPDATE dsg_mcp_api_keys
SET status = 'REVOKED', revoked_at = NOW()
WHERE label LIKE '%expires %' AND revoked_at IS NULL
  AND DATE(created_at)::DATE + INTERVAL '60 days' <= NOW();
```

---

## 10. Compliance and Review

### 10.1 Access Control Review

**Quarterly:**
- All admin role holders verified
- All active API keys reviewed
- All RLS policies verified against schema
- All service-role usages reviewed for necessity

**Annually:**
- Full access control audit by external party
- Compliance mapping to SOC 2 / ISO 27001
- Policy updates and sign-off by leadership

### 10.2 Monitoring

**Automated:**
- Daily: Failed login attempts (>5 in 1h = alert)
- Daily: New API key creation (log and audit)
- Daily: Privilege escalation attempts (alert)
- Weekly: Admin role actions review
- Monthly: Orphaned key detection

**Manual:**
- Weekly security team review of audit logs
- Quarterly privilege review
- Annual third-party audit

### 10.3 Policy Violations

**Detected:**
1. Unauthorized access attempt
2. API key used after revocation
3. Service-role key exposure in logs
4. MFA bypass attempt
5. Role escalation without approval

**Response:**
1. Block immediately (revoke token/key)
2. Log to audit_log with `SECURITY_INCIDENT` flag
3. Alert security team within 1 hour
4. Investigate within 4 hours
5. Remediate within 24 hours
6. Post-incident review within 7 days

---

## 11. Contact & Questions

**Access Control Officer:** security@dsg.pics  
**Incident Report:** security@dsg.pics  
**Access Request (New API key):** support@dsg.pics  

**Last Reviewed:** July 16, 2026  
**Next Review:** January 16, 2027  
**Approved By:** Engineering & Security Leadership
