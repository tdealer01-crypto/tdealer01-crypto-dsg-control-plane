# DSG Operator Runtime Policy

This document records the core runtime rule for DSG ONE agent integrations.

## Core rule

Hermes is the operator runtime. DSG Gate is the safety inspector.

DSG must not disable Hermes, reduce Hermes capability, or block normal work by default. DSG must inspect each proposed action before execution and decide whether the action is safe to run.

## Runtime flow

```text
User command
  -> Hermes selects the tool/action with full capability
  -> DSG Gate evaluates the proposed action
  -> Safe action: RUN
  -> Risky action: REQUEST_APPROVAL
  -> Dangerous action: BLOCK
  -> Approved action runs through Controlled Executor
  -> Evidence and audit are recorded
  -> Claim Gate blocks unsupported claims
```

## Decision model

| Action class | Decision | Rule |
|---|---|---|
| Status, list, read-only inspection | RUN | Allow and record trace. |
| Web search or public page extract | RUN | Allow unless exfiltration or disallowed target risk is detected. |
| Browser navigate or snapshot | RUN | Allow with evidence capture. |
| Browser click or type | REQUEST_APPROVAL when sensitive | Require approval for login, payment, admin, destructive, or personal-data actions. |
| Read file in approved workspace | RUN | Block paths outside approved workspace/scope. |
| Write file or patch | REQUEST_APPROVAL | Must include target files and reason. |
| Terminal, process, execute code | REQUEST_APPROVAL | Must run only in sandbox; block if sandbox is absent. |
| Cron or scheduled automation | REQUEST_APPROVAL | Must include schedule, scope, and stop condition. |
| External message or notification | REQUEST_APPROVAL | Must show recipient and body before send. |
| Secrets, auth, RBAC, billing, finance | BLOCK unless scoped and security-approved | No implicit secret access. |
| Production deploy or production claim | BLOCK unless proof-gated | Requires approval, evidence, audit, and claim gate. |

## Personal operator mode

For a single trusted operator, DSG should reduce friction while preserving safety:

```text
web_search: RUN
browser_navigate: RUN + evidence
browser_snapshot: RUN + evidence
read_workspace_file: RUN
write_file_or_patch: REQUEST_APPROVAL
terminal_or_execute_code: sandbox + REQUEST_APPROVAL
secrets_auth_billing_production: BLOCK unless explicitly scoped and approved
```

## Product boundary

DSG is not a tool-disabling layer. DSG is not a replacement for Hermes. DSG must not turn a working agent into a status-only chatbot.

Hermes is the engine. DSG is the safety gate, audit trail, evidence layer, and claim boundary.
