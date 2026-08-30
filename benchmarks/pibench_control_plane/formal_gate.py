from __future__ import annotations

import hashlib
import json
import os
import subprocess
from dataclasses import asdict, dataclass
from decimal import Decimal, getcontext
from typing import Any

getcontext().prec = 50

DECISIONS = ("ALLOW", "DENY", "ESCALATE")
_PR1180_SOLVER_VERSION = "dsg-qubo-anneal/1.0.0"


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
    """32-bit deterministic PRNG retained as a compatibility fallback for tests."""

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
    """Compatibility QUBO used only when the PR1180 native bridge is not configured."""

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

    one_hot = []
    for idx in range(len(DECISIONS)):
        bits = [0] * len(DECISIONS)
        bits[idx] = 1
        one_hot.append((qubo_energy(bits, q), idx, bits))
    _, selected_idx, selected_bits = min(one_hot, key=lambda item: (item[0], item[1]))

    return {
        "engine": "python-compat-advisory/v1",
        "seed": seed,
        "steps": steps,
        "candidate": DECISIONS[selected_idx],
        "bits": selected_bits,
        "ising_spins": qubo_to_ising(selected_bits),
        "energy": qubo_energy(selected_bits, q),
        "trajectory_head": previous_hash,
        "trajectory_hash": sha256_json(trajectory),
    }


def _native_qubo_bridge() -> str | None:
    value = os.getenv("DSG_QUBO_BRIDGE", "").strip()
    return value or None


def _run_pr1180_qubo(signals: PolicySignals) -> tuple[list[list[Any]], dict[str, Any]]:
    bridge = _native_qubo_bridge()
    if bridge is None:
        q = build_qubo(signals)
        return q, deterministic_anneal(q)

    node_binary = os.getenv("NODE_BINARY", "node").strip() or "node"
    completed = subprocess.run(
        [node_binary, bridge],
        input=canonical_json(asdict(signals)),
        text=True,
        capture_output=True,
        timeout=5,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip()[:500] or f"exit={completed.returncode}"
        raise RuntimeError(f"PR1180 QUBO bridge failed: {detail}")

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("PR1180 QUBO bridge returned invalid JSON") from exc

    if not isinstance(payload, dict):
        raise RuntimeError("PR1180 QUBO bridge returned non-object payload")
    if payload.get("engine") != _PR1180_SOLVER_VERSION:
        raise RuntimeError("PR1180 QUBO bridge solver version mismatch")
    if payload.get("seed") != 42:
        raise RuntimeError("PR1180 QUBO bridge seed mismatch")
    if payload.get("feasible") is not True:
        raise RuntimeError("PR1180 QUBO bridge returned infeasible advisory candidate")
    if payload.get("candidate") not in DECISIONS:
        raise RuntimeError("PR1180 QUBO bridge returned invalid decision candidate")
    matrix = payload.get("matrix")
    if not isinstance(matrix, dict) or not isinstance(matrix.get("matrix"), list):
        raise RuntimeError("PR1180 QUBO bridge omitted matrix evidence")
    if not isinstance(payload.get("provenance_hash"), str) or not payload["provenance_hash"]:
        raise RuntimeError("PR1180 QUBO bridge omitted provenance hash")

    return matrix["matrix"], payload


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
    q, qubo = _run_pr1180_qubo(signals)
    z3 = z3_authority(signals)
    return {
        "signals_hash": sha256_json(asdict(signals)),
        "qubo_matrix": q,
        "qubo": qubo,
        "z3": z3,
        "advisory_matches_authority": qubo.get("candidate") == z3.get("decision"),
        "decision": z3["decision"],
    }
