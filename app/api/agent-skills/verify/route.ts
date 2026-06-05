import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { fetchGitHubRepoMeta } from '@/lib/agent-skills/github-search';
import { inspectGitHubSkill } from '@/lib/agent-skills/inspect-skill';
import { buildSkillDraft } from '@/lib/agent-skills/build-draft';
import { verifySkill } from '@/lib/agent-skills/verify-skill';
import type { SkillDraft } from '@/lib/agent-skills/types';

export async function POST(req: Request) {
  try {
    await requireVerifiedDsgActor(req.headers, 'skill:read');
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_REQUIRED' } }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    draft?: SkillDraft;
    owner?: string;
    repo?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: { code: 'BODY_REQUIRED' } }, { status: 400 });
  }

  try {
    let draft: SkillDraft;

    if (body.draft) {
      // Accept a pre-built draft from the /build endpoint
      draft = body.draft;
      const source = await fetchGitHubRepoMeta(draft.sourceOwner, draft.sourceRepo);
      if (!source) {
        return NextResponse.json({ ok: false, error: { code: 'REPO_NOT_FOUND' } }, { status: 404 });
      }
      const inspection = await inspectGitHubSkill(source);
      const result = verifySkill(draft, inspection);

      return NextResponse.json({
        ok: true,
        data: {
          skillId: draft.id,
          verification: result,
          draft,
          nextStep:
            result.status === 'verified' || result.status === 'needs_review'
              ? 'POST /api/agent-skills/register to lock this skill.'
              : result.status === 'needs_approval'
              ? 'Requires explicit human approval before registration.'
              : 'Skill is blocked and cannot be registered.',
        },
      });
    }

    if (body.owner && body.repo) {
      const source = await fetchGitHubRepoMeta(body.owner.trim(), body.repo.trim());
      if (!source) {
        return NextResponse.json({ ok: false, error: { code: 'REPO_NOT_FOUND' } }, { status: 404 });
      }
      const inspection = await inspectGitHubSkill(source);
      draft = buildSkillDraft(inspection);
      const result = verifySkill(draft, inspection);

      return NextResponse.json({
        ok: true,
        data: {
          skillId: draft.id,
          verification: result,
          draft,
          nextStep:
            result.status === 'verified' || result.status === 'needs_review'
              ? 'POST /api/agent-skills/register to lock this skill.'
              : result.status === 'needs_approval'
              ? 'Requires explicit human approval before registration.'
              : 'Skill is blocked and cannot be registered.',
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'DRAFT_OR_OWNER_REPO_REQUIRED' } },
      { status: 400 },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'VERIFY_FAILED';
    return NextResponse.json({ ok: false, error: { code } }, { status: 502 });
  }
}
