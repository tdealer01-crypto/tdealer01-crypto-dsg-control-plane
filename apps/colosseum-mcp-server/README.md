# colosseum-mcp-server

An MCP server that exposes the [Colosseum](https://colosseum.org) Solana hackathon resource corpus — sponsor tools, RPC providers, and build-path documentation — as tools any MCP-compatible AI agent can call.

Data comes from the public, unauthenticated corpus at `https://ColosseumOrg.github.io/hackathon-resources/current.json`. **No API key, account, or configuration is required** — install it and it works.

## Install

```bash
npm install
npm run build
```

## Run

This server speaks MCP over stdio. Point your MCP client at it directly — no separate "start the server" step is needed; the client launches it as a subprocess.

### Claude Code

```bash
claude mcp add colosseum -- node /absolute/path/to/colosseum-mcp-server/dist/index.js
```

### Claude Desktop / other JSON-config MCP clients

Add to your client's MCP config file:

```json
{
  "mcpServers": {
    "colosseum": {
      "command": "node",
      "args": ["/absolute/path/to/colosseum-mcp-server/dist/index.js"]
    }
  }
}
```

### Behind a proxy

The server auto-detects `HTTPS_PROXY` / `https_proxy` (or `HTTP_PROXY` / `http_proxy`) **inside its own process environment** and routes the corpus fetch through it. Most MCP clients do *not* forward their own environment to spawned servers by default (this is a deliberate security default, not a bug) — if you're behind a proxy, add it explicitly to the server's config entry:

```json
{
  "mcpServers": {
    "colosseum": {
      "command": "node",
      "args": ["/absolute/path/to/colosseum-mcp-server/dist/index.js"],
      "env": { "HTTPS_PROXY": "http://your-proxy:port" }
    }
  }
}
```

## Tools

| Tool | Purpose |
|---|---|
| `colosseum_get_overview` | Hackathon name + counts of sponsors/providers/resource sections. Call first to orient. |
| `colosseum_list_sponsors` | Index of sponsor tools, optionally filtered by tag (`defi`, `wallet`, `privacy`, `agents`, ...) or skill availability. |
| `colosseum_get_sponsor` | Full details (description, links, skill install command) for one sponsor by slug. |
| `colosseum_search_sponsors` | Keyword search across sponsor name/tags/content. |
| `colosseum_list_rpc_providers` | RPC/infra providers and their hackathon offers. |
| `colosseum_list_resources` | Index of curated doc sections (foundations + per-project-type build paths). |
| `colosseum_get_resource` | Full link list for one doc section by id. |

## Development

```bash
npm run dev          # tsx watch, runs src/index.ts directly
npm run build         # compile to dist/
npm run smoke-test    # build + spawn the server as a real client would, call every tool
```

## Design notes

- **Read-only.** Every tool is annotated `readOnlyHint: true` / `destructiveHint: false` — this server only reads the public corpus, nothing is mutated anywhere.
- **In-memory cache** (10 min TTL) avoids refetching the ~90KB corpus on every tool call within a session, while falling back to stale cached data rather than failing outright if a refetch errors.
- **No recommendation/ranking tool.** Per MCP best practice, filtering and reasoning ("which sponsor fits my project") is left to the calling agent using `colosseum_list_sponsors` / `colosseum_search_sponsors`, rather than baking judgment calls into the server.
