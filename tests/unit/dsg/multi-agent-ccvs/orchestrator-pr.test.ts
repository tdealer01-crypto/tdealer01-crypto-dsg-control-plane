// Verifies MultiAgentOrchestrator never fabricates a GitHub PR URL.
//
// createPullRequest() used to always return a plausible-looking
// `github.com/.../pull/CCVS-xxxxx` URL even though no real GitHub API call
// was ever made. These tests assert that result.prUrl is only ever set when
// a real PR-creation call (mocked here to stay hermetic/fast) actually
// succeeded, and is `undefined` whenever it could not have happened.
import { afterEach, describe, expect, it, vi } from 'vitest';

const createCCVSPRMock = vi.fn();
const createGHPRAutomationMock = vi.fn(() => ({ createCCVSPR: createCCVSPRMock }));

vi.mock('../../../../lib/dsg/multi-agent-ccvs/github/ghpr-automation', () => ({
  createGHPRAutomation: (...args: unknown[]) => createGHPRAutomationMock(...args),
}));

import { MultiAgentOrchestrator } from '../../../../lib/dsg/multi-agent-ccvs/orchestrator/multi-agent-orchestrator';

describe('MultiAgentOrchestrator PR creation truth boundary', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('never calls the GitHub API and never returns a prUrl when no real token is configured', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: false,
      createPR: true,
      githubToken: '', // no real token/integration configured
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      maxTotalIterations: 1,
    });

    const result = await orch.orchestrate('abc123def456', 'test goal');

    // No fabricated github.com URL, and no real API call was attempted.
    expect(result.prUrl).toBeUndefined();
    expect(result.metrics.prCreated).toBe(false);
    expect(createGHPRAutomationMock).not.toHaveBeenCalled();
    expect(createCCVSPRMock).not.toHaveBeenCalled();
  });

  it('does not return a prUrl when the real GitHub PR-creation call fails', async () => {
    createCCVSPRMock.mockRejectedValueOnce(new Error('simulated GitHub API failure'));

    const orch = new MultiAgentOrchestrator({
      simulationFirst: false,
      createPR: true,
      githubToken: 'fake-but-nonempty-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      maxTotalIterations: 1,
    });

    const result = await orch.orchestrate('abc123def456', 'test goal');

    expect(result.prUrl).toBeUndefined();
    expect(result.metrics.prCreated).toBe(false);
    // The real GitHub automation path was attempted (not fabricated locally).
    expect(createGHPRAutomationMock).toHaveBeenCalledTimes(1);
    expect(createCCVSPRMock).toHaveBeenCalledTimes(1);
  });

  it('returns the real PR URL from the GitHub automation call when it succeeds', async () => {
    createCCVSPRMock.mockResolvedValueOnce({
      url: 'https://github.com/test-owner/test-repo/pull/42',
      number: 42,
    });

    const orch = new MultiAgentOrchestrator({
      simulationFirst: false,
      createPR: true,
      githubToken: 'fake-but-nonempty-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      maxTotalIterations: 1,
    });

    const result = await orch.orchestrate('abc123def456', 'test goal');

    expect(result.prUrl).toBe('https://github.com/test-owner/test-repo/pull/42');
    expect(result.metrics.prCreated).toBe(true);
    expect(createGHPRAutomationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fake-but-nonempty-token',
        owner: 'test-owner',
        repo: 'test-repo',
      })
    );
  });
});
