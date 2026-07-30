# DSG ONE MCP Server — Phase 3 Testing & Verification

**Status:** PHASE 3 TESTING PROCEDURES

**Date:** 2026-07-30

**Objective:** Verify all 7 services and 30+ tools work correctly through the MCP protocol with proper error handling, schema validation, and response formatting.

---

## Test Environment Setup

### Prerequisites

```bash
# Navigate to project
cd /tmp/claude-0/-home-user/e9e19a74-06e9-5d7b-8b6e-06e6a8b01142/scratchpad/dsg-one-mcp-server

# Verify build
npm run build

# Check dist directory
ls -la dist/index.js
```

### Environment Variables

Create `.env` file with minimal test variables:

```bash
# REQUIRED - Supabase
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# OPTIONAL - These can be empty for Phase 3 (will fail gracefully)
export VERCEL_API_TOKEN=""
export VERCEL_TEAM_ID=""
export ANTHROPIC_API_KEY=""
export STRIPE_API_KEY=""
export SPINE_BASE_URL=""
export SPINE_API_KEY=""
export DSG_BRAIN_BASE_URL=""
export DSG_BRAIN_API_KEY=""
export COMPLIANCE_BASE_URL=""
export COMPLIANCE_API_KEY=""
```

---

## Test Procedures

### Test 1: Server Initialization & Tool Registration

**Objective:** Verify MCP server starts and registers all available tools.

**Steps:**

1. Start the server:
```bash
npm start
```

2. In another terminal, test tools/list endpoint:
```bash
# The server should output startup logs
# Expected output pattern: "[DSG MCP] <service> initialized with N tools"
```

**Expected Output:**
```
[DSG MCP] Supabase initialized with 2 tools
[DSG MCP] Server started successfully
```

**Verification Checklist:**
- [ ] Server starts without fatal errors
- [ ] No unhandled exceptions during initialization
- [ ] All available services log their initialization
- [ ] tools/list returns at least Supabase tools

---

### Test 2: Supabase Service Tools

**Objective:** Verify Supabase database connectivity and query execution.

**Tools to Test:**
- `dsg_query_database` — Execute SQL queries
- `dsg_list_tables` — List database tables
- `dsg_manage_rls_policies` — View RLS policies
- `dsg_execute_migrations` — Run migrations
- `dsg_check_auth_session` — Verify auth sessions
- `dsg_update_records` — Update with audit trail

**Test Cases:**

#### Test 2.1: List Tables
```json
{
  "tool": "dsg_list_tables",
  "input": {}
}
```
**Expected:** Returns array of table names (e.g., `["auth.users", "public.executions"]`)

#### Test 2.2: Query Database
```json
{
  "tool": "dsg_query_database",
  "input": {
    "query": "SELECT COUNT(*) as count FROM auth.users;",
    "params": []
  }
}
```
**Expected:** Returns JSON array with row count

#### Test 2.3: Get RLS Policies
```json
{
  "tool": "dsg_manage_rls_policies",
  "input": {
    "table": "public.executions"
  }
}
```
**Expected:** Returns array of policy objects or empty array

**Verification Checklist:**
- [ ] All Supabase tools appear in tools/list
- [ ] Authentication errors handled gracefully
- [ ] Query results properly formatted as JSON
- [ ] RLS policy retrieval works or returns sensible error
- [ ] Null/empty results don't crash tools

---

### Test 3: Vercel Service Tools (with API token)

**Objective:** Verify Vercel integration and deployment monitoring.

**Tools to Test:**
- `vercel_list_deployments` — List project deployments
- `vercel_get_project_status` — Get project health
- `vercel_trigger_deploy` — Trigger new deployment
- `vercel_get_build_logs` — Retrieve build logs
- `vercel_manage_env_vars` — Configure environment

**Test Cases (requires VERCEL_API_TOKEN):**

#### Test 3.1: List Deployments
```json
{
  "tool": "vercel_list_deployments",
  "input": {
    "projectId": "test-project-id",
    "limit": 5
  }
}
```
**Expected:** Returns array of deployment objects or error if no token

#### Test 3.2: Get Project Status
```json
{
  "tool": "vercel_get_project_status",
  "input": {
    "projectId": "test-project-id"
  }
}
```
**Expected:** Returns project status object or error message

