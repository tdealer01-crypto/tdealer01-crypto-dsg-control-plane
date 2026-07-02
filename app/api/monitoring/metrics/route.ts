/**
 * GET /api/monitoring/metrics
 * Get aggregated monitoring metrics
 *
 * Query Parameters:
 * - agent_id: string (optional, filter by agent)
 * - period: 'day' | 'week' | 'month' (default: 'month')
 *
 * Returns:
 * - totalExecutions: number
 * - successRate: percentage
 * - totalTokens: number
 * - totalCost: USD
 * - avgDuration: seconds
 * - byAgent: array of per-agent metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getPeriodDays(period: string): number {
  switch (period) {
    case 'day':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    default:
      return 30;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id');
    const period = searchParams.get('period') || 'month';
    const periodDays = getPeriodDays(period);

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Get executions within period
    let query = supabase
      .from('monitoring_executions')
      .select('status, total_tokens, total_cost_usd, start_time, end_time')
      .gte('created_at', startDate.toISOString());

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('Failed to fetch metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    // Calculate metrics
    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter((e) => e.status === 'success').length || 0;
    const totalTokens = executions?.reduce((sum, e) => sum + (e.total_tokens || 0), 0) || 0;
    const totalCost = executions?.reduce((sum, e) => sum + (e.total_cost_usd || 0), 0) || 0;

    let avgDuration = 0;
    if (totalExecutions > 0) {
      const durations = executions
        ?.filter((e) => e.start_time && e.end_time)
        .map(
          (e) =>
            (new Date(e.end_time!).getTime() - new Date(e.start_time!).getTime()) / 1000
        ) || [];

      avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    }

    const successRate =
      totalExecutions > 0
        ? ((successfulExecutions / totalExecutions) * 100).toFixed(2)
        : '0.00';

    // Get metrics by agent
    let agentQuery = supabase
      .from('monitoring_monthly_metrics')
      .select('agent_id, total_executions, successful_executions, total_tokens_used, total_cost_usd, success_rate_percent');

    if (agentId) {
      agentQuery = agentQuery.eq('agent_id', agentId);
    }

    const { data: agentMetrics } = await agentQuery;

    return NextResponse.json({
      period,
      totalExecutions,
      successRate: parseFloat(successRate),
      totalTokens,
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
      avgDuration: Math.round(avgDuration * 100) / 100,
      byAgent: agentMetrics || [],
    });
  } catch (error) {
    console.error('Error in GET /api/monitoring/metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
