# MCP Integration Guide — DSG ONE Control Plane

**Model Context Protocol (MCP) Integration Reference**
- Version: 1.0.0
- Last Updated: July 16, 2026
- Status: Production-ready

---

## Table of Contents

1. [MCP Overview](#mcp-overview)
2. [Architecture](#architecture)
3. [Integration Setup](#integration-setup)
   - [PostHog MCP](#posthog-mcp)
   - [Supabase MCP](#supabase-mcp)
   - [Vercel MCP](#vercel-mcp)
   - [AWS Marketplace MCP](#aws-marketplace-mcp)
4. [Authentication & Configuration](#authentication--configuration)
5. [Usage Patterns](#usage-patterns)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## MCP Overview

### What is MCP?

**Model Context Protocol (MCP)** is a standardized protocol that enables AI assistants to interact with external systems through a unified tool interface. MCP servers expose capabilities (tools) that Claude and other MCP clients can discover and call.

### Key Benefits

- **Standardized Interface** — Consistent tool discovery and invocation across platforms
- **Secure Authentication** — OAuth 2.0 + bearer token support
- **Real-time Data Access** — Live queries without polling
- **Extensibility** — Custom tools can be added via MCP servers
- **Compliance-Ready** — Full audit trail of tool calls in conversation history

### How DSG Uses MCP

The DSG ONE control plane uses 4 primary MCP integrations:

| MCP Server | Purpose | Data Access |
|-----------|---------|-------------|
| **PostHog** | Analytics & LLM observability | Event streams, user behavior, execution traces |
| **Supabase** | Database & serverless compute | Live SQL queries, schema, migrations, auth |
| **Vercel** | Deployment & runtime monitoring | Logs, builds, deployments, performance metrics |
| **AWS Marketplace** | Solution discovery & evaluation | 10,000+ third-party products with reviews |

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude AI                              │
│              (Claude Desktop, Claude.ai, etc)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ MCP Protocol (JSON-RPC 2.0)
                     │
        ┌────────────┴────────────┬──────────────┬─────────────┐
        │                         │              │             │
        ▼                         ▼              ▼             ▼
    ┌─────────┐           ┌──────────────┐  ┌────────┐   ┌──────────────┐
    │ PostHog │           │  Supabase    │  │ Vercel │   │ AWS Mkt      │
    │  MCP    │           │   MCP        │  │  MCP   │   │  MCP         │
    └────┬────┘           └──────┬───────┘  └───┬────┘   └──────┬───────┘
         │                       │              │               │
         │ Analytics API         │ PostgreSQL   │ REST API      │ REST API
         │                       │ PostgREST    │               │
         ▼                       ▼              ▼               ▼
    ┌─────────────────┐   ┌──────────────┐  ┌──────────┐   ┌──────────────┐
    │ PostHog Cloud   │   │ Supabase     │  │ Vercel   │   │ AWS          │
    │ (us.posthog.com)│   │ (*.supabase  │  │ Control  │   │ Marketplace  │
    │                 │   │  .co)        │  │ Plane    │   │ API          │
    └─────────────────┘   └──────────────┘  └──────────┘   └──────────────┘
```

### Data Flow Example: Compliance Verification

```
1. User asks: "Verify production health"
   │
   ├─→ Vercel MCP: Get current deployment status
   │   └─→ Vercel API: Retrieve dpl_4eFAKoLPVZb6JkSj9QHUkB8Y2Vz9 metadata
   │   └─→ Result: READY state, all aliases active ✓
   │
   ├─→ Supabase MCP: Query audit logs
   │   └─→ PostgreSQL: SELECT COUNT(*) FROM audit_logs WHERE created_at > now() - interval '1 day'
   │   └─→ Result: 1487+ events logged ✓
   │
   ├─→ PostHog MCP: Check execution events
   │   └─→ PostHog API: Query trends for execution_completed events
   │   └─→ Result: 2 events in last 7 days ✓
   │
   └─→ Response: "Production verified. All systems operational."
```

---

## Integration Setup

### Prerequisites

- Claude account with MCP connector access
- Administrator access to each service's dashboard
- API credentials/tokens for authentication
- Active subscriptions to services

---

## PostHog MCP

### 1. Enable PostHog Connector

**Via claude.ai Settings:**
1. Go to https://claude.ai/settings/connectors
2. Search for "PostHog"
3. Click "Connect"
4. Approve OAuth consent screen

**For Desktop App:**
1. Navigate to Settings → Integrations → MCP
2. Add PostHog connector
3. Authenticate via OAuth

### 2. Configuration

PostHog uses OAuth 2.0 — no manual token required once authenticated.

**Environment Variables (if self-hosting):**
```bash
POSTHOG_API_KEY=phc_your_project_key_here
POSTHOG_API_URL=https://us.posthog.com
```

### 3. Verify Connection

Test in Claude by asking:
```
"List my PostHog projects and show me recent event trends."
```

Expected response includes project names, event counts, and trend data.

### 4. Common Queries

#### Get Event Trends
```
Query: "Show me execution_completed event trends over the last 7 days"

Behind the scenes:
- Tool: trends
- Parameters:
  - event_name: "execution_completed"
  - date_from: "-7d"
  - interval: "day"
```

#### Analyze LLM Traces
```
Query: "What are the average token counts in my LLM traces?"

Behind the scenes:
- Tool: llm_traces
- Parameters:
  - filter_by: "token_usage"
  - time_window: "last_30_days"
```

#### Create Custom Insight
```
Query: "Build a dashboard showing policy evaluation funnel: evaluate → approve → execute"

Behind the scenes:
- Tool: insights (funnels)
- Parameters:
  - steps: ["policy_evaluate", "policy_approve", "execute"]
```

---

## Supabase MCP

### 1. Enable Supabase Connector

**Via claude.ai Settings:**
1. Go to https://claude.ai/settings/connectors
2. Search for "Supabase"
3. Click "Connect"
4. Select your Supabase organization
5. Approve access scopes (database, storage, auth)

**Note:** Requires OAuth — cannot be skipped

### 2. Configuration

Once connected, Supabase MCP has full access to:
- Database (PostgreSQL read/write)
- Migrations
- Edge Functions
- Storage
- Authentication
- Real-time subscriptions

### 3. Verify Connection

Test in Claude:
```
"List all tables in my Supabase database and show row counts"
```

Expected response shows 130+ tables with metadata.

### 4. Common Queries

#### Query Database
```
Query: "Show me all users in the users table with their organizations"

Behind the scenes:
- Tool: execute_sql
- Parameters:
  - sql: "SELECT u.id, u.email, o.name FROM users u JOIN organizations o ON u.org_id = o.id"
  - db: "prod"
```

#### Inspect Schema
```
Query: "What columns does the executions table have?"

Behind the scenes:
- Tool: list_tables
- Filter: "executions"
- Returns: Column names, types, constraints, indexes
```

#### Deploy Edge Function
```
Query: "Show the logs for the dsg_execute edge function from the last hour"

Behind the scenes:
- Tool: get_logs
- Parameters:
  - function: "dsg_execute"
  - time_range: "-1h"
```

#### Apply Migration
```
Query: "Apply the latest migration to production"

Behind the scenes:
- Tool: apply_migration
- Parameters:
  - environment: "production"
  - auto: true
```

---

## Vercel MCP

### 1. Enable Vercel Connector

**Via claude.ai Settings:**
1. Go to https://claude.ai/settings/connectors
2. Search for "Vercel"
3. Click "Connect"
4. Approve OAuth consent
5. Select teams/projects for access

**For CLI Integration:**
```bash
vercel login
```

### 2. Configuration

Vercel MCP requires a Vercel access token:

**Generate Token:**
1. Go to https://vercel.com/account/tokens
2. Create new token (read-only recommended)
3. Copy token (used in connector setup)

**Environment Variables (if self-hosting):**
```bash
VERCEL_TOKEN=your_access_token_here
VERCEL_TEAM_ID=team_xxxxx (optional)
```

### 3. Verify Connection

Test in Claude:
```
"Show me the current production deployment for tdealer01-crypto-dsg-control-plane"
```

Expected response includes deployment ID, state, aliases, commit SHA.

### 4. Common Queries

#### Check Deployment Status
```
Query: "Is tdealer01-crypto-dsg-control-plane.vercel.app healthy?"

Behind the scenes:
- Tool: get_deployment
- Parameters:
  - id_or_url: "tdealer01-crypto-dsg-control-plane.vercel.app"
  - team_id: "team_n189mlAdVHR6cGGiaAwsKzQ0"
- Returns: state, regions, aliases, commit metadata
```

#### Retrieve Runtime Logs
```
Query: "Show me errors from the last 24 hours on production"

Behind the scenes:
- Tool: get_runtime_logs
- Parameters:
  - project_id: "prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW"
  - team_id: "team_n189mlAdVHR6cGGiaAwsKzQ0"
  - environment: "production"
  - level: ["error"]
  - since: "24h"
```

#### Get Build Logs
```
Query: "Why did the last deployment fail?"

Behind the scenes:
- Tool: get_deployment_build_logs
- Parameters:
  - deployment_id: "dpl_4eFAKoLPVZb6JkSj9QHUkB8Y2Vz9"
- Returns: Full build output with error messages
```

#### Monitor Agent Runs
```
Query: "Show me the Eve framework agent runs from the last 7 days"

Behind the scenes:
- Tool: list_agent_runs
- Parameters:
  - project_id: "prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW"
  - team_id: "team_n189mlAdVHR6cGGiaAwsKzQ0"
  - period: "7d"
```

---

## AWS Marketplace MCP

### 1. Enable AWS Marketplace Connector

**Via claude.ai Settings:**
1. Go to https://claude.ai/settings/connectors
2. Search for "AWS Marketplace"
3. Click "Connect"
4. No authentication required (public catalog access)

### 2. Configuration

AWS Marketplace MCP is **authless** — no credentials needed. It queries the public AWS Marketplace catalog.

**Optional: For Procurement Integration**
```bash
AWS_ACCOUNT_ID=123456789012 (for procurement tracking)
AWS_REGION=us-east-1
```

### 3. Verify Connection

Test in Claude:
```
"Search for governance compliance solutions on AWS Marketplace"
```

Expected response includes 15+ governance/compliance solutions with reviews.

### 4. Common Queries

#### Search Solutions
```
Query: "Find API management solutions on AWS Marketplace"

Behind the scenes:
- Tool: search_aws_marketplace_solutions
- Parameters:
  - queries: ["API management"]
  - max_results: 10
- Returns: 10 solutions with IDs, names, vendors, descriptions, review counts
```

#### Get Detailed Solution Info
```
Query: "Tell me about Sprinto (the compliance solution)"

Behind the scenes:
- Tool: get_aws_marketplace_solution
- Parameters:
  - solution_ids: ["prodview-ixyb464cbjkam"]
- Returns: Full metadata including reviews, sentiments, pricing, integrations
```

#### Deep Research
```
Query: "Research Sprinto's features, integrations, and pricing"

Behind the scenes:
- Tool: research_aws_marketplace_solution
- Parameters:
  - solution_ids: ["prodview-ixyb464cbjkam"]
  - sections: ["features", "integrations", "pricing"]
- Returns: In-depth research with citations from official docs
```

#### Find Alternatives
```
Query: "What are alternatives to Sprinto for compliance management?"

Behind the scenes:
- Tool: get_aws_marketplace_related_solutions
- Parameters:
  - solution_ids: ["prodview-ixyb464cbjkam"]
- Returns: Related solutions from AWS Marketplace recommendations
```

---

## Authentication & Configuration

### OAuth 2.0 Flow (PostHog, Supabase, Vercel)

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Account                         │
│          (claude.ai or Desktop App)                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ 1. User clicks "Connect"
                        ▼
            ┌───────────────────────┐
            │  Service Login (OAuth)│
            │  (e.g., Supabase)     │
            └──────────┬────────────┘
                       │
                       │ 2. User grants permissions
                       ▼
            ┌───────────────────────┐
            │  Service Authorization│
            │  Consent Screen       │
            └──────────┬────────────┘
                       │
                       │ 3. Grant authorization code
                       ▼
            ┌───────────────────────┐
            │  Token Exchange       │
            │  code → access_token  │
            └──────────┬────────────┘
                       │
                       │ 4. Access token stored securely
                       ▼
            ┌───────────────────────┐
            │ MCP Server Connected  │
            │ Tools now available   │
            └───────────────────────┘
```

### Token Management

#### PostHog
- **Type:** OAuth 2.0
- **Scope:** Full project access
- **Rotation:** Automatic (handled by OAuth provider)
- **Revocation:** Disconnect in connector settings

#### Supabase
- **Type:** OAuth 2.0
- **Scope:** database, storage, auth, edge-functions
- **Rotation:** Automatic via OAuth provider
- **Revocation:** Disconnect in connector settings

#### Vercel
- **Type:** Bearer Token (OAuth 2.0)
- **Scope:** Read-only recommended (deployments, logs, projects)
- **Rotation:** Manual — generate new token at https://vercel.com/account/tokens
- **Revocation:** Delete token in Vercel dashboard

#### AWS Marketplace
- **Type:** None (public catalog)
- **Scope:** N/A
- **Rotation:** N/A
- **Revocation:** N/A

### Environment Variable Setup (Self-Hosted)

```bash
# .env.local or .env.production

# PostHog
POSTHOG_API_KEY=phc_your_project_key
POSTHOG_API_URL=https://us.posthog.com

# Supabase
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_API_URL=https://your-project.supabase.co
SUPABASE_ACCESS_TOKEN=your_jwt_token

# Vercel
VERCEL_TOKEN=your_access_token
VERCEL_TEAM_ID=team_xxxxx

# AWS Marketplace
# No env vars needed (public API)
```

---

## Usage Patterns

### Pattern 1: Production Health Check

**Objective:** Verify all systems operational

**Workflow:**
```
User: "Run a production health check"

Claude executes:
1. Vercel: Get current deployment status
2. Vercel: Get runtime errors (last 24h)
3. Supabase: Query audit_logs count (last 24h)
4. PostHog: Get execution_completed event count (last 24h)

Response:
✅ Deployment: READY (dpl_4eFAKoLPVZb6JkSj9QHUkB8Y2Vz9)
✅ Runtime Errors: 0 in production
✅ Audit Trail: 1487 events logged (24h)
✅ Executions: 2 successful (24h)

Conclusion: Production is healthy and operational
```

### Pattern 2: Compliance Evidence Collection

**Objective:** Gather audit evidence for SOC 2 compliance

**Workflow:**
```
User: "Collect evidence for SOC 2 audit from last 30 days"

Claude executes:
1. Supabase: Query audit_logs with timestamps
2. Supabase: Get RLS policies configuration
3. Vercel: Get deployment logs (30 days)
4. PostHog: Track policy evaluation events

Response: Evidence package with:
- Audit log entries (timestamped)
- Policy change history
- Deployment records (with commit SHAs)
- Execution traces
- Access control logs

Ready for auditor review ✓
```

### Pattern 3: Third-Party Solution Evaluation

**Objective:** Evaluate governance solutions for adoption

**Workflow:**
```
User: "Compare Sprinto vs IBM watsonx.governance"

Claude executes:
1. AWS Marketplace: Search governance solutions
2. AWS Marketplace: Get Sprinto metadata
3. AWS Marketplace: Get IBM watsonx metadata
4. AWS Marketplace: Research both solutions (features, reviews, integrations)

Response: Comparison table with:
- Pricing (Sprinto: $15k/year vs IBM: custom)
- Features (coverage: 20+ frameworks vs AI-native)
- Integration ecosystem (300+ vs specialized)
- Customer satisfaction (4.8★ vs 4.3★)
- Use case alignment (fast-growing tech vs enterprise AI)

Recommendation: Sprinto for rapid SOC 2 compliance ✓
```

### Pattern 4: Incident Investigation

**Objective:** Root cause analysis for production error

**Workflow:**
```
User: "What caused the 503 errors on /api/mcp-server last night?"

Claude executes:
1. Vercel: Get runtime errors (grep 503)
2. Vercel: Get deployment build logs (time correlation)
3. Supabase: Query execution_logs around error time
4. PostHog: Check for event spikes or anomalies

Response: Investigation summary with:
- Error timeline (14:34:56 UTC)
- Affected endpoint (/api/mcp-server)
- Error message and stack trace
- Correlation with deployments
- Root cause: MCP server route handler timeout

Fix applied in next deployment ✓
```

---

## API Reference

### PostHog MCP Tools

#### `trends`
Query event trends over time with aggregations.
```json
{
  "event": "execution_completed",
  "date_from": "-7d",
  "date_to": "today",
  "interval": "day",
  "aggregation": "count"
}
```

#### `funnels`
Analyze user/execution funnel conversion.
```json
{
  "steps": ["policy_evaluate", "policy_approve", "execute"],
  "date_from": "-30d"
}
```

#### `retention`
Track retention of executions/users.
```json
{
  "event": "execution_completed",
  "retention_type": "day"
}
```

#### `llm_traces`
Query LLM/AI execution traces.
```json
{
  "filter_by": "token_usage",
  "time_window": "last_7_days"
}
```

---

### Supabase MCP Tools

#### `execute_sql`
Execute arbitrary SQL queries.
```json
{
  "sql": "SELECT id, email FROM users WHERE org_id = $1",
  "db": "prod",
  "params": ["org-123"]
}
```

#### `list_tables`
Discover database tables and schema.
```json
{
  "schema": "public",
  "limit": 100
}
```

#### `apply_migration`
Apply pending database migrations.
```json
{
  "environment": "production",
  "migration_id": "20260716150000_audit_trail"
}
```

#### `get_logs`
Retrieve edge function or database logs.
```json
{
  "function": "dsg_execute",
  "time_range": "-1h",
  "level": "error"
}
```

---

### Vercel MCP Tools

#### `get_deployment`
Get deployment metadata and status.
```json
{
  "id_or_url": "tdealer01-crypto-dsg-control-plane.vercel.app",
  "team_id": "team_n189mlAdVHR6cGGiaAwsKzQ0"
}
```

#### `get_runtime_logs`
Stream and filter runtime application logs.
```json
{
  "project_id": "prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW",
  "team_id": "team_n189mlAdVHR6cGGiaAwsKzQ0",
  "environment": "production",
  "level": ["error", "warning"],
  "since": "6h",
  "limit": 50
}
```

#### `list_deployments`
List all deployments for a project.
```json
{
  "project_id": "prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW",
  "team_id": "team_n189mlAdVHR6cGGiaAwsKzQ0",
  "limit": 20
}
```

#### `list_agent_runs`
Query Eve framework agent execution runs.
```json
{
  "project_id": "prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW",
  "team_id": "team_n189mlAdVHR6cGGiaAwsKzQ0",
  "period": "7d",
  "page": 1
}
```

---

### AWS Marketplace MCP Tools

#### `search_aws_marketplace_solutions`
Search 10,000+ AWS Marketplace solutions.
```json
{
  "queries": ["governance compliance", "API management"],
  "max_results": 10
}
```

#### `get_aws_marketplace_solution`
Retrieve detailed solution metadata.
```json
{
  "solution_ids": ["prodview-ixyb464cbjkam", "prodview-rrpkzqswbnyt6"]
}
```

#### `research_aws_marketplace_solution`
Deep research across 7 dimensions.
```json
{
  "solution_ids": ["prodview-ixyb464cbjkam"],
  "sections": ["features", "reviews", "integrations", "pricing", "case_studies"]
}
```

#### `get_aws_marketplace_related_solutions`
Discover related/alternative solutions.
```json
{
  "solution_ids": ["prodview-ixyb464cbjkam"]
}
```

---

## Best Practices

### 1. Security

#### API Key Management
- ✅ Store tokens in secure credential managers (1Password, HashiCorp Vault)
- ✅ Use restricted tokens with least-privilege scopes
- ✅ Rotate tokens every 90 days
- ✅ Never commit tokens to version control
- ✅ Use different tokens for dev vs production

#### OAuth Scopes
```bash
# ✅ Recommended (least privilege)
PostHog: public_data, event_read

# ✅ Recommended
Supabase: database, storage (separate from admin)

# ✅ Recommended
Vercel: read-only for logs, deployments

# ✅ AWS Marketplace: No auth needed (public)
```

#### Conversation Privacy
- ✅ MCP calls logged in conversation history
- ✅ Don't ask Claude to process sensitive data in chat
- ✅ Use private/direct conversations for compliance work
- ✅ Export sensitive data to local files (not chat)

### 2. Performance

#### Query Optimization
```
✅ DO: Specify time windows (since: "24h", until: "now")
✗ DON'T: Query all time without limits

✅ DO: Filter by environment (production, staging)
✗ DON'T: Fetch all environments and filter in Claude

✅ DO: Use pagination for large result sets
✗ DON'T: Retrieve all 100,000 logs at once
```

#### Rate Limiting
- PostHog: 100 queries/min
- Supabase: 10,000 queries/min
- Vercel: 60 requests/min
- AWS Marketplace: No rate limit (public API)

### 3. Reliability

#### Error Handling
```
If PostHog times out:
→ Reduce time window (-7d instead of -30d)
→ Use specific event names (not wildcard)
→ Retry after 60 seconds

If Supabase connection fails:
→ Check database status at supabase.com/dashboard
→ Verify RLS policies allow your token
→ Re-authenticate in connector settings

If Vercel logs missing:
→ Check deployment is in READY state
→ Verify time range uses correct format (24h, not 1d)
→ Use log filtering to reduce payload
```

#### Caching
- Claude caches MCP tool results for 1-2 minutes
- Re-ask within cache window for consistency
- Clear cache if stale data suspected (disconnect/reconnect)

### 4. Compliance

#### Audit Trail
- ✅ All MCP calls are logged in Claude conversation
- ✅ Export conversations for compliance records
- ✅ Timestamp all evidence collection
- ✅ Use Supabase audit_logs for non-repudiation

#### Evidence Chain
```
For SOC 2/ISO 27001 compliance:
1. Query data via MCP (timestamped)
2. Screenshot/export results
3. Store in compliance evidence folder
4. Link to control framework
5. Include MCP tool calls as proof of verification
```

---

## Troubleshooting

### PostHog Issues

#### "Invalid input for query-trends"
**Cause:** Incorrect schema for event fields
**Solution:**
1. Call `get_schema` for the specific event
2. Use exact field names from schema
3. Verify filter syntax matches schema type

```
Example:
✗ { event: "execution_completed", actor_id: "123" }
✅ { event: "execution_completed", properties: { agent_id: "123" } }
```

#### "Query timeout after 30 seconds"
**Cause:** Too long time window or complex aggregation
**Solution:**
1. Reduce date range (-7d instead of -90d)
2. Add specific event name (not all events)
3. Use daily aggregation (not hourly)
4. Filter by specific properties

### Supabase Issues

#### "RLS policy denies access"
**Cause:** Row-level security policy blocks your token
**Solution:**
1. Check RLS policies in Supabase dashboard
2. Verify token has correct role
3. For sensitive tables, request admin token
4. Re-authenticate in connector settings

#### "Column does not exist"
**Cause:** Wrong column name or typo
**Solution:**
1. Call `describe_table` or `list_tables`
2. View exact column names and types
3. Re-run query with correct column names

#### "Connection refused"
**Cause:** Supabase connector not authenticated
**Solution:**
1. Go to claude.ai connector settings
2. Disconnect and reconnect Supabase
3. Complete OAuth flow
4. Grant full database access scopes

### Vercel Issues

#### "Deployment not found"
**Cause:** Incorrect deployment ID or team ID
**Solution:**
1. Use `list_projects` to get project ID
2. Use `list_deployments` to find deployment
3. Verify team_id matches (team_xxx...)

#### "Logs empty or missing"
**Cause:** Deployment not in READY state or no runtime activity
**Solution:**
1. Check deployment state with `get_deployment`
2. Wait 2-3 minutes for logs to appear
3. Try older time range (24h instead of 6h)
4. Verify environment is "production"

#### "401 Unauthorized"
**Cause:** Vercel token invalid or expired
**Solution:**
1. Go to https://vercel.com/account/tokens
2. Generate new token
3. Reconnect in connector settings
4. Copy full token (not truncated)

### AWS Marketplace Issues

#### "No results found"
**Cause:** Search query too specific or poor keyword matching
**Solution:**
1. Try broader keywords ("governance" not "DSG governance")
2. Use multiple related keywords
3. Search for vendor name instead
4. Browse related solutions for inspiration

#### "Solution details incomplete"
**Cause:** Solution not fully listed or research failed
**Solution:**
1. Try different sections (skip "case_studies" if missing)
2. Use `get_related_solutions` to find alternatives
3. Manual search at https://aws.amazon.com/marketplace

---

## Advanced Configurations

### Self-Hosted MCP Servers

If running Claude Code locally or in private environments:

#### Setup Local PostHog MCP
```bash
npm install @anthropic-ai/mcp-posthog
# Configure in .claude/mcp.json
{
  "mcpServers": {
    "posthog": {
      "command": "node",
      "args": ["/path/to/mcp-posthog.js"],
      "env": {
        "POSTHOG_API_KEY": "${POSTHOG_API_KEY}",
        "POSTHOG_API_URL": "https://us.posthog.com"
      }
    }
  }
}
```

#### Setup Local Supabase MCP
```bash
npm install @anthropic-ai/mcp-supabase
# Configure in .claude/mcp.json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/path/to/mcp-supabase.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

### Custom MCP Tools

Create custom tools for domain-specific queries:

```javascript
// example-custom-mcp.js
const MCP = require('@anthropic-ai/mcp');

const server = new MCP.Server({
  name: "dsg-custom",
  version: "1.0.0"
});

server.addTool({
  name: "check_dsg_readiness",
  description: "Comprehensive DSG control plane readiness check",
  inputSchema: {
    type: "object",
    properties: {
      include_performance: { type: "boolean" }
    }
  },
  handler: async (input) => {
    // Call Vercel, Supabase, PostHog APIs
    // Aggregate results
    // Return readiness score
    return {
      readiness: "READY",
      checks: [
        { name: "deployment", status: "READY" },
        { name: "database", status: "READY" },
        { name: "analytics", status: "READY" }
      ]
    };
  }
});

server.start();
```

---

## Summary

### MCP Connection Status Checklist

| Service | Connected | Auth Type | Tools | Status |
|---------|-----------|-----------|-------|--------|
| PostHog | ✅ Yes | OAuth 2.0 | 50+ | Ready |
| Supabase | ⚠️ Needs OAuth | OAuth 2.0 | 25+ | Ready (auth required) |
| Vercel | ✅ Yes | OAuth 2.0 | 15+ | Ready |
| AWS Marketplace | ✅ Yes | None | 11+ | Ready |

### Quick Start Commands

```bash
# Verify all MCPs connected
"Give me a 10-second status check of all MCP integrations"

# Production health check
"Run a complete production readiness verification"

# Collect compliance evidence
"Gather all audit evidence from the last 30 days"

# Evaluate solutions
"Compare Sprinto vs IBM watsonx for compliance needs"

# Investigate incident
"What caused the 503 errors last night?"

# Database inspection
"Show me all users and their last login time"

# Deployment status
"Is the current deployment healthy?"
```

---

## Support & Resources

### Documentation Links
- [PostHog Docs](https://posthog.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [AWS Marketplace](https://aws.amazon.com/marketplace)
- [MCP Specification](https://modelcontextprotocol.io)

### Getting Help
1. Check troubleshooting section above
2. Review service status pages (posthog.com/status, etc.)
3. Check connector settings for auth errors
4. Enable debug logging in MCP server
5. Contact support for each service

### Feedback
- Report MCP issues via Claude feedback
- Suggest new tools in connector settings
- Share integration patterns with team

---

**Last Updated:** July 16, 2026  
**Version:** 1.0.0  
**Status:** Production-ready  
**Maintained By:** DSG Team
