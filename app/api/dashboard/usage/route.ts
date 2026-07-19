/**
 * Usage Metrics Dashboard API
 *
 * GET /api/dashboard/usage
 * Query organization usage metrics and cost projection
 *
 * Query params:
 * - range: time range (7d, 30d, 90d, custom)
 * - startDate: ISO date (required if range=custom)
 * - endDate: ISO date (required if range=custom)
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext } from '@/lib/audit/correlation-context';

export const dynamic = 'force-dynamic';

interface UsageMetrics {
  period_start: string;
  api_calls: number;
  webhook_deliveries: number;
  gate_evaluations: number;
  storage_gb: number;
  active_seats: number;
  cost_usd: number;
}

export async function GET(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission - allow view access to usage
    const permResult = await checkPermission(userId, orgId, 'read:usage');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '30d';
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    // Calculate date range
    let startDate: Date;
    let endDate = new Date();

    if (range === 'custom') {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json(
          { ok: false, error: 'startDate and endDate required for custom range' },
          { status: 400 },
        );
      }
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const days = parseInt(range.match(/\d+/)?.[0] || '30');
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const supabase = getSupabaseAdmin() as any;

    // Query usage metrics for the date range
    const metricsResult = await supabase
      .from('org_usage_metrics')
      .select('*')
      .eq('org_id', orgId)
      .gte('period_start', startDate.toISOString().split('T')[0])
      .lte('period_start', endDate.toISOString().split('T')[0])
      .order('period_start', { ascending: false });

    if (metricsResult.error) {
      console.error('[usage-metrics] Error:', metricsResult.error);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch usage metrics' },
        { status: 500 },
      );
    }

    const metrics = metricsResult.data || [];

    // Calculate totals and averages
    let totalApiCalls = 0;
    let totalWebhookDeliveries = 0;
    let totalGateEvaluations = 0;
    let totalCost = 0;
    let maxSeats = 0;
    let maxStorage = 0;

    for (const m of metrics) {
      totalApiCalls += m.api_calls || 0;
      totalWebhookDeliveries += m.webhook_deliveries || 0;
      totalGateEvaluations += m.gate_evaluations || 0;
      totalCost += m.cost_usd || 0;
      maxSeats = Math.max(maxSeats, m.active_seats || 0);
      maxStorage = Math.max(maxStorage, m.storage_gb || 0);
    }

    const daysInRange = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const avgDailyApiCalls = Math.round(totalApiCalls / (daysInRange || 1));
    const avgDailyGateEvaluations = Math.round(totalGateEvaluations / (daysInRange || 1));

    // Project monthly cost if enough data
    const projectedMonthlyCost =
      range === '30d' ? totalCost : (totalCost / daysInRange) * 30;

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'usage_metrics_viewed',
      resource_type: 'usage',
      actor_id: userId,
      actor_email: userId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'INFO',
    });

    return NextResponse.json({
      ok: true,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: daysInRange,
      },
      summary: {
        totalApiCalls,
        totalWebhookDeliveries,
        totalGateEvaluations,
        maxActiveSeats: maxSeats,
        maxStorageGb: maxStorage,
        totalCostUsd: Math.round(totalCost * 100) / 100,
        projectedMonthlyCostUsd: Math.round(projectedMonthlyCost * 100) / 100,
      },
      daily_average: {
        apiCalls: avgDailyApiCalls,
        gateEvaluations: avgDailyGateEvaluations,
      },
      daily_breakdown: metrics.map((m: UsageMetrics) => ({
        date: m.period_start,
        apiCalls: m.api_calls,
        webhookDeliveries: m.webhook_deliveries,
        gateEvaluations: m.gate_evaluations,
        storageGb: m.storage_gb,
        activeSeats: m.active_seats,
        costUsd: m.cost_usd,
      })),
    });
  } catch (error) {
    console.error('[usage-metrics] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
