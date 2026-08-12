# SMT proof method for DSG formal artifacts

Status: `verified fact` for every solver result quoted below. All results were
produced by Z3 5.0.0 on the files named, on 2026-08-12.

This document exists because the DSG gate model has been written twice with two
different proof methods, and only one of them proves anything.

---

## The rule

**A safety property is proven when you assert its negation and the solver
answers `unsat`.**

Asserting the property itself and reading `sat` does not prove it. `sat` means
"this set of statements is self-consistent" — the solver is free to *invent* an
interpretation of the uninterpreted functions that makes your property true.
That is the opposite of what a safety proof needs, which is that *no*
interpretation consistent with your rules can violate the property.

| Method | You assert | Pass signal | What it proves |
|---|---|---|---|
| Consistency (wrong for safety) | axioms **+ property** | `sat` | the axioms don't contradict each other |
| Refutation (correct) | axioms **+ ¬property** | `unsat` | the property holds in *every* model |

`formal/agent-invariants.smt2` has always used refutation via `push` /
`assert violation` / `check-sat` / `pop`. That is the repository convention and
new artifacts must follow it.

---

## Why this is not a style preference

A gate model that is missing a rule produces a **false pass** under the
consistency method. Reproduced with Z3 5.0.0 on a four-state gate
(`IDLE`, `AUTH`, `EXEC`, `FORBIDDEN`) with the "block every forbidden target"
rule deliberately omitted:

| Method | Result | Reviewer's reading |
|---|---|---|
| Consistency — assert safety, expect `sat` | `sat` | **PASS** — wrong |
| Refutation — assert ¬safety, expect `unsat` | `sat` | NOT proven; counterexample exists |

Both runs print `sat`, and under the consistency method that string is the
documented success criterion. So the missing rule ships. The refutation run
correctly reports that a gate walking straight into `FORBIDDEN` satisfies every
stated axiom.

The two methods also **invert the meaning of `unsat`**. Under refutation,
`unsat` is the success signal. Under the consistency method, `unsat` means the
axioms contradict each other. An unannotated stream of `sat` / `unsat` lines
therefore carries no information about whether a proof passed. This is why every
`(check-sat)` in this repository must carry an `; EXPECTED:` marker.

---

## Two concrete defects this method catches

Both were found in externally supplied DSG proof artifacts.

### 1. Contradictory axioms reported as a passing proof

A version of the model asserted absolute unreachability:

```smt2
(assert (forall ((s State) (s2 State))
  (not (= (delta s s2) FORBIDDEN))))
```

This is false in the model's own terms. When the system is *already* forbidden,
the gate blocks and `delta` returns the source state unchanged, so
`delta(FORBIDDEN, FORBIDDEN) = FORBIDDEN`. Z3 returns `unsat` — the axiom set is
contradictory — while the accompanying document stated the expected result was
`sat`. Unsat core, via `assert_and_track`:

```
['A6_delta_def', 'A7_SAFETY_delta_never_FORBIDDEN']
```

The correct property is invariant *preservation*, which is what
`formal/dsg-state-gate-safety.smt2` T1 states: from a non-forbidden state, no
proposed target reaches a forbidden state. `FORBIDDEN` being absorbing is then
stated separately and deliberately as T4.

### 2. Missing `distinct` lets the solver collapse states

Without

```smt2
(assert (distinct IDLE AUTH EXEC FORBIDDEN))
```

nothing stops the solver from identifying `IDLE` with `AUTH`. Some collapses are
blocked indirectly by the `forbidden` predicate, but not all, and a model that
satisfies the axioms by merging states proves nothing about a real gate with
four distinct states.

The same reasoning applies to the closed-world assumption. Without

```smt2
(assert (forall ((s State)) (or (= s IDLE) (= s AUTH) (= s EXEC) (= s FORBIDDEN))))
```

the solver may invent an unnamed fifth state, and range/totality properties
become unprovable for reasons that have nothing to do with the gate.

---

## What the current artifact proves, and what it does not

`formal/dsg-state-gate-safety.smt2`, 7 blocks, all matching their `; EXPECTED:`
markers:

| ID | Property | Result |
|---|---|---|
| BASE | model is consistent | `sat` |
| T1 | safety invariance — forbidden unreachable from safe states | `unsat` = **proven** |
| T2 | gate totality — decision always in `{0,1,2}` | `unsat` = **proven** |
| T3 | gate never emits ALLOW toward a forbidden target | `unsat` = **proven** |
| T4 | `FORBIDDEN` is absorbing — the gate is not a recovery mechanism | `unsat` = **proven** |
| L1 | the happy path `IDLE→AUTH→EXEC` is reachable | `sat` |
| L2 | `EXEC` is terminal — no modelled edge back to `IDLE` | `unsat` |

### Claim boundary

**Not** proven by this artifact, and not claimable from it:

- **Determinism.** SMT-LIB functions are functions by construction, so
  `(= (gate s s2) (gate s s2))` is a tautology and proves nothing. Determinism
  here is a property of the *encoding*, not a theorem. Proving that the
  implementation has no hidden state dependency requires a different encoding
  (for example, an explicit history parameter shown to be irrelevant).
- **Constant-time / O(1).** A structural claim about the implementation.
  Asserting `delta2(s,s2,s3) = delta(s,s2)` is an axiom the author supplies, not
  a theorem the solver discharges. It restates the intent; it does not verify it.
- **Anything about the TypeScript gate.** This model is a specification. It is
  not extracted from, nor mechanically linked to, `lib/dsg/deterministic/**`.
  Nothing here shows the deployed route agrees with the model. Per the repository
  claim policy, `external production Z3 solver invocation` remains
  `not verified`; `POST /api/dsg/v1/gates/evaluate` does not call Z3.

### L2 is a design finding, not a bug

`EXEC` has no outgoing edge, so once the system reaches `EXEC` no proposed target
changes its state. If the product needs a completion or reset edge, rule `R2` in
the artifact must be extended and L2's expectation updated. Recording it as a
proven property keeps the gap visible instead of latent.

---

## Running the checks

```bash
npm run verify:formal                                  # all annotated artifacts
node scripts/verify-smt2-expectations.mjs formal/x.smt2 # one file
z3 formal/dsg-state-gate-safety.smt2                   # raw solver output
```

`npm run verify:formal` compares every `(check-sat)` against its `; EXPECTED:`
marker and exits non-zero on any mismatch. Requires `z3` on `PATH`
(`pip install z3-solver`).

The runner's own failure path is exercised: a file asserting a satisfiable
formula while claiming `; EXPECTED: unsat` produces
`line 5: expected unsat, got sat` and exit code 1.

---

## Adding a new property

1. State it as a violation, not as a goal.
2. Wrap it in `(push)` / `(pop)` so it cannot leak into later blocks.
3. Annotate the `(check-sat)` with `; EXPECTED: unsat` (for a property that must
   hold) or `; EXPECTED: sat` (for a reachability or sanity witness).
4. Run `npm run verify:formal` and confirm the count of checked blocks rose.
5. If a property cannot be expressed as a violation, say so in the artifact
   comments rather than asserting it as an axiom and calling the resulting `sat`
   a proof.
