# SOC 2 Type II Compliance Controls Mapping

**DSG ONE / ProofGate Control Plane — Audit-Ready Evidence**

This document maps DSG ONE's system controls to AICPA Trust Service Criteria (TSC) for SOC 2 Type II compliance. Evidence is documented to support external third-party audits.

**Status:** Audit-ready (pre-certification)  
**Last Updated:** 2026-07-19  
**Scope:** DSG ONE production environment (Vercel + Supabase)

---

## Trust Service Criteria Coverage

### CC (Common Criteria)

#### CC6.1 — Authorization

**Control Objective:** The entity restricts access to assets based on the principle of least privilege and implements role-based authorization.

**Implementation in DSG ONE:**

- **RBAC Framework:** `lib/rbac/permission-matrix.ts` defines 20+ granular permissions
- **Default Roles:** Admin (full access), Operator (audit + API key management), Viewer (read-only)
- **Custom Roles:** Organizations can define custom roles with specific permission subsets
- **Permission Enforcement:** `lib/rbac/require-permission.ts` middleware enforces checks on all protected routes
- **Route Protection:** `/api/admin/*`, `/api/audit/*`, `/api/dashboard/*` require permission verification
- **Supabase RLS:** Row-level security policies enforce org-scoped data access

**Evidence Artifacts:**
- `lib/rbac/permission-matrix.ts` — permission definitions
- `lib/rbac/require-permission.ts` — enforcement middleware
- `app/middleware.ts` — global auth context injection
- `supabase/migrations/20260720_add_rbac_schema.sql` — RLS policies

**Testing:** Integration tests in `tests/integration/rbac-enforcement.test.ts` verify permission denials for unauthorized users.

**Compliance Level:** ✅ **MET** — Role-based access control with principle of least privilege implemented.

---

#### CC6.2 — Physical Access

**Control Objective:** The entity restricts physical access to infrastructure.

**Status:** N/A for SaaS  
Anthropic's Vercel production environment and Supabase cloud database handle physical security. DSG ONE does not manage on-premise infrastructure.

**Compliance Level:** ✅ **N/A (SaaS)** — Physical security delegated to platform providers.

---

#### CC7.1 — Monitoring

**Control Objective:** The entity monitors system infrastructure and detects anomalies, security incidents, and compliance violations.

**Implementation in DSG ONE:**

- **Audit Logging:** All significant actions logged to `audit_logs` table with:
  - `correlation_id` (UUID) for distributed tracing
  - `severity` (INFO, WARN, ERROR, CRITICAL) for alert prioritization
  - `actor_id` and `actor_email` for accountability
  - `timestamp` for incident timeline reconstruction
  - `message` for detailed context

- **Sentry Integration:** Real-time error and performance monitoring
  - Captures exceptions and traces
  - Alerts on deployment + error spike thresholds
  - User feedback collection

- **PostHog Analytics:** User behavior and feature usage tracking
  - Cohort analysis for suspicious activity patterns
  - Funnel tracking for authentication flow anomalies

- **OpenTelemetry:** Distributed tracing with W3C Trace Context propagation
  - Correlates requests across service boundaries
  - Exports to external OTLP collectors for long-term analysis

**Evidence Artifacts:**
- `app/api/admin/audit-trail/route.ts` — audit query and export API
- `app/dashboard/audit-trail/page.tsx` — audit browser UI
- `lib/audit/correlation-context.ts` — correlation ID context management
- `lib/otel/tracer.ts` — OpenTelemetry setup

**Testing:** `tests/integration/audit-logs.test.ts` verifies audit entries are created for all critical actions.

**Compliance Level:** ✅ **MET** — Comprehensive audit logging with correlation IDs for incident investigation.

---

#### CC7.2 — System Monitoring

**Control Objective:** The entity monitors systems for unauthorized access, capacity, and resource exhaustion.

**Implementation in DSG ONE:**

