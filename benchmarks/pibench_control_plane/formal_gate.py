from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from decimal import Decimal, getcontext
from typing import Any

getcontext().prec = 50

DECISIONS = ("ALLOW", "DENY", "ESCALATE")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class PolicySignals:
    explicit_deny: bool
    requires_escalation: bool
    authorization_verified: bool
    mandatory_preconditions_satisfied: bool
    privacy_release_allowed: bool
    operational_action_requested: bool
    confidence: float = 0.0

    @classmethod
    def fail_closed(cls) -> "PolicySignals":
        return cls(
            explicit_deny=False,
            requires_escalation=True,
            authorization_verified=False,
            mandatory_preconditions_satisfied=False,
            privacy_release_allowed=True,
            operational_action_requested=True,
            confidence=0.0,
        )


class Mulberry32:
    """32-bit deterministic PRNG used only by the advisory QUBO search."""

    def __init__(self, seed: int = 42) -> None:
        self._state = seed & 0xFFFFFFFF

    def next_u32(self) -> int:
        self._state = (self._state + 0x6D2B79F5) & 0xFFFFFFFF
        z = self._state
        z = ((z ^ (z >> 15)) * (z | 1)) & 0xFFFFFFFF
        z ^= (z + (((z ^ (z >> 7)) * (z | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return (z ^ (z >> 14)) & 0xFFFFFFFF

    def unit_decimal(self) -> Decimal:
        return Decimal(self.next_u32()) / Decimal(2**32)


def _decision_biases(signals: PolicySignals) -> dict[str, int]:
    deny_trigger = signals.explicit_deny or (
        signals.operational_action_requested and not signals.privacy_release_allowed
    )
    escalate_trigger = (
        signals.requires_escalation
        or (
            signals.operational_action_requested
            and (
                not signals.authorization_verified
                or not signals.mandatory_preconditions_satisfied
            )
        )
    )
    allow_trigger = not deny_trigger and not escalate_trigger
    return {
        "ALLOW": -4 if allow_trigger else 10,
        "DENY": -6 if deny_trigger else 6,
        "ESCALATE": -5 if (not deny_trigger and escalate_trigger) else 5,
    }


def build_qubo(signals: PolicySignals, one_hot_penalty: int = 12) -> list[list[int]]:
    """Build a 3x3 upper-triangular QUBO over ALLOW/DENY/ESCALATE.

    QUBO is advisory only. Z3 is the execution authority.
    """

    biases = _decision_biases(signals)
    n = len(DECISIONS)
    q = [[0 for _ in range(n)] for _ in range(n)]
    for i, decision in enumerate(DECISIONS):
        q[i][i] = biases[decision] - one_hot_penalty
    for i in range(n):
        for j in range(i + 1, n):
            q[i][j] = 2 * one_hot_penalty
    return q


def qubo_energy(bits: list[int], q: list[list[int]]) -> int:
    total = 0
    for i in range(len(bits)):
        total += q[i][i] * bits[i]
        for j in range(i + 1, len(bits)):
            total += q[i][j] * bits[i] * bits[j]
    return total


def qubo_to_ising(bits: list[int]) -> list[int]:
    return [2 * int(bit) - 1 for bit in bits]


def deterministic_anneal(
    q: list[list[int]],
    *,
    seed: int = 42,
    steps: int = 96,
) -> dict[str, Any]:
    rng = Mulberry32(seed)
    state = [0] * len(DECISIONS)
    state[rng.next_u32() % len(DECISIONS)] = 1
    energy = qubo_energy(state, q)

    trajectory: list[dict[str, Any]] = []
    previous_hash: str | None = None

    for step in range(steps):
        idx = rng.next_u32() % len(state)
        candidate = state.copy()
        candidate[idx] = 1 - candidate[idx]
        candidate_energy = qubo_energy(candidate, q)
        delta = candidate_energy - energy

        temperature = Decimal(8) * (Decimal("0.94") ** step)
        accepted = delta <= 0
        if not accepted and temperature > 0:
            probability = (-Decimal(delta) / temperature).exp()
            accepted = rng.unit_decimal() < probability

        if accepted:
            state = candidate
            energy = candidate_energy

        core = {
            "step": step,
            "flip": idx,
            "accepted": accepted,
            "energy": energy,
            "state": state,
            "previous": previous_hash,
        }
        step_hash = sha256_json(core)
        trajectory.append({**core, "hash": step_hash})
        previous_hash = step_hash

    # Enforce a deterministic one-hot advisory candidate by selecting the
    # minimum-energy one-hot state after the annealing trajectory.
    one_hot = []
    for idx in range(len(DECISIONS)):
        bits = [0] * len(DECISIONS)
        bits[idx] = 1
        one_hot.append((qubo_energy(bits, q), idx, bits))
    _, selected_idx, selected_bits = min(one_hot, key=lambda item: (item[0], item[1]))

    return {
        "seed": seed,
        "steps": steps,
        "candidate": DECISIONS[selected_idx],
        "bits": selected_bits,
        "ising_spins": qubo_to_ising(selected_bits),
        "energy": qubo_energy(selected_bits, q),
        "trajectory_head": previous_hash,
        "trajectory_hash": sha256_json(trajectory),
    }


def z3_authority(signals: PolicySignals) -> dict[str, Any]:
    """Use Z3 as final authority over the normalized semantic signal contract."""

    from z3 import And, Bool, Not, Or, Solver, sat

    allow = Bool("allow")
    deny = Bool("deny")
    escalate = Bool("escalate")

    deny_condition = Or(
        signals.explicit_deny,
        And(signals.operational_action_requested, Not(signals.privacy_release_allowed)),
    )
    escalate_condition = And(
        Not(deny_condition),
        Or(
            signals.requires_escalation,
            And(
                signals.operational_action_requested,
                Or(
                    Not(signals.authorization_verified),
                    Not(signals.mandatory_preconditions_satisfied),
                ),
            ),
        ),
    )
    allow_condition = And(Not(deny_condition), Not(escalate_condition))

    solver = Solver()
    solver.add(allow == allow_condition)
    solver.add(deny == deny_condition)
    solver.add(escalate == escalate_condition)
    solver.add(Or(allow, deny, escalate))
    solver.add(Not(And(allow, deny)))
    solver.add(Not(And(allow, escalate)))
    solver.add(Not(And(deny, escalate)))

    status = solver.check()
    if status != sat:
        return {
            "status": str(status).upper(),
            "decision": "BLOCK",
            "proof_hash": sha256_json({"signals": asdict(signals), "status": str(status)}),
        }

    model = solver.model()
    truth = {
        "ALLOW": bool(model.eval(allow)),
        "DENY": bool(model.eval(deny)),
        "ESCALATE": bool(model.eval(escalate)),
    }
    selected = [name for name, value in truth.items() if value]
    if len(selected) != 1:
        return {
            "status": "INVALID_MODEL",
            "decision": "BLOCK",
            "proof_hash": sha256_json({"signals": asdict(signals), "truth": truth}),
        }

    proof_material = {
        "schema": "dsg-pibench-z3-authority/v1",
        "signals": asdict(signals),
        "truth": truth,
        "decision": selected[0],
    }
    return {
        "status": "SAT",
        "decision": selected[0],
        "truth": truth,
        "proof_hash": sha256_json(proof_material),
    }


def solve_policy(signals: PolicySignals) -> dict[str, Any]:
    q = build_qubo(signals)
    qubo = deterministic_anneal(q)
    z3 = z3_authority(signals)
    return {
        "signals_hash": sha256_json(asdict(signals)),
        "qubo_matrix": q,
        "qubo": qubo,
        "z3": z3,
        "decision": z3["decision"],
    }
