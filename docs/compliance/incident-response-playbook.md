# Incident Response Playbook

**Applies to**: DSG Control Plane production environment
**Contact**: Tar (tdealer01-crypto)

---

## Severity Matrix

| Severity | Definition | Examples | Response SLA | Escalation |
|----------|------------|----------|--------------|------------|
| P1 | Service down / data breach / financial impact | Stripe webhook fail, DB RLS bypass | 30 min | Engineering + finance lead |
| P2 | Degraded but functional | API latency > 5s, auth errors | 2 hr | On-call engineer |
| P3 | Incorrect behavior, no data risk | Wrong UI state, missing docs | 24 hr | Next sprint |
| P4 | Cosmetic / enhancement | Typos, UI polish | Best effort | Backlog |

---

## Roles

| Role | Responsibility |
|------|----------------|
| Incident Commander | Coordinate response, declare severity, communicate status |
| Investigator | Find root cause via `/api/audit`, logs, evidence bundle |
| Communicator | Customer notification, status page |

---

## Procedure

1. **Detect**
   - Health endpoint: `GET /api/health`
   - Evidence pack: `GET /api/compliance-evidence-pack`
   - Audit trail: `GET /api/audit`

2. **Triage**
   - Assign severity from matrix above
   - If P1 or P2 involving financial data: notify engineering + finance lead immediately

3. **Contain**
   - Disable offending agent via `POST /api/agent/commands` (requires approval)
   - Enable maintenance mode if needed

4. **Investigate**
   - Pull audit bundle for affected timeframe
   - Check `finance_governance_audit_ledger` for finance-impacted actions
   - Check `gateway_monitor_events` for decision drift

5. **Remediate**
   - Apply configuration fix
   - Verify via `POST /api/agent/preflight`
   - Re-run affected integration tests

6. **Notify**
   - Affected users via `/api/notifications` (if implemented)
   - Update status page
   - Legal: if breach likely, notify within 72h per applicable regulation

7. **Post-mortem**
   - Update this playbook with open items
   - Create regression test for root cause

---

## Breach Notification Timeline

| Step | Deadline |
|------|----------|
| Internal detection | Immediate |
| Engineering lead notified | 30 min |
| Legal counsel consulted | 24 hr (if P1 with data impact) |
| Customer notification | 72 hr max (EU AI Act / GDPR) |

---

*Last reviewed: 2026-06-23*
