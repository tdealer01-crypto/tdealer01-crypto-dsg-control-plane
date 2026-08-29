import type { ConstraintVerdict, FormalConstraint, PolicyControl } from './types';

/**
 * Exact constraint verification, independent of the annealer.
 *
 * The QUBO encoding expresses each constraint as a penalty, which biases the
 * search but never proves anything: a penalised assignment is still a possible
 * output. These predicates are the authority on whether an assignment actually
 * satisfies the constraint set, so the engine can fail closed on a violation
 * rather than reporting a low-energy but infeasible selection.
 */
export function verifyConstraints(
  controls: PolicyControl[],
  constraints: FormalConstraint[],
  assignment: Record<string, boolean>,
): ConstraintVerdict[] {
  const selected = (id: string) => assignment[id] === true;
  return constraints.map((constraint) => verifyOne(controls, constraint, selected));
}

function verifyOne(
  controls: PolicyControl[],
  constraint: FormalConstraint,
  selected: (id: string) => boolean,
): ConstraintVerdict {
  switch (constraint.kind) {
    case 'implication': {
      const a = selected(constraint.antecedent);
      const b = selected(constraint.consequent);
      return {
        constraintId: constraint.id,
        kind: constraint.kind,
        satisfied: !a || b,
        formalExpression: `x_${constraint.antecedent} - x_${constraint.antecedent} * x_${constraint.consequent} <= 0`,
        detail: `${constraint.antecedent}=${a ? 1 : 0}, ${constraint.consequent}=${b ? 1 : 0}`,
      };
    }
    case 'equivalence': {
      const l = selected(constraint.left);
      const r = selected(constraint.right);
      return {
        constraintId: constraint.id,
        kind: constraint.kind,
        satisfied: l === r,
        formalExpression: `(x_${constraint.left} - x_${constraint.right})^2 = 0`,
        detail: `${constraint.left}=${l ? 1 : 0}, ${constraint.right}=${r ? 1 : 0}`,
      };
    }
    case 'mutual_exclusion': {
      const l = selected(constraint.left);
      const r = selected(constraint.right);
      return {
        constraintId: constraint.id,
        kind: constraint.kind,
        satisfied: !(l && r),
        formalExpression: `x_${constraint.left} * x_${constraint.right} = 0`,
        detail: `${constraint.left}=${l ? 1 : 0}, ${constraint.right}=${r ? 1 : 0}`,
      };
    }
    case 'at_least': {
      const active = constraint.controls.filter(selected).length;
      return {
        constraintId: constraint.id,
        kind: constraint.kind,
        satisfied: active >= constraint.minimum,
        formalExpression: `sum(x_i) >= ${constraint.minimum}`,
        detail: `active=${active} of ${constraint.controls.length}`,
      };
    }
    case 'budget_cap': {
      const spend = controls.reduce((sum, c) => (selected(c.id) ? sum + c.cost : sum), 0);
      return {
        constraintId: constraint.id,
        kind: constraint.kind,
        satisfied: spend <= constraint.budget,
        formalExpression: `sum(c_i * x_i) <= ${constraint.budget}`,
        detail: `spend=${round(spend)} budget=${constraint.budget}`,
      };
    }
    default: {
      const exhaustive: never = constraint;
      throw new Error(`Unsupported constraint: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Ids of the controls a constraint refers to, for dependency reporting. */
export function constraintScope(constraint: FormalConstraint): string[] {
  switch (constraint.kind) {
    case 'implication':
      return [constraint.antecedent, constraint.consequent];
    case 'equivalence':
    case 'mutual_exclusion':
      return [constraint.left, constraint.right];
    case 'at_least':
      return [...constraint.controls];
    case 'budget_cap':
      return [];
    default:
      return [];
  }
}

/** Fail closed early: a constraint naming an unknown control is a defect. */
export function assertConstraintsResolve(
  controls: PolicyControl[],
  constraints: FormalConstraint[],
): void {
  const known = new Set(controls.map((c) => c.id));
  for (const constraint of constraints) {
    for (const id of constraintScope(constraint)) {
      if (!known.has(id)) {
        throw new Error(`Constraint ${constraint.id} references unknown control ${id}`);
      }
    }
  }
}
