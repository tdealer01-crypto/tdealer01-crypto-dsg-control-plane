# DSG Safe DOM Mirror Acceptance Checklist

This checklist defines what must be true before any Safe DOM Mirror implementation can be claimed as working, safe, or production-ready.

## Status boundary

Current status for this PR:

```text
DESIGN ONLY
NO production readiness claim
NO browser executor claim
NO live deployment claim
```

## Core invariant

The implementation must enforce:

```text
If DSG does not expose an element in the current safe manifest, the agent cannot invoke it.
```

## Phase 0 — Design acceptance

- [ ] Blueprint exists.
- [ ] Implementation plan exists.
- [ ] Acceptance checklist exists.
- [ ] IP / license strategy exists.
- [ ] Non-goals are stated clearly.
- [ ] No production claim is made from documents alone.

## Phase 1 — Pure library acceptance

- [ ] `filterDangerousElements` removes dangerous actions before agent observation.
- [ ] `redactSensitiveValues` redacts secrets before agent observation.
- [ ] `buildSafeManifest` creates server-side manifest entries with hidden selectors.
- [ ] Agent-facing view does not include raw selectors.
- [ ] `verifySafeDomCommand` blocks unknown `elementId`.
- [ ] `verifySafeDomCommand` blocks expired frames.
- [ ] `verifySafeDomCommand` blocks operations not listed in `allowedOps`.
- [ ] Unit tests cover allow, block, expire, redact, and remove cases.

## Phase 2 — Observe endpoint acceptance

- [ ] `POST /api/dsg/safe-dom/observe` requires authenticated operator access.
- [ ] Observe response contains only safe element IDs.
- [ ] Observe response includes `removedCount` and `redactedCount`.
- [ ] Server stores a manifest keyed by `sessionId` and `frameId`.
- [ ] Manifest expires automatically.
- [ ] Raw DOM is not returned to the agent.
- [ ] Secret values are not returned to the agent.
- [ ] Evidence stores safe-view hash and policy version.

## Phase 3 — Act endpoint acceptance

- [ ] `POST /api/dsg/safe-dom/act` requires authenticated operator access.
- [ ] Action with unknown `elementId` returns `BLOCK_ELEMENT_NOT_EXPOSED`.
- [ ] Action with expired `frameId` returns `BLOCK_SAFE_VIEW_EXPIRED`.
- [ ] Action not in `allowedOps` returns `BLOCK_OP_NOT_ALLOWED`.
- [ ] Allowed action executes only against the server-side selector.
- [ ] Agent cannot provide raw selector or JavaScript.
- [ ] Before/after evidence is recorded.

## Phase 4 — Dangerous capability acceptance

- [ ] Dangerous controls are removed by default.
- [ ] Dangerous controls require human approval before exposure.
- [ ] Dangerous capability is single-use.
- [ ] Dangerous capability has short TTL.
- [ ] Dangerous capability is bound to a resource ID.
- [ ] Typed confirmation phrase is required where possible.
- [ ] Before/after evidence is mandatory.
- [ ] Capability is revoked after use or expiration.

## Phase 5 — UI acceptance

- [ ] Operator can see safe elements.
- [ ] Operator can see removed/redacted counts.
- [ ] Operator can inspect action decisions.
- [ ] Operator can inspect evidence.
- [ ] UI does not show raw secrets.
- [ ] UI does not claim production readiness without live test proof.

## Security No-Go conditions

Any of the following is a blocker:

- [ ] Agent receives raw selectors.
- [ ] Agent receives full raw DOM containing secrets.
- [ ] Agent can execute JavaScript directly.
- [ ] Agent can invoke an element not in the manifest.
- [ ] Dangerous controls are exposed without human approval.
- [ ] Credentials are passed into agent context.
- [ ] Evidence is missing for an executed action.
- [ ] UI or docs claim production readiness without live evidence.

## Evidence required for GO

A production GO claim requires all of these:

- [ ] CI typecheck pass.
- [ ] Unit tests pass.
- [ ] Integration tests pass against sandbox browser session.
- [ ] Auth/RBAC proof.
- [ ] Evidence persistence proof.
- [ ] Safe manifest replay proof.
- [ ] Screenshot or DOM before/after proof.
- [ ] Operator approval proof for a destructive simulated action.
- [ ] No raw secrets in logs or agent payload.

## User-benefit gate

Before merge beyond design phase, the PR must answer:

- [ ] What does the user gain?
- [ ] What risk is removed?
- [ ] What is easier than MCP/API/browser plugin integration?
- [ ] What evidence proves it works?
- [ ] What still does not work?

## Truth boundary

Do not say:

```text
Safe DOM Mirror is production-ready.
```

Unless the evidence required above exists.

Allowed wording during design phase:

```text
Safe DOM Mirror design and implementation plan are documented.
```
