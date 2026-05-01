import { NextResponse } from 'next/server';
import { decideGatewayApproval, listPendingGatewayApprovals } from '../../../../lib/gateway/approvals';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

async function readBody(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return {
      orgId: String(form.get('orgId') ?? ''),
      reviewerId: String(form.get('reviewerId') ?? ''),
      reviewerRole: String(form.get('reviewerRole') ?? ''),
      auditToken: String(form.get('auditToken') ?? ''),
      decision: String(form.get('decision') ?? ''),
      note: String(form.get('note') ?? ''),
      redirectTo: String(form.get('redirectTo') ?? ''),
      fromForm: true,
    };
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  return {
    orgId: String(body?.orgId ?? ''),
    reviewerId: String(body?.reviewerId ?? ''),
    reviewerRole: String(body?.reviewerRole ?? ''),
    auditToken: String(body?.auditToken ?? ''),
    decision: String(body?.decision ?? ''),
    note: typeof body?.note === 'string' ? body.note : undefined,
    redirectTo: typeof body?.redirectTo === 'string' ? body.redirectTo : '',
    fromForm: false,
  };
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
  const body = await readBody(request);
  const orgId = header(request, 'x-org-id') || body.orgId.trim();
  const reviewerId = header(request, 'x-reviewer-id') || body.reviewerId.trim() || 'reviewer-ui';
  const reviewerRole = header(request, 'x-reviewer-role') || body.reviewerRole.trim() || 'finance_approver';
  const auditToken = body.auditToken.trim();
  const decision = body.decision.trim();
  const note = body.note;

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

  if (body.fromForm) {
    const url = new URL(body.redirectTo || `/approvals?orgId=${encodeURIComponent(orgId)}`, request.url);
    url.searchParams.set('lastDecision', decision);
    url.searchParams.set('approvalHash', result.approvalHash || '');
    return NextResponse.redirect(url, { status: 303 });
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
