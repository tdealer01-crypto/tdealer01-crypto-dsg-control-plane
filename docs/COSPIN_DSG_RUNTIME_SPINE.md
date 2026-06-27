# CospinDSG Runtime Spine

## Product definition

CospinDSG is the runtime gate placed in front of an existing customer agent before that agent performs a real-world action.

The customer keeps the existing agent and tool runtime. CospinDSG checks the proposed action, attached memory packet, deterministic invariants, and audit evidence before execution.

## Product promise

> Keep your existing agent. Put CospinDSG before real-world actions. Get ALLOW, STABILIZE, or BLOCK with evidence.

## Runtime boundary

CospinDSG is not a replacement for the customer agent. It is not an AI model and is not a solver.

It is a deterministic runtime gate under a fixed input snapshot, fixed invariant set, fixed policy version, and fixed code version.

## Existing DSG spine fit

The current repository already has API auth, rate limiting, spine intent handling, execution handling, and database-backed commit flow. CospinDSG should be added as a runtime gate adapter, not as a replacement for the existing spine.

## High-level flow

```text
Customer agent
  -> proposes action + memory packet
  -> DSG /api/intent
  -> DSG /api/execute
  -> CospinDSG UDG gate
  -> ALLOW / STABILIZE / BLOCK
  -> existing customer agent executes only if allowed
  -> result receipt returns to DSG
  -> audit evidence chain
```

## Decisions

- `ALLOW`: The action may proceed in the customer's existing runtime.
- `STABILIZE`: The action should not proceed yet; the system should hold, review, or return to a stable anchor.
- `BLOCK`: The action must not proceed.

## Evidence chain

Each protected action should bind:

- memory packet hash
- action envelope hash
- policy version
- invariant set
- decision
- reason
- proof hash
- result receipt hash
- target system receipt id when available

## Claim boundary

CospinDSG makes actions traceable and tamper-evident. SHA-256 hashes do not make data physically immutable by themselves; they make changes detectable. Stronger immutability requires database triggers, append-only storage, object lock, external notarization, or another independent anchor.
