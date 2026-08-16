# DSG Unified MCP Runtime Reference

> **Production source of truth:** live Render registry `dsg-control-plane-unified-mcp` v1.2.0.  
> **Evidence boundary:** registry discovery is verified; authenticated tool execution must be evidenced separately.

## Endpoint

```text
https://tdealer01-crypto-dsg-control-plane.onrender.com/api/mcp
```

Deployed commit at verification time:

```text
69c6204e04363ea9a5c4f20721c2757907180337
```

## Runtime verification

| Check | Result |
|---|---|
| JSON-RPC `initialize` | HTTP 200; protocol `2024-11-05`; server v1.2.0 |
| JSON-RPC `tools/list` | HTTP 200; 65 tools |
| Anonymous `dsg.system.status` | HTTP 401 / `-32001 Unauthorized` |
| Authenticated read-only tool call | REVIEW — no existing credential was available to the verifier |

Request IDs and timestamps are maintained in the GitBook verification record. Do not store API keys in this document.

## Client flow

1. Send `initialize`.
2. Send `notifications/initialized`.
3. Send `tools/list` and use the returned schemas.
4. Authenticate with a supported DSG session or stored MCP key.
5. Send `tools/call`.
6. Verify the structured result, provider postconditions and audit evidence.

Initialize:

```json
{"jsonrpc":"2.0","id":"init-1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client","version":"1.0"}}}
```

List tools:

```json
{"jsonrpc":"2.0","id":"list-1","method":"tools/list","params":{}}
```

Read-only status call:

```json
{"jsonrpc":"2.0","id":"status-1","method":"tools/call","params":{"name":"dsg.system.status","arguments":{}}}
```

## Approval and proof rules

- Discovery does not require authorization; tool execution does.
- WRITE/CRITICAL, deployment, billing, outbound communication, device and file mutations require the approval defined by the runtime policy.
- A queued or dispatched action remains REVIEW until independent postconditions and audit evidence pass.
- `SAT` proves feasibility of encoded constraints; it does not automatically prove global optimality, legal compliance or certification.
- Never present examples as observed runtime results.

## Unified control plane (12)

| Tool | Description | Required fields | Input properties |
|---|---|---|---|
| `dsg.system.status` | Return the unified DSG Control Plane MCP adapter status without exposing secrets. | None | None |
| `dsg.aimo.status` | Check the DSG ONE AIMO harness surface through the unified control-plane gateway. | None | None |
| `dsg.aimo.solve` | Run the governed AIMO pipeline through DSG ONE -> DSG AGI Simulation -> Cinema Proof Agent. | `problem` | `problem`, `shardCount`, `parallelism`, `maxCandidatesPerShard`, `requireAllShards`, `nvidiaIsing` |
| `dsg.aws.contract` | Return the governed AWS execution contract used by the Control Plane and AWS Agent Toolkit adapter. | None | None |
| `dsg.aws.deploy` | Gate and idempotently dispatch the repository CDK deployment workflow. Deployment remains REVIEW until post-deploy evidence verifies it. | `environment`, `approved`, `idempotencyKey` | `environment`, `approved`, `idempotencyKey` |
| `dsg.repair.simulate` | Generate a binary repair plan and verify the selected candidate exactly with Z3. This tool is plan-only and never mutates a repository. | `jobId`, `finding`, `candidates`, `allowedFiles` | `jobId`, `finding`, `candidates`, `allowedFiles`, `approvals`, `solver` |
| `dsg.evaluate` | Evaluate an AI agent action through the DSG deterministic gate. Returns gate decision (PASS/BLOCK/REVIEW), proof hash, and policy constraints checked. | `action`, `actor` | `action`, `actor`, `tool`, `args`, `env` |
| `dsg.verifyClaim` | Verify whether a production claim is allowed given the current evidence state. Blocks claims like "production-ready" or "certified" that require independent verification. | `claim` | `claim`, `evidenceRefs` |
| `dsg.recordEvidence` | Record an evidence envelope into the CCVS chain. Returns an evidence envelope with integrity hash. | `kind`, `hash` | `kind`, `hash`, `url`, `metadata` |
| `dsg.exportComplianceBundle` | Export a compliance bundle for a given regulatory framework. Returns the compliance matrix with control statuses and summary. | `framework` | `framework` |
| `dsg.getReadiness` | Get the current DSG system readiness status including compliance matrix summary, evidence chain health, and deployment posture. | None | None |
| `dsg.classifyRisk` | Deterministically classify an AI-proposed action into an EU AI Act-aligned risk tier (low/medium/high/critical), sourced from docs/consult-toolkit/risk-classification-checklist.md. Caller supplies explicit capability flags; ambiguous or unanswered flags never lower the resulting tier. | `actionDescription` | `actionDescription`, `capabilities` |

