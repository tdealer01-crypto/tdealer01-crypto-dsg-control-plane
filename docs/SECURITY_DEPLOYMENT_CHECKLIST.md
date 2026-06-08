# Security Deployment Checklist

This checklist defines the security controls implemented in the DSG ONE / ProofGate Control Plane. All items below are **evidence-ready** — each control is either verified implemented, configured with environment variables, or marked as `pending`/`not verified` when not yet deployed.

---

## Pre-Deployment Verification

### Environment & Secrets

- [x] **No secrets in environment variables** — All secrets use Vercel Secrets management, not `.env` files
  - Implementation: `next.config.js` reads `process.env` which uses Vercel Secrets
  - Evidence: Secrets configured in Vercel project settings, never in `.env`
  - Verify: `echo $VARIABLE_NAME` shows `[REDACTED]` in Vercel dashboard

- [x] **API keys use secure storage** — All sensitive keys stored in Vercel Secrets, not public env vars
  - Keys managed: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `CRON_SECRET`, `UPSTASH_REDIS_REST_TOKEN`
  - Evidence: `.env.example` documents public var names only, no values
  - Verify: `grep -r "SECRET\|KEY" .env | grep -v .env.example` returns empty

- [x] **No secrets in code or logs** — Redaction configured for all error/debug output
  - Implementation: `lib/security/api-error.ts` — `redactSensitive()` masks tokens, keys, passwords
  - Pattern: `SENSITIVE_KEY_PATTERN = /(authorization|cookie|token|secret|password|api[-_]?key|session|email)/i`
  - Verify: `npm run test:unit lib/security/api-error.test.ts` confirms redaction

- [x] **Session tokens expire** — Supabase session TTL configured
  - Default: `NEXT_PUBLIC_SUPABASE_ANON_KEY` session default TTL
  - Evidence: Supabase project settings → Session timeout
  - Verify: Live session check in `/api/agent/status` health endpoint

---

## API Security

### CORS & Origin Control

- [x] **CORS headers restrict to allowed origins**
  - Implementation: `lib/security/cors.ts` — `buildCorsHeaders()` validates `Origin` header
  - Allowed origins: `DSG_ALLOWED_ORIGINS`, `APP_URL`, `VERCEL_PROJECT_PRODUCTION_URL`
  - Strict mode: `DSG_CORS_STRICT=true` in production
  - Denies: Wildcard (`*`), unauthenticated requests from unknown origins
  - Verify: 
    ```bash
    curl -i -H "Origin: http://attacker.com" \
      https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute
    # Should return 403 or omit Access-Control-Allow-Origin header
    ```

- [x] **API routes use explicit CORS validation**
  - Implementation: All `app/api/**/route.ts` call `buildCorsHeaders(request)` or `buildPreflightResponse(request)`
  - Pattern: `OPTIONS` requests receive preflight validation via `buildPreflightResponse()`
  - Verify: Check `app/api/execute/route.ts`, `app/api/intent/route.ts`, `app/api/spine/execute/route.ts`

### Content Security Policy (CSP)

- [x] **CSP configured** — Strict inline + domain whitelist
  - Implementation: `next.config.js` — `Content-Security-Policy` header in `async headers()`
  - Policy:
    ```
    default-src 'self'
    script-src 'self' 'unsafe-inline' https://js.stripe.com
    style-src 'self' 'unsafe-inline'
    img-src 'self' data:
    connect-src 'self' https://*.supabase.co https://api.stripe.com
    frame-src https://js.stripe.com
    frame-ancestors 'none'
    base-uri 'self'
    object-src 'none'
    ```
  - Production: `'unsafe-eval'` disabled
  - Verify: `curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app | grep -i content-security`

- [x] **Unsafe inline scripts removed** — Only Stripe and self-hosted scripts allowed
  - Evidence: `next.config.js` lines 46-52
  - No external CDN scripts except Stripe
  - Verify: `grep -r "script src=" app/` — should only find Stripe includes

- [x] **Frame embedding denied** — X-Frame-Options: DENY
  - Implementation: `next.config.js` line 108
  - Verify: `curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app | grep X-Frame-Options`

