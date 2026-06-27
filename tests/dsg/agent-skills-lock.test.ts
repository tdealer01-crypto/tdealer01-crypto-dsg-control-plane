import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildLockEntry,
  computeSkillHash,
  readSkillsLock,
  registerSkillToLock,
} from '../../lib/agent-skills/lock-skill';
import type { SkillDraft, SkillVerificationResult } from '../../lib/agent-skills/types';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'dsg-skillgate-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const draft: SkillDraft = {
  id: 'example-test-skill',
  name: 'test-skill',
  sourceType: 'github',
  sourceUrl: 'https://github.com/example/test-skill',
  sourceOwner: 'example',
  sourceRepo: 'test-skill',
  description: 'A test skill',
  status: 'draft',
  riskLevel: 'low',
  permissions: {
    network: true,
    filesystem: 'none',
    secrets: false,
    codeExecution: false,
    externalWrite: false,
  },
  draftedAt: '2026-05-23T00:00:00.000Z',
};

const verifiedResult: SkillVerificationResult = {
  status: 'verified',
  reasons: [],
  checks: {
    hasReadme: true,
    hasLicense: true,
    hasTests: true,
    noHardcodedSecrets: true,
    noExternalWrite: true,
    noCodeExecution: true,
    riskLevel: 'low',
  },
};

describe('computeSkillHash', () => {
  it('returns a 64-char hex string', () => {
    const hash = computeSkillHash(draft, 'abc123');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same inputs', () => {
    const h1 = computeSkillHash(draft, 'abc123');
    const h2 = computeSkillHash(draft, 'abc123');
    expect(h1).toBe(h2);
  });

  it('differs when sourceCommit changes', () => {
    expect(computeSkillHash(draft, 'abc123')).not.toBe(computeSkillHash(draft, 'def456'));
  });

  it('differs when riskLevel changes', () => {
    expect(computeSkillHash(draft, 'abc123')).not.toBe(
      computeSkillHash({ ...draft, riskLevel: 'high' }, 'abc123'),
    );
  });

  it('differs when permissions change', () => {
    const modified = { ...draft, permissions: { ...draft.permissions, codeExecution: true } };
    expect(computeSkillHash(draft, 'abc123')).not.toBe(computeSkillHash(modified, 'abc123'));
  });

  it('handles null sourceCommit', () => {
    expect(computeSkillHash(draft, null)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('buildLockEntry', () => {
  it('sets status from a verified result', () => {
    const entry = buildLockEntry(draft, verifiedResult, 'abc123');
    expect(entry.status).toBe('verified');
    expect(entry.riskLevel).toBe('low');
    expect(entry.source).toBe('example/test-skill');
    expect(entry.sourceCommit).toBe('abc123');
  });

  it('preserves blocked status', () => {
    const blocked: SkillVerificationResult = { ...verifiedResult, status: 'blocked' };
    expect(buildLockEntry(draft, blocked, null).status).toBe('blocked');
  });

  it('sets needs_approval status', () => {
    const approval: SkillVerificationResult = { ...verifiedResult, status: 'needs_approval' };
    expect(buildLockEntry(draft, approval, 'commit-sha').status).toBe('needs_approval');
  });

  it('includes a valid registeredAt timestamp', () => {
    expect(Date.parse(buildLockEntry(draft, verifiedResult, null).registeredAt)).not.toBeNaN();
  });

  it('computedHash matches standalone computeSkillHash', () => {
    const entry = buildLockEntry(draft, verifiedResult, 'sha-xyz');
    expect(entry.computedHash).toBe(computeSkillHash(draft, 'sha-xyz'));
  });
});

describe('readSkillsLock', () => {
  it('returns empty lock when file does not exist', async () => {
    const lockPath = path.join(tempDir, 'missing-lock.json');
    const lock = await readSkillsLock(lockPath);
    expect(lock.version).toBe(1);
    expect(lock.skills).toEqual({});
  });

  it('parses an existing lock file', async () => {
    const lockPath = path.join(tempDir, 'skills-lock.json');
    const content = { version: 1, updatedAt: '2026-05-23T00:00:00Z', skills: { 'my-skill': { status: 'verified' } } };
    await writeFile(lockPath, JSON.stringify(content));
    const lock = await readSkillsLock(lockPath);
    expect(lock.skills['my-skill']).toBeDefined();
  });
});

describe('registerSkillToLock', () => {
  it('writes the skill to the lock file and returns updated lock', async () => {
    const lockPath = path.join(tempDir, 'skills-lock.json');
    const updatedLock = await registerSkillToLock(draft, verifiedResult, 'commit-abc', lockPath);

    expect(updatedLock.skills['example-test-skill']).toBeDefined();
    expect(updatedLock.skills['example-test-skill'].status).toBe('verified');
  });

  it('blocked skill written to lock with blocked status (forceRegister pattern)', async () => {
    const lockPath = path.join(tempDir, 'skills-lock.json');
    const blocked: SkillVerificationResult = { ...verifiedResult, status: 'blocked' };
    const updatedLock = await registerSkillToLock(draft, blocked, null, lockPath);
    expect(updatedLock.skills['example-test-skill'].status).toBe('blocked');
  });

  it('persisted lock can be re-read with correct data', async () => {
    const lockPath = path.join(tempDir, 'skills-lock.json');
    await registerSkillToLock(draft, verifiedResult, 'sha-persist', lockPath);

    const reread = await readSkillsLock(lockPath);
    expect(reread.skills['example-test-skill'].sourceCommit).toBe('sha-persist');
  });
});
