import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock: requireVerifiedDsgActor — returns a valid actor by default.
// Individual tests can override this to simulate auth failures.
// ---------------------------------------------------------------------------
vi.mock('@/lib/dsg/server/context', () => ({
  requireVerifiedDsgActor: vi.fn().mockResolvedValue({
    actorId: 'actor-test-uuid',
    workspaceId: 'ws-test',
    role: 'OWNER',
  }),
}));

// ---------------------------------------------------------------------------
// build/route.ts dependencies
// ---------------------------------------------------------------------------
vi.mock('@/lib/agent-skills/github-search', () => ({
  fetchGitHubRepoMeta: vi.fn().mockResolvedValue({
    owner: 'test-owner',
    repo: 'test-repo',
    fullName: 'test-owner/test-repo',
    url: 'https://github.com/test-owner/test-repo',
    description: 'A test repo',
    stars: 42,
    license: 'MIT',
    language: 'TypeScript',
    topics: [],
    lastCommit: '2024-01-01T00:00:00Z',
  }),
}));

vi.mock('@/lib/agent-skills/inspect-skill', () => ({
  inspectGitHubSkill: vi.fn().mockResolvedValue({
    source: {
      owner: 'test-owner',
      repo: 'test-repo',
      fullName: 'test-owner/test-repo',
      url: 'https://github.com/test-owner/test-repo',
      description: 'A test repo',
      stars: 42,
      license: 'MIT',
      language: 'TypeScript',
      topics: [],
      lastCommit: '2024-01-01T00:00:00Z',
    },
    hasReadme: true,
    hasLicense: true,
    hasTests: true,
    hasSchemaOrTypes: true,
    hasSecretHardcoded: false,
    hasExternalWrite: false,
    hasCodeExecution: false,
    dependencies: [],
    securityPolicy: false,
    rawReadme: null,
    rawPackageJson: null,
  }),
}));

vi.mock('@/lib/agent-skills/build-draft', () => ({
  buildSkillDraft: vi.fn().mockReturnValue({
    id: 'test-owner-test-repo',
    name: 'test-repo',
    sourceType: 'github' as const,
    sourceUrl: 'https://github.com/test-owner/test-repo',
    sourceOwner: 'test-owner',
    sourceRepo: 'test-repo',
    description: 'A test repo',
    status: 'draft' as const,
    riskLevel: 'low' as const,
    permissions: {
      network: true,
      filesystem: 'none' as const,
      secrets: false,
      codeExecution: false,
      externalWrite: false,
    },
    draftedAt: '2024-01-01T00:00:00.000Z',
  }),
}));

vi.mock('@/lib/agent-skills/verify-skill', () => ({
  verifySkill: vi.fn().mockReturnValue({
    status: 'verified' as const,
    reasons: [],
    checks: {
      hasReadme: true,
      hasLicense: true,
      hasTests: true,
      noHardcodedSecrets: true,
      noExternalWrite: true,
      noCodeExecution: true,
      riskLevel: 'low' as const,
    },
  }),
}));

// ---------------------------------------------------------------------------
// run/route.ts dependencies
// ---------------------------------------------------------------------------
vi.mock('@/lib/agent-skills/lock-skill', () => ({
  readSkillsLock: vi.fn().mockResolvedValue({
    version: 1,
    updatedAt: '2024-01-01T00:00:00.000Z',
    skills: {
      'test-owner-test-repo': {
        source: 'test-owner/test-repo',
        sourceType: 'github',
        sourceUrl: 'https://github.com/test-owner/test-repo',
        sourceCommit: null,
        computedHash: 'sha256:mockhash',
        status: 'verified',
        riskLevel: 'low',
        permissions: {
          network: true,
          filesystem: 'none',
          secrets: false,
          codeExecution: false,
          externalWrite: false,
        },
        registeredAt: '2024-01-01T00:00:00.000Z',
        description: 'A test repo',
      },
    },
  }),
  getSkillFromLock: vi.fn().mockResolvedValue({
    source: 'test-owner/test-repo',
    sourceType: 'github',
    sourceUrl: 'https://github.com/test-owner/test-repo',
    sourceCommit: null,
    computedHash: 'sha256:mockhash',
    status: 'verified',
    riskLevel: 'low',
    permissions: {
      network: true,
      filesystem: 'none',
      secrets: false,
      codeExecution: false,
      externalWrite: false,
    },
    registeredAt: '2024-01-01T00:00:00.000Z',
    description: 'A test repo',
  }),
}));

