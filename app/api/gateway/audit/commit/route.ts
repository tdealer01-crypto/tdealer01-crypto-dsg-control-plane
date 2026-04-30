import { NextResponse } from 'next/server';
import { commitMonitorAudit } from '../../../../../lib/gateway/monitor';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orgId = typeof body.orgId === 'string' && body.orgId.trim()
      ? body.orgId.trim()
      : header(request, 'x-org-id');
    const auditToken = typeof body.auditToken === 'string' ? body.auditToken.trim() : '';
    const result = body.result && typeof body.result === 'object' && !Array.isArray(body.result)
      ? body.result as Record<string, unknown>
      : {};

    const commit = await commitMonitorAudit(orgId, auditToken, result);
    return NextResponse.json(commit, { status: commit.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'gateway_audit_commit_error',
      },
      { status: 500 }
    );
  }
}