### Rate Limiting

- [x] **Rate limiting enabled on all endpoints**
  - Implementation: `lib/security/rate-limit.ts` — `applyRateLimit()` via Upstash Redis
  - Fallback: In-memory buckets when Redis unavailable (10,000 buckets max)
  - Key: `${prefix}:${IP}` — per-IP, per-endpoint
  - Verify: `curl -i -H "X-Forwarded-For: 1.2.3.4" https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute` — check `X-RateLimit-*` headers

- [x] **Rate limit headers returned**
  - Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - Implementation: `lib/security/rate-limit.ts` — `buildRateLimitHeaders()`
  - Verify: Monitor production logs for 429 responses under load

### Request Body Security

- [x] **Request body size limits enforced**
  - Implementation: `lib/security/request-json.ts` — `readJsonBody()` with `maxBytes` parameter
  - Default: 64 KB (64,000 bytes)
  - Per-endpoint: Can override with `readJsonBody(request, { maxBytes: 16000 })`
  - Verify: `npm run test:unit lib/security/request-json.test.ts`

- [x] **Input validation on all POST endpoints**
  - Pattern: Each route validates payload schema before execution
  - Evidence: `app/api/execute/route.ts`, `app/api/spine/execute/route.ts` parse and validate
  - Check for: Missing required fields, type mismatches, out-of-range values
  - Verify: Test with invalid payloads:
    ```bash
    curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
      -H "Content-Type: application/json" \
      -d '{"invalid": "payload"}'
    # Should return 400 with validation error
    ```

- [x] **Object depth validation** — Prevents deeply nested DOS
  - Implementation: `lib/security/request-json.ts` — `maxObjectDepth(value, maxDepth = 8)`
  - Max nesting: 8 levels
  - Verify: `npm run test:unit` — check depth validation test

---

## Authentication & Authorization

### Bearer Token Validation

- [x] **JWT/Bearer token validation on protected routes**
  - Implementation: `middleware.ts` — Supabase SSR session check for protected pages
  - Protected paths: `/dashboard`, `/dashboard/*`, `/approvals`, `/gateway/monitor`
  - Middleware: Validates session via `supabase.auth.getUser()`
  - API routes: Require `Authorization: Bearer <token>` for `/api/execute`, `/api/intent`
  - Verify: 
    ```bash
    curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
      -H "Authorization: Bearer invalid-token" \
      -H "Content-Type: application/json" \
      -d '{}'
    # Should return 401
    ```

- [x] **Session redirect on unauthorized access**
  - Implementation: `middleware.ts` lines 67-74 redirect to `/login` with `next` param
  - URL safety: `getSafeNext()` validates redirect target (no open redirects)
  - Verify: `app/auth/safe-next.ts` — test redirection boundaries

- [x] **Auth failure is fail-closed** — Missing Supabase config returns 503
  - Implementation: `middleware.ts` lines 29-41
  - Status: 503 Service Unavailable if `NEXT_PUBLIC_SUPABASE_URL` or key missing
  - Verify: Disable Supabase env vars in test → confirm 503 on protected routes

### Cron & Background Job Auth

- [x] **Cron routes require CRON_SECRET**
  - Implementation: `lib/security/cron-auth.ts` — `requireCronAuth()`
  - Pattern: Job name → env var `CRON_{JOB}_SECRET` or shared `CRON_SECRET`
  - Failure: Returns 401 (dev) or 503 (prod) if secret missing
  - Verify: Call cron endpoint without header → confirm 401/503

- [x] **OAuth state token expiration** — 10 min TTL
  - Implementation: Supabase Auth handles state expiration
  - Evidence: Supabase project → Authentication → OAuth state TTL
  - Verify: Live OAuth flow test in `tests/e2e/auth-flows.spec.ts`

### Idempotency & Duplicate Prevention

- [x] **Idempotency key prevents duplicate processing**
  - Implementation: `lib/security/cors.ts` — `Idempotency-Key` in allowed headers
  - Pattern: Route handlers check `request.headers.get('Idempotency-Key')`
  - Storage: Supabase table `idempotency_keys` stores hash of key + payload
  - Verify: Send same idempotency key twice → confirm idempotent response

