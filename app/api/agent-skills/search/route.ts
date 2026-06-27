// ERROR_HANDLER_EXEMPT - legacy error handling, migrate to handleApiError
import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { searchGitHubSkills } from '@/lib/agent-skills/github-search';

export async function GET(req: Request) {
  try {
    await requireVerifiedDsgActor(req.headers, 'skill:read');
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_REQUIRED' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const maxResults = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 30);

  if (!query) {
    return NextResponse.json({ ok: false, error: { code: 'QUERY_REQUIRED' } }, { status: 400 });
  }

  try {
    const results = await searchGitHubSkills(query, maxResults);
    return NextResponse.json({
      ok: true,
      data: {
        query,
        count: results.length,
        results: results.map((r) => ({
          ...r,
          status: 'discovered',
        })),
        note: 'Read-only GitHub metadata. No code cloned or executed.',
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'GITHUB_SEARCH_FAILED';
    return NextResponse.json({ ok: false, error: { code } }, { status: 502 });
  }
}
