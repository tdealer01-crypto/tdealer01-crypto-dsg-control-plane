import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const checkType = searchParams.get('checkType');
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In production: query readiness_checks table with these filters
    // const query = supabase
    //   .from('readiness_checks')
    //   .select('*')
    //   .eq('org_id', orgId)
    //   .gte('created_at', daysAgo)
    //   .order('created_at', { ascending: false })
    //   .range(offset, offset + limit - 1);

    // Mock data for MVP
    const mockHistory = [
      {
        id: '1',
        checkType: 'ci_status',
        status: 'pass',
        message: 'All CI checks passed',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: { duration: 245, workflow: 'test.yml' },
      },
      {
        id: '2',
        checkType: 'coverage',
        status: 'pass',
        message: 'Coverage 84% exceeds minimum 80%',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        details: { coverage: 84, minimum: 80 },
      },
      {
        id: '3',
        checkType: 'secrets',
        status: 'pass',
        message: 'No secrets detected',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        details: { filesScanned: 12, patternsFound: 0 },
      },
      {
        id: '4',
        checkType: 'reviews',
        status: 'review_required',
        message: 'Needs 1 more approval',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        details: { current: 1, required: 2 },
      },
      {
        id: '5',
        checkType: 'migrations',
        status: 'pass',
        message: 'No pending migrations',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        details: { pending: 0 },
      },
    ];

    // Apply filters
    let filtered = mockHistory;
    if (checkType) {
      filtered = filtered.filter(h => h.checkType === checkType);
    }

    const cutoffDate = new Date(Date.now() - days * 86400000);
    filtered = filtered.filter(h => new Date(h.timestamp) >= cutoffDate);

    // Apply pagination
    const paginatedHistory = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        offset,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
      filters: {
        days,
        checkType: checkType || 'all',
      },
      query: `${filtered.length} results in last ${days} days`,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch readiness history' },
      { status: 500 }
    );
  }
}
