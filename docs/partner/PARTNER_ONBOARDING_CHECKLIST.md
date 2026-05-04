# DSG ONE Partner Onboarding Checklist

## Before Access

- [ ] Partner identity verified
- [ ] Company verified
- [ ] Contact email verified
- [ ] Access purpose written
- [ ] Environment selected: staging / partner-preview
- [ ] No production secrets shared
- [ ] No Supabase service role shared
- [ ] No Vercel production env edit access
- [ ] No GitHub admin access
- [ ] Access revocation owner assigned

## Before NDA

Allowed:
- [ ] Public docs
- [ ] API overview
- [ ] Staging/demo URL
- [ ] Demo workspace
- [ ] Scoped partner token if needed
- [ ] GitHub read/fork access if approved

Blocked:
- [ ] Production secrets
- [ ] Service role
- [ ] Production DB
- [ ] Internal service token
- [ ] Execution API authority
- [ ] Policy write
- [ ] Deployment authority

## After NDA

Allowed:
- [ ] Repository access
- [ ] Architecture docs
- [ ] API contracts
- [ ] Staging token
- [ ] Preview deployment logs
- [ ] Redacted logs
- [ ] Partner API facade work
- [ ] Bubble integration work

Still protected:
- [ ] Production env values
- [ ] Service role
- [ ] GitHub admin
- [ ] Vercel owner/admin
- [ ] Direct production DB
- [ ] Core governance bypass

## Required Gates Before Production Claim

- [ ] Typecheck PASS
- [ ] Tests PASS
- [ ] E2E live PASS, not skipped
- [ ] Vercel Ready verified
- [ ] Env validation PASS
- [ ] Supabase applied-state proof PASS
- [ ] /api/health PASS
- [ ] /api/readiness PASS
- [ ] /api/finance-governance/readiness PASS
- [ ] Authenticated operator checks PASS
- [ ] GO/NO-GO PASS
- [ ] Evidence committed to qa-logs/
