# DSG ONE Partner Access Policy

## Purpose

This policy defines what a DSG ONE implementation/commercial partner may access before and after legal agreement.

The goal is to let the partner build, fix, operate, and sell the storefront, Bubble operator layer, and partner-facing product surface without exposing DSG core governance authority, production secrets, customer data, or production execution bypasses.

## Operating Model

```text
Open contribution
Controlled production
Partner API boundary
Owner-held DSG core authority
Automated checkpoint gates
```

## Phase 0 — Before NDA / Before Legal Agreement

Allowed:
- Public documentation
- Public product pages
- Public health/readiness endpoints
- API contract preview
- OpenAPI examples
- Bubble integration discussion
- Demo screenshots / demo workspace
- GitHub read access or fork/PR access if approved
- Staging/partner-preview API token if scoped and revocable

Not allowed:
- Production secrets
- Supabase service role key
- Direct production database access
- Vercel production environment edit
- GitHub admin
- GitHub Actions secrets
- Internal service token
- Stripe secret key
- Provider API keys
- Production execution authority
- Policy-write authority
- Cross-customer data access
- Destructive migrations

## Phase 1 — After NDA

Allowed:
- Full architecture review
- Repository access
- Branch / PR contribution
- API contract and route map
- Non-secret migration files
- Partner integration guide
- Staging URL
- Staging partner API token
- Demo workspace
- Redacted logs
- Preview deployments
- Bubble operator build access

Still protected:
- Production secrets
- Supabase service role
- Direct production DB admin
- Vercel production env values
- GitHub repo admin
- Internal service token
- Core execution bypass
- Customer raw data
- Cross-workspace data

## Phase 2 — After Pilot / Maintainer Agreement

Allowed:
- Partner Maintainer role
- GitHub write access
- Staging deploy and test
- Preview deployment review
- Partner API facade improvements
- Storefront and Bubble UI management
- Customer onboarding surface
- Checkout/commercialization shell
- Non-core backend fixes
- Production deployment only when gates pass and protected paths are not touched

Checkpoint required:
- DSG core governance changes
- Policy / gate / execution logic
- Audit ledger / evidence / replay proof authority
- Auth / RBAC
- Billing secret logic
- Production environment
- Destructive migrations
- Deployment-control changes
- Cross-workspace access
- Any high/critical-risk action

## Partner Maintainer Allowed Work

Partner may maintain and improve:
- Bubble storefront
- Bubble operator UI
- Landing pages
- Pricing pages
- Request-access flow
- Checkout UI
- Onboarding flow
- Partner dashboard
- Customer demo workspace
- API response mapping
- Partner API facade
- Documentation
- Integration guide
- Customer-facing product copy
- Staging validation
- Preview deployment testing

## Protected Core Boundary

Partner must not bypass owner checkpoint for:
- lib/dsg/core/**
- lib/dsg/runtime/**
- lib/dsg/gates/**
- lib/dsg/audit/**
- lib/dsg/evidence/**
- lib/dsg/executor/**
- lib/dsg/policy/**
- lib/dsg/crypto/**
- app/api/execute/**
- app/api/spine/**
- app/api/mcp/**
- app/api/gateway/tools/**
- app/api/executors/**
- supabase/migrations/**
- production env/secrets
- production DB authority
- deployment authority
- billing secrets

## Legal Boundary

NDA protects confidential information.
Access control protects the production system.
Both are required.

Before broad backend/operations access, the following agreements should be in place:
- NDA
- Master Service Agreement
- Data Processing Agreement if any personal data is processed
- IP ownership / assignment
- Security addendum
- Incident response clause
- Access revocation clause
- No unauthorized production claims clause
- No cross-customer data access clause
- No secret copying clause
- No production deployment bypass clause

## Claim Boundary

Allowed customer-facing claim:
DSG ONE provides a governed runtime control layer for AI, workflow, finance, and deployment actions with policy gates, readiness checks, audit evidence, and operator monitoring.

Forbidden unless separately verified:
- Production-certified
- Bank-certified
- ISO certified
- Guaranteed compliance
- Fully autonomous payment approval
- All customer systems protected
- External Z3 production solver complete
- WORM evidence storage complete
- Third-party audited

## Access Revocation

All partner access must be revocable.

Access must be revoked immediately if:
- agreement terminates
- key/token is suspected leaked
- unauthorized data export occurs
- production boundary is bypassed
- false customer-facing claims are published
- protected core is modified without checkpoint
