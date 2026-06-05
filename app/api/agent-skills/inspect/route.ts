// ERROR_HANDLER_EXEMPT - legacy error handling, migrate to handleApiError
import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { fetchGitHubRepoMeta } from '@/lib/agent-skills/github-search';
import { inspectGitHubSkill } from '@/lib/agent-skills/inspect-skill';

export async function POST(req: Request) {
  try {
    await requireVerifiedDsgActor(req.headers, 'skill:read');
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_REQUIRED' } }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { owner?: string; repo?: string } | null;
  if (!body?.owner?.trim() || !body?.repo?.trim()) {
    return NextResponse.json(
      { ok: false, error: { code: 'OWNER_AND_REPO_REQUIRED' } },
      { status: 400 },
    );
  }

  const owner = body.owner.trim();
  const repo = body.repo.trim();

  try {
    const source = await fetchGitHubRepoMeta(owner, repo);
    if (!source) {
      return NextResponse.json(
        { ok: false, error: { code: 'REPO_NOT_FOUND' } },
        { status: 404 },
      );
    }

    const inspection = await inspectGitHubSkill(source);

    return NextResponse.json({
      ok: true,
      data: {
        source: inspection.source,
        hasReadme: inspection.hasReadme,
        hasLicense: inspection.hasLicense,
        hasTests: inspection.hasTests,
        hasSchemaOrTypes: inspection.hasSchemaOrTypes,
        hasSecretHardcoded: inspection.hasSecretHardcoded,
        hasExternalWrite: inspection.hasExternalWrite,
        hasCodeExecution: inspection.hasCodeExecution,
        securityPolicy: inspection.securityPolicy,
        dependencyCount: inspection.dependencies.length,
        note: 'Metadata-only inspection. No code cloned or installed.',
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INSPECT_FAILED';
    return NextResponse.json({ ok: false, error: { code } }, { status: 502 });
  }
}