**Verification Checklist:**
- [ ] Tools gracefully handle missing API token
- [ ] Error messages are descriptive
- [ ] Response schemas match API documentation
- [ ] Rate limiting doesn't crash server

---

### Test 4: Anthropic Service Tools (with API key)

**Objective:** Verify LLM session and message handling.

**Tools to Test:**
- `anthropic_create_session` — Start new conversation
- `anthropic_send_message` — Send and receive messages
- `anthropic_list_models` — Get available models
- `anthropic_get_usage` — Retrieve usage statistics

**Test Cases (requires ANTHROPIC_API_KEY):**

#### Test 4.1: Create Session
```json
{
  "tool": "anthropic_create_session",
  "input": {}
}
```
**Expected:** Returns session object with ID and token counts

#### Test 4.2: Send Message
```json
{
  "tool": "anthropic_send_message",
  "input": {
    "sessionId": "sess_...",
    "message": "Hello, what is 2+2?",
    "model": "claude-opus-4"
  }
}
```
**Expected:** Returns response with content and usage

**Verification Checklist:**
- [ ] Sessions created successfully
- [ ] Message responses properly formatted
- [ ] Token usage tracked accurately
- [ ] Model list includes expected versions
- [ ] Error handling for invalid sessions

---

### Test 5: Stripe Service Tools (with API key)

**Objective:** Verify billing and subscription management.

**Tools to Test:**
- `stripe_create_customer` — Create customer account
- `stripe_list_invoices` — Retrieve billing history
- `stripe_create_subscription` — Set up subscription
- `stripe_record_usage` — Track metered billing

**Test Cases (requires STRIPE_API_KEY with sandbox):**

#### Test 5.1: Create Customer
```json
{
  "tool": "stripe_create_customer",
  "input": {
    "email": "test@example.com",
    "name": "Test User"
  }
}
```
**Expected:** Returns Stripe customer object with ID

#### Test 5.2: List Invoices
```json
{
  "tool": "stripe_list_invoices",
  "input": {
    "customerId": "cus_...",
    "limit": 10
  }
}
```
**Expected:** Returns array of invoice objects

**Verification Checklist:**
- [ ] Customer creation works
- [ ] Invoice queries return proper format
- [ ] Subscription setup doesn't require session
- [ ] Usage recording follows Stripe schema
- [ ] Error handling for invalid customers

---

### Test 6: Spine Service Tools (stub)

**Objective:** Verify governance execution pipeline integration.

**Tools to Test:**
- `spine_check_quota` — Verify agent quota
- (Others are stubs and will return placeholder responses)

**Test Cases:**

#### Test 6.1: Check Quota
```json
{
  "tool": "spine_check_quota",
  "input": {
    "agentId": "agent_123"
  }
}
```
**Expected:** Returns quota response or "Service not configured" error

**Verification Checklist:**
- [ ] Tool error handling doesn't crash server
- [ ] Proper error message when service URL missing
- [ ] Request format matches Spine API spec

---

### Test 7: DSG Brain Service Tools (stub)

**Objective:** Verify planning and conformance validation.

**Tools to Test:**
- `dsg_propose_plan` — Generate execution plan

**Test Cases:**

#### Test 7.1: Propose Plan
```json
{
  "tool": "dsg_propose_plan",
  "input": {
    "objective": "Deploy new feature to production",
    "context": {
      "repository": "dsg-control-plane",
      "branch": "main"
    },
    "constraints": ["must-pass-tests", "requires-approval"]
  }
}
```
**Expected:** Returns plan object with steps or error

**Verification Checklist:**
- [ ] Plan structure includes hash and steps
- [ ] Error handling for missing objective
- [ ] Constraints are validated

---

### Test 8: Compliance Service Tools (stub)

**Objective:** Verify evidence collection and audit logging.

**Tools to Test:**
- `ccvs_collect_evidence` — Gather compliance evidence
- `ccvs_list_audit_logs` — Query audit trail

**Test Cases:**

#### Test 8.1: Collect Evidence
```json
{
  "tool": "ccvs_collect_evidence",
  "input": {
    "executionId": "exec_123",
    "level": "L3",
    "metadata": {
      "version": "1.0",
      "timestamp": "2026-07-30T12:00:00Z"
    }
  }
}
```
**Expected:** Returns evidence object with hash

