import { NextResponse } from 'next/server';
import { decideGatewayApproval, listPendingGatewayApprovals } from '../../../../lib/gateway/approvals';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = header(request, 'x-org-id') || searchParams.get('orgId')?.trim() || '';

  const result = await listPendingGatewayApprovals(orgId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    type: 'dsg-gateway-approval-queue',
    orgId,
    count: result.approvals.length,
    approvals: result.approvals,
    boundary: {
      statement: 'Approval queue supports governed AI/tool execution review. It is not a certification claim.',
      certificationClaim: false,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const orgId = header(request, 'x-org-id') || String(body?.orgId ?? '').trim();
  const reviewerId = header(request, 'x-reviewer-id') || String(body?.reviewerId ?? '').trim();
  const reviewerRole = header(request, 'x-reviewer-role') || String(body?.reviewerRole ?? '').trim();
  const auditToken = String(body?.auditToken ?? '').trim();
  const decision = String(body?.decision ?? '').trim();
  const note = typeof body?.note === 'string' ? body.note : undefined;

  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ ok: false, error: 'invalid_decision' }, { status: 400 });
  }

  const result = await decideGatewayApproval({
    orgId,
    auditToken,
    decision,
    reviewerId,
    reviewerRole,
    note,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ...result,
    decision,
    boundary: {
      statement: 'Approval decision is DSG-generated workflow evidence. It is not an independent third-party certification.',
      certificationClaim: false,
      independentAuditClaim: false,
    },
  });
}
