import { describe, expect, it, vi } from 'vitest';
import { runBrowserResearch } from '../../skills/browser-research/skill';

const { mockSeedData } = vi.hoisted(() => ({
  mockSeedData: vi.fn(),
}));

vi.mock('../../lib/dsg/seed/seed-engine', () => ({
  seedData: mockSeedData,
}));

vi.mock('../../lib/dsg/logic/z3-agent-gate', () => ({
  runZ3AgentGate: vi.fn(async (input: { gateAllow: boolean }) => ({
    status: input.gateAllow ? 'PASS' : 'BLOCK',
    pass: input.gateAllow,
    z3Check: input.gateAllow ? 'sat' : 'unsat',
    z3ProofHash: `sha256:mock-browser-${input.gateAllow}`,
    violations: input.gateAllow
      ? []
      : [{ code: 'USES_BROWSER_WITHOUT_EVIDENCE_HASH', message: 'no evidence hash' }],
    agentType: 'browser-research',
    jobId: 'test',
  })),
}));

vi.mock('../../lib/dsg/runtime/hash', () => ({
  sha256Json: vi.fn((input: unknown) => `sha256:computed-${JSON.stringify(input).length}`),
}));

describe('Browser Research Agent — Evidence Hash Invariant', () => {
  it('PASS when seed returns data with evidence hash', async () => {
    mockSeedData.mockResolvedValueOnce({
      ok: true,
      data: { pageContent: 'some research content' },
      evidenceHash: 'sha256:page-content-hash',
      sourceUrl: 'https://example.com',
      gateStatus: 'PASS',
      searchAttempted: true,
    });

    const r = await runBrowserResearch({
      jobId: 'br-001',
      workspaceId: 'ws1',
      researchQuery: 'latest AI governance regulations',
    });
    expect(r.ok).toBe(true);
    expect(r.evidenceHash).toMatch(/^sha256:/);
    expect(r.blockedReasons).toHaveLength(0);
  });

  it('BLOCK when seed fails (no evidence available)', async () => {
    mockSeedData.mockResolvedValueOnce({
      ok: false,
      data: null,
      evidenceHash: 'sha256:none',
      sourceUrl: '',
      gateStatus: 'BLOCK',
      blockReason: 'search failed, cannot proceed without data',
      searchAttempted: true,
    });

    const r = await runBrowserResearch({
      jobId: 'br-002',
      workspaceId: 'ws1',
      researchQuery: 'nonexistent topic xyz',
    });
    expect(r.ok).toBe(false);
    expect(r.evidenceHash).toBe('sha256:none');
    expect(r.blockedReasons).toContain('USES_BROWSER_WITHOUT_EVIDENCE_HASH');
  });

  it('always returns z3ProofHash', async () => {
    mockSeedData.mockResolvedValueOnce({
      ok: true,
      data: { content: 'page' },
      evidenceHash: 'sha256:abc',
      sourceUrl: 'https://example.com',
      gateStatus: 'PASS',
      searchAttempted: true,
    });

    const r = await runBrowserResearch({
      jobId: 'br-003',
      workspaceId: 'ws1',
      researchQuery: 'test query',
    });
    expect(r.z3ProofHash).toMatch(/^sha256:/);
  });

  it('evidenceHash is sha256:none when content unavailable', async () => {
    mockSeedData.mockResolvedValueOnce({
      ok: false,
      data: null,
      evidenceHash: 'sha256:none',
      sourceUrl: '',
      gateStatus: 'BLOCK',
      searchAttempted: false,
    });

    const r = await runBrowserResearch({
      jobId: 'br-004',
      workspaceId: 'ws1',
      researchQuery: 'unknown',
    });
    expect(r.evidenceHash).toBe('sha256:none');
  });

  it('echoes jobId and researchQuery in result', async () => {
    mockSeedData.mockResolvedValueOnce({
      ok: true,
      data: { content: 'research' },
      evidenceHash: 'sha256:br-hash',
      sourceUrl: 'https://example.com',
      gateStatus: 'PASS',
      searchAttempted: true,
    });

    const r = await runBrowserResearch({
      jobId: 'br-unique-99',
      workspaceId: 'ws1',
      researchQuery: 'specific research topic',
    });
    expect(r.jobId).toBe('br-unique-99');
    expect(r.researchQuery).toBe('specific research topic');
  });

  it('accepts optional targetUrl without error', async () => {
    mockSeedData.mockResolvedValueOnce({
      ok: true,
      data: { content: 'page content' },
      evidenceHash: 'sha256:target-hash',
      sourceUrl: 'https://docs.example.com',
      gateStatus: 'PASS',
      searchAttempted: true,
    });

    const r = await runBrowserResearch({
      jobId: 'br-005',
      workspaceId: 'ws1',
      researchQuery: 'documentation',
      targetUrl: 'https://docs.example.com',
    });
    expect(r.ok).toBe(true);
  });
});
