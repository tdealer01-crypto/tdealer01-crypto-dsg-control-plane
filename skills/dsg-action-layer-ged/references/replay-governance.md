# Replay governance: requirements and gaps

A replay is a review of recorded evidence against the exact policy, plan, adapter, and verifier versions that were in force. This repository does not provide a live replay endpoint or claim a hosted evidence database.

## Collect before replay

- Original user goal, target, and scoped action
- Plan and policy versions
- Route and adapter identity
- Approval and entitlement record
- Bound payload digest or an explicit reason it was not stored
- Provider result and source timestamp
- Evidence chain and attestation, if present
- Verifier version and verification outcome

Recompute what can be independently recomputed. Preserve the original records and report any missing link. If a source cannot be retrieved, report the replay as incomplete or UNVERIFIED; never synthesize a historical record or infer that a database write occurred.
