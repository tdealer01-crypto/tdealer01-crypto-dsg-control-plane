import { describe, expect, it } from 'vitest';
import {
  DeterministicRng,
  buildQuboMatrix,
  catalogFrameworks,
  controlsFromCatalog,
  isingEnergy,
  quboEnergy,
  replayProvenance,
  runWhatIf,
  slackWeights,
  solveQubo,
  toIsingModel,
  toSpins,
  verifyConstraints,
} from '@/lib/ising/qubo';
import type { FormalConstraint, PolicyControl, QuboProblem } from '@/lib/ising/qubo';

const CONTROLS: PolicyControl[] = [
  { id: 'A', value: 10, riskReduction: 5, cost: 3 },
  { id: 'B', value: 4, riskReduction: 9, cost: 6 },
  { id: 'C', value: 1, riskReduction: 1, cost: 8 },
];

function problem(constraints: FormalConstraint[] = []): QuboProblem {
  return { controls: CONTROLS, constraints };
}

describe('DeterministicRng (Mulberry32)', () => {
  it('reproduces the identical stream for the same seed', () => {
    const first = Array.from({ length: 16 }, () => new DeterministicRng(42).next());
    const rng = new DeterministicRng(42);
    const stream = Array.from({ length: 16 }, () => rng.next());
    expect(first[0]).toBe(stream[0]);
    expect(stream).toEqual(Array.from({ length: 16 }, (_, i) => stream[i]));

    const replay = new DeterministicRng(42);
    expect(Array.from({ length: 16 }, () => replay.next())).toEqual(stream);
  });

  it('produces a different stream for a different seed', () => {
    const a = Array.from({ length: 8 }, () => 0).map(() => new DeterministicRng(1).next());
    const b = new DeterministicRng(2).next();
    expect(a[0]).not.toBe(b);
  });

  it('emits values inside [0, 1) and bounded integers', () => {
    const rng = new DeterministicRng(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(rng.nextInt(5)).toBeLessThan(5);
    }
  });

  it('reset replays the same stream', () => {
    const rng = new DeterministicRng(99);
    const first = [rng.next(), rng.next(), rng.next()];
    rng.reset();
    expect([rng.next(), rng.next(), rng.next()]).toEqual(first);
  });
});

describe('QUBO matrix', () => {
  it('puts net benefit on the diagonal', () => {
    const qubo = buildQuboMatrix(problem());
    // cost - value - riskReduction
    expect(qubo.matrix[0][0]).toBe(3 - 10 - 5);
    expect(qubo.matrix[1][1]).toBe(6 - 4 - 9);
    expect(qubo.matrix[2][2]).toBe(8 - 1 - 1);
  });

  it('stays upper-triangular', () => {
    const qubo = buildQuboMatrix(
      problem([{ kind: 'mutual_exclusion', id: 'mx', left: 'A', right: 'C' }]),
    );
    for (let i = 0; i < qubo.matrix.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        expect(qubo.matrix[i][j]).toBe(0);
      }
    }
  });

  it('rejects duplicate control ids', () => {
    expect(() =>
      buildQuboMatrix({ controls: [CONTROLS[0], CONTROLS[0]], constraints: [] }),
    ).toThrow(/Duplicate control id/);
  });

  it('penalises an implication only when the antecedent is unsupported', () => {
    const p = problem([
      { kind: 'implication', id: 'imp', antecedent: 'A', consequent: 'B', penalty: 50 },
    ]);
    const qubo = buildQuboMatrix(p);
    const violating = quboEnergy(qubo, { A: true, B: false, C: false });
    const satisfying = quboEnergy(qubo, { A: true, B: true, C: false });
    expect(violating - quboEnergy(buildQuboMatrix(problem()), { A: true, B: false, C: false })).toBe(50);
    expect(satisfying).toBeLessThan(violating);
  });

  it('penalises a mutual exclusion only when both are selected', () => {
    const qubo = buildQuboMatrix(
      problem([{ kind: 'mutual_exclusion', id: 'mx', left: 'A', right: 'B', penalty: 40 }]),
    );
    const base = buildQuboMatrix(problem());
    expect(quboEnergy(qubo, { A: true, B: true }) - quboEnergy(base, { A: true, B: true })).toBe(40);
    expect(quboEnergy(qubo, { A: true, B: false })).toBe(quboEnergy(base, { A: true, B: false }));
  });

  it('penalises an equivalence only when the two differ', () => {
    const qubo = buildQuboMatrix(
      problem([{ kind: 'equivalence', id: 'eq', left: 'A', right: 'B', penalty: 30 }]),
    );
    const base = buildQuboMatrix(problem());
    for (const [assignment, expected] of [
      [{ A: true, B: true }, 0],
      [{ A: false, B: false }, 0],
      [{ A: true, B: false }, 30],
      [{ A: false, B: true }, 30],
    ] as const) {
      expect(quboEnergy(qubo, assignment) - quboEnergy(base, assignment)).toBe(expected);
    }
  });
});

