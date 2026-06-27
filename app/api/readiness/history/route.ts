// ERROR_HANDLER_EXEMPT - legacy error handling, migrate to handleApiError
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

type ReadinessHistoryRow = Database['public']['Tables']['readiness_history']['Row'];

function mapRowToHistory(row: ReadinessHistoryRow) {
  return {
    id: String(row.id),
    checkType: 'readiness',
    status: row.status,
    message: `Readiness score: ${row.score} (${row.status})`,
    timestamp: row.recorded_at,
    details: row.details,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId parameter required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error, count } = await supabase
      .from('readiness_history')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .gte('recorded_at', cutoffDate)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[readiness-history] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch readiness history', detail: error.message },
        { status: 500 },
      );
    }

    const history = (data || []).map(mapRowToHistory);
    const filtered = history;
    const total = count ?? filtered.length;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: filtered,
      pagination: {
        offset,
        limit,
        total,
        pages,
      },
      filters: {
        days,
        orgId,
      },
      query: `${filtered.length} results in last ${days} days for org ${orgId}`,
    });
  } catch (error) {
    console.error('[readiness-history] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch readiness history' },
      { status: 500 }
    );
  }
}