## Verified Action Compiler (3)

| Tool | Description | Required fields | Input properties |
|---|---|---|---|
| `dsg.action.registry` | Return the deterministic Action Registry used by the Verified Action Compiler. Registry entries are the only actions the compiler may emit. | None | None |
| `dsg.action.compile` | Compile a verified solution into typed Action IR without executing it. Unknown or unmapped solution parameters fail closed as UNSUPPORTED. | `solution`, `proof` | `profile`, `solution`, `proof` |
| `dsg.action.verifyAcceptance` | Verify Action IR postconditions against independently observed facts and build the final execution receipt when the complete upstream proof chain is supplied. | `plan`, `observations`, `evidence` | `plan`, `observations`, `evidence`, `proofChain` |

## Deployment adapters (2)

| Tool | Description | Required fields | Input properties |
|---|---|---|---|
| `dsg.deploy.status` | Return governed deployment adapter readiness for Netlify, Render, and Supabase. GitHub Actions is the dispatcher and evidence boundary. | None | None |
| `dsg.deploy.execute` | Gate and idempotently dispatch a governed deployment to Netlify, Render, or Supabase. Dispatch success remains REVIEW until provider evidence is verified. | `target`, `environment`, `approved`, `idempotencyKey` | `target`, `environment`, `approved`, `idempotencyKey`, `ref`, `supabaseMode` |

## Android device and UI (8)

| Tool | Description | Required fields | Input properties |
|---|---|---|---|
| `device.status.get` | Queue device.status.get for Android owner-agent review. Class=PASS; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `device.open_url` | Queue device.open_url for Android owner-agent review. Class=PASS; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `device.open_app` | Queue device.open_app for Android owner-agent review. Class=PASS; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `device.open_settings` | Queue device.open_settings for Android owner-agent review. Class=PASS; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `ui.back` | Queue ui.back for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `ui.home` | Queue ui.home for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `ui.scroll` | Queue ui.scroll for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `device.notifications.summary` | Queue device.notifications.summary for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |

## File tools (7)

| Tool | Description | Required fields | Input properties |
|---|---|---|---|
| `file.list_root` | Queue file.list_root for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `file.preview` | Queue file.preview for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `file.select` | Queue file.select for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `file.send_to_claw` | Queue file.send_to_claw for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `file.rename` | Queue file.rename for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `file.move` | Queue file.move for Android owner-agent review. Class=REVIEW; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |
| `file.delete` | Queue file.delete for Android owner-agent review. Class=BLOCK; owner approval is always required before device execution. | `deviceId` | `deviceId`, `url`, `packageName`, `screen`, `direction` |

## Hermes runtime (33)

