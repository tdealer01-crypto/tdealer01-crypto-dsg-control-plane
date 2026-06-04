/**
 * GET /api/approval-queue/pending
 * List pending approval requests for an organization
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PendingApprovalsQuery {
  orgId: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  agentId?: string;
  sort?: 'created_at' | 'expires_at' | 'priority';
  limit?: number;
  offset?: number;
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

    // Mock data (in production: query Supabase)
    const mockApprovals = [
      {
        id: 'areq_001',
        agentId: 'agent_claude_001',
        orgId,
        action: 'deploy to production',
        input: { environment: 'production', services: ['api', 'web'] },
        status: 'pending',
        priority: 'high',
        requestedBy: 'system',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        expiresAt: new Date(Date.now() + 23.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'areq_002',
        agentId: 'agent_openai_001',
        orgId,
        action: 'modify database migration',
        input: { migrationFile: 'migrations/20260604_add_users_table.sql' },
        status: 'pending',
        priority: 'medium',
        requestedBy: 'system',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Filter by status
    const filtered = status === 'pending'
      ? mockApprovals.filter((a) => a.status === 'pending')
      : mockApprovals;

    // Filter by agentId if provided
    const result = agentId
      ? filtered.filter((a) => a.agentId === agentId)
      : filtered;

    // Sort
    const sorted = result.sort((a, b) => {
      if (sort === 'expires_at') {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Paginate
    const paginated = sorted.slice(offset, offset + limit);

    return NextResponse.json({
      total: sorted.length,
      limit,
      offset,
      approvals: paginated,
    });
  } catch (caught) {
    console.error('[approval-pending] Unexpected error:', caught);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 },
    );
  }
}
