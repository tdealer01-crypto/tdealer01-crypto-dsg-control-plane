# End User Outcome Contract

Updated: 2026-05-22

## Purpose

This document is the user-facing outcome contract for the DSG Revenue-Ready Cut.

The release is not complete because the internals are sophisticated. The release is complete only when a real user can move through the simple outcome below without seeing system complexity.

## End-user outcome

After this cycle, the user should only need to experience this path:

1. Visit the website.
2. Click **Start Trial**.
3. Receive an API key.
4. Copy a working curl example.
5. Receive a deterministic decision: `allow`, `review`, or `block`.
6. See an `audit_id` for the action.
7. When quota is exhausted, clearly understand that upgrade is required.
8. After payment, continue using the product under the paid plan.

## Acceptance gate

The release remains `NO-GO` unless every step above has executable evidence.

Required proof artifacts:

- landing/pricing page evidence for **Start Trial**
- API key creation evidence
- quickstart curl evidence
- `/api/execute` or stable execution-entry evidence returning `allow`, `review`, or `block`
- audit evidence containing `audit_id`
- quota exhaustion evidence returning a clear upgrade path
- Stripe test checkout evidence
- webhook fulfillment evidence showing entitlement/plan update
- post-payment execution evidence

## Design rule

If a task does not improve one of the eight user-visible outcomes, it is out of scope for this cut.

Allowed work:

- simplify trial start
- simplify API key issuance
- simplify quickstart copy/paste
- make execution response deterministic and understandable
- make audit evidence visible
- make quota exhaustion readable
- make upgrade/payment fulfillment reliable
- make post-payment usage reliable

Blocked work unless directly required by the eight outcomes:

- new benchmark claims
- cosmetic dashboard expansion
- new abstract architecture docs
- new AI features not connected to the trial-to-paid path
- production-ready, compliance, or certification claims without evidence

## Response contract

The user-facing execution result should be understandable without reading internal docs.

Successful or governed response:

```json
{
  "ok": true,
  "decision": "allow",
  "reason": "Action passed the active governance policy.",
  "audit_id": "aud_...",
  "usage": {
    "used": 1,
    "limit": 60,
    "remaining": 59
  }
}
```

Review/block response:

```json
{
  "ok": false,
  "decision": "review",
  "reason": "Action requires human review before execution.",
  "audit_id": "aud_...",
  "usage": {
    "used": 1,
    "limit": 60,
    "remaining": 59
  }
}
```

Quota response:

```json
{
  "ok": false,
  "error": "quota_exceeded",
  "decision": "block",
  "reason": "Trial quota exhausted. Upgrade is required to continue.",
  "audit_id": "aud_...",
  "upgrade_url": "/pricing",
  "usage": {
    "used": 60,
    "limit": 60,
    "remaining": 0
  }
}
```

## Evidence rule

Mock evidence may be used for local development only. It must not be recorded as real production evidence.

A claim is real only when the repository, CI log, deployment log, Stripe test event, or database state proves it.

## Current verdict

VERDICT: NO-GO

Reason: this contract has been recorded, but the eight-step user path still needs executable test and runtime evidence.
