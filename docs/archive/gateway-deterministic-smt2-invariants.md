# Gateway Deterministic SMT2 Invariants

DSG Gateway can emit deterministic SMT-LIB v2-compatible invariant evidence for AI/tool execution requests.

## Why

Prompt-based policy review is not enough for high-risk execution governance.

DSG uses deterministic invariants for checks that must not be negotiated or guessed:

- organization id must exist
- actor id must exist
- actor role must exist and be allowed
- organization plan must be entitled
- tool must be registered
- requested action must match the registered tool action
- evidence must be writable before allow
- high-risk and critical actions must have approval

## Script

```bash
npm run benchmark:gateway:smt2
```

Outputs:

```text
artifacts/gateway-smt2/gateway-smt2-invariants-result.json
artifacts/gateway-smt2/gateway-smt2-invariants-report.md
```

## Evidence boundary

The verifier emits SMT-LIB v2-compatible constraint text and hashes the SMT2 input/result.

Current implementation:

- deterministic SMT2 text generation
- deterministic static invariant evaluation
- SMT2 hash
- result hash
- pass/fail report

Not yet included:

- external Z3/cvc5 solver invocation
- solver certificate export

The emitted SMT2 text is structured so external solver verification can be added later without changing the policy surface.

## Example invariant

```lisp
(assert has_org)
(assert has_actor)
(assert is_registered_tool)
(assert action_matches_tool)
(assert actor_role_allowed)
(assert plan_entitled)
(assert evidence_writable)
(assert (=> (or requires_approval (>= risk 2)) has_approval))
```

## Product wording

Use:

```text
DSG emits deterministic SMT2-compatible invariant evidence before governed AI/tool execution.
```

Do not use yet:

```text
DSG has independently certified formal verification.
```

That claim would require external solver artifacts and independent review.
