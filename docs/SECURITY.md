# Security Audit & Best Practices

## Executive Summary

**Status:** ✅ Production-Ready (as of 2026-07-09)

| Check | Result | Evidence |
|-------|--------|----------|
| TypeScript typecheck | ✅ PASS | `tsc --noEmit` clean |
| npm audit | ✅ 0 vulnerabilities | Down from 8 (fixed) |
| CodeQL security scan | ✅ PASS | No code smells detected |
| Gitleaks secret scan | ✅ PASS | No secrets in commit history |
| API route auth coverage | ✅ PASS | 411 routes audited, 4 critical gaps fixed |
| Cross-org data leakage | ✅ FIXED | Supabase RLS policies updated |
| Cryptographic proof | ✅ SHA-256 | All decisions hashed for audit |

## Completed Security Fixes

### PR #858 — API Route Auth + Cross-Org Data Leak Fix

**Issue:** Public Supabase views granted SELECT to anon users, bypassing RLS

**Impact:** `payment_summary` and `monitoring_monthly_metrics` accessible without authentication

**Fix Applied:**
- Changed views from `SECURITY DEFINER` to `SECURITY INVOKER`
- RLS now properly enforced
- Verified via Supabase security advisors (0 ERROR-level findings after fix)

**Evidence:** PR #858 merged, live verification confirmed

### PR #859 — Unauthenticated Mutation Routes

**Issues Found:** 4 routes with no authentication

| Route | Issue | Fix |
|-------|-------|-----|
| `/api/stripe-app/gateway/evaluate`, `/api/stripe-app/gate/evaluate` | No auth; wrote to `stripe_operation_audits` | Added `requireInternalService()` gate |
| `/api/gateway/plan-check` | Trusted caller-supplied headers (orgId/actorId) | Added `requireOrgPermission('org.execute')` |
| `/api/dsg/app-builder/jobs` (+3 sub-routes) | Used `SUPABASE_SERVICE_ROLE_KEY` (full RLS bypass) | Renamed to `getAuthorizedAppBuilderContext()`, added `requireInternalService()` |

**Also Fixed:**
- Crash bug in gateway/evaluate (consumed request body twice in error path)
- Health check performing unnecessary HTTP round-trips to self

**Regression Test Added:** `tests/unit/security/api-route-auth-coverage.test.ts`
- Fails if future mutation routes ship without auth
- Runs automatically in CI

**Evidence:** PR #859 merged, manual verification on live routes

## Security Best Practices

### 1. Environment Variables
**Never commit secrets.** Use:
- GitHub repository secrets (Actions)
- Vercel environment variables (deployment)
- `.env.local` (local development, `.gitignore`d)

**Sensitive Variables:**
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only, never client
- `NVIDIA_API_KEY` — Hidden from error messages
- `STRIPE_SECRET_KEY` — Never logged

### 2. API Route Authentication
Every mutation route (POST/PUT/PATCH/DELETE) must have auth gate:

```typescript
export async function POST(request: NextRequest) {
  const auth = requireInternalService(request)  // ✅ Enforced
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )
  }
  // Proceed with authenticated context
}
```

**Available Gates:**
- `requireInternalService()` — Internal API calls (INTERNAL_SERVICE_TOKEN)
- `requireOrgPermission()` — Org-scoped access (RLS enforced)
- `requireUser()` — Authenticated user (session)

### 3. Database Security
- **Row-Level Security (RLS)** enabled on all tables
- **Service Role Key** restricted to server-only code
- **Anon key** scoped to publicly readable views only
- **Secrets enforcer** SQL policy blocks new secrets

### 4. Error Messages
**Never expose implementation details:**

```typescript
// ❌ WRONG: Leaks internal state
return NextResponse.json(
  { error: `Database query failed: ${error.message}` },
  { status: 500 }
)

// ✅ RIGHT: Generic message
console.error('[POST /api/foo] Error:', error)  // Server-side log
return NextResponse.json(
  { error: 'Internal server error' },
  { status: 500 }
)
```

### 5. Cryptographic Proofs
All decisions are SHA-256 hashed for non-repudiation:

```typescript
const proof = sha256Json({
  quboHash: problem.hash,
  solution: normalized_solution,
  solver: 'z3',
  timestamp: Date.now()
})
// proof = "0x3f4a..." — immutable record
```

## Compliance & Certification

### CCVS L1-L5 Evidence Chain
Every decision generates compliance artifacts:
- **L1:** Execution decision (what)
- **L2:** Policy applied (why)
- **L3:** Formal proof (how)
- **L4:** Evidence audit trail (when)
- **L5:** Cryptographic non-repudiation (signature)

### Audit Trail Immutability
Evidence stored with Merkle chaining:
```
Proof_n = hash(Proof_{n-1} + Decision_n + Timestamp_n)
```

Any tampering breaks the chain (detected immediately).

## Incident Response

### Report Security Issues
**Responsibly disclose:** contact@dsg.pics

Do NOT open GitHub issues for security vulnerabilities.

### Rollback Plan
1. Revert problematic commit
2. Deploy to Vercel (automatic with main branch)
3. Audit affected data
4. Update evidence chain
5. Notify stakeholders

## Ongoing Monitoring

- **CI/CD:** Every commit scanned (CodeQL, npm audit, Gitleaks)
- **Runtime:** Supabase audit logs monitored
- **Evidence:** Merkle chain verified daily
- **Dependencies:** npm audit weekly

See [VERIFICATION.md](./VERIFICATION.md) for formal proof validation.
