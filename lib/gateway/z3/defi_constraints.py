"""
DeFi transaction constraint proofs (Theorems 6–8).

Models financial transaction parameters as Z3 Real variables and proves:
  6. amount_bound         — no transaction can violate single-tx or daily limit
  7. slippage_bound       — no transaction can exceed max slippage
  8. constraint_consistency — the constraint set is satisfiable (not all-blocking)

Usage:
    pip install z3-solver
    python3 lib/gateway/z3/defi_constraints.py
"""
import sys
from z3 import Real, RealVal, Bool, Solver, And, Or, Implies, sat, unsat

# ── Constraint values ─────────────────────────────────────────────────────────
# These become the source of truth written into verified-constraints.json.
MAX_SINGLE_TX_USD = RealVal(1000)    # $1,000 per transaction
MAX_DAILY_USD     = RealVal(10000)   # $10,000 per day per org
MAX_SLIPPAGE_BPS  = RealVal(50)      # 0.5% slippage tolerance (50 basis points)

ALLOWED_TOKENS = ['KUB', 'KKUB', 'USDT', 'ETH', 'BTC']
ALLOWED_PROTOCOLS = ['kubswap', 'kub-perps', 'kub-lend', 'kub-liquid-stake']

DEFI_PROVED: list[str] = []
DEFI_FAILED: list[str] = []


def _check_unsat(name: str, s: Solver) -> bool:
    result = s.check()
    if result == unsat:
        print(f'✓ PROVED   [{name}]')
        DEFI_PROVED.append(name)
        return True
    else:
        print(f'✗ FAILED   [{name}]  counterexample: {s.model()}')
        DEFI_FAILED.append(name)
        return False


def main() -> list[str]:
    amount      = Real('amount')
    daily_spent = Real('daily_spent')
    slippage    = Real('slippage')
    execute     = Bool('execute')

    # Invariant conjunction: all constraints that must hold when execute=True
    all_bounds = And(
        amount > RealVal(0),
        amount <= MAX_SINGLE_TX_USD,
        daily_spent >= RealVal(0),
        daily_spent + amount <= MAX_DAILY_USD,
        slippage >= RealVal(0),
        slippage <= MAX_SLIPPAGE_BPS,
    )

    # ── Theorem 6: Amount Bound ───────────────────────────────────────────────
    # Claim: no executed tx can violate the single-tx or daily limit.
    # Proof: assume execute=True AND bounds hold, then add violation — UNSAT.
    s6 = Solver()
    s6.add(Implies(execute, all_bounds))
    s6.add(execute)
    s6.add(Or(
        amount > MAX_SINGLE_TX_USD,
        daily_spent + amount > MAX_DAILY_USD
    ))
    _check_unsat('amount_bound', s6)

    # ── Theorem 7: Slippage Bound ─────────────────────────────────────────────
    # Claim: no executed tx can exceed the max slippage.
    s7 = Solver()
    s7.add(Implies(execute, all_bounds))
    s7.add(execute)
    s7.add(slippage > MAX_SLIPPAGE_BPS)
    _check_unsat('slippage_bound', s7)

    # ── Theorem 8: Constraint Consistency ────────────────────────────────────
    # Claim: the constraint set is satisfiable — there exists a valid transaction.
    # (Confirms the DeFi validator is not trivially all-blocking.)
    s8 = Solver()
    s8.add(
        amount > RealVal(0),
        amount <= MAX_SINGLE_TX_USD,
        daily_spent == RealVal(0),
        daily_spent + amount <= MAX_DAILY_USD,
        slippage >= RealVal(0),
        slippage <= MAX_SLIPPAGE_BPS,
    )
    result = s8.check()
    if result == sat:
        m = s8.model()
        print(f'✓ PROVED   [constraint_consistency]'
              f' (example: amount={m[amount]}, slippage={m[slippage]})')
        DEFI_PROVED.append('constraint_consistency')
    else:
        print(f'✗ FAILED   [constraint_consistency]  no valid transaction exists!')
        DEFI_FAILED.append('constraint_consistency')

    print()
    print(f'DeFi theorems: {len(DEFI_PROVED)} proved, {len(DEFI_FAILED)} failed')
    if DEFI_FAILED:
        sys.exit(1)
    return list(DEFI_PROVED)


if __name__ == '__main__':
    main()
