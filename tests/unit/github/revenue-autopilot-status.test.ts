import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REVENUE_AUTOPILOT_REPOSITORY,
  resolveGitHubRepository,
  summarizeWorkflowRun,
} from '../../../lib/github/revenue-autopilot-status';

describe('revenue autopilot GitHub status', () => {
  it('accepts a valid owner/repository and fails closed to the verified default', () => {
    expect(resolveGitHubRepository('owner/repository')).toBe(
      'owner/repository',
    );
    expect(
      resolveGitHubRepository('https://github.com/owner/repository'),
    ).toBe(DEFAULT_REVENUE_AUTOPILOT_REPOSITORY);
  });

  it('returns only fields used by the buyer cockpit', () => {
    expect(
      summarizeWorkflowRun({
        workflow_runs: [
          {
            id: 123,
            run_number: 7,
            name: 'Revenue Autopilot',
            status: 'completed',
            conclusion: 'failure',
            head_branch: 'main',
            head_sha: 'abcdef1234567890',
            html_url: 'https://github.com/owner/repo/actions/runs/123',
            created_at: '2026-08-13T00:00:00Z',
            updated_at: '2026-08-13T00:01:00Z',
          },
        ],
      }),
    ).toEqual({
      id: 123,
      number: 7,
      name: 'Revenue Autopilot',
      status: 'completed',
      conclusion: 'failure',
      branch: 'main',
      sha: 'abcdef1234567890',
      url: 'https://github.com/owner/repo/actions/runs/123',
      createdAt: '2026-08-13T00:00:00Z',
      updatedAt: '2026-08-13T00:01:00Z',
    });
  });

  it('returns null when GitHub has no complete run identity', () => {
    expect(summarizeWorkflowRun({ workflow_runs: [] })).toBeNull();
    expect(
      summarizeWorkflowRun({ workflow_runs: [{ status: 'queued' }] }),
    ).toBeNull();
  });
});
