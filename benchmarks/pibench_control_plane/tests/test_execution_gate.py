from __future__ import annotations

import json

from execution_gate import gate_tool_calls


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "transfer_funds",
            "parameters": {
                "type": "object",
                "properties": {"amount": {"type": "number"}},
                "required": ["amount"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "record_decision",
            "parameters": {
                "type": "object",
                "properties": {
                    "decision": {
                        "type": "string",
                        "enum": ["ALLOW", "ALLOW-CONDITIONAL", "DENY", "ESCALATE"],
                    }
                },
                "required": ["decision"],
                "additionalProperties": False,
            },
        },
    },
]


def call(name: str, args: dict, call_id: str = "c1") -> dict:
    return {
        "id": call_id,
        "type": "function",
        "function": {"name": name, "arguments": json.dumps(args)},
    }


def gate(calls: list[dict], decision: str):
    return gate_tool_calls(
        calls,
        TOOLS,
        formal_decision=decision,
        content=None,
        context_hash="ctx",
        toolset_hash="tools",
        turn_index=0,
        previous_receipt_hash=None,
        formal_proof_hash="proof",
    )


def test_deny_blocks_operational_action() -> None:
    result = gate([call("transfer_funds", {"amount": 100})], "DENY")
    assert result.status == "BLOCKED"
    assert result.tool_calls == []
    assert "DENY_FORBIDS_OPERATION:transfer_funds" in result.reason_codes


def test_deny_accepts_only_matching_record_decision() -> None:
    result = gate([call("record_decision", {"decision": "DENY"})], "DENY")
    assert result.status == "PASSED"
    assert result.tool_calls[0]["function"]["name"] == "record_decision"


def test_formal_decision_mismatch_fails_closed() -> None:
    result = gate([call("record_decision", {"decision": "ALLOW"})], "ESCALATE")
    assert result.status == "BLOCKED"
    assert "FORMAL_DECISION_MISMATCH" in result.reason_codes


def test_allow_accepts_schema_valid_action() -> None:
    result = gate([call("transfer_funds", {"amount": 100})], "ALLOW")
    assert result.status == "PASSED"
    assert len(result.tool_calls) == 1


def test_invalid_schema_emits_zero_calls() -> None:
    result = gate([call("transfer_funds", {"amount": "not-a-number"})], "ALLOW")
    assert result.status == "BLOCKED"
    assert result.tool_calls == []


def test_decision_must_be_last() -> None:
    result = gate(
        [
            call("record_decision", {"decision": "ALLOW"}, "d1"),
            call("transfer_funds", {"amount": 1}, "a1"),
        ],
        "ALLOW",
    )
    assert result.status == "BLOCKED"
    assert "ACTION_AFTER_FINAL_DECISION" in result.reason_codes
