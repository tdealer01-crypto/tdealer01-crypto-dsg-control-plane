# Trinity DSG Revenue Integration

This module provides automatic revenue synchronization from Trinity DSG API to the DSG Control Plane billing system.

## Overview

Trinity DSG runs a multi-agent system (executor, scheduler, monitor, auditor, etc.) that processes AI tasks. Each agent consumes resources and generates costs. This integration:

1. **Queries Trinity API** for agent cost metrics on a scheduled basis
2. **Creates revenue records** in the control plane database
3. **Tracks per-agent costs** for granular revenue analysis
4. **Enables Stripe metering** integration for usage-based billing

## Architecture

### Flow

```
Trinity API (hourly)
       ↓
fetchTrinityCosts()
       ↓
TrinityAgentMetrics
       ↓
createRevenueRecords()
       ↓
Database (trinity_revenue_*)
       ↓
[Optional] Stripe Metering
```

### Components

- **`revenue-sync.ts`** — Core sync logic and Trinity API integration
- **`/api/cron/trinity-revenue-sync`** — Cron endpoint for scheduled sync
- **Database migrations** — Tables for revenue records and agent metrics
- **`revenue-autopilot-schedule.ts`** — Scheduling integration (hourly cadence)

## Configuration

### Environment Variables

```env
# Trinity API connection
TRINITY_API_URL=http://localhost:3001        # Default: http://localhost:3001
TRINITY_JWT_TOKEN=<jwt-token>                # Optional: for authenticated access

# Supabase (required for database operations)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-key>

# Cron authorization
CRON_SECRET=<secret-token>                   # Required for cron endpoint access
```

### MCP Server Registration

Trinity MCP Server is registered in `.mcp.json`:

```json
{
  "trinity-dsg-mcp": {
    "type": "stdio",
    "command": "node",
    "args": ["--loader", "ts-node/esm", "trinity-mcp-server/src/index.ts"],
    "env": {
      "TRINITY_API_URL": "${TRINITY_API_URL}",
      "TRINITY_JWT_TOKEN": "${TRINITY_JWT_TOKEN}"
    }
  }
}
```

## API Reference

### `fetchTrinityCosts(period?)`

Queries Trinity API for agent cost metrics.

```typescript
const metrics = await fetchTrinityCosts('24h');
// Returns: TrinityAgentMetrics
```

**Parameters:**
- `period` — Time period: `'1h'`, `'24h'`, or `'7d'` (default: `'24h'`)

**Returns:**
```typescript
{
  total_agents: number
  healthy_agents: number
  total_cost: number
  period: string
  timestamp: string
  agents: TrinityAgentCost[]
  fragmentation_risk: number
  context_sharing: number
}
```

### `createRevenueRecords(metrics)`

Stores Trinity metrics as revenue records in the database.

```typescript
const result = await createRevenueRecords(metrics);
// Returns: RevenueSyncResult
```

**Returns:**
```typescript
{
  ok: boolean
  period: string
  recordsCreated: number
  totalCost: number
  agentCount: number
  errors: string[]
}
```

### `syncTrinityRevenue(period?)`

Complete sync operation: fetch from Trinity and store locally.

```typescript
const result = await syncTrinityRevenue('24h');
```

### `checkTrinityRevenueHealth()`

Health check for Trinity integration.

```typescript
const health = await checkTrinityRevenueHealth();
// Returns: { healthy: boolean, trinity_api: boolean, database: boolean, message: string }
```

## Database Schema

### `trinity_revenue_records`

Main revenue records table:

```sql
- id (UUID PK)
- organization_id (text)
- period_start (timestamptz)
- period_end (timestamptz)
- source (text, default: 'trinity-agents')
- total_amount_usd (decimal)
- agent_count (integer)
- healthy_agents (integer)
- fragmentation_risk (decimal)
- context_sharing (decimal)
- metrics_json (jsonb)
- status (text: pending_reconciliation, reconciled, billed, archived)
- created_at, updated_at (timestamptz)
```

### `trinity_revenue_agents`

Per-agent cost breakdown:

```sql
- id (UUID PK)
- trinity_revenue_record_id (UUID FK)
- agent_name (text)
- jobs_processed (integer)
- cpu_usage (decimal)
- agent_cost_usd (decimal)
- created_at (timestamptz)
```

### `trinity_revenue_sync_state`

Sync state tracking:

```sql
- id (UUID PK)
- last_successful_sync (timestamptz)
- last_sync_attempt (timestamptz)
- last_sync_period (text)
- last_sync_record_count (integer)
- last_sync_total_cost (decimal)
- status (text: ready, syncing, failed, degraded)
- error_message (text)
- created_at, updated_at (timestamptz)
```

## Cron Integration

Trinity revenue sync is scheduled as an hourly job via the revenue autopilot system:

```typescript
// From lib/revenue/autopilot-schedule.ts
{ 
  name: 'trinity-revenue-sync',
  path: '/api/cron/trinity-revenue-sync',
  cadence: 'hourly'
}
```

**Endpoint:** `GET /api/cron/trinity-revenue-sync`

