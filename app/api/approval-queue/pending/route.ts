/**
 * GET /api/approval-queue/pending
 * List pending approval requests for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

interface PendingApprovalsQuery {
  orgId: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  agentId?: string;
  sort?: 'created_at' | 'expires_at' | 'priority';
  limit?: number;
  offset?: number;
}

type ApprovalRow = Database['public']['Tables']['runtime_approval_requests']['Row'];

function mapRowToApproval(row: ApprovalRow) {
  const payload = row.request_payload as Record<string, unknown> | null;
  return {
    id: row.id,
    agentId: row.agent_id,
    orgId: row.org_id,
    action: (payload?.action as string) || 'unknown action',
    input: (payload?.input as Record<string, unknown>) || {},
    status: row.status || 'pending',
    priority: (payload?.priority as string) || 'medium',
    requestedBy: (payload?.requestedBy as string) || 'system',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('orgId');
    const status = request.nextUrl.searchParams.get('status') || 'pending';
    const agentId = request.nextUrl.searchParams.get('agentId');
    const sort = request.nextUrl.searchParams.get('sort') || 'created_at';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId parameter required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('runtime_approval_requests')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[approval-pending] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch approvals', detail: error.message },
        { status: 500 },
      );
    }

    const approvals = (data || []).map(mapRowToApproval);

    // If sort is not created_at, we need to sort in memory (or add more query options)
    let sorted = approvals;
    if (sort === 'expires_at') {
      sorted = [...approvals].sort(
        (a, b) => new Date(a.expiresAt || 0).getTime() - new Date(b.expiresAt || 0).getTime(),
      );
    }

    return NextResponse.json({
      total: count ?? sorted.length,
      limit,
      offset,
      approvals: sorted,
    });
  } catch (caught) {
    console.error('[approval-pending] Unexpected error:', caught);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 },
    );
  }
}