describe('slack encoding', () => {
  it('covers every integer up to the bound without overshooting', () => {
    for (const bound of [0, 1, 2, 3, 5, 8, 13]) {
      const weights = slackWeights(bound);
      expect(weights.reduce((a, b) => a + b, 0)).toBe(bound);
      const reachable = new Set<number>([0]);
      for (const weight of weights) {
        for (const value of [...reachable]) reachable.add(value + weight);
      }
      for (let v = 0; v <= bound; v += 1) expect(reachable.has(v)).toBe(true);
    }
  });

  it('leaves a within-budget selection unpenalised and penalises an over-budget one', () => {
    const constraint: FormalConstraint = { kind: 'budget_cap', id: 'cap', budget: 9, penalty: 100 };
    const qubo = buildQuboMatrix(problem([constraint]));
    const base = buildQuboMatrix(problem());

    // A + B costs 9, exactly the cap: some slack setting must reach zero penalty.
    const slackVars = qubo.variables.filter((v) => v.startsWith('slack:'));
    const withinBudget = { A: true, B: true, C: false } as Record<string, boolean>;
    for (const v of slackVars) withinBudget[v] = false;
    expect(quboEnergy(qubo, withinBudget) - quboEnergy(base, withinBudget)).toBe(0);

    // A + B + C costs 17, over the cap, and no slack assignment can absorb it.
    const overBudget = { A: true, B: true, C: true } as Record<string, boolean>;
    for (const v of slackVars) overBudget[v] = false;
    expect(quboEnergy(qubo, overBudget)).toBeGreaterThan(quboEnergy(base, overBudget));
  });
});

describe('QUBO <-> Ising transform', () => {
  it('preserves energy for every assignment', () => {
    const qubo = buildQuboMatrix(
      problem([
        { kind: 'implication', id: 'imp', antecedent: 'A', consequent: 'B' },
        { kind: 'mutual_exclusion', id: 'mx', left: 'B', right: 'C' },
      ]),
    );
    const ising = toIsingModel(qubo);
    const n = qubo.variables.length;

    for (let mask = 0; mask < 1 << n; mask += 1) {
      const assignment: Record<string, boolean> = {};
      qubo.variables.forEach((name, i) => {
        assignment[name] = Boolean(mask & (1 << i));
      });
      expect(isingEnergy(ising, toSpins(assignment))).toBeCloseTo(quboEnergy(qubo, assignment), 9);
    }
  });
});

describe('formal constraint verification', () => {
  it('checks each constraint kind exactly', () => {
    const constraints: FormalConstraint[] = [
      { kind: 'implication', id: 'imp', antecedent: 'A', consequent: 'B' },
      { kind: 'equivalence', id: 'eq', left: 'B', right: 'C' },
      { kind: 'mutual_exclusion', id: 'mx', left: 'A', right: 'C' },
      { kind: 'at_least', id: 'min', controls: ['A', 'B', 'C'], minimum: 2 },
      { kind: 'budget_cap', id: 'cap', budget: 9 },
    ];
    const verdicts = verifyConstraints(CONTROLS, constraints, { A: true, B: true, C: false });
    expect(verdicts.map((v) => [v.constraintId, v.satisfied])).toEqual([
      ['imp', true],
      ['eq', false],
      ['mx', true],
      ['min', true],
      ['cap', true],
    ]);
    expect(verdicts[4].detail).toContain('spend=9');
  });

  it('rejects a constraint naming an unknown control', () => {
    expect(() =>
      solveQubo(problem([{ kind: 'implication', id: 'bad', antecedent: 'A', consequent: 'ZZZ' }])),
    ).toThrow(/unknown control ZZZ/);
  });
});

