import { OAuthHandler } from '../../src/handlers/oauth-handler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

  describe('generateAuthorizationUrl', () => {
    it('should generate authorization URL with all required parameters', () => {
      const { url, state } = handler.generateAuthorizationUrl();

      expect(url).toContain('https://connect.stripe.com/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Foauth%2Fcallback');
      expect(url).toContain('scope=read_write');
      expect(url).toContain(`state=${state}`);
      expect(state).toBeTruthy();
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate unique state values on each call', () => {
      const { state: state1 } = handler.generateAuthorizationUrl();
      const { state: state2 } = handler.generateAuthorizationUrl();

      expect(state1).not.toBe(state2);
    });

    it('should handle multiple scopes correctly', () => {
      const multiScopeHandler = new OAuthHandler({
        stripeClientId: 'test_client_id',
        clientSecret: 'test_secret',
        redirectUri: 'http://localhost:3001/oauth/callback',
        scopes: ['read_write', 'write_charges', 'read_account_info'],
      });

      const { url } = multiScopeHandler.generateAuthorizationUrl();

      expect(url).toContain('scope=read_write%20write_charges%20read_account_info');
    });
  });

  describe('validateState', () => {
    it('should validate correct state value', () => {
      const { state } = handler.generateAuthorizationUrl();

      expect(handler.validateState(state)).toBe(true);
    });

    it('should reject invalid state', () => {
      expect(handler.validateState('invalid_state')).toBe(false);
    });

    it('should reject completely fake state', () => {
      expect(handler.validateState('completely_fake_state_12345')).toBe(false);
    });

    it('should reject expired state after TTL', () => {
      vi.useFakeTimers();
      const { state } = handler.generateAuthorizationUrl();

      // Fast forward 11 minutes (TTL is 10 minutes)
      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(handler.validateState(state)).toBe(false);

      vi.useRealTimers();
    });

    it('should clean up expired state from store', () => {
      vi.useFakeTimers();
      const { state } = handler.generateAuthorizationUrl();

      // State should be valid now
      expect(handler.validateState(state)).toBe(true);

      // Fast forward past TTL
      vi.advanceTimersByTime(11 * 60 * 1000);

      // Should no longer be valid
      expect(handler.validateState(state)).toBe(false);

      // Second validation should still fail (state was deleted)
      expect(handler.validateState(state)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for token', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sk_test_token_123',
          stripe_user_id: 'acct_test123',
          scope: 'read_write',
          livemode: false,
        }),
      });

      const result = await handler.exchangeCodeForToken('code_123');

      expect(result.access_token).toBe('sk_test_token_123');
      expect(result.stripe_user_id).toBe('acct_test123');
      expect(result.scope).toBe('read_write');
      expect(result.livemode).toBe(false);

      expect(mockFetch).toHaveBeenCalledWith('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.stringContaining('grant_type=authorization_code'),
      });
    });

    it('should throw error on failed token exchange', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(handler.exchangeCodeForToken('bad_code')).rejects.toThrow(
        'OAuth token exchange failed: Bad Request'
      );
    });
  });

  describe('validateToken', () => {
    it('should validate non-empty token', () => {
      expect(handler.validateToken('valid_token')).toBe(true);
    });

    it('should reject empty token', () => {
      expect(handler.validateToken('')).toBe(false);
    });

    it('should reject whitespace token', () => {
      expect(handler.validateToken('   ')).toBe(false);
    });

    it('should accept various token formats', () => {
      expect(handler.validateToken('sk_test_abc')).toBe(true);
      expect(handler.validateToken('rk_test_xyz')).toBe(true);
      expect(handler.validateToken('a')).toBe(true);
    });
  });
});
