import { describe, expect, it } from 'vitest';
import {
  validateGitHubActionsOidcClaims,
  type GitHubActionsOidcClaims,
} from '@/lib/security/github-actions-oidc';

const nowSeconds = 1_787_000_000;
const options = {
  audience: 'dsg-revenue-autopilot',
  repository: 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane',
  ref: 'refs/heads/main',
  workflowPath: '.github/workflows/revenue-autopilot.yml',
  allowedEvents: ['schedule', 'workflow_dispatch'],
  nowSeconds,
};

function validClaims(overrides: Partial<GitHubActionsOidcClaims> = {}): GitHubActionsOidcClaims {
  return {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'dsg-revenue-autopilot',
    exp: nowSeconds + 300,
    nbf: nowSeconds - 10,
    repository: 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane',
    ref: 'refs/heads/main',
    event_name: 'schedule',
    workflow_ref: 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane/.github/workflows/revenue-autopilot.yml@refs/heads/main',
    ...overrides,
  };
}

describe('GitHub Actions OIDC claim validation', () => {
  it('accepts only the configured revenue scheduler identity', () => {
    expect(validateGitHubActionsOidcClaims(validClaims(), options)).toEqual({ ok: true });
  });

  it.each([
    ['repository', { repository: 'attacker/repo' }, 'oidc_repository_mismatch'],
    ['audience', { aud: 'other-audience' }, 'oidc_audience_mismatch'],
    ['ref', { ref: 'refs/heads/feature' }, 'oidc_ref_mismatch'],
    ['event', { event_name: 'pull_request' }, 'oidc_event_not_allowed'],
    ['workflow', { workflow_ref: 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane/.github/workflows/other.yml@refs/heads/main' }, 'oidc_workflow_mismatch'],
  ])('rejects a wrong %s claim', (_name, overrides, error) => {
    expect(validateGitHubActionsOidcClaims(validClaims(overrides), options)).toEqual({ ok: false, error });
  });

  it('rejects expired claims', () => {
    expect(validateGitHubActionsOidcClaims(validClaims({ exp: nowSeconds }), options)).toEqual({
      ok: false,
      error: 'oidc_expired',
    });
  });

  it('accepts workflow_dispatch for explicit operator runs', () => {
    expect(validateGitHubActionsOidcClaims(validClaims({ event_name: 'workflow_dispatch' }), options)).toEqual({ ok: true });
  });
});