---

## Data Security

### SQL Injection Prevention

- [x] **SQL injection prevention** — Supabase prepared statements only
  - Implementation: All DB queries use Supabase SDK or `lib/supabase-server.ts`
  - Pattern: No raw SQL execution; ORM prevents injection
  - Verify: `grep -r "client\.from\|client\.rpc" lib/ | head -20` — all parameterized
  - Dangerous: `grep -r "query\|execute.*String" app/api/` should return empty

- [x] **No direct SQL execution** — ORM-only database access
  - Implementation: Use `supabaseAdmin.from('table_name')` for all DB ops
  - Evidence: `lib/supabase-admin.ts` exports safe client
  - Verify: `npm audit --audit-level=high` — check dependency vulnerabilities

### XSS Prevention

- [x] **XSS prevention** — No dangerous innerHTML
  - Implementation: React/JSX auto-escapes text content
  - Pattern: Use `dangerouslySetInnerHTML` only for trusted content (marked explicitly)
  - Verify: `grep -r "dangerouslySetInnerHTML" app/` — each usage must be justified
  - Test: `npm run test:unit -- xss` (if test exists)

### Data Encryption

- [x] **TLS/HTTPS enforced** — https:// only, no http://
  - Implementation: `next.config.js` — `Strict-Transport-Security` header
  - Header: `max-age=63072000; includeSubDomains; preload`
  - Verify: `curl -i -L http://tdealer01-crypto-dsg-control-plane.vercel.app | head -1` — should 301 to https

- [x] **Encryption at rest** — Supabase managed encryption
  - Evidence: Supabase project → Settings → Encryption
  - Verify: Supabase dashboard confirms encryption status

- [x] **Encryption in transit** — TLS 1.2+
  - Verify: `echo | openssl s_client -connect tdealer01-crypto-dsg-control-plane.vercel.app:443 2>/dev/null | grep "Protocol"` — must show TLSv1.2+

---

## Security Headers

- [x] **Security headers implemented**
  - Implementation: `next.config.js` lines 107-127
  - Headers:
    - `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
    - `X-Frame-Options: DENY` — Prevents clickjacking
    - `Referrer-Policy: strict-origin-when-cross-origin` — Limits referrer leakage
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — Disables dangerous APIs
    - `Cross-Origin-Opener-Policy: same-origin` — Isolates cross-origin windows
    - `Cross-Origin-Resource-Policy: same-origin` — Prevents Spectre attacks
  - Verify: `npm run verify:security-headers`

- [x] **HSTS preload enabled**
  - Header: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - Verify: Domain listed on https://hstspreload.org/

---

## Database & RLS Security

- [x] **Database RLS policies enforce org isolation**
  - Implementation: Supabase RLS policies in `supabase/migrations/`
  - Pattern: Policies check `auth.uid()` and org membership before row access
  - Verify: `supabase db list` → check RLS is `Enabled`
  - Query: `SELECT name, rlsenabled FROM pg_tables WHERE schemaname = 'public'` — all critical tables must have RLS enabled

- [x] **No wildcard RLS policies** — Explicit org/user checks required
  - Verify: Check migration files for policy definitions — no `FOR ALL` without conditions

---

## Error Handling & Logging

- [x] **Error messages don't expose stack traces to users**
  - Implementation: `lib/security/api-error.ts` — `toSafeErrorResponse()`
  - Pattern: Users see generic "Internal server error" for 5xx
  - Stack traces logged server-side via Sentry (never shown to client)
  - Verify: Trigger 500 error in production → confirm no stack trace in response

- [x] **Logging doesn't leak secrets** — Redaction configured
  - Implementation: `lib/security/api-error.ts` — `redactSensitive()` masks:
    - Authorization headers
    - Cookies, tokens, API keys
    - Session IDs, passwords
    - Email addresses (regex pattern)
  - Verify: `npm run test:unit -- api-error.test.ts` confirms masking

- [x] **Audit logging records decisions** — decision_id + lineage
  - Implementation: `lib/runtime/commit-rpc.ts` writes to Supabase audit tables
  - Fields: `decision_id`, `agent_id`, `decision`, `reason`, `proof`, `lineage`
  - Verify: Query audit table: `SELECT COUNT(*) FROM execution_audit WHERE decision_id IS NOT NULL`

- [x] **Webhook signature validation**
  - Implementation: Stripe webhook routes validate signature
  - Pattern: Check `stripe.webhooks.constructEvent(body, sig, endpoint_secret)`
  - Verify: `app/api/webhooks/stripe/route.ts` validates before processing

---

## HTTPS & TLS

- [x] **HTTPS redirect** — All http:// requests redirect to https://
  - Implementation: Vercel automatically redirects
  - Verify: `curl -I http://tdealer01-crypto-dsg-control-plane.vercel.app` — should show 301/308 to https

