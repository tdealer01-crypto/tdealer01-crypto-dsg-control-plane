# 🔧 Troubleshooting Guide

Quick solutions for common DSG Control Plane issues.

---

## Table of Contents

1. [Build & Deployment](#build--deployment)
2. [API & Runtime](#api--runtime)
3. [Database & Storage](#database--storage)
4. [Authentication & Authorization](#authentication--authorization)
5. [Performance Issues](#performance-issues)
6. [Data & Evidence](#data--evidence)
7. [Getting Help](#getting-help)

---

## Build & Deployment

### ❌ Vercel Build Fails

**Symptom**: Red "Failed" status on Vercel dashboard

**Common Causes**:

#### 1. TypeScript Compilation Error
```
error TS2769: No overload matches this call
```

**Fix**:
```bash
# Local check
npm run typecheck

# Fix common issues
# - Missing imports
# - Type mismatches
# - Missing required fields

# Then redeploy
git push origin main
```

#### 2. Out of Disk Space
```
ENOSPC: no space left on device
```

**Fix**:
```bash
# In Vercel dashboard:
# 1. Go to Project Settings
# 2. Scroll to "Advanced" → "Deployment Logs"
# 3. Check "Disk Usage" metrics

# Local clean-up
rm -rf .next node_modules
npm ci
npm run build
```

#### 3. Environment Variable Missing
```
Error: NEXT_PUBLIC_SUPABASE_URL is undefined
```

**Fix**:
```bash
# Check Vercel project settings
# Settings → Environment Variables

# Required vars:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - ANTHROPIC_API_KEY
# - VERCEL_ENV (should be 'production')

# Verify locally:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 4. Conflicting Dependencies
```
npm ERR! found 0 vulnerabilities that are high or critical
npm ERR! npm WARN ...
```

**Fix**:
```bash
# Update lock file
npm install --legacy-peer-deps

# Or downgrade conflicting package
npm install package@older-version
```

---

### ❌ Deployment Stuck in "Building"

**Symptom**: Build running for >5 minutes

**Fix**:
```bash
# Option 1: Force rebuild
# - Vercel dashboard → Deployments → Redeploy

# Option 2: Cancel and retry
# - Vercel dashboard → [x] Cancel
# - Wait 30 sec
# - git push origin main

# Option 3: Check build logs
# - Vercel dashboard → Deployments → View logs
# - Look for hanging step (usually npm install or next build)
```

---

## API & Runtime

### ❌ API Returns 500 Error

**Symptom**: `{"error": "Internal server error"}`

**Debug Steps**:

```bash
# 1. Check if API is alive
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
# Should return: {"ok": true, "env": "production", ...}

# 2. Check Vercel logs
# - Vercel dashboard → Deployments → [latest] → Logs
# - Look for stack traces

# 3. Check specific endpoint
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dashboard/trinity/chat
# If 500: Error is in this route

# 4. Test locally
npm run dev
curl http://localhost:3000/api/dashboard/trinity/chat
# Compare error to production
```

**Common API Errors**:

#### 500: TypeError - Cannot read property 'x' of undefined
```javascript
// Issue: Missing null check
const response = data.result.value  // data.result might be null

// Fix: Add null check
const response = data?.result?.value || fallback
```

#### 500: Database Connection Failed
```
Error: FATAL: sorry, too many clients already (...)
```

**Fix**:
```bash
# Connection pool exhausted
# 1. Restart Vercel: Redeploy
# 2. Check Supabase connection limit
#    - Supabase dashboard → Settings → Database → Connection Limits
#    - Increase from 20 to 40 if needed
# 3. Clear idle connections
#    - In Supabase: SQL Editor → Run:
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - interval '10 min';
```

#### 500: Rate Limit Exceeded (Public API)
```
HTTP 429 Too Many Requests
```

**Fix**:
```bash
# Check rate limit headers
curl -v https://tdealer01-crypto-dsg-control-plane.vercel.app/api/public/test/arbiter-validation

# Headers show:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 0

# Solution:
# - Wait 1 minute for bucket reset
# - Or use different IP address
# - Or contact support for quota increase
```

---

### ❌ API Response Incomplete or Wrong

**Symptom**: Response missing data or has unexpected format

**Common Causes**:

#### 1. Supabase Row Not Found
```json
{
  "error": "Row not found",
  "code": "PGRST116"
}
```

**Fix**:
```bash
# Check if data exists
# 1. Supabase dashboard → SQL Editor
SELECT * FROM trinity_chat_history WHERE session_id = '...';

# 2. If empty: Data not saved (check API response handling)
# 3. If exists: Query wrong table or filter
```

#### 2. Tool Response Malformed
```
Error: SyntaxError: Unexpected token < in JSON at position 0
```

**Fix**:
```bash
# Response is HTML (error page) instead of JSON
# Likely cause: 404 or 500 error disguised as JSON parse error

# Check actual response:
curl -v https://tdealer01-crypto-dsg-control-plane.vercel.app/api/...
# Look at response headers and body

# Common fix: Wrong endpoint path
```

#### 3. Type Mismatch in Response
```typescript
// Expected: { toolCalls: string[] }
// Got: { toolCalls: "tool1,tool2" }
```

**Fix**:
```typescript
// In API route
const toolCalls = Array.isArray(data.toolCalls) 
  ? data.toolCalls 
  : data.toolCalls.split(',')
```

---

## Database & Storage

### ❌ Supabase Connection Fails

**Symptom**: Can't connect to database in local dev

**Fix**:

```bash
# 1. Check Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 2. If missing, add to .env.local
cp .env.example .env.local
# Edit .env.local with real credentials

# 3. Test connection
npx supabase status

# 4. If still fails:
# - Check Supabase project status dashboard
# - Verify credentials in Supabase dashboard → Settings → API
# - Regenerate keys if needed (Settings → API → Generate Keys)
```

---

### ❌ Migration Fails

**Symptom**: Database schema out of sync

**Fix**:

```bash
# 1. Check migration status
supabase migration list

# 2. If stuck, manually reset (dev only)
supabase db reset

# 3. For production, run migration manually
# - Supabase dashboard → SQL Editor
# - Copy migration SQL from supabase/migrations/*.sql
# - Run it manually

# 4. Verify schema
supabase db pull
# Should not show changes if sync is good
```

---

### ❌ Data Inconsistency

**Symptom**: Trinity chat history shows old/missing messages

**Common Causes**:

#### 1. Wrong Session ID
```javascript
// Generated new session ID on page reload
const [sessionId] = useState(() => generateNewId())
// ❌ Creates new ID every time state changes

// ✅ Fix: Generate once
const [sessionId] = useState(() => `session-${Date.now()}`)
```

**Fix**:
```bash
# Check current session ID
console.log(sessionId)

# Query messages with correct session ID
SELECT * FROM trinity_chat_history WHERE session_id = 'session-...'
```

#### 2. RLS Policy Blocks Access
```
Error: row level security violation
```

**Fix**:
```sql
-- Verify RLS policy allows access
SELECT * FROM trinity_chat_history
WHERE session_id = '...' AND user_id = ...

-- If empty: RLS policy is blocking
-- Fix in Supabase → authentication → RLS
-- Add policy: FOR SELECT USING (TRUE) -- dev only
```

---

## Authentication & Authorization

### ❌ API Key Invalid

**Symptom**: 401 Unauthorized when making API requests

**Fix**:

```bash
# 1. Check your API key
echo $ANTHROPIC_API_KEY | head -c 10

# 2. Verify format (should start with sk-)
# If not: Regenerate from Anthropic dashboard

# 3. Check header format
# ✅ Correct: Authorization: Bearer sk-ant-...
# ❌ Wrong: Authorization: sk-ant-...

# 4. Test locally
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  https://api.anthropic.com/v1/messages \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

---

### ❌ Permission Denied

**Symptom**: 403 Forbidden - "You don't have permission"

**Common Causes**:

#### 1. Supabase RLS Policy
```
Error: row level security violation
```

**Fix**:
```sql
-- Check if user_id matches
SELECT current_user;  -- Who am I?

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'trinity_chat_history';

-- Temporarily disable RLS for testing (dev only)
ALTER TABLE trinity_chat_history DISABLE ROW LEVEL SECURITY;
```

#### 2. API Scope Mismatch
```
Error: This API key doesn't have access to this resource
```

**Fix**:
```bash
# Verify API key has required scopes
# - For Anthropic: Should allow /messages endpoint
# - For Supabase: Should allow database write + read
# - For Vercel: Should allow deployments + logs

# Regenerate with correct scopes
```

---

## Performance Issues

### ❌ API Response Slow (>200ms)

**Symptom**: Requests taking 5+ seconds

**Diagnosis Steps**:

```bash
# 1. Measure latency
time curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
# Real: 0.500s  user: 0.010s  sys: 0.020s

# 2. Break down into components
# - Request: 100ms (network)
# - Processing: 200ms (server CPU)
# - Database: 300ms (query)
# - Total: 600ms ❌ Too slow

# 3. Find slow component
# Add timing logs in app/api/[route]/route.ts
console.time('db-query')
const result = await supabase.from('trinity_chat_history').select()
console.timeEnd('db-query')  // Output: db-query: 342.5ms
```

**Common Performance Fixes**:

#### 1. Slow Database Query
```javascript
// ❌ Slow: No index, full table scan
SELECT * FROM trinity_chat_history WHERE session_id = '123'

// ✅ Fast: With index
CREATE INDEX idx_session ON trinity_chat_history(session_id)
```

#### 2. Missing Connection Pool
```javascript
// ❌ Creates new connection per request
const client = new SupabaseClient(url, key)
const data = await client.from('...').select()

// ✅ Reuse connection
const client = createClient(url, key)  // Reused globally
```

#### 3. N+1 Queries
```javascript
// ❌ Slow: 100 queries for 100 rows
for (const session of sessions) {
  const messages = await db.query('SELECT * FROM messages WHERE session_id = ?', session.id)
}

// ✅ Fast: 1 query
const messages = await db.query(
  'SELECT * FROM messages WHERE session_id IN (...)'
)
```

---

### ❌ Build Slow (>3 minutes)

**Symptom**: npm run build takes too long

**Diagnosis**:
```bash
# 1. Time each step
npm run build 2>&1 | grep -E "^>"

# 2. Identify slow step
# Example output:
# > tsc --noEmit  (45s) ← TypeScript is slow
# > next build    (120s) ← Next.js build is slow
# > vercel build  (30s) ← OK

# 3. For TypeScript slowness
# - Reduce files in tsconfig
# - Use skipLibCheck: true

# 4. For Next.js slowness
# - Check node_modules size
# - Remove unused dependencies
# - Clear .next cache
```

---

## Data & Evidence

### ❌ DSG Proof Invalid

**Symptom**: "Proof verification failed" error

**Common Causes**:

#### 1. Hash Mismatch
```
requestHash: abc123...
proofHash: def456...  ← Different!
bundleHash: ghi789...
```

**Fix**:
```bash
# Check if input parameters changed
# Proof chain is deterministic: same input = same hashes

# If input was modified:
# 1. Find original input
# 2. Regenerate proof with original
# 3. Or accept new proof if input intentionally changed
```

#### 2. Proof Chain Broken
```
requestHash → proofHash ❌ (link broken)
              bundleHash
```

**Fix**:
```javascript
// Verify chain integrity
const chain = [requestHash, proofHash, bundleHash, merkleRoot]
for (let i = 0; i < chain.length - 1; i++) {
  const nextHash = sha256(chain[i] + chain[i+1])
  if (nextHash !== chain[i+1]) {
    console.error(`Chain broken at link ${i}`)
  }
}
```

---

### ❌ Audit Trail Missing

**Symptom**: No evidence recorded for decision

**Fix**:

```bash
# 1. Check if audit table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'audit%'

# 2. Check if entries were saved
SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - interval '1 hour'

# 3. If empty: Check API response
# Did API return audit trail ID?
console.log(response.audit_trail_id)
```

---

## Getting Help

### Before Reaching Out

1. **Check Status Page**: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
2. **Search This Doc**: Use Ctrl+F for error message
3. **Check GitHub Issues**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
4. **Review Logs**: Vercel dashboard → Deployments → Logs

### Report a Bug

Include:
```markdown
## Error
[Exact error message]

## Reproduction
[Steps to reproduce]

## Environment
- Endpoint: [URL or API route]
- Branch: [main/feature]
- Timestamp: [ISO 8601]

## Logs
[Error stack trace]

## Expected
[What should happen]

## Actual
[What happened]
```

### Escalation Path

1. Search this troubleshooting guide
2. Search GitHub issues
3. Post in team Slack channel
4. Create GitHub issue with reproduction steps
5. Page on-call engineer (if production critical)

---

**Last Updated**: 2026-07-18  
**Maintained By**: DSG Platform Team

See also:
- MONITORING_RUNBOOK.md - Production monitoring
- PERFORMANCE_GUIDE.md - Performance optimization
- docs/SECURITY.md - Security issues