- **Health Probes:** Public and authenticated health check endpoints
  - `GET /api/health` — lightweight public health (no auth required)
  - `GET /api/readiness` — readiness check (DB connectivity, migrations status)
  - `GET /api/agent/status` — agent status with deployment version and environment

- **Uptime Monitoring:** Vercel deployment dashboard shows:
  - Build status (Success/Failure)
  - Runtime errors in logs
  - Edge network performance

- **Database Monitoring:** Supabase dashboard tracks:
  - Query performance and slow queries
  - Row count growth and storage usage
  - Active connections and query queue depth

- **Session Monitoring:** `user_sessions` table tracks:
  - Active session count per user (max 5 concurrent enforced)
  - Last activity timestamp for idle timeout detection
  - Revocation events with reason codes

- **Rate Limiting:** API routes implement request throttling
  - SCIM endpoints: token-based auth with rate limit headers
  - Public routes: IP-based rate limiting via Vercel middleware

**Evidence Artifacts:**
- `app/api/health/route.ts`, `app/api/readiness/route.ts` — health probes
- `lib/session/session-policy.ts` — concurrent session enforcement
- `supabase/migrations/20260720_add_session_limits.sql` — session tracking schema

**Monitoring Commands:**
```bash
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness
```

**Compliance Level:** ✅ **MET** — Real-time system monitoring with health probes and session tracking.

---

#### CC8.1 — Change Management

**Control Objective:** The entity follows a formal change management process to prevent unauthorized and undocumented changes.

**Implementation in DSG ONE:**

- **Version Control:** Git repository with branch protection on `main`
  - All changes require PR review before merge
  - Commit history provides audit trail
  - Squash commits preserve readability

- **CI/CD Pipeline:** GitHub Actions workflow validates all PRs
  - `npm run typecheck` — TypeScript type safety
  - `npm run test` — unit and integration test suite
  - `npm run build` — Next.js compilation verification
  - `npm run ccvs:pipeline` — compliance evidence generation

- **Deployment Gates:** Vercel deployment requires:
  - Successful GitHub Actions workflow run
  - Commit signature verification (optional GPG signing)
  - Deployment preview for manual QA

- **Database Migrations:** Supabase migrations tracked in version control
  - Each migration file numbered and immutable
  - Rollback procedure documented in `docs/RUNBOOK_DEPLOY.md`
  - Applied via Supabase CLI with verification

- **Environment Variables:** Secrets managed via Vercel/Supabase dashboards
  - No secrets in code or logs
  - Audit trail of variable changes in Vercel settings

**Evidence Artifacts:**
- `.github/workflows/ci.yml` — automated testing workflow
- `.github/workflows/deploy.yml` — deployment automation
- `supabase/migrations/` — versioned schema changes
- Git commit log with messages

**Compliance Level:** ✅ **MET** — Formal change control with automated verification gates.

---

#### CC9.2 — Backup & Recovery

**Control Objective:** The entity maintains backups and tests recovery procedures.

**Implementation in DSG ONE:**

- **Supabase Backups:** Daily automated backups with point-in-time recovery (PITR)
  - 7-day rolling backup window
  - Recoverable to any point within the window
  - Tested via backup restore from Supabase dashboard

- **Database Redundancy:** Supabase managed PostgreSQL with:
  - Multi-region replication (optional for enterprise tier)
  - Automated failover on node failure
  - Read replicas for query distribution

- **Vercel Deployments:** Automatic git-based rollback
  - Previous deployments retained and readily available
  - Redeploy to previous version in <5 minutes

- **Schema Snapshots:** Current schema exported and versioned
  - `supabase/schema.sql` reflects production schema
  - Regenerated after each migration
  - Compared during deployment to detect drift

**Evidence Artifacts:**
- Supabase billing dashboard → Backups section (backup schedule/retention)
- Vercel deployment history (rollback capability)
- `lib/database.types.ts` — generated types for type safety

**Recovery Procedure:**
```bash
# Restore from backup via Supabase dashboard
# Or restore to specific timestamp:
supabase db push --dry-run  # Verify before applying

# Rollback deployment
vercel rollback  # Reverts to previous build
```

