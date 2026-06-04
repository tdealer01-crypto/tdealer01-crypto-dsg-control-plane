/**
 * PATCH /api/approval-queue/[id]
 * Approve or reject an approval request
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ApprovalDecisionBody {
  decision: 'approved' | 'rejected';
  reason?: string;
  approvedBy?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ApprovalDecisionBody;

    if (!body.decision || !['approved', 'rejected'].includes(body.decision)) {
      return NextResponse.json(
        { error: 'decision must be "approved" or "rejected"' },
        { status: 400 },
      );
    }

    const approvedAt = new Date().toISOString();

    // Log decision (in production: update Supabase)
    console.log('[Approval Decision]', {
      requestId: id,
      decision: body.decision,
      approvedBy: body.approvedBy || 'unknown',
      reason: body.reason,
      approvedAt,
    });

    // Send notifications (in production)
    console.log(`[Notify] Send ${body.decision} notification to requester`);

    return NextResponse.json({
      id,
      status: body.decision === 'approved' ? 'approved' : 'rejected',
      decision: body.decision,
      reason: body.reason,
      approvedBy: body.approvedBy,
      approvedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Decision failed' },
      { status: 500 },
    );
  }
}
