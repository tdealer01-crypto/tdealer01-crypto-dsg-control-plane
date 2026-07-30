import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { requireRuntimeAccess } from '../../../../lib/authz-runtime';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { logServerError, serverErrorResponse } from '../../../../lib/security/error-response';

export const dynamic = 'force-dynamic';

const USAGE_RATE_LIMIT = 120;
const USAGE_RATE_WINDOW_MS = 60 * 1000; // 1 minute

interface UsageRecord {
  date: string;
  total_calls: number;
  avg_latency_ms: number;
  error_count: number;
  decision_counts: {
    ALLOW: number;
    BLOCK: number;
    REVIEW: number;
    UNSUPPORTED: number;
  };
}

/**
 * GET /api/monitor/usage
 *
 * Returns historical usage analytics from the executions table.
 * Supports date range filtering and pagination.
 *
 * Query params:
 * - start_date: ISO 8601 date string (default: 30 days ago)
 * - end_date: ISO 8601 date string (default: now)
 * - limit: number of records (default: 50, max: 100)
 * - offset: pagination offset (default: 0)
 */
export async function GET(request: Request) {
  try {
    // Apply rate limiting
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'monitor-usage'),
      limit: USAGE_RATE_LIMIT,
      windowMs: USAGE_RATE_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, USAGE_RATE_LIMIT) }
      );
    }

    // Check authorization
    const access = await requireRuntimeAccess(request, 'usage_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 100);
    const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);

    // Parse date range
    const endDate = url.searchParams.get('end_date') || new Date().toISOString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = url.searchParams.get('start_date') || thirtyDaysAgo.toISOString();

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date range: start_date must be before end_date' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch executions data grouped by day
    const { data: executions, error: executionsError, count } = await supabase
      .from('executions')
      .select(
        `
        id,
        created_at,
        latency_ms,
        decision,
        reason
      `,
        { count: 'exact' }
      )
      .eq('org_id', access.orgId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (executionsError) {
      logServerError(executionsError, 'monitor-usage-get');
      return serverErrorResponse();
    }

    // Aggregate data by date
    const aggregatedByDate = new Map<string, UsageRecord>();

    (executions || []).forEach((exec) => {
      const dateStr = new Date(exec.created_at).toISOString().split('T')[0];

      if (!aggregatedByDate.has(dateStr)) {
        aggregatedByDate.set(dateStr, {
          date: dateStr,
          total_calls: 0,
          avg_latency_ms: 0,
          error_count: 0,
          decision_counts: {
            ALLOW: 0,
            BLOCK: 0,
            REVIEW: 0,
            UNSUPPORTED: 0,
          },
        });
      }

      const record = aggregatedByDate.get(dateStr)!;
      record.total_calls += 1;

      // Track decision types
      if (exec.decision && exec.decision in record.decision_counts) {
        record.decision_counts[exec.decision as keyof typeof record.decision_counts] += 1;
      }

      // Count errors (decisions that are not ALLOW)
      if (exec.decision !== 'ALLOW') {
        record.error_count += 1;
      }

      // Accumulate latency for average calculation
      record.avg_latency_ms += exec.latency_ms || 0;
    });

    // Calculate averages and convert to array
    const usageData: UsageRecord[] = Array.from(aggregatedByDate.values())
      .map((record) => ({
        ...record,
        avg_latency_ms: record.total_calls > 0 ? Math.round(record.avg_latency_ms / record.total_calls) : 0,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary statistics
    const summary = {
      total_calls: usageData.reduce((sum, r) => sum + r.total_calls, 0),
      avg_latency_ms: usageData.length > 0
        ? Math.round(usageData.reduce((sum, r) => sum + r.avg_latency_ms, 0) / usageData.length)
        : 0,
      error_rate: usageData.length > 0
        ? (usageData.reduce((sum, r) => sum + r.error_count, 0) / usageData.reduce((sum, r) => sum + r.total_calls, 0)) * 100
        : 0,
      decision_breakdown: {
        ALLOW: usageData.reduce((sum, r) => sum + r.decision_counts.ALLOW, 0),
        BLOCK: usageData.reduce((sum, r) => sum + r.decision_counts.BLOCK, 0),
        REVIEW: usageData.reduce((sum, r) => sum + r.decision_counts.REVIEW, 0),
        UNSUPPORTED: usageData.reduce((sum, r) => sum + r.decision_counts.UNSUPPORTED, 0),
      },
    };

    return NextResponse.json({
      ok: true,
      data: usageData,
      summary,
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
      date_range: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  } catch (error) {
    logServerError(error, 'monitor-usage-get');
    return serverErrorResponse();
  }
}
