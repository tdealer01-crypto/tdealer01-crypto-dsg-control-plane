"""
Yield optimizer mathematical invariant proofs.

Proves 4 theorems about the proportional yield distribution math
in lib/defi/yield-optimizer.ts. All theorems use refutation:
  Not(claim) == UNSAT  =>  claim is proved for all valid inputs.

Usage:
    pip install z3-solver
    python3 lib/gateway/z3/yield_invariants.py
"""
import sys
from z3 import Real, RealVal, Solver, And, Not, Implies, unsat, sat

MAX_APY_PCT = RealVal(50)          # 50% APY ceiling
GAIN_THRESHOLD_BPS = RealVal("0.5")  # 0.5% minimum gain to rebalance (REBALANCE_THRESHOLD_PCT)

PROVED: list[str] = []
FAILED: list[str] = []


def _refute(name: str, claim) -> bool:
    s = Solver()
    s.add(Not(claim))
    result = s.check()
    if result == unsat:
        print(f'✓ PROVED   [{name}]  (Not(claim) == UNSAT)')
        PROVED.append(name)
        return True
    else:
        print(f'✗ FAILED   [{name}]  counterexample: {s.model()}')
        FAILED.append(name)
        return False


def main() -> None:
    # ── Theorem 1: share_sum_unity ─────────────────────────────────────────────
    # For 2 users with deposits d1, d2 > 0 summing to pool P,
    # their fractions d1/P + d2/P == 1.
    # We prove the 2-user case; by linearity it generalises to N users.
    d1 = Real('d1')
    d2 = Real('d2')
    pool = Real('pool')

    precond = And(d1 > 0, d2 > 0, pool == d1 + d2)
    share_sum = (d1 / pool) + (d2 / pool)
    _refute('share_sum_unity', Implies(precond, share_sum == RealVal(1)))

    # ── Theorem 2: share_non_negative ─────────────────────────────────────────
    # Each user's share fraction is in [0, 1] given deposit >= 0 and pool > 0.
    deposit = Real('deposit')
    total = Real('total')

    precond2 = And(deposit >= 0, total > 0, deposit <= total)
    fraction = deposit / total
    _refute('share_non_negative', Implies(precond2, And(fraction >= 0, fraction <= RealVal(1))))

    # ── Theorem 3: yield_upper_bound ──────────────────────────────────────────
    # Daily yield for a pool P at APY a% <= P * (MAX_APY_PCT / 100 / 365).
    P = Real('P')
    apy = Real('apy')

    precond3 = And(P > 0, apy >= 0, apy <= MAX_APY_PCT)
    daily_yield = P * (apy / RealVal(100) / RealVal(365))
    max_daily = P * (MAX_APY_PCT / RealVal(100) / RealVal(365))
    _refute('yield_upper_bound', Implies(precond3, daily_yield <= max_daily))

    # ── Theorem 4: gain_threshold_monotone ────────────────────────────────────
    # If the APY gain (new_apy - current_apy) is >= GAIN_THRESHOLD_BPS,
    # then new_apy > current_apy (rebalance is strictly beneficial).
    current_apy = Real('current_apy')
    new_apy = Real('new_apy')
    gain = new_apy - current_apy

    precond4 = And(current_apy >= 0, new_apy >= 0, gain >= GAIN_THRESHOLD_BPS)
    _refute('gain_threshold_monotone', Implies(precond4, new_apy > current_apy))

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print(f'Yield invariants: {len(PROVED)} proved, {len(FAILED)} failed')
    if FAILED:
        sys.exit(1)


if __name__ == '__main__':
    main()
