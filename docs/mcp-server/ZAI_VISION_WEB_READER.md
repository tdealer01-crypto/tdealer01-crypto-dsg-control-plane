# Z.AI MCP Servers — Vision + Web Reader

This document describes how the **Z.AI Vision MCP Server** and **Z.AI Web Reader
MCP Server** are wired into this repository's Claude Code configuration, the full
tool surface each one exposes, and the choices made to keep startup fast and
reliable.

These servers give the coding agent two capabilities the base model lacks in
this workflow:

- **Vision** — read screenshots, diagrams, charts, error snapshots, and short
  videos from the local working directory.
- **Web Reader** — fetch and structure the full content of a public webpage
  (title, body, metadata, links) without a local browser.

> Both servers require a **GLM Coding Plan** API key. They share one key:
> `Z_AI_API_KEY`. See `.env.example` for the variable names (values are never
> committed).

---

## 1. Configuration (as designed)

The repo centralizes MCP configuration in `.claude/settings.json`, using
`${VAR}` substitution so secrets stay out of git. The two Z.AI servers follow
the same pattern as the existing `dsg-one-v1` / `dsg-control-plane` entries.

Add the following two entries to the `mcpServers` object in
`.claude/settings.json`:

```json
{
  "mcpServers": {
    "zai-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@z_ai/mcp-server@latest"],
      "env": {
        "Z_AI_API_KEY": "${Z_AI_API_KEY}",
        "Z_AI_MODE": "ZAI"
      }
    },
    "web-reader": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/web_reader/mcp",
      "headers": {
        "Authorization": "Bearer ${Z_AI_API_KEY}"
      }
    }
  }
}
```

> Note: editing `.claude/settings.json` changes the agent's own tooling and is
> guarded as a self-modification. Apply it yourself with the one-click commands
> below, or paste the block above. The repo ships the documentation, the
> `.env.example` variable names, and the `scripts/setup-zai-mcp.sh` helper; the
> final enable step is left to the operator on purpose.

### One-click install (Claude Code)

```bash
# Vision (local stdio server). @latest avoids a stale npx cache — see §3.
claude mcp add -s user zai-vision \
  --env Z_AI_API_KEY="$Z_AI_API_KEY" --env Z_AI_MODE=ZAI \
  -- npx -y "@z_ai/mcp-server@latest"

# Web Reader (remote HTTP server)
claude mcp add -s user -t http web-reader \
  https://api.z.ai/api/mcp/web_reader/mcp \
  --header "Authorization: Bearer $Z_AI_API_KEY"
```

Use `-s user` so both servers are available across every session and project
without re-adding them per repo.

---

## 2. Tool surface (complete)

### Vision MCP Server (`zai-vision`)

| Tool | Purpose |
| :--- | :--- |
| `ui_to_artifact` | Turn UI screenshots into code, prompts, specs, or descriptions. |
| `extract_text_from_screenshot` | OCR for code, terminals, docs, general text. |
| `diagnose_error_screenshot` | Analyze an error snapshot and propose fixes. |
| `understand_technical_diagram` | Read architecture, flow, UML, ER, system diagrams. |
| `analyze_data_visualization` | Read charts/dashboards and surface insights. |
| `ui_diff_check` | Compare two UI shots to flag visual/implementation drift. |
| `image_analysis` | General-purpose image understanding. |
| `video_analysis` | Inspect local/remote videos ≤ 8 MB (MP4/MOV/M4V). |

Place the file in the working directory and reference it by name/path in the
prompt, e.g. `What does demo.png describe?`. (Pasting an image directly works in
Claude Code, but the documented best practice is to reference a file on disk.)

### Web Reader MCP Server (`web-reader`)

| Tool | Purpose |
| :--- | :--- |
| `webReader` | Fetch a URL and return title, main content, metadata, and links. |

---

## 3. Efficiency choices

| Choice | Why |
| :--- | :--- |
| Pin `@z_ai/mcp-server@latest` | Z.AI's own guidance: a cached older version can pin an older model (pre-GLM-4.6V) and is a common cause of the `Connection Closed` error. `@latest` forces the newest build. |
| Pre-warm the npx cache (`scripts/setup-zai-mcp.sh`) | The first stdio launch downloads the package; pre-fetching it removes that cost from the first tool call and avoids stdio start-up timeouts. |
| Web Reader over remote HTTP | No local install, no Node process to manage; lower local overhead and a shared, server-side fetch path. |
| Install at user scope (`-s user`) | One install serves every session/project instead of re-adding per repo. |
| Single shared `Z_AI_API_KEY` | Both servers authenticate with the same GLM Coding Plan key — one secret to manage and rotate. |

---

## 4. Prerequisites & verification

| Item | Status | Evidence |
| :--- | :--- | :--- |
| Node.js ≥ v22.0.0 (required by Vision server) | verified | `node -v` → `v22.22.2` in this environment |
| `@z_ai/mcp-server` published and ≥ 0.1.2 | verified | `npm view @z_ai/mcp-server version` → `0.1.4` |
| Config is valid JSON after edit | verify with `scripts/setup-zai-mcp.sh --check` or `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"` |
| Live Vision/Web Reader tool calls succeed | **not verified** | requires a real `Z_AI_API_KEY`; not run here — no key configured in this environment |

Local install smoke test (needs a key):

```bash
Z_AI_API_KEY="$Z_AI_API_KEY" npx -y @z_ai/mcp-server@latest
```

If it starts and waits on stdio, the environment is correct and any remaining
issue is client configuration.

---

## 5. Quota (GLM Coding Plan)

Web search + Web Reader share a monthly call budget; vision understanding draws
from the plan's 5-hour rolling prompt resource pool.

| Plan | Web search + Web Reader (total) | Vision |
| :--- | :--- | :--- |
| Lite | 100 | 5-hour rolling pool |
| Pro | 1,000 | 5-hour rolling pool |
| Max | 4,000 | 5-hour rolling pool |

---

## 6. Troubleshooting

- **Connection Closed** — confirm Node ≥ 22 (`node -v`, `npx -v`), confirm
  `Z_AI_API_KEY` is set, and confirm `@latest` is pinned (stale cache is the
  usual cause).
- **Invalid API Key** — confirm the key is copied correctly, activated, has
  balance, and that `Z_AI_MODE=ZAI` matches the key's platform.
- **Web fetch returned empty** — confirm the target URL is public and not behind
  anti-scraping; try a different URL.

Sources: Z.AI Vision MCP Server and Web Reader MCP Server documentation.
