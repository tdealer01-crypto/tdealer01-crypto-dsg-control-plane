import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEVELOPMENT_SCOPES,
  DEFAULT_LEASE_SCOPES,
  PRODUCTION_PROMOTION_SCOPES,
  canonicalJson,
  containsSecretMaterial,
  hashWorkspacePlan,
  isDevelopmentEnvironment,
  scopeMatches,
} from '../../../lib/agent-workspace/policy';

describe('agent workspace policy', () => {
  it('hashes plans deterministically regardless of object key order', () => {
    const left = { goal: 'ship', constraints: { b: 2, a: 1 } };
    const right = { constraints: { a: 1, b: 2 }, goal: 'ship' };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(hashWorkspacePlan(left)).toBe(hashWorkspacePlan(right));
  });

  it('matches exact and prefix wildcard scopes without overmatching', () => {
    const granted = ['repo.*', 'logs.read'];
    expect(scopeMatches(granted, 'repo.write')).toBe(true);
    expect(scopeMatches(granted, 'repo.branch.create')).toBe(true);
    expect(scopeMatches(granted, 'logs.read')).toBe(true);
    expect(scopeMatches(granted, 'production.deploy')).toBe(false);
    expect(scopeMatches(granted, 'repository.write')).toBe(false);
    expect(scopeMatches(DEFAULT_LEASE_SCOPES, 'deploy.production')).toBe(true);
  });

  it('keeps development database and browser scopes separate from production', () => {
    expect(scopeMatches(DEFAULT_DEVELOPMENT_SCOPES, 'database.dev.write')).toBe(true);
    expect(scopeMatches(DEFAULT_DEVELOPMENT_SCOPES, 'database.preview.migrate')).toBe(true);
    expect(scopeMatches(DEFAULT_DEVELOPMENT_SCOPES, 'database.production.write')).toBe(false);
    expect(scopeMatches(DEFAULT_DEVELOPMENT_SCOPES, 'browser.preview.fill')).toBe(true);
    expect(scopeMatches(DEFAULT_DEVELOPMENT_SCOPES, 'browser.production.fill')).toBe(false);
  });

  it('reserves main merge and live mutations for promotion scopes', () => {
    expect(scopeMatches(PRODUCTION_PROMOTION_SCOPES, 'repo.merge.main')).toBe(true);
    expect(scopeMatches(PRODUCTION_PROMOTION_SCOPES, 'deploy.production')).toBe(true);
    expect(scopeMatches(PRODUCTION_PROMOTION_SCOPES, 'database.production.migrate')).toBe(true);
    expect(scopeMatches(PRODUCTION_PROMOTION_SCOPES, 'stripe.live.price.update')).toBe(true);
    expect(scopeMatches(PRODUCTION_PROMOTION_SCOPES, 'repo.write')).toBe(false);
    expect(scopeMatches(PRODUCTION_PROMOTION_SCOPES, 'database.dev.write')).toBe(false);
  });

  it('limits autonomous operation to development and preview', () => {
    expect(isDevelopmentEnvironment('development')).toBe(true);
    expect(isDevelopmentEnvironment('preview')).toBe(true);
    expect(isDevelopmentEnvironment('production')).toBe(false);
  });

  it('rejects secret material but permits secret references', () => {
    expect(containsSecretMaterial({ secretRefs: ['STRIPE_SECRET_KEY'] })).toBe(false);
    expect(containsSecretMaterial({ token: 'actual-value' })).toBe(true);
    expect(containsSecretMaterial({ payload: 'sk_test_123456789' })).toBe(true);
    expect(containsSecretMaterial({ payload: 'no secret here' })).toBe(false);
  });
});