vi.mock('@/lib/agent-skills/run-skill-action', () => ({
  runSkillAction: vi.fn().mockResolvedValue({
    ok: true,
    skillId: 'test-owner-test-repo',
    gateStatus: 'ready',
    simulated: true,
    auditId: 'audit:test:123',
  }),
}));

// ---------------------------------------------------------------------------
// Import handlers after all mocks are registered
// ---------------------------------------------------------------------------
import { POST as buildPOST } from '../../app/api/agent-skills/build/route';
import { POST as verifyPOST } from '../../app/api/agent-skills/verify/route';
import { GET as runGET, POST as runPOST } from '../../app/api/agent-skills/run/route';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost/api/agent-skills/build', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// build route tests
// ---------------------------------------------------------------------------
describe('POST /api/agent-skills/build', () => {
  beforeEach(() => {
    vi.mocked(requireVerifiedDsgActor).mockResolvedValue({
      actorId: 'actor-test-uuid',
      workspaceId: 'ws-test',
      role: 'OWNER',
    });
  });

  it('returns 200 with draft and inspectionSummary for valid payload', async () => {
    const req = makeRequest({ owner: 'test-owner', repo: 'test-repo' });
    const response = await buildPOST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.draft).toBeDefined();
    expect(body.data.inspectionSummary).toBeDefined();
    expect(body.data.nextStep).toContain('/api/agent-skills/verify');
  });

  it('returns 400 when owner is missing', async () => {
    const req = makeRequest({ repo: 'test-repo' });
    const response = await buildPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('OWNER_AND_REPO_REQUIRED');
  });

  it('returns 400 when repo is missing', async () => {
    const req = makeRequest({ owner: 'test-owner' });
    const response = await buildPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('OWNER_AND_REPO_REQUIRED');
  });

  it('returns 400 when body is empty', async () => {
    const req = makeRequest({});
    const response = await buildPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it('returns 403 when auth fails', async () => {
    vi.mocked(requireVerifiedDsgActor).mockRejectedValueOnce(new Error('DSG_AUTH_REQUIRED'));
    const req = makeRequest({ owner: 'test-owner', repo: 'test-repo' });
    const response = await buildPOST(req);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('DSG_AUTH_REQUIRED');
  });

  it('returns 404 when repo is not found', async () => {
    const { fetchGitHubRepoMeta } = await import('@/lib/agent-skills/github-search');
    vi.mocked(fetchGitHubRepoMeta).mockResolvedValueOnce(null);

    const req = makeRequest({ owner: 'nonexistent', repo: 'nonexistent-repo' });
    const response = await buildPOST(req);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('REPO_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// verify route tests
// ---------------------------------------------------------------------------
describe('POST /api/agent-skills/verify', () => {
  beforeEach(() => {
    vi.mocked(requireVerifiedDsgActor).mockResolvedValue({
      actorId: 'actor-test-uuid',
      workspaceId: 'ws-test',
      role: 'OWNER',
    });
  });

  it('returns 200 with verification result when draft is provided', async () => {
    const draft = {
      id: 'test-owner-test-repo',
      name: 'test-repo',
      sourceType: 'github',
      sourceUrl: 'https://github.com/test-owner/test-repo',
      sourceOwner: 'test-owner',
      sourceRepo: 'test-repo',
      description: 'A test repo',
      status: 'draft',
      riskLevel: 'low',
      permissions: {
        network: true,
        filesystem: 'none',
        secrets: false,
        codeExecution: false,
        externalWrite: false,
      },
      draftedAt: '2024-01-01T00:00:00.000Z',
    };

    const req = makeRequest({ draft });
    const response = await verifyPOST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.skillId).toBeDefined();
    expect(body.data.verification).toBeDefined();
    expect(body.data.nextStep).toBeDefined();
  });

  it('returns 200 with verification result when owner+repo are provided', async () => {
    const req = makeRequest({ owner: 'test-owner', repo: 'test-repo' });
    const response = await verifyPOST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.verification).toBeDefined();
  });

  it('returns 400 when body is null (invalid JSON)', async () => {
    const req = new Request('http://localhost/api/agent-skills/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await verifyPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('BODY_REQUIRED');
  });

  it('returns 400 when neither draft nor owner+repo are provided', async () => {
    const req = makeRequest({ someOtherField: true });
    const response = await verifyPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('DRAFT_OR_OWNER_REPO_REQUIRED');
  });

  it('returns 403 when auth fails', async () => {
    vi.mocked(requireVerifiedDsgActor).mockRejectedValueOnce(new Error('DSG_AUTH_REQUIRED'));
    const req = makeRequest({ owner: 'test-owner', repo: 'test-repo' });
    const response = await verifyPOST(req);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('DSG_AUTH_REQUIRED');
  });
});

// ---------------------------------------------------------------------------
// run route tests
// ---------------------------------------------------------------------------
describe('GET /api/agent-skills/run', () => {
  beforeEach(() => {
    vi.mocked(requireVerifiedDsgActor).mockResolvedValue({
      actorId: 'actor-test-uuid',
      workspaceId: 'ws-test',
      role: 'OWNER',
    });
  });

  it('returns 200 with skills list', async () => {
    const req = new Request('http://localhost/api/agent-skills/run', { method: 'GET' });
    const response = await runGET(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    expect(typeof body.data.version).toBe('number');
    expect(Array.isArray(body.data.skills)).toBe(true);
  });

  it('returns 403 when auth fails on GET', async () => {
    vi.mocked(requireVerifiedDsgActor).mockRejectedValueOnce(new Error('DSG_AUTH_REQUIRED'));
    const req = new Request('http://localhost/api/agent-skills/run', { method: 'GET' });
    const response = await runGET(req);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('DSG_AUTH_REQUIRED');
  });
});

describe('POST /api/agent-skills/run', () => {
  beforeEach(() => {
    vi.mocked(requireVerifiedDsgActor).mockResolvedValue({
      actorId: 'actor-test-uuid',
      workspaceId: 'ws-test',
      role: 'OWNER',
    });
  });

  it('returns 200 with run result for valid payload', async () => {
    const req = makeRequest({ skillId: 'test-owner-test-repo', goal: 'Run the skill for testing' });
    const response = await runPOST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.skillId).toBe('test-owner-test-repo');
    expect(body.data.gateStatus).toBeDefined();
    expect(body.data.auditId).toBeDefined();
  });

  it('returns 400 when skillId is missing', async () => {
    const req = makeRequest({ goal: 'Run the skill' });
    const response = await runPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('SKILL_ID_AND_GOAL_REQUIRED');
  });

  it('returns 400 when goal is missing', async () => {
    const req = makeRequest({ skillId: 'test-owner-test-repo' });
    const response = await runPOST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('SKILL_ID_AND_GOAL_REQUIRED');
  });

  it('returns 403 when gate blocks the skill run', async () => {
    const { runSkillAction } = await import('@/lib/agent-skills/run-skill-action');
    vi.mocked(runSkillAction).mockResolvedValueOnce({
      ok: false,
      skillId: 'test-owner-test-repo',
      gateStatus: 'blocked',
      gateReason: 'SKILL_NOT_REGISTERED',
      simulated: true,
      auditId: 'audit:blocked:123',
    });

    const req = makeRequest({ skillId: 'test-owner-test-repo', goal: 'Run the skill' });
    const response = await runPOST(req);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('SKILL_NOT_REGISTERED');
  });

  it('returns 403 when auth fails on POST', async () => {
    vi.mocked(requireVerifiedDsgActor).mockRejectedValueOnce(new Error('DSG_AUTH_REQUIRED'));
    const req = makeRequest({ skillId: 'test-owner-test-repo', goal: 'Run the skill' });
    const response = await runPOST(req);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('DSG_AUTH_REQUIRED');
  });
});
