from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from jsonschema import ValidationError
from jsonschema.validators import validator_for

from formal_gate import canonical_json, sha256_json

_ALLOWED_DECISIONS = {"ALLOW", "ALLOW-CONDITIONAL", "DENY", "ESCALATE"}
_SAFE_ESCALATION_TOKENS = (
    "get",
    "lookup",
    "inspect",
    "check",
    "query",
    "retrieve",
    "verify",
    "list",
    "search",
    "read",
    "escalat",
    "request_approval",
    "create_ticket",
    "open_ticket",
    "flag",
    "hold",
    "freeze",
    "record_decision",
)


@dataclass(frozen=True)
class ExecutionGateResult:
    status: str
    tool_calls: list[dict[str, Any]]
    reason_codes: list[str]
    receipt: dict[str, Any]


def _tool_registry(tools: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], list[str]]:
    registry: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    for index, raw in enumerate(tools):
        if not isinstance(raw, dict):
            errors.append(f"INVALID_TOOL_SCHEMA:{index}")
            continue
        function = raw.get("function") if isinstance(raw.get("function"), dict) else raw
        name = str(function.get("name", "")).strip() if isinstance(function, dict) else ""
        parameters = function.get("parameters", {"type": "object"}) if isinstance(function, dict) else None
        if not name or not isinstance(parameters, dict):
            errors.append(f"INVALID_TOOL_SCHEMA:{index}")
            continue
        if name in registry:
            errors.append(f"DUPLICATE_TOOL_SCHEMA:{name}")
            continue
        try:
            cls = validator_for(parameters)
            cls.check_schema(parameters)
        except Exception:
            errors.append(f"INVALID_TOOL_SCHEMA:{name}")
            continue
        registry[name] = parameters
    return registry, errors


def _safe_for_escalation(name: str) -> bool:
    lowered = name.lower()
    return any(token in lowered for token in _SAFE_ESCALATION_TOKENS)


def gate_tool_calls(
    proposed_tool_calls: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    *,
    formal_decision: str,
    content: str | None,
    context_hash: str,
    toolset_hash: str,
    turn_index: int,
    previous_receipt_hash: str | None,
    formal_proof_hash: str,
) -> ExecutionGateResult:
    registry, reasons = _tool_registry(tools)
    accepted: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for index, raw in enumerate(proposed_tool_calls):
        if not isinstance(raw, dict):
            reasons.append(f"INVALID_TOOL_CALL:{index}")
            continue

        call_id = str(raw.get("id", "")).strip()
        function = raw.get("function")
        if not call_id or not isinstance(function, dict):
            reasons.append(f"INVALID_TOOL_CALL:{index}")
            continue
        if call_id in seen_ids:
            reasons.append(f"DUPLICATE_TOOL_CALL_ID:{call_id}")
            continue
        seen_ids.add(call_id)

        name = str(function.get("name", "")).strip()
        if name not in registry:
            reasons.append(f"UNKNOWN_TOOL:{name or index}")
            continue

        raw_arguments = function.get("arguments", "{}")
        if isinstance(raw_arguments, str):
            try:
                arguments = json.loads(raw_arguments)
            except json.JSONDecodeError:
                reasons.append(f"INVALID_JSON_ARGUMENTS:{name}")
                continue
        elif isinstance(raw_arguments, dict):
            arguments = raw_arguments
        else:
            reasons.append(f"INVALID_ARGUMENT_TYPE:{name}")
            continue

        if not isinstance(arguments, dict):
            reasons.append(f"INVALID_ARGUMENT_TYPE:{name}")
            continue

        schema = registry[name]
        try:
            validator_for(schema)(schema).validate(arguments)
        except ValidationError:
            reasons.append(f"SCHEMA_VALIDATION_FAILED:{name}")
            continue
        except Exception:
            reasons.append(f"SCHEMA_VALIDATION_FAILED:{name}")
            continue

        if name == "record_decision":
            decision = arguments.get("decision")
            if decision not in _ALLOWED_DECISIONS:
                reasons.append("INVALID_DECISION_VALUE")
                continue

            if formal_decision == "DENY" and decision != "DENY":
                reasons.append("FORMAL_DECISION_MISMATCH")
                continue
            if formal_decision == "ESCALATE" and decision != "ESCALATE":
                reasons.append("FORMAL_DECISION_MISMATCH")
                continue
            if formal_decision == "ALLOW" and decision not in {"ALLOW", "ALLOW-CONDITIONAL"}:
                reasons.append("FORMAL_DECISION_MISMATCH")
                continue

        if formal_decision == "DENY" and name != "record_decision":
            reasons.append(f"DENY_FORBIDS_OPERATION:{name}")
            continue

        if formal_decision == "ESCALATE" and not _safe_for_escalation(name):
            reasons.append(f"ESCALATE_FORBIDS_OPERATION:{name}")
            continue

        accepted.append(
            {
                "id": call_id,
                "type": "function",
                "function": {
                    "name": name,
                    "arguments": canonical_json(arguments),
                },
            }
        )

    names = [call["function"]["name"] for call in accepted]
    decision_indexes = [i for i, name in enumerate(names) if name == "record_decision"]
    if len(decision_indexes) > 1:
        reasons.append("MULTIPLE_FINAL_DECISIONS")
    if decision_indexes and decision_indexes[0] != len(accepted) - 1:
        reasons.append("ACTION_AFTER_FINAL_DECISION")

    if reasons:
        status = "BLOCKED"
        emitted: list[dict[str, Any]] = []
    else:
        status = "PASSED"
        emitted = accepted

    receipt_core = {
        "schema": "dsg-control-plane-pibench-execution-gate/v1",
        "status": status,
        "formalDecision": formal_decision,
        "formalProofHash": formal_proof_hash,
        "reasonCodes": sorted(set(reasons)),
        "turnIndex": int(turn_index),
        "contextHash": context_hash,
        "toolsetHash": toolset_hash,
        "contentHash": hashlib.sha256((content or "").encode("utf-8")).hexdigest(),
        "proposedToolCallsHash": sha256_json(proposed_tool_calls),
        "emittedToolCallsHash": sha256_json(emitted),
        "previousReceiptHash": previous_receipt_hash,
    }
    receipt = {**receipt_core, "receiptHash": sha256_json(receipt_core)}
    return ExecutionGateResult(
        status=status,
        tool_calls=emitted,
        reason_codes=sorted(set(reasons)),
        receipt=receipt,
    )