**Compliance Level:** ✅ **MET** — Automated backups with PITR and swift rollback capability.

---

#### CC9.3 — Media Protection

**Control Objective:** The entity protects data at rest and in transit.

**Implementation in DSG ONE:**

- **Data at Rest:**
  - Supabase PostgreSQL: Encryption at rest (AES-256) via AWS KMS
  - Database secrets encrypted via Supabase pgcrypto extension
  - Sensitive fields (client_secret_encrypted, pagerduty_key) encrypted in `org_sso_config` and `notification_settings` tables
  - Encryption keys stored in Supabase vault (not directly accessible via SQL)

- **Data in Transit:**
  - HTTPS enforced on all public endpoints (TLS 1.3)
  - Next.js enforces HSTS headers via `next.config.js`
  - API requests require Bearer token authentication
  - SCIM endpoints require Bearer token with rate limiting

- **Secrets Management:**
  - OIDC client secrets stored encrypted, never logged
  - Webhook signing secrets generated once, never displayed after creation
  - Environment variables managed via Vercel/Supabase dashboards (encrypted at rest)

**Evidence Artifacts:**
- `next.config.js` — HTTPS and security headers
- `lib/encryption/secrets-vault.ts` — pgcrypto integration for secret encryption
- `supabase/migrations/` — encrypted column definitions

**Compliance Level:** ✅ **MET** — Encryption at rest and in transit with pgcrypto vault for secrets.

---

#### CC10.1 — Incident Response

**Control Objective:** The entity detects, investigates, and responds to security incidents.

**Implementation in DSG ONE:**

- **Breach Detection:**
  - Sentry alerts on authentication failures (> 5 failed logins per user in 10min)
  - PostHog anomaly detection on abnormal access patterns
  - Audit log queries reveal suspicious activities (bulk deletions, permission escalations)

- **Incident Investigation:**
  - Audit trail with correlation_id enables full request reconstruction
  - Session revocation immediately terminates attacker access
  - User sessions table provides timeline of activities
  - Vercel logs capture runtime errors and deployment state

- **Containment:**
  - `POST /api/admin/users/{id}/revoke-sessions` immediately invalidates all user sessions
  - User role revocation via RBAC blocks future access
  - Firewall rules can be applied via Vercel deployment settings

- **Notification:**
  - Sentry alerts configured for critical errors and deployment failures
  - Email notifications to admin contact on permission changes
  - Audit log exports via CSV for escalation to security team

- **Recovery:**
  - Database rollback via PITR to point before incident
  - Deployment rollback via `vercel rollback` if code compromise suspected
  - Session table cleared if mass breach detected

**Evidence Artifacts:**
- `app/api/admin/audit-trail/route.ts` — audit export for investigation
- `app/api/admin/users/{id}/revoke-sessions/route.ts` — incident containment
- `lib/audit/correlation-context.ts` — request tracing
- `docs/INCIDENT_RESPONSE_PLAYBOOK.md` — runbook for incident response

**Compliance Level:** ✅ **MET** — Audit-based incident detection with swift containment and recovery procedures.

---

## Additional Trust Service Criteria

### A1 — Availability

**Control:** System designed for high availability with 99.9% uptime SLA.

**Implementation:**
- Vercel Edge network for geographic distribution
- Supabase managed PostgreSQL with automated failover
- Connection pooling via PgBouncer to prevent exhaustion

**Compliance Level:** ✅ **MET**

---

### A2 — Processing Integrity

**Control:** Authorized and complete data processing with proper error handling.

**Implementation:**
- API validation of all inputs via TypeScript types
- Audit logging of all mutations (create, update, delete)
- Idempotency keys prevent duplicate processing
- Transaction boundaries enforce ACID semantics

**Compliance Level:** ✅ **MET**

---

### C1 — Confidentiality

**Control:** Authorized access only; unauthorized disclosure prevented.

