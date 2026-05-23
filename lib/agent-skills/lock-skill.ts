import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { SkillDraft, SkillLockEntry, SkillsLock, SkillVerificationResult } from './types';

const DEFAULT_LOCK_PATH = join(process.cwd(), 'skills-lock.json');

export async function readSkillsLock(lockPath = DEFAULT_LOCK_PATH): Promise<SkillsLock> {
  try {
    const raw = await readFile(lockPath, 'utf-8');
    return JSON.parse(raw) as SkillsLock;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return { version: 1, updatedAt: new Date().toISOString(), skills: {} };
    }
    throw error;
  }
}

export function computeSkillHash(draft: SkillDraft, sourceCommit: string | null): string {
  const manifest = JSON.stringify({
    sourceUrl: draft.sourceUrl,
    sourceCommit: sourceCommit ?? 'HEAD',
    riskLevel: draft.riskLevel,
    permissions: draft.permissions,
  });
  return createHash('sha256').update(manifest).digest('hex');
}

export function buildLockEntry(
  draft: SkillDraft,
  verification: SkillVerificationResult,
  sourceCommit: string | null,
): SkillLockEntry {
  return {
    source: `${draft.sourceOwner}/${draft.sourceRepo}`,
    sourceType: draft.sourceType,
    sourceUrl: draft.sourceUrl,
    sourceCommit,
    computedHash: computeSkillHash(draft, sourceCommit),
    status: verification.status,
    riskLevel: draft.riskLevel,
    permissions: draft.permissions,
    registeredAt: new Date().toISOString(),
    description: draft.description,
  };
}

export async function registerSkillToLock(
  draft: SkillDraft,
  verification: SkillVerificationResult,
  sourceCommit: string | null,
  lockPath = DEFAULT_LOCK_PATH,
): Promise<SkillsLock> {
  const lock = await readSkillsLock(lockPath);
  lock.skills[draft.id] = buildLockEntry(draft, verification, sourceCommit);
  lock.updatedAt = new Date().toISOString();

  try {
    await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  } catch {
    // read-only filesystem (Vercel production) — caller receives lock JSON directly
  }

  return lock;
}

export async function getSkillFromLock(skillId: string, lockPath = DEFAULT_LOCK_PATH): Promise<SkillLockEntry | null> {
  const lock = await readSkillsLock(lockPath);
  return lock.skills[skillId] ?? null;
}
