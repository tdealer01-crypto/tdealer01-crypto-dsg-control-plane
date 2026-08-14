# Trinity DSG MCP Server

A stdio MCP bridge between an MCP client and a Trinity Backend API.

## Verified in this package

- TypeScript build succeeds with `@modelcontextprotocol/sdk` 1.30.0.
- The MCP process starts over stdio.
- `tools/list` returns exactly 8 tools.
- A protocol smoke test is included in `test/list-tools.test.mjs`.

These checks do **not** prove that a remote Trinity Backend, Supabase database, authentication, or agent execution is live. Those require a reachable backend and separate integration tests.

## Tools

1. `trinity_health_check` → `GET /api/health`
2. `trinity_get_agents` → `GET /api/agents/status`
3. `trinity_set_agent_mode` → `POST /api/agents/mode`
4. `trinity_execute_task` → `POST /api/agents/execute`
5. `trinity_chat_agent` → `POST /api/agents/chat`
6. `trinity_get_costs` → `GET /api/cost/tracker`
7. `trinity_get_audit_logs` → `GET /api/security/audit`
8. `trinity_get_state` → `GET /api/state/continuity`

## Setup

```bash
npm install
npm test
```

`npm test` builds the server and performs a real MCP stdio handshake plus `tools/list`.

Configure the backend URL when running the server:

```bash
TRINITY_API_URL=https://your-trinity-backend.example.com npm start
```

Optional authenticated backend:

```bash
TRINITY_API_URL=https://your-trinity-backend.example.com \
TRINITY_JWT_TOKEN=your-token \
npm start
```

## MCP client configuration

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

## Transport boundary

This implementation is **stdio-only**. Run it on the same machine/process environment as the MCP client. The Trinity Backend may be remote.

Do not claim this package itself is a remotely hosted Vercel MCP endpoint. If remote MCP hosting is required, implement and test an HTTP MCP transport first.

## Production claim boundary

Production readiness requires evidence for all of the following:

- Trinity Backend deployed and healthy.
- Database migration applied to the intended database.
- Authentication tested with valid/invalid credentials.
- All 8 backend routes tested against real backend responses.
- Mutation tools (`set_agent_mode`, `execute_task`) tested with authorization and governance controls.
- Audit/evidence behavior verified.

Until those checks exist, the accurate status is: **MCP bridge verified locally; backend-dependent integration pending verification.**