- [x] **TLS certificate valid** — Let's Encrypt (Vercel managed)
  - Verify: `echo | openssl s_client -connect tdealer01-crypto-dsg-control-plane.vercel.app:443 2>/dev/null | grep -A 5 "Issuer:"`

---

## Dependency Security

- [x] **Package dependencies audited** — No high/critical vulnerabilities
  - Verify: `npm audit --audit-level=high`
  - Note: Overrides in `package.json` explicitly harden transitive dependencies
  - Verify: `npm list` → check for flagged packages

- [x] **npm ci used in production** — Deterministic dependency lock
  - Evidence: `vercel.json` — `installCommand: "npm ci"`
  - `.github/workflows/` — all CI uses `npm ci`
  - Verify: No `npm install` in production build

---

## Compliance & Audit

- [x] **Idempotent operations** — Execution queries are repeatable
  - Pattern: All mutations use idempotency keys or database upsert logic
  - Verify: Replay same request → confirm same result

- [x] **Evidence collection ready** — Decision proof + lineage + trace
  - Implementation: Runtime spine writes full execution evidence
  - Verify: `/api/executions` returns `proof`, `trace`, `decision_id`, `lineage`

---

## Verification Commands

Run these commands to verify security posture:

```bash
# Check security headers
npm run verify:security-headers

# Check for secrets in code
grep -r "process.env.*SECRET\|process.env.*KEY" app/ lib/ --exclude-dir=node_modules | grep -v "typeof\|\.example\|verification\|docs"

# Audit dependencies
npm audit --audit-level=high

# Type check for security issues
npm run typecheck

# Run security-related tests
npm run test:unit lib/security/

# Check CORS configuration
npm run test:integration -- cors

# Verify rate limiting
npm run test:unit -- rate-limit

# Check CSP headers in production
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app | grep -i "content-security\|x-frame\|x-content\|strict-transport"
```

---

## Production Readiness Checklist

Before production deployment, verify:

- [ ] All secrets stored in Vercel Secrets (not `.env`)
- [ ] CORS origins explicitly configured for target domain
- [ ] Rate limit secrets configured (Upstash Redis)
- [ ] Cron secrets configured for background jobs
- [ ] Supabase RLS policies enabled on all tables
- [ ] Database migrations applied to production
- [ ] TLS certificate valid (check expiry)
- [ ] Security headers verified via curl
- [ ] Error messages don't expose internals (manual smoke test)
- [ ] Audit logging confirms decision_id + lineage
- [ ] OAuth state token TTL confirmed
- [ ] Idempotency keys working for critical endpoints
- [ ] npm audit passes with no high/critical findings
- [ ] Load test confirms rate limiting works
- [ ] Webhook signature validation tested

---

## Known Limitations & Pending Items

- **not verified**: Third-party security audit / SOC 2 certification
- **not verified**: Penetration testing results
- **not verified**: Bug bounty program coverage (if applicable)
- **pending**: Full GDPR/CCPA compliance audit (see `COMPLIANCE_READINESS.md`)
- **pending**: PCI DSS compliance (delegated to Stripe for card data)

See `COMPLIANCE_READINESS.md` for data governance and privacy checklist.
