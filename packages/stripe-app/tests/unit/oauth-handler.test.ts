import { OAuthHandler } from '../../src/handlers/oauth-handler';
import { describe, it, expect, beforeEach } from 'vitest';

describe('OAuthHandler', () => {
  let handler: OAuthHandler;

  beforeEach(() => {
    handler = new OAuthHandler({
      stripeClientId: 'test_client_id',
      clientSecret: 'test_secret',
      redirectUri: 'http://localhost:3001/oauth/callback',
      scopes: ['read_write'],
    });
  });

  it('should generate authorization URL with state', () => {
    const { url, state } = handler.generateAuthorizationUrl();

    expect(url).toContain('https://connect.stripe.com/oauth/authorize');
    expect(url).toContain('client_id=test_client_id');
    expect(url).toContain('response_type=code');
    expect(state).toBeTruthy();
    expect(state.length).toBeGreaterThan(0);
  });

  it('should validate state correctly', () => {
    const { state } = handler.generateAuthorizationUrl();

    expect(handler.validateState(state)).toBe(true);
  });

  it('should reject invalid state', () => {
    expect(handler.validateState('invalid_state')).toBe(false);
  });

  it('should validate token format', () => {
    expect(handler.validateToken('valid_token')).toBe(true);
    expect(handler.validateToken('')).toBe(false);
  });
});
