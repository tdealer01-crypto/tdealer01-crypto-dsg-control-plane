# Deterministic QUBO / Ising policy engine

`lib/ising/solver.ts` searches boolean assignments against callback predicates.
This module adds the algebraic layer it does not have: an explicit QUBO matrix,
the exact QUBO ↔ Ising transform, formal constraint encodings, a reproducible
annealing trajectory, and a SHA-256 provenance chain.

## What each piece does

| File | Responsibility |
|---|---|
| `matrix.ts` | Builds the upper-triangular QUBO `Q`, encodes constraints as penalties, converts to Ising `(h, J, offset)`, evaluates energy in either form |
| `deterministic-rng.ts` | Mulberry32 PRNG — 32-bit integer ops only, so a seed reproduces the identical stream on any platform |
| `annealer.ts` | Deterministic simulated annealing + single-flip descent polish + provenance chain |
| `constraints.ts` | Exact verification of an assignment, independent of the penalty encoding |
| `what-if.ts` | Counterfactual budget shifts → ΔC / ΔR / ΔV and rule divergence |
| `catalog-adapter.ts` | Builds controls from the repository's own `REQUIREMENT_CATALOG` |

## Objective and encodings

The objective minimises `Σ (cost_i − value_i − riskReduction_i)·x_i`, which is
equivalent to maximising net benefit. Constraints become penalty terms:

| Constraint | Pseudo-boolean form | QUBO encoding |
|---|---|---|
| `implication` A→B | `x_A − x_A·x_B ≤ 0` | `Q_AA += P`, `Q_AB −= P` |
| `equivalence` A↔B | `(x_A − x_B)² = 0` | `Q_AA += P`, `Q_BB += P`, `Q_AB −= 2P` |
| `mutual_exclusion` | `x_A·x_B = 0` | `Q_AB += P` |
| `at_least` | `Σ x_i ≥ k` | `P·(Σx_i − k − s)²` with binary slack `s` |
| `budget_cap` | `Σ c_i·x_i ≤ B` | `P·(Σc_i x_i + s − B)²` with binary slack `s` |

The two inequality constraints introduce slack variables so the inequality is
encoded exactly rather than approximated. Slack is binary-encoded on a
`slackGranularity` grid (default 1, i.e. integral costs); non-integral costs are
rounded onto that grid, so set the granularity to match your units.

## Determinism

`solveQubo` draws every random decision from the seeded PRNG, starts from the
all-unselected assignment, and scans variables in matrix order during the
polish. Nothing depends on wall-clock time or map iteration order, so the same
`(problem, seed)` reproduces the same selection, the same energy, the same
trajectory, and the same `provenanceHash`. `replayProvenance` recomputes the
head hash from retained steps and detects any alteration.

Every step is chained whether or not it is retained, so `provenanceHash` covers
the whole run while `retainTrajectorySteps` bounds memory. Replay therefore
matches only when the full trajectory was retained.

## Claim boundary

- **Penalties bias, they do not prove.** A low-energy assignment can still
  violate a constraint. `verifyConstraints` is the authority, `solution.feasible`
  reports its verdict, and the annealer prefers a verified-feasible assignment
  over a lower-energy infeasible one. Check `feasible` before acting on
  `selected`.
- **Simulated annealing is a heuristic.** The polish step guarantees a local
  optimum under single flips, not a proven global optimum. This module does not
  invoke Z3; the constraint encodings above are the pseudo-boolean forms an SMT
  encoding would use, verified here by direct evaluation.
- **Framework scope is whatever the repository actually carries.**
  `controlsFromCatalog()` reads `REQUIREMENT_CATALOG`, which today covers
  EU AI Act, ISO 42001, NIST AI RMF, SLSA, and one DSG-internal requirement.
  There are no GDPR, PDPA, Thai criminal law, or FinTech rows in this
  repository, so the adapter cannot emit controls for them — pass your own
  `PolicyControl[]` if you need those frameworks.
- **The catalog weighting is a modelling choice.** `DEFAULT_CATALOG_WEIGHTING`
  derives value/risk/cost from `min_severity_level`, `evidence_type`, and
  `mutation_required`. Those are engineering weights for the optimiser, not a
  legal, actuarial, or certification judgement. Override them with your own.

## Usage

```ts
import { controlsFromCatalog, runWhatIf, solveQubo } from '@/lib/ising/qubo';

const controls = controlsFromCatalog();
const problem = {
  controls,
  constraints: [
    { kind: 'budget_cap', id: 'q3-budget', budget: 20 },
    { kind: 'implication', id: 'audit-needs-oversight',
      antecedent: 'EU-AI-ACT-ART12', consequent: 'EU-AI-ACT-ART14' },
  ],
} as const;

const solution = solveQubo(problem, { seed: 42, retainTrajectorySteps: 100 });
if (!solution.feasible) throw new Error('no feasible control set under this budget');

const report = runWhatIf(problem, [
  { id: 'cut', budgetDelta: -300 },
  { id: 'raise', budgetDelta: 500 },
], { seed: 42 });
```

## Verification

```bash
npx vitest run tests/unit/qubo-policy-engine.test.ts
npm run typecheck
```
