import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../../lib/auth/require-org-permission';
import { logServerError, serverErrorResponse } from '../../../../../lib/security/error-response';
import { buildGoLiveReadinessReport } from '../../../../../lib/readiness/go-live';

export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'cache-control': 'private, no-store, max-age=0',
};

export async function GET(req: NextRequest) {
  const access = await requireOrgPermission('org.view_reports');
  if (access.ok === false) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_HEADERS });
  }

  const format = new URL(req.url).searchParams.get('format') || 'json';

  try {
    const report = await buildGoLiveReadinessReport(access.orgId);

    if (format === 'md') {
      const md = [
        '# Go-live readiness',
        '',
        `Status: **${report.status}**`,
        '',
        '## Blockers',
        report.blockers.map((b) => `- ${b}`).join('\n') || '- None',
        '',
        '## Warnings',
        report.warnings.map((w) => `- ${w}`).join('\n') || '- None',
        '',
      ].join('\n');
      return new NextResponse(md, {
        headers: { ...PRIVATE_HEADERS, 'content-type': 'text/markdown; charset=utf-8' },
      });
    }

    return NextResponse.json(report, { headers: PRIVATE_HEADERS });
  } catch (error) {
    logServerError(error, 'settings-go-live-export');
    return serverErrorResponse({ headers: PRIVATE_HEADERS });
  }
}