**Query Parameters:**
- `period` — Optional time period (`1h`, `24h`, `7d`, default: `24h`)

**Authorization:** Requires `CRON_SECRET` in Authorization header

**Response:**
```json
{
  "ok": true,
  "period": "24h",
  "recordsCreated": 1,
  "totalCost": 125.50,
  "agentCount": 7,
  "errorCount": 0
}
```

## Usage Examples

### Manual Sync

```typescript
import { syncTrinityRevenue } from '@/lib/trinity/revenue-sync';

const result = await syncTrinityRevenue('24h');
console.log(`Synced ${result.recordsCreated} records, total cost: $${result.totalCost}`);
```

### Health Check

```typescript
import { checkTrinityRevenueHealth } from '@/lib/trinity/revenue-sync';

const health = await checkTrinityRevenueHealth();
if (!health.healthy) {
  console.warn('Trinity integration unhealthy:', health.message);
}
```

### Querying Revenue Records

```typescript
// In an API route with Supabase client
const { data, error } = await client
  .from('trinity_revenue_records')
  .select('*, trinity_revenue_agents(*)')
  .eq('organization_id', 'trinity-dsg')
  .order('created_at', { ascending: false })
  .limit(10);
```

## Error Handling

The integration handles several failure modes gracefully:

1. **Trinity API Unreachable** — Returns `null` from `fetchTrinityCosts()`, sync continues to report error
2. **Database Connection Failed** — Creates `RevenueSyncResult` with `ok: false` and error details
3. **Malformed Response** — Fills missing fields with defaults (0, empty array, etc.)
4. **Authorization Failures** — Cron endpoint returns 401 or 503 with clear status

**Best Practices:**
- Monitor error counts in cron response (`errorCount` field)
- Set up alerts for health check failures
- Check sync state table periodically: `SELECT * FROM trinity_revenue_sync_state ORDER BY updated_at DESC LIMIT 1`

## Testing

Unit tests are located in:
- `tests/unit/trinity/revenue-sync.test.ts` — Core sync logic
- `tests/unit/cron/trinity-revenue-sync.test.ts` — Cron route behavior

**Run tests:**
```bash
npm run test -- tests/unit/trinity/revenue-sync.test.ts
npm run test -- tests/unit/cron/trinity-revenue-sync.test.ts
```

## Monitoring

### Health Checks

```bash
# Via cron endpoint (requires CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://api.example.com/api/cron/trinity-revenue-sync

# Via health endpoint (example - implement as needed)
curl https://api.example.com/api/trinity-health
```

### Observability

Check sync state and error logs:

```sql
-- Recent sync attempts
SELECT * FROM trinity_revenue_sync_state 
ORDER BY updated_at DESC 
LIMIT 5;

-- Revenue records for the last 7 days
SELECT 
  DATE(period_start) as date,
  COUNT(*) as records,
  SUM(total_amount_usd) as total
FROM trinity_revenue_records
WHERE period_start > NOW() - INTERVAL '7 days'
GROUP BY DATE(period_start)
ORDER BY date DESC;

-- Agent cost breakdown
SELECT 
  agent_name,
  COUNT(*) as count,
  SUM(agent_cost_usd) as total_cost,
  SUM(jobs_processed) as total_jobs,
  AVG(cpu_usage) as avg_cpu
FROM trinity_revenue_agents
GROUP BY agent_name
ORDER BY total_cost DESC;
```

## Integration with Stripe Metering (Future)

The framework supports future Stripe metering integration:

```typescript
// Example (not yet implemented)
if (result.ok && process.env.STRIPE_METER_ID) {
  await submitStripeMetering({
    meterId: process.env.STRIPE_METER_ID,
    value: result.totalCost,
    timestamp: new Date(),
  });
}
```

## Troubleshooting

### "Trinity revenue sync degraded"

**Check:**
1. Trinity API is running: `curl ${TRINITY_API_URL}/api/health`
2. `TRINITY_API_URL` and `TRINITY_JWT_TOKEN` are set
3. Network connectivity to Trinity API

### "Supabase credentials not configured"

**Check:**
1. `SUPABASE_URL` is set and valid
2. `SUPABASE_SERVICE_ROLE_KEY` is present
3. Database tables exist: `SELECT * FROM trinity_revenue_records LIMIT 1`

### "Failed to fetch Trinity metrics"

**Check:**
1. Trinity API is responding: `curl -v ${TRINITY_API_URL}/api/costs`
2. Response format matches expected schema
3. Network timeouts (check logs for timeout errors)

### No records created but sync reports "ok"

**Check:**
1. Trinity returned zero agents or zero cost
2. Database constraints rejected records (check `trinity_revenue_records.status`)
3. Time period parameter is correct

## Future Enhancements

- [ ] Real-time agent cost streaming (via WebSocket)
- [ ] Stripe metering integration for automatic invoicing
- [ ] Agent cost predictions and forecasting
- [ ] Revenue anomaly detection
- [ ] Multi-organization support with cost allocation
- [ ] Export revenue reports (CSV, PDF)
- [ ] Cost trend analysis and dashboards