describe('deterministic annealing', () => {
  it('is bit-for-bit reproducible across runs with the same seed', () => {
    const p = problem([{ kind: 'budget_cap', id: 'cap', budget: 9 }]);
    const first = solveQubo(p, { seed: 42, maxIterations: 400, retainTrajectorySteps: 400 });
    const second = solveQubo(p, { seed: 42, maxIterations: 400, retainTrajectorySteps: 400 });

    expect(second.selected).toEqual(first.selected);
    expect(second.energy).toBe(first.energy);
    expect(second.provenanceHash).toBe(first.provenanceHash);
    expect(second.trajectory).toEqual(first.trajectory);
  });

  it('diverges for a different seed while staying self-consistent', () => {
    const p = problem([{ kind: 'budget_cap', id: 'cap', budget: 9 }]);
    const a = solveQubo(p, { seed: 42, maxIterations: 400 });
    const b = solveQubo(p, { seed: 4242, maxIterations: 400 });
    expect(b.provenanceHash).not.toBe(a.provenanceHash);
    expect(b.feasible).toBe(true);
    expect(a.feasible).toBe(true);
  });

  it('selects the net-positive controls and drops the net-negative one', () => {
    const solution = solveQubo(problem(), { seed: 42, maxIterations: 2000 });
    expect(solution.selected).toEqual(['A', 'B']);
    expect(solution.totalCost).toBe(9);
    expect(solution.feasible).toBe(true);
  });

  it('honours a budget cap that excludes the full selection', () => {
    const solution = solveQubo(problem([{ kind: 'budget_cap', id: 'cap', budget: 5 }]), {
      seed: 42,
      maxIterations: 2000,
    });
    expect(solution.totalCost).toBeLessThanOrEqual(5);
    expect(solution.feasible).toBe(true);
    expect(solution.verdicts.find((v) => v.constraintId === 'cap')?.satisfied).toBe(true);
  });

  it('respects a mutual exclusion between the two best controls', () => {
    const solution = solveQubo(
      problem([{ kind: 'mutual_exclusion', id: 'mx', left: 'A', right: 'B' }]),
      { seed: 42, maxIterations: 2000 },
    );
    expect(solution.selected).toEqual(['A']);
    expect(solution.feasible).toBe(true);
  });

  it('drags in a required consequent through an implication', () => {
    const solution = solveQubo(
      problem([{ kind: 'implication', id: 'imp', antecedent: 'A', consequent: 'C' }]),
      { seed: 42, maxIterations: 2000 },
    );
    expect(solution.feasible).toBe(true);
    if (solution.selected.includes('A')) expect(solution.selected).toContain('C');
  });

  it('reports infeasible rather than silently returning a violating selection', () => {
    const impossible: FormalConstraint[] = [
      { kind: 'at_least', id: 'min', controls: ['A', 'B'], minimum: 2 },
      { kind: 'mutual_exclusion', id: 'mx', left: 'A', right: 'B' },
    ];
    const solution = solveQubo(problem(impossible), { seed: 42, maxIterations: 800 });
    expect(solution.feasible).toBe(false);
    expect(solution.verdicts.some((v) => !v.satisfied)).toBe(true);
  });

  it('rejects a cooling rate outside (0, 1)', () => {
    expect(() => solveQubo(problem(), { coolingRate: 1 })).toThrow(/coolingRate/);
  });
});

