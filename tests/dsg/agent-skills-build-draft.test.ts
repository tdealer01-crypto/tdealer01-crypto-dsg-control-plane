import { describe, it, expect } from 'vitest';
import { buildSkillDraft } from '../../lib/agent-skills/build-draft';
import type { SkillInspection } from '../../lib/agent-skills/types';

const baseSource = {
  owner: 'example',
  repo: 'test-skill',
  fullName: 'example/test-skill',
  url: 'https://github.com/example/test-skill',
  description: 'A test skill',
  stars: 42,
  license: 'MIT',
  language: 'TypeScript',
  topics: ['skill', 'agent'],
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
    dependencies: ['zod'],
    securityPolicy: false,
    rawReadme: '# Test Skill',
    rawPackageJson: { name: 'test-skill', version: '1.0.0' },
    ...overrides,
  };
}

describe('buildSkillDraft', () => {
  it('produces low risk when all safety checks pass', () => {
    const draft = buildSkillDraft(makeInspection());
    expect(draft.riskLevel).toBe('low');
    expect(draft.permissions.codeExecution).toBe(false);
    expect(draft.permissions.externalWrite).toBe(false);
    expect(draft.permissions.secrets).toBe(false);
    expect(draft.permissions.filesystem).toBe('none');
  });

  it('produces medium risk when README is missing', () => {
    const draft = buildSkillDraft(makeInspection({ hasReadme: false }));
    expect(draft.riskLevel).toBe('medium');
  });

  it('produces medium risk when only code execution is detected', () => {
    const draft = buildSkillDraft(makeInspection({ hasCodeExecution: true }));
    expect(draft.riskLevel).toBe('medium');
    expect(draft.permissions.codeExecution).toBe(true);
    expect(draft.permissions.filesystem).toBe('read');
  });

  it('produces high risk when code execution AND external write are both detected', () => {
    const draft = buildSkillDraft(makeInspection({ hasCodeExecution: true, hasExternalWrite: true }));
    expect(draft.riskLevel).toBe('high');
  });

  it('produces critical risk when hardcoded secrets are detected', () => {
    const draft = buildSkillDraft(makeInspection({ hasSecretHardcoded: true }));
    expect(draft.riskLevel).toBe('critical');
    expect(draft.permissions.secrets).toBe(true);
  });

  it('generates a slug id from fullName', () => {
    const draft = buildSkillDraft(makeInspection());
    expect(draft.id).toBe('example-test-skill');
    expect(draft.sourceType).toBe('github');
    expect(draft.status).toBe('draft');
  });

  it('handles org/repo names with dots and uppercase', () => {
    const draft = buildSkillDraft(
      makeInspection({
        source: { ...baseSource, fullName: 'My.Org/My-Skill.v2', owner: 'My.Org', repo: 'My-Skill.v2' },
      }),
    );
    expect(draft.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('includes a draftedAt ISO timestamp', () => {
    const draft = buildSkillDraft(makeInspection());
    expect(Date.parse(draft.draftedAt)).not.toBeNaN();
  });
});