#### Test 8.2: List Audit Logs
```json
{
  "tool": "ccvs_list_audit_logs",
  "input": {
    "agentId": "agent_123",
    "limit": 50
  }
}
```
**Expected:** Returns array of audit log entries

**Verification Checklist:**
- [ ] Evidence levels (L1-L5) are validated
- [ ] Evidence hash is consistent
- [ ] Audit logs properly formatted
- [ ] Query filters work correctly

---

### Test 9: Error Handling

**Objective:** Verify proper error handling across all services.

**Test Cases:**

#### Test 9.1: Invalid Tool Name
```json
{
  "tool": "nonexistent_tool",
  "input": {}
}
```
**Expected:** Returns error: `Tool not found: nonexistent_tool`

#### Test 9.2: Missing Required Input
```json
{
  "tool": "dsg_query_database",
  "input": {}
}
```
**Expected:** Returns validation error for missing `query` parameter

#### Test 9.3: Authentication Failure
```json
{
  "tool": "dsg_list_tables",
  "input": {}
}
```
**Expected (with missing Supabase keys):** Returns authentication error

**Verification Checklist:**
- [ ] Tool not found errors are clear
- [ ] Missing parameters are caught by Zod validation
- [ ] Authentication errors don't expose secrets
- [ ] Error responses follow consistent format
- [ ] No stack traces exposed to caller

---

### Test 10: Resource Endpoints

**Objective:** Verify MCP resource functionality.

**Test Cases:**

#### Test 10.1: List Resources
```
resources/list
```
**Expected:** Returns array with dsg-control-plane://status resource

#### Test 10.2: Read Status Resource
```
resources/read with uri: dsg-control-plane://status
```
**Expected:** Returns status text showing initialized services

**Verification Checklist:**
- [ ] Status resource contains correct initialization info
- [ ] Unknown resources return proper error
- [ ] Resource URIs are consistent

---

## MCP Inspector Integration Testing

For full interactive testing with schema validation:

```bash
npm run inspector
```

The inspector will:
1. Start the MCP server
2. Connect and list all tools
3. Show input/output schemas
4. Allow interactive tool execution
5. Validate request/response formats

**Inspector Checklist:**
- [ ] All 30+ tools appear in inspector
- [ ] Input schemas are valid and required fields marked
- [ ] Output schemas define response structure
- [ ] Tool execution works end-to-end
- [ ] Error responses follow error schema

---

## Test Summary Template

After completing tests, document results:

```markdown
## Phase 3 Test Results

**Date:** 2026-07-30
**Environment:** [development/staging/production]
**Tester:** [name]

### Services Tested
- [x] Supabase (6 tools) — ✅ PASS
- [x] Vercel (5 tools) — ⚠️ SKIP (no API token)
- [x] Anthropic (4 tools) — ⚠️ SKIP (no API key)
- [x] Stripe (4 tools) — ⚠️ SKIP (no API key)
- [x] Spine (4 tools) — ✅ PASS (stubs)
- [x] DSG Brain (3 tools) — ✅ PASS (stubs)
- [x] Compliance (4 tools) — ✅ PASS (stubs)

### Issues Found
1. [Issue description] — [Resolution]
2. [Issue description] — [Resolution]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

**Status:** ✅ READY FOR PHASE 4
```

---

## Known Test Limitations

1. **External API Dependencies:** Tests requiring real API tokens (Vercel, Anthropic, Stripe) will skip if credentials absent
2. **Network Isolation:** Tests cannot verify actual network calls to external services
3. **Stub Services:** Spine, DSG Brain, Compliance return placeholder responses only
4. **Database State:** Supabase tests depend on available tables and RLS policies
5. **Rate Limiting:** Stub services don't implement actual rate limiting

---

## Next: Phase 4 Evaluation

Once Phase 3 testing is complete and documented, proceed to Phase 4:

**Phase 4:** Create comprehensive evaluation questions that test:
- Multi-step workflows requiring multiple tools
- Error recovery and handling
- LLM reasoning about DSG ONE concepts
- Integration between service boundaries
- Real-world use cases for agents

See PHASE_4_EVALUATION.md for detailed evaluation framework.

---

**Last Updated:** 2026-07-30
**Next Steps:** Run tests and document results, then proceed to Phase 4 evaluation.
