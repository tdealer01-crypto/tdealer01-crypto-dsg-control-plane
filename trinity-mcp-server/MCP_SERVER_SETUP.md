# Trinity DSG MCP Server Setup

## What is verified

The package builds and its stdio MCP transport can complete a protocol handshake and list 8 tools. Run:

```bash
npm install
npm test
```

Expected result: one passing smoke test named `MCP server starts and lists exactly the 8 Trinity tools`.

## Backend configuration

The MCP bridge calls a separate Trinity Backend. Set:

```bash
export TRINITY_API_URL=https://your-trinity-backend.example.com
# Optional:
export TRINITY_JWT_TOKEN=your-token
```

Then run:

```bash
npm start
```

## Configure an MCP client

Use an absolute path to the compiled server:

```json
{
  "mcpServers": {
    "trinity": {
      "command": "node",
      "args": ["/absolute/path/to/trinity-mcp-server/dist/index.js"],
      "env": {
        "TRINITY_API_URL": "https://your-trinity-backend.example.com"
      }
    }
  }
}
```

## Available tools

- `trinity_health_check`
- `trinity_get_agents`
- `trinity_set_agent_mode`
- `trinity_execute_task`
- `trinity_chat_agent`
- `trinity_get_costs`
- `trinity_get_audit_logs`
- `trinity_get_state`

## Important deployment boundary

The current implementation uses MCP **stdio transport**. It is designed to be spawned by a local MCP client. A remote Trinity Backend can be used through `TRINITY_API_URL`, but this package is not itself an HTTP MCP endpoint.

Before claiming end-to-end production readiness, verify the real backend, database, auth, and all eight route contracts.