describe('provenance chain', () => {
  it('chains every retained step to its predecessor', () => {
    const solution = solveQubo(problem(), { seed: 42, maxIterations: 25, retainTrajectorySteps: 25 });
    expect(solution.trajectory).toHaveLength(25);
    expect(solution.trajectory[0].previousHash).toBeNull();
    for (let i = 1; i < solution.trajectory.length; i += 1) {
      expect(solution.trajectory[i].previousHash).toBe(solution.trajectory[i - 1].stepHash);
    }
    expect(solution.trajectory.at(-1)?.stepHash).toBe(solution.provenanceHash);
  });

  it('replays to the same head hash and detects a tampered step', () => {
    const solution = solveQubo(problem(), { seed: 42, maxIterations: 20, retainTrajectorySteps: 20 });
    const variables = Object.keys(solution.assignment);
    expect(replayProvenance(solution.trajectory, solution.seed, variables)).toBe(
      solution.provenanceHash,
    );

    const tampered = solution.trajectory.map((step, i) =>
      i === 5 ? { ...step, energyAfter: step.energyAfter + 1 } : step,
    );
    expect(replayProvenance(tampered, solution.seed, variables)).not.toBe(solution.provenanceHash);
  });

  it('covers the whole run even when the retained window is smaller', () => {
    const full = solveQubo(problem(), { seed: 42, maxIterations: 200, retainTrajectorySteps: 200 });
    const windowed = solveQubo(problem(), { seed: 42, maxIterations: 200, retainTrajectorySteps: 5 });
    expect(windowed.provenanceHash).toBe(full.provenanceHash);
    expect(windowed.trajectory).toHaveLength(5);
  });
});

describe('what-if counterfactuals', () => {
  it('reports cost, risk, value and rule divergence against the baseline', () => {
    const p = problem([{ kind: 'budget_cap', id: 'cap', budget: 9 }]);
    const report = runWhatIf(
      p,
      [
        { id: 'tighter', budgetDelta: -4, description: 'budget cut' },
        { id: 'looser', budgetDelta: 8, description: 'budget increase' },
      ],
      { seed: 42, maxIterations: 2000 },
    );

    expect(report.baseline.totalCost).toBe(9);

    const tighter = report.outcomes[0];
    expect(tighter.solution.totalCost).toBeLessThanOrEqual(5);
    expect(tighter.deltaCost).toBeLessThan(0);
    expect(tighter.removed.length).toBeGreaterThan(0);
    expect(tighter.ruleDivergence).toBe(tighter.added.length + tighter.removed.length);

    const looser = report.outcomes[1];
    expect(looser.solution.feasible).toBe(true);
    expect(looser.deltaRiskReduction).toBeGreaterThanOrEqual(0);
  });

  it('never lets a budget shift drive the cap below zero', () => {
    const report = runWhatIf(
      problem([{ kind: 'budget_cap', id: 'cap', budget: 4 }]),
      [{ id: 'wipeout', budgetDelta: -100 }],
      { seed: 42, maxIterations: 500 },
    );
    expect(report.outcomes[0].solution.totalCost).toBe(0);
    expect(report.outcomes[0].solution.feasible).toBe(true);
  });
});

describe('CCVS catalog adapter', () => {
  it('builds one control per catalog requirement with derived weights', () => {
    const controls = controlsFromCatalog();
    expect(controls).toHaveLength(10);
    const riskGate = controls.find((c) => c.id === 'EU-AI-ACT-ART9');
    expect(riskGate).toMatchObject({ framework: 'EU AI Act', label: 'Risk management system' });
    // min_severity_level 2, evidence_type integration (severity 2), mutation required
    expect(riskGate?.value).toBe(4);
    expect(riskGate?.riskReduction).toBe(6);
    expect(riskGate?.cost).toBe(4);
  });

  it('honours weighting overrides', () => {
    const controls = controlsFromCatalog({ valuePerSeverity: 10, mutationCost: 0 });
    const riskGate = controls.find((c) => c.id === 'EU-AI-ACT-ART9');
    expect(riskGate?.value).toBe(20);
    expect(riskGate?.cost).toBe(2);
  });

  it('reports only the frameworks the repository actually carries', () => {
    expect(catalogFrameworks()).toEqual([
      'DSG Internal',
      'EU AI Act',
      'ISO 42001',
      'NIST AI RMF',
      'SLSA',
    ]);
  });

  it('optimises the real catalog under a budget and stays feasible', () => {
    const controls = controlsFromCatalog();
    const solution = solveQubo(
      { controls, constraints: [{ kind: 'budget_cap', id: 'ccvs-budget', budget: 20 }] },
      { seed: 42, maxIterations: 4000 },
    );
    expect(solution.feasible).toBe(true);
    expect(solution.totalCost).toBeLessThanOrEqual(20);
    expect(solution.selected.length).toBeGreaterThan(0);
    expect(solution.provenanceHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
