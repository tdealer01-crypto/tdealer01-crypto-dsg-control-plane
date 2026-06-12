import { describe, expect, it } from 'vitest';
import { buildStripeInstallUrl, resolveStripeInstallMode } from '@/lib/stripe-app/install-url';

const baseInput = {
  mode: 'live' as const,
  configuredUrl: 'https://marketplace.stripe.com/oauth/v2/authorize?client_id=ca_live',
  clientId: 'ca_live',
  redirectUri: 'https://dsg.example/stripe/oauth/callback',
  state: 'signed-state',
};

describe('Stripe public OAuth install URLs', () => {
  it('adds only the callback and signed state to a configured public URL', () => {
    const url = buildStripeInstallUrl(baseInput);
    expect(url.origin).toBe('https://marketplace.stripe.com');
    expect(url.pathname).toBe('/oauth/v2/authorize');
    expect(url.searchParams.get('client_id')).toBe('ca_live');
    expect(url.searchParams.get('redirect_uri')).toBe(baseInput.redirectUri);
    expect(url.searchParams.get('state')).toBe(baseInput.state);
  });

  it('rejects external-test channel links instead of silently turning them into a different URL', () => {
    expect(() => buildStripeInstallUrl({
      ...baseInput,
      configuredUrl: `${baseInput.configuredUrl}&channel_link=external-test`,
    })).toThrow('forbidden channel_link');
  });

  it('rejects arbitrary HTTPS hosts and incorrect paths', () => {
    expect(() => buildStripeInstallUrl({ ...baseInput, configuredUrl: 'https://example.com/oauth?client_id=ca_live' }))
      .toThrow('public marketplace authorize endpoint');
    expect(() => buildStripeInstallUrl({ ...baseInput, configuredUrl: 'https://marketplace.stripe.com/not-oauth?client_id=ca_live' }))
      .toThrow('public marketplace authorize endpoint');
  });

  it('rejects missing and mismatched client IDs', () => {
    expect(() => buildStripeInstallUrl({ ...baseInput, configuredUrl: 'https://marketplace.stripe.com/oauth/v2/authorize' }))
      .toThrow('missing client_id');
    expect(() => buildStripeInstallUrl({ ...baseInput, configuredUrl: 'https://marketplace.stripe.com/oauth/v2/authorize?client_id=ca_other' }))
      .toThrow('does not match');
  });

  it('requires an explicit public URL from Stripe Settings', () => {
    expect(() => buildStripeInstallUrl({ ...baseInput, configuredUrl: undefined })).toThrow('public Stripe OAuth URL is not configured');
  });

  it('rejects unknown modes instead of silently installing live', () => {
    expect(resolveStripeInstallMode('sandbox')).toBe('sandbox');
    expect(resolveStripeInstallMode('live')).toBe('live');
    expect(resolveStripeInstallMode(null)).toBe('live');
    expect(() => resolveStripeInstallMode('test')).toThrow('must be live or sandbox');
  });
});
