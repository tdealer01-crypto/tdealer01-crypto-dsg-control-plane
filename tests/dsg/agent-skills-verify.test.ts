import { describe, it, expect } from 'vitest';
import { buildSkillDraft } from '../../lib/agent-skills/build-draft';
import { verifySkill } from '../../lib/agent-skills/verify-skill';
import type { SkillInspection } from '../../lib/agent-skills/types';

const baseSource = {
  owner: 'example',
  repo: 'clean-skill',
  fullName: 'example/clean-skill',
  url: 'https://github.com/example/clean-skill',
  description: 'A clean read-only skill',
  stars: 100,
  license: 'MIT',
  language: 'TypeScript',
  topics: [],
  lastCommit: '2026-01-01T00:00:00Z',
};

function makeInspection(overrides: Partial<SkillInspection> = {}): SkillInspection {
  return {
    source: baseSource,
    hasReadme: true,
    hasLicense: true,
    hasTests: true,
    hasSchemaOrTypes: true,
    hasSecretHardcoded: false,
    hasExternalWrite: false,
    hasCodeExecution: false,
    dependencies: [],
    securityPolicy: true,
    rawReadme: '# Clean Skill',
    rawPackageJson: null,
    ...overrides,
  };
}

describe('verifySkill', () => {
  it('returns verified when all checks pass', () => {
    const inspection = makeInspection();
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('verified');
    expect(result.reasons).toHaveLength(0);
    expect(result.checks.hasReadme).toBe(true);
    expect(result.checks.hasLicense).toBe(true);
    expect(result.checks.hasTests).toBe(true);
    expect(result.checks.noHardcodedSecrets).toBe(true);
    expect(result.checks.noExternalWrite).toBe(true);
    expect(result.checks.noCodeExecution).toBe(true);
  });

  it('returns needs_review when README is missing', () => {
    const inspection = makeInspection({ hasReadme: false });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('MISSING_README');
  });

  it('returns needs_review when LICENSE is missing', () => {
    const inspection = makeInspection({ hasLicense: false });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('MISSING_LICENSE');
  });

  it('returns needs_review when no tests found', () => {
    const inspection = makeInspection({ hasTests: false });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('NO_TESTS_FOUND');
  });

  it('returns needs_approval when code execution is detected', () => {
    const inspection = makeInspection({ hasCodeExecution: true });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('needs_approval');
    expect(result.reasons).toContain('CODE_EXECUTION_CAPABILITY');
  });

  it('returns needs_approval when external write is detected', () => {
    const inspection = makeInspection({ hasExternalWrite: true });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('needs_approval');
    expect(result.reasons).toContain('EXTERNAL_WRITE_CAPABILITY');
  });

  it('returns blocked when hardcoded secrets are detected (overrides other issues)', () => {
    const inspection = makeInspection({ hasSecretHardcoded: true, hasCodeExecution: true });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('HARDCODED_SECRET_DETECTED');
    expect(result.reasons).toContain('CODE_EXECUTION_CAPABILITY');
  });

  it('accumulates multiple reasons independently', () => {
    const inspection = makeInspection({ hasReadme: false, hasLicense: false, hasTests: false });
    const draft = buildSkillDraft(inspection);
    const result = verifySkill(draft, inspection);

    expect(result.reasons).toContain('MISSING_README');
    expect(result.reasons).toContain('MISSING_LICENSE');
    expect(result.reasons).toContain('NO_TESTS_FOUND');
  });
});
