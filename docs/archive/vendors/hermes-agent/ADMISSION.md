# Hermes Agent Vendor Admission

This document admits the full Hermes Agent capability set as the target external runtime for DSG ONE, while preserving DSG's action safety gate.

## Source

- Project: Hermes Agent
- Upstream repository: https://github.com/NousResearch/hermes-agent
- Vendor/author: Nous Research
- License: MIT
- Pinned upstream commit inspected for admission: `b34ee80741db2fdf188dcdc5c5caa78ee72642ff`
- Upstream README inspected: Hermes Agent README on `main`
- Upstream license inspected: MIT License, copyright Nous Research

## Product rule

Hermes must remain fully usable. DSG must not disable Hermes, reduce Hermes capability, or turn Hermes into a status-only chatbot.

DSG Gate exists to inspect each proposed action before execution:

```text
Safe action -> RUN
Risky action -> REQUEST_APPROVAL
Dangerous action -> BLOCK
```

Every allowed or approved action must emit trace, evidence, and audit metadata where applicable.

## Full Hermes capability surface to preserve

The following upstream capabilities are admitted as the intended runtime surface. They must be mapped into DSG as capabilities, not deleted or hidden.

### Agent runtime

- Self-improving agent loop
- Skill creation from experience
- Skill improvement during use
- Memory persistence and nudges
- Session search and cross-session recall
- User model / profile memory
- Subagent delegation
- Parallel workstreams
- Tool-calling model support
- Trajectory generation and compression for research workflows

### Interfaces

- CLI / terminal UI
- Messaging gateway
- Telegram
- Discord
- Slack
- WhatsApp
- Signal
- Email / platform delivery where configured
- Voice memo transcription where configured
- Cross-platform conversation continuity
- Gateway process for remote operation

### Model providers and endpoint flexibility

- Nous Portal
- OpenRouter
- NovitaAI
- NVIDIA NIM
- Xiaomi MiMo
- z.ai / GLM
- Kimi / Moonshot
- MiniMax
- Hugging Face
- OpenAI
- Custom OpenAI-compatible or user-provided endpoints
- Runtime model switching with no code changes

### Tool Gateway and hosted tools

- Web search
- Page/content extraction
- Image generation
- Text-to-speech
- Cloud browser / Browser Use
- Bring-your-own-key tool backends
- Provider-specific tool gateway configuration

### Terminal and execution backends

- Local terminal backend
- Docker backend
- SSH backend
- Singularity backend
- Modal backend
- Daytona backend
- Serverless persistence / hibernation where backend supports it
- Process management
- Streaming command output
- Interrupt and redirect workflows

### File and code tools

- Read file
- Write file
- Patch file
- Search files
- Execute code
- Run scripts that call tools via RPC
- Collapse multi-step pipelines into zero-context-cost tool scripts

### Browser and computer-use tools

- Browser navigation
- Browser snapshot
- Browser click
- Browser type
- Browser scroll
- Browser back
- Browser press
- Browser image retrieval
- Browser vision
- Browser console
- Browser CDP
- Browser dialog handling
- Optional desktop/computer-use MCP integrations where installed

### Skills and memory

- Skills list
- Skill view
- Skill manage
- Skills Hub / agentskills.io compatibility
- Procedural memory
- Local memory
- Honcho memory integration where configured
- Context files that shape conversation behavior
- OpenClaw migration of memories, skills, persona, settings, allowlist, and workspace instructions

### Scheduling and automation

- Built-in cron scheduler
- Daily reports
- Nightly backups
- Weekly audits
- Natural-language scheduled jobs
- Cron delivery to configured platforms

### MCP and extensibility

- MCP client/server integration
- Connect any MCP server for extended capabilities
- Toolset system
- Custom toolsets
- Platform-specific toolsets
- Dynamic tool resolution

### Security features from upstream to preserve

- Command approval concepts
- DM/user pairing for messaging surfaces
- Container/sandbox isolation where available
- Tool configuration via `hermes tools`
- `hermes doctor` diagnostics
- Dry-run migration options
- Allowlisted secrets migration from OpenClaw when explicitly chosen

## DSG capability mapping

DSG must map Hermes capabilities into action classes.

| Hermes capability | DSG action class | Default decision |
|---|---|---|
| status, usage, config read, list tools | read-only inspection | RUN |
| web_search, web_extract | external read | RUN unless disallowed/exfiltration risk |
| browser_navigate, browser_snapshot | browser read/navigation | RUN + evidence |
| browser_click, browser_type, browser_press | browser mutation/input | REQUEST_APPROVAL when sensitive |
| read_file, search_files | workspace read | RUN if inside approved workspace |
| write_file, patch | workspace mutation | REQUEST_APPROVAL |
| terminal, process, execute_code | command execution | REQUEST_APPROVAL if sandboxed, otherwise BLOCK |
| cronjob | scheduled automation | REQUEST_APPROVAL |
| send_message | external communication | REQUEST_APPROVAL |
| delegate_task | subagent orchestration | REQUEST_APPROVAL for non-read-only tasks |
| secrets, auth, RBAC, billing, finance | sensitive business surface | BLOCK unless scoped and security-approved |
| deploy, production claim | production surface | BLOCK unless proof-gated |

## Gate behavior

DSG must not block Hermes at catalog time. Hermes tools should be visible/proposable. DSG evaluates before execution.

```text
Hermes proposes action
  -> DSG classifies risk
  -> DSG checks workspace, sandbox, secret scope, network scope, approvals, and proof
  -> DSG returns RUN / REQUEST_APPROVAL / BLOCK
  -> Controlled Executor executes only RUN or approved actions
  -> Evidence and audit are recorded
```

## Runtime admission status

This document admits the upstream project and its capability surface as the intended integration target.

It does not claim that the Hermes runtime is already fully connected inside DSG production.

Implementation still requires:

- Hermes sidecar installation/provisioner
- Pinned commit checkout or package installation
- License notice retention
- Tool catalog import
- Action gate evaluator
- Controlled executor binding
- Browser/terminal/file adapters
- Evidence and audit hooks
- Tests and live proof

## Claim boundary

Allowed claim after this document only:

```text
DSG has an official policy/spec to integrate Hermes Agent as a full-capability external runtime behind an action safety gate.
```

Blocked claims until executable proof exists:

```text
Hermes is fully integrated.
Hermes browser works in production.
Hermes terminal works in production.
DSG production runtime is ready.
```
