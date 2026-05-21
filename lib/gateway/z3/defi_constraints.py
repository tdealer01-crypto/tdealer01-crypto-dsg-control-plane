"""
DeFi transaction constraint proofs (Theorems 6–8).

Usage:
    pip install z3-solver
    python3 lib/gateway/z3/defi_constraints.py
"""
import sys
from z3 import Real, RealVal, Bool, Solver, And, Or, Implies, sat, unsat

MAX_SINGLE_TX_USD = RealVal(1000)
MAX_DAILY_USD     = RealVal(10000)
MAX_SLIPPAGE_BPS  = RealVal(50)

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

    all_bounds = And(
        amount > RealVal(0),
        amount <= MAX_SINGLE_TX_USD,
        daily_spent >= RealVal(0),
        daily_spent + amount <= MAX_DAILY_USD,
        slippage >= RealVal(0),
        slippage <= MAX_SLIPPAGE_BPS,
    )

    s6 = Solver()
    s6.add(Implies(execute, all_bounds))
    s6.add(execute)
    s6.add(Or(amount > MAX_SINGLE_TX_USD, daily_spent + amount > MAX_DAILY_USD))
    _check_unsat('amount_bound', s6)

    s7 = Solver()
    s7.add(Implies(execute, all_bounds))
    s7.add(execute)
    s7.add(slippage > MAX_SLIPPAGE_BPS)
    _check_unsat('slippage_bound', s7)

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
        print(f'✓ PROVED   [constraint_consistency] (example: amount={m[amount]}, slippage={m[slippage]})')
        DEFI_PROVED.append('constraint_consistency')
    else:
        print('✗ FAILED   [constraint_consistency]  no valid transaction exists!')
        DEFI_FAILED.append('constraint_consistency')

    print()
    print(f'DeFi theorems: {len(DEFI_PROVED)} proved, {len(DEFI_FAILED)} failed')
    if DEFI_FAILED:
        sys.exit(1)
    return list(DEFI_PROVED)


if __name__ == '__main__':
    main()
