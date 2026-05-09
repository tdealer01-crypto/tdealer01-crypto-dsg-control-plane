import { NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { decideGatewayApproval, listPendingGatewayApprovals } from '@/lib/gateway/approvals';

export const dynamic = 'force-dynamic';

async function readBody(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return {
      auditToken: String(form.get('auditToken') ?? ''),
      decision: String(form.get('decision') ?? ''),
      note: String(form.get('note') ?? ''),
      redirectTo: String(form.get('redirectTo') ?? ''),
      fromForm: true,
    };
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return {
    auditToken: String(body?.auditToken ?? ''),
    decision: String(body?.decision ?? ''),
    note: typeof body?.note === 'string' ? body.note : undefined,
    redirectTo: typeof body?.redirectTo === 'string' ? body.redirectTo : '',
    fromForm: false,
  };
}

export async function GET() {
  const auth = await requireOrgPermission('org.view_evidence');

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const result = await listPendingGatewayApprovals(auth.orgId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    type: 'dsg-gateway-approval-queue',
    orgId: auth.orgId,
    count: result.approvals.length,
    approvals: result.approvals,
    actor: {
      userId: auth.userId,
      role: auth.role,
    },
    boundary: {
      statement: 'Approval queue supports governed AI/tool execution review. It is not a certification claim.',
      certificationClaim: false,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireOrgPermission('org.manage_agents');

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await readBody(request);
  const auditToken = body.auditToken.trim();
  const decision = body.decision.trim();
  const note = body.note;

  if (!auditToken) {
    return NextResponse.json({ ok: false, error: 'missing_audit_token' }, { status: 400 });
  }

  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ ok: false, error: 'invalid_decision' }, { status: 400 });
  }

  const result = await decideGatewayApproval({
    orgId: auth.orgId,
    auditToken,
    decision,
    reviewerId: auth.userId,
    reviewerRole: auth.role,
    note,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  if (body.fromForm) {
    const url = new URL(body.redirectTo || `/approvals?orgId=${encodeURIComponent(auth.orgId)}`, request.url);
    url.searchParams.set('lastDecision', decision);
    url.searchParams.set('approvalHash', result.approvalHash || '');
    return NextResponse.redirect(url, { status: 303 });
  }

  return NextResponse.json({
    ...result,
    decision,
    actor: {
      userId: auth.userId,
      role: auth.role,
    },
    boundary: {
      statement: 'Approval decision is DSG-generated workflow evidence. It is not an independent third-party certification.',
      certificationClaim: false,
      independentAuditClaim: false,
    },
  });
}
