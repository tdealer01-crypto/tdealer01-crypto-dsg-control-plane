---
name: z3-compliance-review
description: >-
  Reason about deterministic QUBO/Ising policy optimization and Z3/SMT-style
  formal constraint verification using the Compliance-ising-z3-Deterministic
  engine. Use when a user asks to optimize a policy/control selection under a
  budget, verify logical constraints (implication, equivalence, mutual
  exclusion, at-least-one, cost cap), run a what-if counterfactual on budget
  shifts, or produce a reproducible, hash-chained compliance decision. The
  underlying engine is native Kotlin (no external Z3 process); constraint
  checks are Z3/SMT-style, implemented deterministically.
---

# Z3 Compliance Review (QUBO / Ising / SMT-style)

This skill wraps the deterministic policy engine from the source repository
`tdealer01-crypto/Compliance-ising-z3-Deterministic-`. Use it to help a user
frame a compliance/policy problem, choose the right constraint form, and
interpret results. It does not embed the Kotlin engine here — it references the
real engine so runs stay reproducible and auditable.

## What the engine does (verified from the source repo)

- **Deterministic QUBO & Ising matrix engine** — maps business value (V), risk
  reduction (R), and cost (C) into an upper-triangular QUBO energy matrix, and
  converts between 0/1 QUBO space and ±1 Ising spins.
  Source: `app/src/main/java/com/example/data/qubo/QuboModels.kt`,
  `QuboPolicyEngine.kt`.
- **Deterministic simulated annealing** — a 32-bit seeded PRNG
  (`DeterministicRNG.kt`, Mulberry32) gives reproducible runs for a fixed seed
  (the repo documents `seed = 42L`). Same seed and inputs produce the same
  trajectory.
- **Z3/SMT-style constraint verification** — enforced before state transitions.
  Common forms:
  - Implication `A → B`: `x_A - x_A*x_B ≤ 0`
  - Equivalence `A ↔ B`: `(x_A - x_B)^2 = 0`
  - Mutual exclusion `¬(A ∧ B)`: `x_A*x_B = 0`
  - At-least-`k`: `Σ x_i ≥ k`
  - Hard budget cap: `Σ c_i*x_i ≤ Budget`
- **What-if counterfactual simulator** — evaluates rule divergence and cost/
  risk/value deltas under hypothetical budget shifts.
- **SHA-256 provenance audit chain** — each annealing step is bound into an
  immutable hash chain (sequence, state flips, temperature, energy delta,
  predecessor hash).
- **MCP gateway** — `app/src/main/java/com/example/data/mcp/McpGatewayEngine.kt`.
- **Regulatory mappings** — pre-built rule models for EU GDPR & EU AI Act, Thai
  PDPA, Thai Criminal Law, and FinTech (see the repo README tables).

## Claim boundary (align with DSG CLAUDE.md sections 1, 12)

- This is a deterministic Kotlin engine with **Z3/SMT-style** constraint logic.
  Do not claim external production Z3 solver invocation — there is no external
  Z3 process; the checks are implemented in-engine.
- "Deterministic" / "reproducible" claims hold only for a fixed seed and fixed
  inputs. State that assumption when you report a result.
- Regulatory mappings are engineering models, not legal certification. Do not
  claim `certified compliance` or `guaranteed compliance`.
- `UNSUPPORTED` is never `PASS`.

## How to run the engine (from the source repo)

The engine is an Android/Kotlin Gradle project. Build and test commands
(captured from the repo's plugin environment config):

```bash
# Build
./gradlew :app:build --no-daemon

# Unit tests
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
```

Reference helper scripts are bundled with this plugin at
`${CLAUDE_PLUGIN_ROOT}/scripts/preBuild.sh` and
`${CLAUDE_PLUGIN_ROOT}/scripts/postTest.sh` (advisory preflight / post-test
echoes carried over from the source repo). Report `Not run` if you did not run
a command — do not claim a build/test passed without real output.

## Suggested workflow

1. Restate the policy/control set with V, R, C per candidate.
2. Pick the constraint forms (implication / equivalence / exclusion / at-least
   / budget cap) and write them explicitly.
3. Run the engine with a fixed seed; capture the selected controls, energy, and
   the provenance hash.
4. Optionally run a what-if under a budget shift and report the deltas.
5. Report the decision with its seed, inputs, and audit hash so it is
   replayable.
