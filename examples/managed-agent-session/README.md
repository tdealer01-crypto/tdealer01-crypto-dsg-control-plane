# Minimal Managed Agents session

A ~80-line client for the Anthropic **Managed Agents** beta (Sessions API). It
creates a session against an existing agent + environment, opens the SSE event
stream, sends a user message, streams the agent's text to stdout, and exits
cleanly on completion or error.

- Agent: `agent_01GQMdFQNgMFzG9h3kJxqyWA`
- Environment: `env_01CwCpLqUQhxb99xCVXHBQ7t`

The agent and environment are **pre-created** (model / system / tools live on the
agent). This app only opens sessions against them — it never calls `agents.create`.

## Prerequisites

- Node.js 20+
- `ANTHROPIC_API_KEY` exported in your shell
- A current `@anthropic-ai/sdk` that exposes `client.beta.sessions.*`
  (Managed Agents beta, `managed-agents-2026-04-01`).

  > ⚠️ The parent repo pins `@anthropic-ai/sdk@^0.27.3`, which **predates** the
  > Sessions API. Do not rely on the repo's installed copy — install a current
  > SDK locally for this example. This directory is outside the Next.js
  > `tsconfig` `include`, so it has no effect on the app's `next build`.

## Run

```bash
cd examples/managed-agent-session

# install the runner + a current SDK locally (not added to the repo's deps)
npm install --no-save @anthropic-ai/sdk@latest tsx

export ANTHROPIC_API_KEY=sk-ant-...
npx tsx run.ts "Summarize what you can do in two sentences."
```

`run.ts` prints session diagnostics to **stderr** and the agent's streamed text
to **stdout**, so you can capture just the answer:

```bash
npx tsx run.ts "..." 2>/dev/null
```

## What it demonstrates

- **Stream-first ordering** — opens `events.stream()` before `events.send()` so
  no early events are dropped.
- **Correct idle gate** — finishes only on `session.status_idle` with a terminal
  `stop_reason` (keeps listening on `requires_action`), or on
  `session.status_terminated`.
- **Clean error handling** — `session.error` events and `Anthropic.APIError`
  both exit with a non-zero status and a single diagnostic line.
