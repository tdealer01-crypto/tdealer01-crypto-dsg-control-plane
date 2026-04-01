import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { buildGoLiveReadinessReport } from '../../../../../lib/readiness/go-live';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['org_admin', 'runtime_auditor']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const format = new URL(req.url).searchParams.get('format') || 'json';
  const report = await buildGoLiveReadinessReport(access.orgId);
  if (format === 'md') {
    const md = `# Go-live readiness\n\nStatus: **${report.status}**\n\n## Blockers\n${report.blockers.map((b: string) => `- ${b}`).join('\n') || '- None'}\n\n## Warnings\n${report.warnings.map((w: string) => `- ${w}`).join('\n') || '- None'}\n`;
    return new NextResponse(md, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
  }
  return NextResponse.json(report);
}
