# DSG Implementation Playbook for Consultants

Purpose: give consultants a step-by-step pilot path for implementing DSG as an AI governance control layer.

Boundary: this playbook is for implementation planning and pilot delivery. It is not a certification procedure.

## Phase A: Discovery

1. Complete client intake questionnaire.
2. Complete AI workflow inventory.
3. Classify action risk.
4. Select one pilot workflow.
5. Identify evidence requirements.

## Phase B: Mode selection

| Client requirement | DSG mode |
|---|---|
| DSG can execute configured endpoint | Gateway Mode |
| Client must keep API keys and runtime internal | Monitor Mode |
| Deployment must be gated before production | GitHub Secure Deploy Gate Action |

## Phase C: Pilot implementation

### Monitor Mode pilot

```text
AI agent or workflow
→ POST /api/gateway/plan-check
→ DSG returns decision, auditToken, requestHash
→ customer runtime executes approved action
→ POST /api/gateway/audit/commit
→ DSG returns recordHash
→ export audit evidence
```

### Gateway Mode pilot

```text
Register connector
→ POST /api/gateway/tools/execute
→ DSG checks policy/risk/approval/invariants
→ DSG executes configured endpoint
→ DSG returns provider result and hashes
```

### CI/CD deploy gate pilot

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1
  with:
    readiness_url: "https://your-app.example.com/api/health"
    expected_status: "200"
    require_json_ok: "true"
```

## Phase D: Evidence review

Collect:

- plan-check response
- audit commit response
- requestHash
- recordHash
- audit export JSON
- GitHub Action run evidence if applicable
- production evidence page screenshot or link

## Phase E: Report

Use `client-report-template.md` to summarize:

- workflows assessed
- risks found
- DSG controls mapped
- pilot results
- evidence gaps
- recommended hardening items

## Phase F: Hardening path

Recommended order:

1. Signed evidence bundle
2. Approval workflow UI
3. Policy template library
4. Organization workspace
5. Usage metering
6. Billing and onboarding
7. External solver mode

## Completion criteria

A pilot is complete when:

1. One workflow is inventoried.
2. Risk level is assigned.
3. DSG mode is selected.
4. plan-check or gateway execution runs successfully.
5. requestHash and recordHash are produced.
6. audit export is available.
7. client report is delivered.
