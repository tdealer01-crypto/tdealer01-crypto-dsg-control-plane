import { NextResponse } from 'next/server';
import {
  REVENUE_AUTOPILOT_WORKFLOW,
  resolveGitHubRepository,
  summarizeWorkflowRun,
  type GitHubWorkflowResponse,
} from '../../../../lib/github/revenue-autopilot-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const repository = resolveGitHubRepository(process.env.GITHUB_REPOSITORY);
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'DSG-ONE-Command-Center',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = 'Bearer ' + token;

  try {
    const response = await fetch(
      'https://api.github.com/repos/' +
        repository +
        '/actions/workflows/' +
        REVENUE_AUTOPILOT_WORKFLOW +
        '/runs?per_page=1',
      {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'GitHub workflow status is unavailable',
          repository,
          workflow: REVENUE_AUTOPILOT_WORKFLOW,
          upstreamStatus: response.status,
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const payload = (await response.json()) as GitHubWorkflowResponse;
    return NextResponse.json(
      {
        ok: true,
        repository,
        workflow: REVENUE_AUTOPILOT_WORKFLOW,
        run: summarizeWorkflowRun(payload),
        checkedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'GitHub workflow status is unavailable',
        repository,
        workflow: REVENUE_AUTOPILOT_WORKFLOW,
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
