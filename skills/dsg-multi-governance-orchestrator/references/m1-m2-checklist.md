# M1/M2 Gate Checklist — DSG Reference

## M1: Production Cutover checklist

```
Public health probes
[ ] GET /api/health                → { ok: true }
[ ] GET /api/readiness             → { ok: true, db: true }
[ ] GET /api/agent/status          → correct commit + environment + db check

DSG Gate functionality
[ ] GET  /api/dsg/v1/policies/manifest → policyVersion + constraintSetHash present
[ ] POST /api/dsg/v1/gates/evaluate    → gateStatus: PASS with proofHash
[ ] POST /api/dsg/v1/proofs/prove      → proof reproducible from stored hash
[ ] GET  /api/dsg/v1/pricing           → tier definitions correct

Auth and protected routes
[ ] Unauthenticated GET /dashboard → 401 or redirect to login
[ ] Unauthenticated GET /approvals → 401 or redirect to login
[ ] Invalid ****** → 401 on all /api/dsg/v1/* routes

Database
[ ] Supabase migrations applied (verified by query result, not file existence)
[ ] dsg_gate_usage table exists with correct schema
[ ] runtime_evidence table exists with correct schema

Deployment
[ ] Vercel deployment status: Ready
[ ] Required env vars present by name (not value): DSG_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY
[ ] npm run go:no-go <production-url> → PASS
```

**Default: NO-GO until all boxes checked with current evidence.**

---

## M2: Hardening + Launch checklist

```
Compliance evidence
[ ] npm run ccvs:pipeline → L1-L5 matrix generated without FAIL
[ ] ccvs-compliance-matrix.json present with passing evidence chain
[ ] SHA256SUMS generated over evidence bundle

Security
[ ] Secret scanning clean (gitleaks + GitHub secret scanning: 0 open alerts)
[ ] CodeQL: 0 high/critical open alerts
[ ] npm audit --audit-level=high → 0 vulnerabilities

Billing
[ ] Stripe keys are production (not test) for paid tiers
[ ] DSG Gate Pro ($99/mo) creates Stripe checkout session
[ ] DSG Gate Enterprise ($499/mo) creates Stripe checkout session
[ ] Quota enforcement: Free tier blocked at 51st evaluation

Evidence replay
[ ] End-to-end replay test: evaluate → store proofHash → prove → decision matches
[ ] Policy version consistency: changing policyVersion invalidates cached replay

Hermes (Enterprise tier only)
[ ] Plan proposal generates deterministic planHash
[ ] Conformance gate blocks mismatched planHash
[ ] Credential broker returns lease fingerprint (not raw secret)
[ ] Evidence capture stores step results in Supabase
```

---

## Evidence record format (per M1/M2 gate)

When reporting M1 or M2 status, always include:

```
Gate: <name>
Status: GO | NO-GO | PENDING | BLOCKED
Evidence: <command run + result OR "Not run — <reason>">
Timestamp: <ISO 8601>
Known limits: <what is still pending>
```

Never claim GO without current evidence. Use PENDING if evidence is missing.
