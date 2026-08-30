from __future__ import annotations

from server import _agent_card_payload, _find_tool


def test_agent_card_declares_pibench_bootstrap_extension() -> None:
    card = _agent_card_payload("http://127.0.0.1:9010")
    assert "urn:pi-bench:policy-bootstrap:v1" in card["extensions"]
    assert card["protocolVersion"] == "0.3.0"


def test_record_decision_tool_lookup_is_exact() -> None:
    tools = [
        {"type": "function", "function": {"name": "record_decision", "parameters": {"type": "object"}}},
        {"type": "function", "function": {"name": "record_decision_extra", "parameters": {"type": "object"}}},
    ]
    found = _find_tool(tools, "record_decision")
    assert found is tools[0]
