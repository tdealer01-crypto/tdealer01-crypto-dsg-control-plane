import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { fetchGitHubRepoMeta } from '@/lib/agent-skills/github-search';
import { inspectGitHubSkill } from '@/lib/agent-skills/inspect-skill';
import { buildSkillDraft } from '@/lib/agent-skills/build-draft';
import { verifySkill } from '@/lib/agent-skills/verify-skill';
import { registerSkillToLock } from '@/lib/agent-skills/lock-skill';
import type { SkillDraft, SkillVerificationResult } from '@/lib/agent-skills/types';

export async function POST(req: Request) {
  try {
    await requireVerifiedDsgActor(req.headers, 'skill:execute');
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_REQUIRED' } }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    draft?: SkillDraft;
    verification?: SkillVerificationResult;
    sourceCommit?: string;
    owner?: string;
    repo?: string;
    forceRegister?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: { code: 'BODY_REQUIRED' } }, { status: 400 });
  }

  try {
    let draft: SkillDraft;
    let verification: SkillVerificationResult;

    if (body.draft && body.verification) {
      draft = body.draft;
      verification = body.verification;
    } else if (body.owner && body.repo) {
      const source = await fetchGitHubRepoMeta(body.owner.trim(), body.repo.trim());
      if (!source) {
        return NextResponse.json({ ok: false, error: { code: 'REPO_NOT_FOUND' } }, { status: 404 });
      }
      const inspection = await inspectGitHubSkill(source);
      draft = buildSkillDraft(inspection);
      verification = verifySkill(draft, inspection);
    } else {
      return NextResponse.json(
        { ok: false, error: { code: 'DRAFT_AND_VERIFICATION_OR_OWNER_REPO_REQUIRED' } },
        { status: 400 },
      );
    }

    // Block registration of blocked skills unless explicitly forced (for audit purposes)
    if (verification.status === 'blocked' && !body.forceRegister) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SKILL_BLOCKED',
            reasons: verification.reasons,
          },
        },
        { status: 422 },
      );
    }

    const updatedLock = await registerSkillToLock(draft, verification, body.sourceCommit ?? null);

    return NextResponse.json({
      ok: true,
      data: {
        skillId: draft.id,
        status: verification.status,
        riskLevel: draft.riskLevel,
        entry: updatedLock.skills[draft.id],
        lockUpdatedAt: updatedLock.updatedAt,
        skillsCount: Object.keys(updatedLock.skills).length,
        note: 'skills-lock.json updated. Commit this file to the repository to persist the registration.',
        skillsLock: updatedLock,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'REGISTER_FAILED';
    return NextResponse.json({ ok: false, error: { code } }, { status: 500 });
  }
}