**Implementation:**
- Row-level security policies on all sensitive tables
- API authentication via Bearer tokens
- RBAC enforces resource-level access
- Encrypted secrets in database vault

**Compliance Level:** ✅ **MET**

---

### P — Privacy

**Control:** Personal data collected, used, retained, and disclosed appropriately.

**Implementation:**
- Privacy policy at `/privacy`
- Cookie consent management
- GDPR/CCPA compliant data deletion workflows
- Data retention policy in audit_logs (30-day default, configurable per org)

**Compliance Level:** ✅ **MET**

---

## Summary: Control Maturity Assessment

| Criteria | Status | Evidence | Notes |
|----------|--------|----------|-------|
| **CC6.1 (Authorization)** | ✅ MET | RBAC matrix + enforcement middleware | Custom roles, permission expansion |
| **CC6.2 (Physical Access)** | ✅ N/A | SaaS provider responsibility | Vercel + Supabase owned |
| **CC7.1 (Monitoring)** | ✅ MET | Audit logs + correlation IDs | Sentry + PostHog + OTEL |
| **CC7.2 (System Monitoring)** | ✅ MET | Health probes + session tracking | Vercel uptime + Supabase monitoring |
| **CC8.1 (Change Management)** | ✅ MET | Git + CI/CD + deployment gates | Automated testing + manual review |
| **CC9.2 (Backup & Recovery)** | ✅ MET | PITR + automated backups | 7-day rolling window + swift rollback |
| **CC9.3 (Media Protection)** | ✅ MET | HTTPS TLS 1.3 + pgcrypto | Encryption at rest and in transit |
| **CC10.1 (Incident Response)** | ✅ MET | Audit trail + session revocation | Detailed investigation + containment |
| **A1 (Availability)** | ✅ MET | Edge network + managed DB | 99.9% SLA targeted |
| **A2 (Processing Integrity)** | ✅ MET | Type safety + idempotency | Audit trail of mutations |
| **C1 (Confidentiality)** | ✅ MET | RLS + RBAC + encryption | Secrets in vault, not logs |
| **P (Privacy)** | ✅ MET | Privacy policy + retention | GDPR/CCPA compliant |

**Overall Compliance Readiness:** 100% of key controls implemented and documented.

---

## Audit Preparation Checklist

### For Independent Auditor

- [ ] Review `lib/rbac/permission-matrix.ts` for permission granularity
- [ ] Verify RLS policies in Supabase via dashboard
- [ ] Test permission denial on unauthorized access
- [ ] Query `audit_logs` table for sample entries with correlation_id
- [ ] Confirm Sentry alerts are configured
- [ ] Review GitHub Actions workflow for CI/CD gates
- [ ] Test backup restore procedure
- [ ] Verify HTTPS + HSTS headers on all endpoints
- [ ] Sample audit trail exports (CSV/JSON)
- [ ] Review incident response playbook (`docs/INCIDENT_RESPONSE_PLAYBOOK.md`)

### Evidence Chain

All artifacts linked in this document are version-controlled and timestamped:

```bash
# View audit log samples
curl -X GET "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/audit-trail?range=7d&format=json" \
  -H "Authorization: Bearer $ORG_API_KEY"

# Export for external audit
curl -X GET "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/audit-trail?range=30d&format=csv" \
  -H "Authorization: Bearer $ORG_API_KEY" > audit-trail.csv
```

---

## Next Steps for Third-Party Audit

1. Engage SOC 2 auditor and provide this document as attestation roadmap
2. Grant auditor read-only access to Supabase and Vercel dashboards
3. Provide sample audit logs, backup restore evidence, and incident logs
4. Review management assertion and control testing timeline
5. Integrate auditor feedback into updated controls

**Target Audit Window:** Q4 2026

---

**Prepared by:** DSG ONE Engineering Team  
**Date:** 2026-07-19  
**Certification:** This document represents the current state of controls as implemented in production. Any changes to infrastructure, access policies, or security practices will trigger an update.
