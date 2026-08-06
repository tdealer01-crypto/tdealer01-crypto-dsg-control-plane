# DSG Feature Mapping

Purpose: map DSG product features to AI governance and evidence workflows.

Boundary: this mapping describes product workflow support. It is not a certification claim.

## Mapping

| Governance need | DSG feature | Evidence produced | Status |
|---|---|---|---|
| Control AI actions before execution | Deterministic action gate | allow, block, or review decision | Implemented |
| Identify who requested an action | Actor headers and audit record | actorId and actorRole | Implemented |
| Scope action to an organization | Organization headers and event scope | orgId | Implemented |
| Confirm tool is known | Connector and tool registry | toolName and connector record | Implemented |
| Confirm requested action is allowed | Runtime invariant check | actionMatchesTool result | Implemented |
| Check plan entitlement | Plan enforcement | planEntitled result | Implemented |
| Route sensitive actions for approval | Risk and approval gate | approvalRequired and decision | Implemented |
| Keep customer API keys outside DSG | Monitor Mode | auditToken plus customer runtime result | Implemented |
| Preserve request evidence | Request hashing | requestHash | Implemented |
| Preserve result evidence | Record hashing | recordHash | Implemented |
| Export audit records | Audit export endpoint | JSON export | Implemented |
| Gate production deploys | GitHub Secure Deploy Gate Action | verdict and evidence_hash | Implemented |
| Package portable evidence | Signed evidence bundle | bundle hash and report | Planned |
| Create human-readable evidence | PDF evidence report | PDF report | Planned |
| Reuse governance policies | Control library | named templates | Planned |

## Safe wording

DSG maps AI execution controls to concrete product features, including deterministic gating, invariant checks, audit proof, and exportable evidence records.
