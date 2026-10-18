# Compliance evidence: inventory and claim limits

Use this checklist to organize evidence that has actually been supplied or retrieved from an authorized source. This repository does not provide a compliance scan endpoint or paid evidence service.

## Evidence inventory

| Area | Evidence to record |
|---|---|
| User goal | Exact requested outcome and target |
| Plan and policy | Versioned plan, policy decision, and scope |
| Route and adapter | Discovered capability, schema, and adapter identity |
| Authority | Entitlement and approval evidence from the responsible control plane |
| Payload binding | Bound input identity or digest and permitted handling |
| Execution | Provider result, execution identifier, and source |
| Verification | Schema checks, result checks, SHA-256, or signature validation actually performed |
| Attestation | Signer identity/key reference, signature result, and verifier version |
| Limitations | Missing, stale, unsigned, or unverifiable records |

## Reporting

Preserve source references, timestamps, and hashes where available. Distinguish source evidence from an interpretation. A valid digest or signature supports artifact integrity and signer verification; it does not by itself prove the action was approved, the provider executed it, or the output is substantively correct.

If a required source is unavailable, mark the item UNVERIFIED. Do not invent a report, endpoint, pricing tier, database record, or attestation.
