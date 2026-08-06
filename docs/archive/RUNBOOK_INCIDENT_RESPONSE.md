# RUNBOOK: Incident Response

## Severity model
- **SEV-1**: Runtime execution path down, safety enforcement unavailable, or core dependency outage.
- **SEV-2**: Partial degradation (billing/usage delays, monitor warnings).
- **SEV-3**: Non-critical issues with workaround.

## Detection and triage
1. Check service health:
   - `GET /api/health`
   - `GET /api/core/monitor`
2. Capture latest errors from Vercel logs and Supabase logs.
3. Classify failure mode.

## Failure mode playbook
### `CORE_HEALTH_DOWN`
- Symptom: `/api/core/monitor` not ready.
- Action:
  1. Validate DSG Core URL/API key env vars.
  2. Validate DSG Core deployment status.
  3. Rollback DSG Core if recent deploy correlates with incident.

### `BILLING_UNAVAILABLE`
- Symptom: usage/billing endpoints failing or Stripe webhook backlog.
- Action:
  1. Verify Stripe keys + price IDs are present.
  2. Inspect webhook delivery failures and replay if required.
  3. Validate Supabase connectivity and billing tables.

### `RUNTIME_LINEAGE_ERROR`
- Symptom: runtime commit/checkpoint inconsistencies.
- Action:
  1. Pause risky automation paths if needed.
  2. Execute runtime recovery endpoint.

## Runtime state recovery
Trigger recovery flow:

```bash
curl -X POST -sS "$CONTROL_PLANE_URL/api/runtime-recovery"
```

Confirm response indicates completed recovery and re-test execution flow.

## Escalation
- SEV-1: Page on-call engineer immediately, escalate to product owner if >15 min.
- SEV-2: Notify on-call in incident channel and assign owner.
- Include timestamps, impact radius, and mitigation status in every update.

## Closure checklist
- Root cause identified.
- Mitigation and permanent fix tracked.
- Post-incident summary documented.
- Runbook updated if gap found.
