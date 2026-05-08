import { NextRequest, NextResponse } from 'next/server';
import { decideGatewayApprovalHardened } from '../../../lib/gateway/approvals-hardened';

export const dynamic = 'force-dynamic';

interface HardenedApprovalRequest {
  auditToken: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

/**
 * POST /api/gateway/approvals-hardened
 * 
 * Process approval decision with hardened security:
 * - Identity from session (requireOrgPermission)
 * - Organization scope from session
 * - Append-only decision event logging
 * - No fallback to fake identities
 * - Validates against request.body spoofing
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HardenedApprovalRequest;

    // Validate input
    if (!body.auditToken) {
      return NextResponse.json(
        { ok: false, error: 'Missing auditToken' },
        { status: 400 }
      );
    }

    if (body.decision !== 'approved' && body.decision !== 'rejected') {
      return NextResponse.json(
        { ok: false, error: 'Invalid decision: must be approved or rejected' },
        { status: 400 }
      );
    }

    // NOTE: We explicitly do NOT read reviewerId/reviewerRole from body
    // requireOrgPermission will provide authenticated identity

    // Process decision
    const result = await decideGatewayApprovalHardened({
      auditToken: body.auditToken,
      decision: body.decision,
      note: body.note,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      approvalToken: result.approvalToken,
      approvalHash: result.approvalHash,
      eventRecorded: result.eventRecorded,
    });
  } catch (error) {
    console.error('POST /api/gateway/approvals-hardened failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
