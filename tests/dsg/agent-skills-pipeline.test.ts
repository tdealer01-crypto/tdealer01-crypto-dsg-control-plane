/**
 * End-to-end pipeline test (fully offline — no GitHub API calls).
 *
 * Simulates the complete SkillGate flow:
 *   inspect → build draft → verify → lock entry → gate decision
 *
 * This is the "evidence flow" used in the SkillGate Evidence Pack.
 */
import { describe, expect, it } from 'vitest';
import { buildSkillDraft } from '../../lib/agent-skills/build-draft';
import { verifySkill } from '../../lib/agent-skills/verify-skill';
import { buildLockEntry, computeSkillHash } from '../../lib/agent-skills/lock-skill';
import type { SkillInspection } from '../../lib/agent-skills/types';

const EXAMPLE_SOURCE = {
  owner: 'anthropics',
  repo: 'claude-code',
  fullName: 'anthropics/claude-code',
  url: 'https://github.com/anthropics/claude-code',
  description: 'Claude Code — AI coding assistant',
  stars: 8000,
  license: 'MIT',
  language: 'TypeScript',
  topics: ['ai', 'coding-assistant', 'cli'],
  lastCommit: '2026-05-20T12:00:00Z',
};

const CLEAN_INSPECTION: SkillInspection = {
  source: EXAMPLE_SOURCE,
  hasReadme: true,
  hasLicense: true,
  hasTests: true,
  hasSchemaOrTypes: true,
  hasSecretHardcoded: false,
  hasExternalWrite: false,
  hasCodeExecution: false,
  dependencies: ['zod', 'typescript'],
  securityPolicy: true,
  rawReadme: '# Claude Code\nAI-powered coding assistant.',
  rawPackageJson: { name: 'claude-code', version: '1.0.0', license: 'MIT' },
};

describe('SkillGate pipeline: GitHub repo → verified skill → governed run', () => {
  it('Step 1 — build draft from inspection', () => {
    const draft = buildSkillDraft(CLEAN_INSPECTION);

    expect(draft.id).toBe('anthropics-claude-code');
    expect(draft.sourceOwner).toBe('anthropics');
    expect(draft.sourceRepo).toBe('claude-code');
    expect(draft.riskLevel).toBe('low');
    expect(draft.permissions.codeExecution).toBe(false);
    expect(draft.permissions.externalWrite).toBe(false);
    expect(draft.permissions.secrets).toBe(false);
    expect(draft.status).toBe('draft');
  });

  it('Step 2 — verify produces verified status for clean repo', () => {
    const draft = buildSkillDraft(CLEAN_INSPECTION);
    const result = verifySkill(draft, CLEAN_INSPECTION);

    expect(result.status).toBe('verified');
    expect(result.reasons).toHaveLength(0);
    expect(result.checks).toMatchObject({
      hasReadme: true,
      hasLicense: true,
      hasTests: true,
      noHardcodedSecrets: true,
      noExternalWrite: true,
      noCodeExecution: true,
      riskLevel: 'low',
    });
  });

  it('Step 3 — lock entry has deterministic hash pinned to commit', () => {
    const draft = buildSkillDraft(CLEAN_INSPECTION);
    const verification = verifySkill(draft, CLEAN_INSPECTION);
    const commit = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const entry = buildLockEntry(draft, verification, commit);

    expect(entry.status).toBe('verified');
    expect(entry.sourceCommit).toBe(commit);
    expect(entry.computedHash).toBe(computeSkillHash(draft, commit));
    expect(entry.computedHash).toMatch(/^[0-9a-f]{64}$/);

    // Hash must not change across calls (determinism)
    expect(computeSkillHash(draft, commit)).toBe(computeSkillHash(draft, commit));
  });

  it('Step 4 — risky repo (exec + write) is blocked before lock', () => {
    const riskyInspection: SkillInspection = {
      ...CLEAN_INSPECTION,
      source: { ...EXAMPLE_SOURCE, fullName: 'bad-actor/risky-tool', owner: 'bad-actor', repo: 'risky-tool' },
      hasSecretHardcoded: true,
      hasCodeExecution: true,
      hasExternalWrite: true,
    };
    const draft = buildSkillDraft(riskyInspection);
    const result = verifySkill(draft, riskyInspection);

    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('HARDCODED_SECRET_DETECTED');
    expect(draft.riskLevel).toBe('critical');
  });

  it('Step 5 — same input always produces same hash (Z3 determinism invariant)', () => {
    const draft = buildSkillDraft(CLEAN_INSPECTION);
    const h1 = computeSkillHash(draft, 'commit-sha-001');
    const h2 = computeSkillHash(draft, 'commit-sha-001');
    const h3 = computeSkillHash(draft, 'commit-sha-002');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });
});
