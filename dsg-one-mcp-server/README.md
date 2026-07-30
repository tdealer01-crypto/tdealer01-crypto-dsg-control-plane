# DSG ONE MCP Server

Comprehensive MCP (Model Context Protocol) integration for the DSG ONE / ProofGate Control Plane, enabling LLMs to interact with all core systems.

## Features

**30+ integrated tools** across 7 service domains:

### 1. Supabase (6 tools)
- Query databases with RLS enforcement
- Update records with audit trails
- Manage migrations
- View RLS policies
- Verify authentication sessions
- Schema discovery

### 2. Vercel (5 tools)
- List and trigger deployments
- View build logs
- Monitor project health
- Manage environment variables
- Production/preview deployments

### 3. Anthropic API (4 tools)
- Create managed agent sessions
- Send messages to Claude models
- List available models
- Track token usage

### 4. Stripe (4 tools)
- Create customers
- List invoices
- Manage subscriptions
- Record metered usage

### 5. Spine Execution (4 tools)
- Execute governed operations
- Check execution status
- Commit audit evidence
- Verify quota/rate limits

### 6. DSG Brain (3 tools)
- Propose execution plans
- Broker credentials with leases
- Validate execution conformance

### 7. Compliance/CCVS (4 tools)
- Collect L1-L5 evidence
- Generate audit reports
- Verify formal proofs
- Query audit logs

## Setup

### Installation

```bash
npm install
```

### Configuration

Set environment variables:

```bash
# Supabase (required)
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vercel (optional)
export VERCEL_API_TOKEN=your-token
export VERCEL_TEAM_ID=your-team-id

# Anthropic (optional)
export ANTHROPIC_API_KEY=your-api-key

# Stripe (optional)
export STRIPE_API_KEY=your-api-key

# Spine (optional)
export SPINE_BASE_URL=https://your-spine-url
export SPINE_API_KEY=your-spine-key

# DSG Brain (optional)
export DSG_BRAIN_BASE_URL=https://your-brain-url
export DSG_BRAIN_API_KEY=your-brain-key

# Compliance (optional)
export COMPLIANCE_BASE_URL=https://your-compliance-url
export COMPLIANCE_API_KEY=your-compliance-key
```

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

### Testing with MCP Inspector

```bash
npm run inspector
```

This launches the official MCP Inspector for testing tools and resources.

## Architecture

```
dsg-one-mcp-server/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── services/                # Service clients
│   │   ├── supabase-service.ts
│   │   ├── vercel-service.ts
│   │   ├── anthropic-service.ts
│   │   ├── stripe-service.ts
│   │   ├── spine-service.ts
│   │   ├── dsg-brain-service.ts
│   │   └── compliance-service.ts
│   ├── tools/                   # Tool implementations
│   │   ├── supabase-tools.ts
│   │   ├── vercel-tools.ts
│   │   ├── anthropic-tools.ts
│   │   ├── stripe-tools.ts
│   │   ├── execution-tools.ts
│   │   ├── planning-tools.ts
│   │   └── compliance-tools.ts
│   ├── schemas/                 # Zod validation schemas
│   └── utils/                   # Error handling, helpers
└── package.json
```

## Service Coverage

Each service is modular and independently loadable:

- **Supabase**: Full CRUD with RLS, migrations, schema management
- **Vercel**: Complete deployment lifecycle, logs, environment config
- **Anthropic**: Session management, message streaming, model access
- **Stripe**: Customer management, billing, usage metering
- **Spine**: Governed execution, quota checking, evidence commitment
- **DSG Brain**: Plan proposal, credential brokering, conformance validation
- **Compliance**: L1-L5 evidence collection, audit trails, proof verification

## Tool Categories

### Read-Only
- `dsg_query_database`
- `dsg_list_tables`
- `dsg_manage_rls_policies`
- `vercel_list_deployments`
- `vercel_get_project_status`
- `vercel_get_build_logs`

### Governance
- `dsg_update_records`
- `dsg_execute_migrations`
- `spine_execute_governed`
- `spine_commit_evidence`
- `dsg_propose_plan`
- `dsg_broker_credentials`

### Evidence & Audit
- `ccvs_collect_evidence`
- `ccvs_generate_audit_report`
- `ccvs_verify_proof`
- `ccvs_list_audit_logs`
- `dsg_check_auth_session`

### Integration
- `vercel_trigger_deploy`
- `stripe_record_usage`
- `anthropic_send_message`

## Error Handling

All services implement consistent error handling:

- `AuthenticationError` — Missing or invalid credentials
- `ValidationError` — Input validation failures
- `QuotaExceededError` — Rate/usage limits exceeded
- `ConformanceError` — Plan/execution mismatch
- `DSGMCPError` — Base error type with code/details

## Next Steps

1. **Integrate with Claude**: Add to your Claude.ai MCP configuration
2. **Implement remaining tools**: Vercel, Anthropic, Stripe, execution, planning, compliance tools
3. **Test with Inspector**: Validate all 30+ tools work correctly
4. **Deploy**: Push to production MCP server
5. **Create Evaluations**: 10 comprehensive test questions for agent validation

## License

Proprietary — DSG ONE Control Plane

---

**MCP Protocol**: https://modelcontextprotocol.io
**TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
