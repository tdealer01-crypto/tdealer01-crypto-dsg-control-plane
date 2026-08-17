/**
 * Trinity DSG Revenue Synchronization
 *
 * Synchronizes cost metrics from Trinity API via MCP and generates revenue events.
 * Supports Stripe metered billing integration for usage-based pricing.
 *
 * Revenue sync flow:
 * 1. Query Trinity API for cost data by time period
 * 2. Convert Trinity costs to DSG revenue events
 * 3. Store revenue records in database
 * 4. Optionally submit meter events to Stripe
 */

import { createClient } from '@supabase/supabase-js';

export interface TrinityAgentCost {
  agent: string;
  cost: number;
  jobsProcessed: number;
  cpuUsage: number;
  uptime: string;
}

export interface TrinityAgentMetrics {
  total_agents: number;
  healthy_agents: number;
  total_cost: number;
  period: string;
  timestamp: string;
  agents: TrinityAgentCost[];
  fragmentation_risk: number;
  context_sharing: number;
}

export interface RevenueSyncResult {
  ok: boolean;
  period: string;
  recordsCreated: number;
  totalCost: number;
  agentCount: number;
  meterEventsSubmitted?: number;
  errors: string[];
}

const TRINITY_API_URL = process.env.TRINITY_API_URL || 'http://localhost:3001';
const TRINITY_JWT_TOKEN = process.env.TRINITY_JWT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Milliseconds covered by each supported sync period. */
const PERIOD_DURATION_MS: Record<'1h' | '24h' | '7d', number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = parseFloat(String(value ?? fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Normalize a Trinity agent entry.
 *
 * The Trinity Backend returns snake_case fields (`agent_name`, `agent_cost_usd`,
 * `jobs_processed`, `cpu_usage`). Older/alternate payloads use camelCase
 * (`agent`, `cost`, `jobsProcessed`, `cpuUsage`). Accept both so a backend
 * shape change does not silently produce empty revenue line items.
 */
function normalizeAgentCost(raw: Record<string, unknown>): TrinityAgentCost {
  return {
    agent: String(raw.agent_name ?? raw.agent ?? ''),
    cost: toNumber(raw.agent_cost_usd ?? raw.cost),
    jobsProcessed: toNumber(raw.jobs_processed ?? raw.jobsProcessed),
    cpuUsage: toNumber(raw.cpu_usage ?? raw.cpuUsage),
    uptime: String(raw.uptime ?? ''),
  };
}

/**
 * Query Trinity API for agent cost tracking.
 * This function would typically be called via the MCP server interface.
 */
export async function fetchTrinityCosts(
  period: '1h' | '24h' | '7d' = '24h'
): Promise<TrinityAgentMetrics | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (TRINITY_JWT_TOKEN) {
      headers.Authorization = `Bearer ${TRINITY_JWT_TOKEN}`;
    }

    const response = await fetch(
      `${TRINITY_API_URL}/api/trinity/costs?period=${encodeURIComponent(period)}`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error('[trinity-revenue] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const agents: TrinityAgentCost[] = Array.isArray(data.agents)
      ? data.agents.map(normalizeAgentCost)
      : [];

    return {
      // The costs endpoint reports agents inline; fall back to the array length
      // when the backend does not send explicit counts.
      total_agents: toNumber(data.total_agents, agents.length),
      healthy_agents: toNumber(data.healthy_agents, agents.length),
      total_cost: toNumber(data.total_cost),
      period,
      timestamp: new Date().toISOString(),
      agents,
      fragmentation_risk: toNumber(data.fragmentation_risk),
      context_sharing: toNumber(data.context_sharing),
    };
  } catch (error) {
    console.error('[trinity-revenue] Fetch failed:', error);
    return null;
  }
}

/**
 * Create revenue records from Trinity cost metrics.
 * Each agent's usage contributes to a revenue line item.
 */
export async function createRevenueRecords(
  metrics: TrinityAgentMetrics
): Promise<RevenueSyncResult> {
  const errors: string[] = [];
  let recordsCreated = 0;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      ok: false,
      period: metrics.period,
      recordsCreated: 0,
      totalCost: metrics.total_cost,
      agentCount: metrics.total_agents,
      errors: ['Supabase credentials not configured'],
    };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Create a single revenue record for the sync period.
    // The window must match the period actually queried, otherwise a 1h or 7d
    // sync would be recorded against a 24h window.
    const periodEnd = new Date();
    const durationMs =
      PERIOD_DURATION_MS[metrics.period as '1h' | '24h' | '7d'] ?? PERIOD_DURATION_MS['24h'];
    const periodStart = new Date(periodEnd.getTime() - durationMs);

    const revenueRecord = {
      organization_id: 'trinity-dsg', // Would be dynamic in multi-tenant setup
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      source: 'trinity-agents',
      total_amount_usd: metrics.total_cost,
      agent_count: metrics.total_agents,
      healthy_agents: metrics.healthy_agents,
      fragmentation_risk: metrics.fragmentation_risk,
      context_sharing: metrics.context_sharing,
      // metrics_json is jsonb — pass the object so it stores as a JSON object
      // rather than a JSON-encoded string.
      metrics_json: {
        agents: metrics.agents,
        timestamp: metrics.timestamp,
      },
      status: 'pending_reconciliation',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('trinity_revenue_records')
      .insert([revenueRecord])
      .select();

    if (error) {
      errors.push(`Database error: ${error.message}`);
      return {
        ok: false,
        period: metrics.period,
        recordsCreated,
        totalCost: metrics.total_cost,
        agentCount: metrics.total_agents,
        errors,
      };
    }

    recordsCreated = data?.length ?? 0;

    // Create individual agent revenue line items
    if (metrics.agents && metrics.agents.length > 0) {
      const agentRecords = metrics.agents.map((agent) => ({
        trinity_revenue_record_id: data?.[0]?.id,
        agent_name: agent.agent,
        jobs_processed: agent.jobsProcessed,
        cpu_usage: agent.cpuUsage,
        agent_cost_usd: agent.cost,
        created_at: new Date().toISOString(),
      }));

      const { error: agentError } = await client
        .from('trinity_revenue_agents')
        .insert(agentRecords);

      if (agentError) {
        console.warn('[trinity-revenue] Agent record error:', agentError);
        errors.push(`Agent records incomplete: ${agentError.message}`);
      }
    }

    return {
      ok: recordsCreated > 0,
      period: metrics.period,
      recordsCreated,
      totalCost: metrics.total_cost,
      agentCount: metrics.total_agents,
      errors,
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      ok: false,
      period: metrics.period,
      recordsCreated,
      totalCost: metrics.total_cost,
      agentCount: metrics.total_agents,
      errors,
    };
  }
}

/**
 * Full revenue sync from Trinity API.
 * Queries Trinity, creates database records, and optionally submits meter events.
 */
export async function syncTrinityRevenue(
  period: '1h' | '24h' | '7d' = '24h'
): Promise<RevenueSyncResult> {
  console.log('[trinity-revenue] Starting sync for period:', period);

  // Fetch costs from Trinity
  const metrics = await fetchTrinityCosts(period);
  if (!metrics) {
    return {
      ok: false,
      period,
      recordsCreated: 0,
      totalCost: 0,
      agentCount: 0,
      errors: ['Failed to fetch Trinity metrics'],
    };
  }

  // Create revenue records
  const result = await createRevenueRecords(metrics);

  if (result.ok && result.totalCost > 0) {
    console.log('[trinity-revenue] Sync complete:', {
      recordsCreated: result.recordsCreated,
      totalCost: result.totalCost,
      agentCount: result.agentCount,
    });
  }

  return result;
}

/**
 * Health check for Trinity revenue sync integration.
 */
export async function checkTrinityRevenueHealth(): Promise<{
  healthy: boolean;
  trinity_api: boolean;
  database: boolean;
  message: string;
}> {
  const checks = {
    trinity_api: false,
    database: !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY,
  };

  try {
    // Trinity Backend exposes health at /health (unauthenticated).
    const response = await fetch(`${TRINITY_API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    checks.trinity_api = response.ok;
  } catch {
    checks.trinity_api = false;
  }

  const healthy = checks.trinity_api && checks.database;
  return {
    healthy,
    ...checks,
    message: healthy ? 'Trinity revenue sync ready' : 'Trinity revenue sync degraded',
  };
}
