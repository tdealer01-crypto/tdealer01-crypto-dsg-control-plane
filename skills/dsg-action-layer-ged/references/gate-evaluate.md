# Gate evaluation: evidence-based guidance

This document describes how to review a gate result. It does not define a reachable endpoint or provide a live gate service.

## Required inputs

Record the exact action, target, scope, plan identifier or source, policy/version, required authority, approval state, payload binding, and the evidence source. If a field is missing, record it as missing; do not fill it with a guess.

A live gate result is usable only when it comes from an explicitly configured, authorized connector and identifies the route, input, result, and verification evidence. This repository's guidance skill does not perform that call.

## Decision mapping

| Result | Handling |
|---|---|
| PASS | Continue only if the actual execution tool is separately authorized and the user requested execution. |
| BLOCK | Stop and explain the verified policy or permission reason. |
| REVIEW | Present the action and required evidence to the designated reviewer. |
| UNSUPPORTED | Do not execute under this decision; find a supported path or ask for review. |
| UNVERIFIED | Do not report success. Identify the missing check or evidence. |

A missing route, offline service, absent approval, or unverified signature must never be converted to PASS. Do not fabricate a proof hash or imply that a draft checklist is an executed gate.
