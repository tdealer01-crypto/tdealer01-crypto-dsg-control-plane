# GO/NO-GO Decision Logic — DSG Reference

## Decision tree

```
gate_status == BLOCK
  → NO-GO (halt immediately, log proofHash as evidence)

gate_status == UNSUPPORTED AND risk_level IN [medium, high, critical]
  → NO-GO

gate_status == UNSUPPORTED AND risk_level == low
  → REVIEW (request human check)

gate_status == REVIEW AND no_approval_recorded
  → NO-GO (gate on approval)

gate_status == REVIEW AND approval_recorded
  → GO (with approval evidence stored)

gate_status == PASS AND proof_hash present
  → GO

proof_hash empty OR missing
  → NO-GO (evidence gap — never proceed without proof)

HTTP 402 (quota exceeded)
  → NO-GO (upgrade required — show upgradeUrl)

HTTP 429 (rate limit)
  → Retry with exponential backoff (max 3 retries)
  → If still 429 after retries → NO-GO

HTTP 5xx
  → Retry with backoff (max 2 retries)
  → If still failing → NO-GO (gate is unavailable — fail closed)
```

## CI workflow integration

```yaml
- name: DSG Gate — Production Deploy
  id: dsg_gate
  uses: tdealer01-crypto/dsg-control-plane/.github/actions/gate-evaluate@v1
  with:
    dsg_api_key: ${{ secrets.DSG_API_KEY }}
    agent_id: ${{ vars.DEPLOY_AGENT_ID }}
    action_type: production_deployment
    risk_level: high
    idempotency_key: ${{ github.run_id }}-${{ github.run_attempt }}

- name: Halt if BLOCK
  if: steps.dsg_gate.outputs.gate_status == 'BLOCK'
  run: |
    echo "DSG Gate BLOCK: ${{ steps.dsg_gate.outputs.proof_hash }}"
    exit 1

- name: Request approval if REVIEW
  if: steps.dsg_gate.outputs.gate_status == 'REVIEW'
  uses: tdealer01-crypto/dsg-control-plane/.github/actions/request-approval@v1
  with:
    dsg_api_key: ${{ secrets.DSG_API_KEY }}
    proof_hash: ${{ steps.dsg_gate.outputs.proof_hash }}
```

## Fail-closed principle

If the gate endpoint is unreachable or returns an unexpected status:
- **Always fail closed** (NO-GO)
- Log the HTTP status and `proofHash` (if available) as evidence
- Never default to PASS when gate is unavailable

This mirrors financial system design: if the risk engine is down, transactions halt.
