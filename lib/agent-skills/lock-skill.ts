import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SkillDraft, SkillLockEntry, SkillsLock, SkillVerificationResult } from './types';

const LOCK_PATH = join(process.cwd(), 'skills-lock.json');

export function readSkillsLock(): SkillsLock {
  if (!existsSync(LOCK_PATH)) {
    return { version: 1, updatedAt: new Date().toISOString(), skills: {} };
  }
  try {
    return JSON.parse(readFileSync(LOCK_PATH, 'utf-8')) as SkillsLock;
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), skills: {} };
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
  const computedHash = computeSkillHash(draft, sourceCommit);

  const statusMap = {
    verified: 'verified',
    needs_review: 'needs_review',
    needs_approval: 'needs_approval',
    blocked: 'blocked',
  } as const;

  return {
    source: `${draft.sourceOwner}/${draft.sourceRepo}`,
    sourceType: draft.sourceType,
    sourceUrl: draft.sourceUrl,
    sourceCommit,
    computedHash,
    status: statusMap[verification.status],
    riskLevel: draft.riskLevel,
    permissions: draft.permissions,
    registeredAt: new Date().toISOString(),
    description: draft.description,
  };
}

export function registerSkillToLock(
  draft: SkillDraft,
  verification: SkillVerificationResult,
  sourceCommit: string | null,
): SkillsLock {
  const lock = readSkillsLock();
  lock.skills[draft.id] = buildLockEntry(draft, verification, sourceCommit);
  lock.updatedAt = new Date().toISOString();

  // Write only in environments where filesystem is writable (dev/CI).
  // In production serverless, this is a no-op; consume the returned JSON instead.
  try {
    writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n');
  } catch {
    // read-only filesystem (Vercel production) — caller receives lock JSON directly
  }

  return lock;
}

export function getSkillFromLock(skillId: string): SkillLockEntry | null {
  const lock = readSkillsLock();
  return lock.skills[skillId] ?? null;
}