| Tool | Description | Required fields | Input properties |
|---|---|---|---|
| `hermes.readiness` | [READ] Fetch deployment readiness from /api/readiness with a safe warning fallback on server errors. | None | None |
| `hermes.execute_action` | [CRITICAL] Create intent and execute through DSG gate with full audit. | `agent_id`, `action` | `agent_id`, `action`, `payload` |
| `hermes.browser_navigate` | [READ] Open a URL in a Browserbase cloud browser with full JS rendering. Returns session live-view URL + HTTP-fetched text content. | `url` | `url`, `extract` |
| `hermes.telegram_send` | [CRITICAL] Send a message to Telegram through DSG spine. | `agent_id`, `chat_id`, `text` | `agent_id`, `chat_id`, `text` |
| `hermes.audit_summary` | [READ] Fetch runtime truth and latest ledger entries for an agent. | `agent_id` | `agent_id` |
| `hermes.checkpoint` | [WRITE] Create a checkpoint hash from latest truth and ledger. | `agent_id` | `agent_id` |
| `hermes.recovery_validate` | [READ] Validate lineage integrity and missing sequences. | `agent_id` | `agent_id` |
| `hermes.realtime_web_search` | [READ] Search live online information and return quick references. | `query` | `query` |
| `hermes.capacity` | [READ] Fetch quota remaining and utilization. | None | None |
| `hermes.list_agents` | [READ] List org agents and current monthly usage. | None | None |
| `hermes.create_agent` | [WRITE] Create a new agent with one-time API key return. | `name` | `name`, `policy_id`, `monthly_limit` |
| `hermes.create_chatbot_agent` | [WRITE] Create a chatbot-ready agent with safe defaults for interactive usage. | None | `name`, `policy_id`, `monthly_limit` |
| `hermes.list_policies` | [READ] List available policies. | None | None |
| `hermes.reconcile_effect` | [WRITE] Mark effect status as succeeded or failed. | `effect_id`, `status` | `effect_id`, `status` |
| `hermes.list_executions` | [READ] List recent executions for this organization. | None | `limit` |
| `hermes.get_execution_proof` | [READ] Get replay details and proof context for one execution. | `execution_id` | `execution_id` |
| `hermes.list_proofs` | [READ] List recent proof artifacts from audit logs. | None | `limit` |
| `hermes.get_ledger` | [READ] Get combined ledger and core-ledger snapshot. | None | `limit` |
| `hermes.get_audit` | [READ] Get audit events and determinism checks. | None | `limit` |
| `hermes.get_usage` | [READ] Get current plan usage and projected overage. | None | None |
| `hermes.get_metrics` | [READ] Get current day control-plane performance metrics. | None | None |
| `hermes.get_integration` | [READ] Fetch integration status and source-of-truth posture. | None | None |
| `hermes.get_agent_detail` | [READ] Get details and monthly usage for one agent. | `agent_id` | `agent_id` |
| `hermes.update_agent` | [WRITE] Update agent metadata, status, policy, or monthly limit. | `agent_id` | `agent_id`, `name`, `status`, `policy_id`, `monthly_limit` |
| `hermes.rotate_agent_key` | [CRITICAL] Rotate and return a new one-time API key for an agent. | `agent_id` | `agent_id` |
| `hermes.delete_agent` | [CRITICAL] Disable an agent (soft delete). | `agent_id` | `agent_id` |
| `hermes.get_enterprise_proof` | [READ] Fetch public enterprise proof and attestation report. | None | None |
| `hermes.auto_setup` | [CRITICAL] Auto-configure default policy, agent, seed execution, billing, onboarding, and runtime roles. | None | None |
| `hermes.write_code_file` | [WRITE] Write a code file into the sandbox (/tmp/dsg-code/). Secret injection is blocked. | `filename`, `content` | `filename`, `content`, `language` |
| `hermes.run_code` | [CRITICAL] Execute inline code or a sandbox file through the Hermes Brain governance gate. Supports node, python3, bash. Returns stdout. | `runtime` | `runtime`, `code`, `file` |
| `hermes.get_compliance_status` | [READ] Get live CCVS compliance status — mutation score, claim gates, evidence chain. | None | `run_id` |
| `hermes.get_delivery_proof` | [READ] Run a live Delivery Proof scan — checks readiness, health, auth gates on production. | None | `production_url`, `readiness_path` |
| `hermes.fetch_url` | [READ] Fetch a public HTTPS URL and return text content (no JS rendering). Fast and lightweight. | `url` | `url`, `selector` |

## Historical document boundary

PR #1088 is not this reference. It remains an unmerged draft based on a historical interface list. Its tool names do not match the current v1.2.0 registry, so it must not be used as production source of truth.

## Regeneration

Regenerate this document from `GET /api/mcp` or JSON-RPC `tools/list` after each production MCP version change. Verify that:

- the server and version match the intended release;
- tool names are unique;
- documented count equals the live registry count;
- high-risk descriptions retain their approval and REVIEW boundaries;
- no credential or token value appears in the generated file.
