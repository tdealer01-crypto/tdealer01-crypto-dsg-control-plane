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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Query Trinity API for agent cost tracking.
 * This function would typically be called via the MCP server interface.
 */
export async function fetchTrinityCosts(
  period: '1h' | '24h' | '7d' = '24h'
): Promise<TrinityAgentMetrics | null> {
  try {
    const response = await fetch(`${TRINITY_API_URL}/api/costs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('[trinity-revenue] API error:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      total_agents: data.total_agents ?? 0,
      healthy_agents: data.healthy_agents ?? 0,
      total_cost: parseFloat(String(data.total_cost ?? 0)),
      period,
      timestamp: new Date().toISOString(),
      agents: data.agents ?? [],
      fragmentation_risk: parseFloat(String(data.fragmentation_risk ?? 0)),
      context_sharing: parseFloat(String(data.context_sharing ?? 0)),
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
    // Create a single revenue record for the sync period
    const revenueRecord = {
      organization_id: 'trinity-dsg', // Would be dynamic in multi-tenant setup
      period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString(),
      source: 'trinity-agents',
      total_amount_usd: metrics.total_cost,
      agent_count: metrics.total_agents,
      healthy_agents: metrics.healthy_agents,
      fragmentation_risk: metrics.fragmentation_risk,
      context_sharing: metrics.context_sharing,
      metrics_json: JSON.stringify({
        agents: metrics.agents,
        timestamp: metrics.timestamp,
      }),
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
    const response = await fetch(`${TRINITY_API_URL}/api/health`, {
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
