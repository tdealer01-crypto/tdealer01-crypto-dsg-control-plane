---
name: dsg-mcp
description: >
  MCP server wrapper for DSG ONE control plane. Connect Claude Desktop, Cursor, or other
  MCP clients to the DSG runtime via standardized MCP protocol. Exposes execution gates,
  governance tools, agent commands, and autonomy controls.
  Trigger phrases: "connect to dsg", "use dsg mcp", "mcp client setup", "expose dsg tools"
version: 1.0.0
author: DSG Team
license: MIT
dependencies:
  - dsg-one: ">=1.0.0"
platforms:
  - macos
  - linux
  - windows
metadata:
  hermes:
    tags:
      - integration
      - mcp
      - governance
      - control-plane
---

# DSG ONE MCP Server Integration

Connect your MCP-compatible client (Claude Desktop, Cursor, Hermes agent) to the DSG ONE control plane via the Model Context Protocol.

## Overview

This skill wraps the DSG ONE MCP server endpoints, exposing:

- **Governance tools** — evaluate actions, verify claims, record evidence
- **Agent runtime** — execution proofs, plan creation, command routing
- **Autonomy controls** — check/set agent autonomous level

The MCP protocol uses JSON-RPC 2.0 over HTTP. Authentication is Bearer token-based; the server checks `Authorization: Bearer ${DSG_ACCESS_TOKEN}` or falls back to the `INTERNAL_SERVICE_TOKEN` environment variable.

## Endpoints

### `/api/mcp-server` (Primary Tools)

6 MCP tools for app builder, agent runtime, and autonomy:

| Tool | Description | Input |
|------|-------------|-------|
| `get_proof` | Retrieve execution proof by goal | `goal` (string, min 8 chars) |
| `list_app_builder_jobs` | List all app builder jobs | `limit` (number, default 10) |
| `create_app_builder_job` | Create a new app builder job | `title`, `description` (strings) |
| `create_job_plan` | Generate execution plan for job | `jobId`, `strategy` (strings) |
| `route_agent_command` | Route command to specific agent | `agentId`, `command`, `args` (strings) |
| `get_autonomous_level` | Check agent autonomy level | `agentId` (string) |

**Server Info:**
- Name: `dsg-one-v1-mcp`
- Protocol Version: `2024-11-05`
- Version: `1.0.0`

### `/api/mcp` (Combined Tools)

Aggregated endpoint combining Android, DSG, and Hermes tool schemas:

**DSG Tools** (dsg.* prefix):
- `dsg.evaluate` — Evaluate action against policy gates
  - Input: `action`, `actor`, `tool`, `args`, `env` (strings)
  - Returns: `gateStatus`, `proofStatus`, `riskLevel`, `reason`, `proofHash`
  
- `dsg.verifyClaim` — Verify a governance claim
  - Input: `claim`, `evidence` (strings)
  - Returns: verification result with status and confidence
  
- `dsg.recordEvidence` — Record audit evidence
  - Input: `executionId`, `evidenceType`, `data` (strings)
  - Returns: evidence hash and sequence number

**Hermes Tools** (hermes.* prefix):
- Agent planning, controlled execution, credential brokering, conformance validation

**Android Tools** (android.* prefix):
- Device commands, memory management, skill execution

## MCP Client Configuration

### Claude Desktop

Create or update `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "dsg-one": {
      "command": "node",
      "args": [
        "-e",
        "const http = require('http'); const token = process.env.DSG_ACCESS_TOKEN || process.env.INTERNAL_SERVICE_TOKEN; const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'); const path = '/api/mcp-server'; const handleReq = (req) => { const method = req.method; const body = []; req.on('data', c => body.push(c)); req.on('end', async () => { const msg = body.length ? JSON.parse(Buffer.concat(body)) : {}; const opts = { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }; const res = http.request(opts, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => process.stdout.write(d)); }); res.write(JSON.stringify(msg)); res.end(); }); }; const server = http.createServer(handleReq); server.listen(0, () => process.stdin.pipe(server)); "
      ],
      "env": {
        "DSG_ACCESS_TOKEN": "${DSG_ACCESS_TOKEN}",
        "INTERNAL_SERVICE_TOKEN": "${INTERNAL_SERVICE_TOKEN}",
        "NEXT_PUBLIC_APP_URL": "${NEXT_PUBLIC_APP_URL}"
      }
    }
  }
}
```

### Cursor / VS Code

Create `.cursor/mcp.json` or `.vscode/claude.json`:

