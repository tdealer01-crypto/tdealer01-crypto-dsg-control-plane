# DSG MCP Server — Model Context Protocol Server for DSG ONE

[![npm](https://img.shields.io/npm/v/@dsg/mcp-server?color=emerald)](https://www.npmjs.com/package/@dsg/mcp-server)
![license](https://img.shields.io/badge/license-MIT-blue)
![build](https://img.shields.io/badge/build-passing-emerald)

> **Connect DSG ONE governance to any MCP-compatible AI tool** — Claude, Cursor, VS Code, or custom agents. Every tool call routes through the policy gate: approval workflow, audit trail, and cryptographic evidence chain included.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- DSG ONE API key (from Vercel dashboard)

### Install

```bash
# Via npm (when published)
npx -y @dsg/mcp-server

# Or from source
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane/dsg-mcp-server
npm ci && npm run build
```

### Configure MCP Client

**Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "dsg-gate": {
      "command": "node",
      "args": ["/path/to/dsg-mcp-server/dist/index.js"],
      "env": {
        "DSG_API_URL": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
        "DSG_API_KEY": "your-api-key-from-vercel"
      }
    }
  }
}
```

**Cursor / VS Code (`mcp.json`):**
```json
{
  "servers": {
    "dsg-gate": {
      "command": "node",
      "args": ["/path/to/dsg-mcp-server/dist/index.js"],
      "env": {
        "DSG_API_URL": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
        "DSG_API_KEY": "${DSG_PROD_API_KEY}"
      }
    }
  }
}
```

### Test Connection

```bash
# In Hermes Agent or any MCP client
/reload-mcp

# Test tools
list_agents
get_health
get_readiness
```

---

## 🔧 Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_agents` | List all registered agents | — |
| `get_agent` | Get agent details | `agentId` |
| `invoke_agent` | Execute agent task | `agentId`, `prompt`, `context?` |
| `list_workflows` | List available workflows | — |
| `run_workflow` | Execute workflow | `workflowId`, `input` |
| `get_workflow_run` | Get workflow run status | `runId` |
| `get_health` | Health check endpoint | — |
| `get_readiness` | Readiness check (DB, finance gates) | — |

---

## 📡 API Reference

### `list_agents`

Returns all registered agents in the organization.

```json
// Response
{
  "items": [
    {
      "agent_id": "uuid",
      "name": "Auto-Setup Agent",
      "policy_id": "uuid",
      "status": "active",
      "monthly_limit": 10000,
      "usage_this_month": 0
    }
  ],
  "pagination": { "page": 1, "per_page": 10, "total": 1 }
}
```

### `get_agent`

```json
// Request
{ "agentId": "93b1019a-55e5-4bb4-9b18-cd42598dd08d" }

// Response
{
  "agent_id": "93b1019a-55e5-4bb4-9b18-cd42598dd08d",
  "name": "Auto-Setup Agent",
  "policy_id": "00000000-0000-4000-8000-000000000001",
  "status": "active",
  "monthly_limit": 10000,
  "usage_this_month": 0,
  "api_key_preview": "sk-x..."
}
```

### `invoke_agent`

```json
// Request
{
  "agentId": "93b1019a-55e5-4bb4-9b18-cd42598dd08d",
  "prompt": "Create a new Next.js app with Stripe integration",
  "context": { "repo": "my-org/my-repo" }
}

// Response
{
  "executionId": "uuid",
  "status": "running",
  "logs": [...]
}
```

### `list_workflows`

```json
// Response
{
  "items": [
    { "id": "deploy-stripe-app", "name": "Deploy Stripe App", ... },
    { "id": "ci-security-scan", "name": "CI Security Scan", ... }
  ]
}
```

### `run_workflow`

```json
// Request
{
  "workflowId": "deploy-stripe-app",
  "input": { "environment": "production", "version": "1.2.3" }
}

// Response
{
  "runId": "uuid",
  "status": "queued"
}
```

### `get_workflow_run`

```json
// Request
{ "runId": "uuid" }

// Response
{
  "runId": "uuid",
  "workflowId": "deploy-stripe-app",
  "status": "completed",
  "startedAt": "2026-06-19T04:00:00Z",
  "completedAt": "2026-06-19T04:05:32Z",
  "steps": [...]
}
```

### `get_health`

```json
// Response
{
  "ok": true,
  "checks": {
    "env": { "ok": true },
    "nextAuthSecret": { "ok": true },
    "supabaseServiceRole": { "ok": true },
    "dsgCoreConfig": { "ok": true },
    "dsgCoreHealth": { "ok": true },
    "financeGovernanceSurface": { "ok": true },
    "financeGovernanceBackend": { "ok": true }
  },
  "timestamp": "2026-06-19T04:05:32.562Z"
}
```

### `get_readiness`

```json
// Response
{
  "items": [
    { "agent_id": "uuid", "name": "Auto-Setup Agent", "status": "active", ... }
  ],
  "pagination": { "page": 1, "per_page": 10, "total": 1 }
}
```

---

## 🐳 Docker Deployment

```bash
# Build
docker build -t dsg-mcp-server ./dsg-mcp-server

# Run
docker run -d \
  --name dsg-mcp-server \
  --restart unless-stopped \
  -e DSG_API_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app" \
  -e DSG_API_KEY="your-api-key" \
  dsg-mcp-server
```

### Docker Compose (with Lightpanda Browser)

```yaml
services:
  mcp-server:
    build: ./dsg-mcp-server
    environment:
      - DSG_API_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
      - DSG_API_KEY=${DSG_API_KEY}

  lightpanda:
    image: lightpanda/browser:nightly
    command: serve --host 0.0.0.0 --port 9222 --obey-robots
    ports:
      - "127.0.0.1:9222:9222"
```

---

## 🔐 Production Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DSG_API_URL` | ✅ | Production API endpoint |
| `DSG_API_KEY` | ✅ | Service-to-service API key |
| `NODE_ENV` | | `production` |

### Systemd Service

```ini
# /etc/systemd/system/dsg-mcp-server@.service
[Unit]
Description=DSG MCP Server
After=network.target

[Service]
Type=simple
User=%i
WorkingDirectory=/home/%i/dsg-mcp-server
ExecStart=/usr/bin/node /home/%i/dsg-mcp-server/dist/index.js
Environment=DSG_API_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
Environment=DSG_API_KEY=***
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable dsg-mcp-server@$USER
sudo systemctl start dsg-mcp-server@$USER
```

---

## 💰 Pricing (SaaS)

| Tier | Executions/Month | Price | Features |
|------|------------------|-------|----------|
| **Developer** | 1,000 | Free | Basic tools, community support |
| **Pro** | 10,000 | $99/mo | All tools, priority support |
| **Agency** | 50,000 | $299/mo | White-label, multi-client, SLA |
| **Enterprise** | Custom | $999/mo+ | SSO, custom skills, dedicated CSM |

---

## 🔗 Related Links

- **Production API**: https://tdealer01-crypto-dsg-control-plane.vercel.app
- **MCP Endpoint**: `/api/mcp`
- **GitHub Repo**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- **DSG ONE Docs**: https://dsg.one/docs
- **Zenodo DOI**: 10.5281/zenodo.18225586

---

## 🛡️ Security

- All tool calls gated through policy engine
- Cryptographic evidence chain (SHA-256 + Merkle)
- Audit trail with cryptographic proof
- No raw API keys exposed to agents
- SOC 2 Type II compliant infrastructure

---

## 📄 License

MIT — See [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ by DSG Team** — Governance-first AI for production systems.