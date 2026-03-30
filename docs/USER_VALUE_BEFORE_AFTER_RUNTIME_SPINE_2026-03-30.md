# USER VALUE + BEFORE/AFTER ANALYSIS (DSG Runtime Spine)

Date: 2026-03-30 (UTC)

## GITHUB_CONTEXT
- READY
- Verified heads (main):
  - DSG-ONE: `5db884f965fc5c352afdfc4b4bc468d1565d9c98`
  - tdealer01-crypto-dsg-control-plane: `dde324291ad743ff4ec3af81539e9ecdd7163984`
  - DSG-Deterministic-Safety-Gate: `3e62eeb102da2c40861c2f0495ca8c07e82fede9`
  - dsg-Legal-Governance: `152388cdcf6e0fc2ac905ba6bcdb5fe244e369da`
- `DSG-Gate-` was not readable from this execution context (auth/visibility issue).

## 1) What users concretely get from the product surface (จับต้องได้)

From the verified control-plane routes and UI surface, users receive:

1. **Execution Safety Flow (Intent -> Approval -> Execute)**
   - `POST /api/intent` creates signed approval metadata and TTL.
   - `POST /api/execute` validates approval integrity, anti-replay status, epoch, and executes through the runtime spine.

2. **Deterministic Decision Output**
   - Decision outcomes are explicit and stable: `ALLOW`, `STABILIZE`, `BLOCK`.
   - Gate decisions include reason codes and metrics (velocity, drift, oscillation).

3. **Evidence + Audit Trail**
   - Every execution path writes ledger entry hash-chain metadata.
   - Execution is mirrored into audit evidence payload with approval/input/entry/state hashes.

4. **Mission/Operations visibility**
   - Dashboard includes command center, mission, operations, executions, proofs, ledger, capacity, billing, audit.
   - Command center calls live APIs for health, capacity, usage, audit, and monitor history.

5. **Org/Agent access controls + usage/billing hooks**
   - Runtime APIs require active agent bearer authentication.
   - Runtime summary joins truth state + approvals + effects + ledger + usage + agents.

## 2) Before vs After (when compared to the standalone Node snippet in user prompt)

### Before (Standalone v1.4 snippet characteristics)
- Single process, file-based state (`state.json`, `approvals.json`, `effects.json`, `ledger.jsonl`).
- Local anti-replay + hash-chain are present.
- No built-in multi-tenant org model, agent auth, billing loop, or first-class dashboard contract.

### After (Current control-plane runtime)
- DB-backed state and records (`runtime_truth_state`, `approvals`, `effects`, `ledger_entries`, `executions`, `audit_logs`).
- Approval + execute flow is bound to org and agent identity.
- Runtime decision is operationalized into API + dashboard + audit + usage surfaces.
- Product is more deployable for team operations and governance workflows.

## 3) Expected user outcomes per main menu (ครบเมนูหลัก)

- **Dashboard / Command Center**: real-time readiness summary + suggested actions.
- **Mission / Operations / Executions**: execution visibility, decisions, and operational traces.
- **Proofs / Ledger / Audit**: inspect integrity and evidence trails.
- **Capacity / Billing**: quota and commercial readiness signals.

## 4) Can this system "work instead of the user" (ทำงานแทนผู้ใช้ได้แค่ไหน)

Short answer: **partially yes**.

What it can do automatically now:
- Enforce gate constraints on every execution attempt.
- Reject replay / expired / mismatched approval payloads.
- Persist deterministic audit evidence and hashes.
- Surface monitor/audit/capacity signals for operator action.

What still needs user/operator decision:
- Policy tuning and governance sign-off.
- Incident triage and remediation prioritization.
- Business-level approval over STABILIZE/BLOCK workflows.

## 5) Security comparison (ความปลอดภัย)

### Security strengths visible in runtime
- Anti-replay semantics on approvals.
- Integrity binding via input hash + approval hash.
- Hash-linked ledger entries.
- Auth-gated agent execution path.
- Decision reasons and metrics retained in audit evidence.

### Important boundary
- Verified formal core claims (determinism/safety invariance/constant-time) are treated as verified artifact for DSG gate core only.
- End-to-end product proof (UI + DB + monitor + billing + integrations) is **not** auto-proven by that artifact.

## 6) Source-of-truth map used in this pass

- Formal gate core truth: `DSG-Deterministic-Safety-Gate`
- Product runtime truth: `tdealer01-crypto-dsg-control-plane`
- Legal/governance narrative: `dsg-Legal-Governance`
- `DSG-Gate-`: จุดนี้ยังยืนยันไม่ได้จากไฟล์และข้อมูลที่มองเห็นอยู่

## 7) Required uncertainty statements

- จุดนี้ยังยืนยันไม่ได้จากไฟล์และข้อมูลที่มองเห็นอยู่
- มองไม่เห็น repo/file/config ที่จำเป็นต่อการสรุปจุดนี้
- ไม่มีหลักฐานพอจะสรุปเป็น fact