```json
{
  "mcp": {
    "servers": {
      "dsg-one": {
        "endpoint": "${NEXT_PUBLIC_APP_URL}/api/mcp-server",
        "auth": {
          "type": "bearer",
          "token": "${DSG_ACCESS_TOKEN}"
        }
      }
    }
  }
}
```

### Hermes Agent

Configure in agent context or memory:

```yaml
mcp_servers:
  dsg_control_plane:
    endpoint: /api/mcp-server
    auth_token: ${DSG_ACCESS_TOKEN}
    timeout_ms: 30000
```

## OAuth 2.0 Setup for claude.ai Remote Connector

### Quick Setup: Connect DSG MCP to claude.ai (Recommended)

**easiest method for claude.ai web app users — one-click OAuth connection**

#### Step 1: Open claude.ai Connector Settings

1. Visit https://claude.ai/settings/connectors
2. Click "+ Add Custom Connector"

#### Step 2: Paste OAuth Server URL

```
https://tdealer01-crypto-dsg-control-plane.vercel.app
```

claude.ai will auto-discover:
- Authorization endpoint: `/api/mcp/oauth/authorize`
- Token endpoint: `/api/mcp/oauth/token`
- Revocation endpoint: `/api/mcp/oauth/revoke`

#### Step 3: Authenticate & Approve

1. Click "Connect"
2. Log in to your DSG account (if not already authenticated)
3. Review consent screen
4. Click "✓ Authorize"
5. Token automatically exchanged and stored in claude.ai

#### Step 4: Verify MCP Tools Available

In claude.ai chat, ask:
```
"What MCP tools are available?"
```

or

```
"List all App Builder jobs in DSG"
```

### OAuth Technical Details

**What Happens Behind the Scenes:**

1. **PKCE Code Challenge** — Security protection for mobile/SPA clients
   - claude.ai generates: `code_verifier` (128 random chars)
   - Hashes it: `code_challenge = SHA256(code_verifier)`
   - Sends to DSG with `code_challenge_method=S256`

2. **State Token** — CSRF protection
   - DSG generates HMAC-SHA256 signed state token
   - 30-minute TTL
   - Validated before granting authorization code

3. **Authorization Code** — Temporary credential
   - DSG issues `code_` + random hex (10-minute TTL)
   - One-time use only (burned after token exchange)
   - Sent back to claude.ai

4. **Token Exchange** — Code → Access Token
   - claude.ai sends: `code + code_verifier + client_credentials`
   - DSG verifies PKCE: `SHA256(code_verifier) == stored_code_challenge`
   - DSG issues opaque access token: `mcp_` + random hex (1-hour TTL)
   - Token linked to your MCP API key and subscription

5. **Tool Calls** — Token validation at execution
   - claude.ai sends: `Authorization: Bearer mcp_...`
   - DSG validates token signature + expiry
   - DSG checks subscription active (Stripe)
   - DSG checks quota not exceeded (10,000 calls/month)
   - DSG records usage for billing
   - Tool executes if all checks pass

**Token Validation Errors:**

| Status | Error | Fix |
|--------|-------|-----|
| 401 | `invalid or expired token` | Token expired (1-hour TTL) — disconnect/reconnect in claude.ai |
| 402 | `subscription not active` | No active Stripe subscription — upgrade at `/dashboard/billing` |
| 402 | `quota exceeded` | Monthly limit reached (10,000 calls/month) — upgrade plan or wait for next cycle |

### Revoking OAuth Access

To disconnect DSG MCP from claude.ai:

1. **Via claude.ai:**
   - Go to https://claude.ai/settings/connectors
   - Find "DSG ONE MCP"
   - Click "Disconnect"
   - Token automatically revoked

2. **Via curl (manual):**
   ```bash
   curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp/oauth/revoke \
     -H "Authorization: Bearer mcp_your_token_here"
   ```

3. **Via Dashboard:**
   - Go to `/dashboard/billing`
   - View "Connected Applications"
   - Click "Revoke Access"

### OAuth Metadata (RFC 8414)

DSG publishes OAuth discovery metadata at:

```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/.well-known/oauth-authorization-server
```

Response includes:
- Supported scopes: `["mcp:execute"]`
- Code challenge methods: `["S256"]` (PKCE S256)
- Grant types: `["authorization_code", "refresh_token"]`
- Full endpoint URLs

### Backward Compatibility: Bearer Token Auth

Existing users with `DSG_ACCESS_TOKEN` bearer tokens can still use:

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp-server \
  -H "Authorization: Bearer sk_test_old_api_key_123" \
  -H "Content-Type: application/json" \
  -d '{ "jsonrpc": "2.0", "method": "tools/list" }'
