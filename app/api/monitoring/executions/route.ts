/**
 * GET /api/monitoring/executions
 * List agent executions with optional filtering
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - agent_id: string (optional, filter by agent)
 * - status: string (optional, filter by status)
 * - user_id: string (optional, filter by user)
 *
 * Returns paginated list of executions with cost and token info
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');

    // Build query
    let query = supabase
      .from('monitoring_executions')
      .select('*', { count: 'exact' });

    // Apply filters first
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Then apply ordering and pagination
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch executions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch executions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/monitoring/executions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
