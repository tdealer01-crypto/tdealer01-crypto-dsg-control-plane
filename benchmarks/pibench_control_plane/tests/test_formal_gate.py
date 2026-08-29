from __future__ import annotations

import pytest

from formal_gate import (
    DECISIONS,
    Mulberry32,
    PolicySignals,
    build_qubo,
    deterministic_anneal,
    qubo_to_ising,
    solve_policy,
)


def safe_signals() -> PolicySignals:
    return PolicySignals(
        explicit_deny=False,
        requires_escalation=False,
        authorization_verified=True,
        mandatory_preconditions_satisfied=True,
        privacy_release_allowed=True,
        operational_action_requested=True,
        confidence=0.9,
    )


def test_mulberry32_replay_is_identical() -> None:
    a = Mulberry32(42)
    b = Mulberry32(42)
    assert [a.next_u32() for _ in range(32)] == [b.next_u32() for _ in range(32)]


def test_qubo_replay_and_ising_shape_are_deterministic() -> None:
    q = build_qubo(safe_signals())
    first = deterministic_anneal(q, seed=42)
    second = deterministic_anneal(q, seed=42)
    assert first == second
    assert first["candidate"] == "ALLOW"
    assert first["ising_spins"] == qubo_to_ising(first["bits"])
    assert len(first["bits"]) == len(DECISIONS)


def test_z3_allows_only_when_authority_and_preconditions_are_proven() -> None:
    pytest.importorskip("z3")
    result = solve_policy(safe_signals())
    assert result["z3"]["status"] == "SAT"
    assert result["decision"] == "ALLOW"


def test_z3_denies_explicit_prohibition() -> None:
    pytest.importorskip("z3")
    signals = PolicySignals(
        explicit_deny=True,
        requires_escalation=False,
        authorization_verified=True,
        mandatory_preconditions_satisfied=True,
        privacy_release_allowed=True,
        operational_action_requested=True,
        confidence=1.0,
    )
    result = solve_policy(signals)
    assert result["decision"] == "DENY"
    assert result["z3"]["truth"]["DENY"] is True


def test_z3_denies_protected_disclosure() -> None:
    pytest.importorskip("z3")
    signals = PolicySignals(
        explicit_deny=False,
        requires_escalation=False,
        authorization_verified=True,
        mandatory_preconditions_satisfied=True,
        privacy_release_allowed=False,
        operational_action_requested=True,
        confidence=0.8,
    )
    assert solve_policy(signals)["decision"] == "DENY"


def test_z3_escalates_missing_authorization() -> None:
    pytest.importorskip("z3")
    signals = PolicySignals(
        explicit_deny=False,
        requires_escalation=False,
        authorization_verified=False,
        mandatory_preconditions_satisfied=True,
        privacy_release_allowed=True,
        operational_action_requested=True,
        confidence=0.8,
    )
    assert solve_policy(signals)["decision"] == "ESCALATE"


def test_fail_closed_signal_contract_escalates() -> None:
    pytest.importorskip("z3")
    assert solve_policy(PolicySignals.fail_closed())["decision"] == "ESCALATE"