```

Old-style tokens are passed through to downstream auth unchanged. Only tokens starting with `mcp_` are validated as OAuth tokens.

**Recommendation:** Migrate to OAuth setup for better token rotation and revocation flow.

---

## Quick Start

### 1. Verify Server is Reachable

```bash
curl -X GET http://localhost:3000/api/mcp-server \
  -H "Authorization: Bearer ${DSG_ACCESS_TOKEN}"
```

Expected response:
```json
{
  "ok": true,
  "tools": 6,
  "server": "dsg-one-v1-mcp"
}
```

### 2. List Available Tools (JSON-RPC 2.0)

```bash
curl -X POST http://localhost:3000/api/mcp-server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DSG_ACCESS_TOKEN}" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### 3. Call a Tool (Example: get_proof)

```bash
curl -X POST http://localhost:3000/api/mcp-server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DSG_ACCESS_TOKEN}" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_proof",
      "arguments": {
        "goal": "verify execution compliance"
      }
    }
  }'
```

### 4. Use Combined Endpoint

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DSG_ACCESS_TOKEN}" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/list",
    "params": {}
  }'
```

## Environment Variables

Set these in your environment or MCP client config:

| Variable | Purpose | Example |
|----------|---------|---------|
| `DSG_ACCESS_TOKEN` | Bearer token for MCP server auth | `sk-dsg-...` (placeholder) |
| `INTERNAL_SERVICE_TOKEN` | Fallback service-to-service token | Server-side only |
| `NEXT_PUBLIC_APP_URL` | Control plane base URL | `http://localhost:3000` or `https://tdealer01-crypto-dsg-control-plane.vercel.app` |

**Important:** Never commit real token values. Use environment variables or `.env` files (kept in `.gitignore`).

### Token Management

- **Rotation:** Rotate `DSG_ACCESS_TOKEN` every 90 days or after team member departure
- **Revocation:** Tokens can be revoked by removing them from the environment and restarting the MCP client
- **Scope:** Use the least-privilege token (read-only tools when write-access not needed)
- **Storage:** Keep tokens in secure credential managers (1Password, LastPass, etc.), not files or chat

## MCP Protocol Details

### Initialize Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

### Server Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "serverInfo": {
      "name": "dsg-one-v1-mcp",
      "version": "1.0.0"
    }
  }
}
```

### Tool Call Format

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

## Verification Checklist

- [ ] Environment variables are set (DSG_ACCESS_TOKEN, NEXT_PUBLIC_APP_URL)
- [ ] MCP client can reach `/api/mcp-server` or `/api/mcp`
- [ ] Authorization header includes Bearer token
- [ ] `tools/list` returns the expected tool count
- [ ] A test tool call succeeds with no 401/403 errors
- [ ] Tool input schemas match your expected parameters

## Troubleshooting

### 401 Unauthorized

**Cause:** Missing or invalid `DSG_ACCESS_TOKEN`

**Fix:**
```bash
export DSG_ACCESS_TOKEN="your-actual-token"
# Or set INTERNAL_SERVICE_TOKEN if using service-to-service auth
```

### 503 Service Unavailable

**Cause:** MCP server endpoint not responding

**Fix:**
1. Verify `NEXT_PUBLIC_APP_URL` points to a running DSG control plane
2. Check that `/api/health` returns `{"ok":true}`
3. Verify Supabase connection via `/api/readiness`

### Tool Not Found

**Cause:** Tool name mismatch or endpoint changed

**Fix:**
1. Call `tools/list` to verify available tools
2. Confirm tool names match exact case (e.g., `dsg.evaluate`, not `dsg_evaluate`)
3. Check `/api/mcp` vs `/api/mcp-server` endpoint

### Invalid Input Schema

**Cause:** Missing required parameters or wrong type

**Fix:**
1. Check tool description in `tools/list` response
2. Verify all required parameters are included
3. Match parameter types (string, number, boolean, object, array)

## Related Documentation

- [docs/mcp-server/README.md](../../docs/mcp-server/README.md) — MCP server setup and configuration
- [CLAUDE_TOOL_API_CONTRACT.md](../../docs/agents/CLAUDE_TOOL_API_CONTRACT.md) — Tool API contract and boundaries
- [ENV_SETUP_COMPLETE.md](../../docs/ENV_SETUP_COMPLETE.md) — Environment variable reference
- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/) — Official MCP specification

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Verify environment variables and token validity
3. Review MCP server logs at `/api/agent/status`
4. Check Vercel/deployment logs for runtime errors
5. Inspect JSON-RPC request/response format
