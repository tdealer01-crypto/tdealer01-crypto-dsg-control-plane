/**
 * OAuthSimulator — Simulate OAuth flows
 *
 * Supports:
 * - Authorization code flow
 * - Success/cancel/error scenarios
 * - Token exchange
 * - Refresh token
 * - Revocation
 */

import { randomUUID } from 'crypto';
import { TestHarness } from './test-harness';

export interface OAuthConfig {
  provider: 'github' | 'vercel' | 'google';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  scenario: 'success' | 'cancel' | 'error' | 'timeout';
}

export interface OAuthSession {
  sessionId: string;
  state: string;
  codeChallenge?: string;
  authorizationCode?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  status: 'pending' | 'authorized' | 'token_granted' | 'revoked' | 'error';
  error?: string;
}

export class OAuthSimulator {
  private sessions: Map<string, OAuthSession> = new Map();

  constructor(private harness: TestHarness) {}

  /**
   * Start authorization request
   */
  startAuthorizationFlow(config: OAuthConfig): OAuthSession {
    const session: OAuthSession = {
      sessionId: randomUUID(),
      state: randomUUID(),
      status: 'pending',
    };

    this.sessions.set(session.sessionId, session);

    this.harness.recordEvent('oauth_start', config.provider, {
      sessionId: session.sessionId,
      scopes: config.scopes,
    });

    return session;
  }

  /**
   * Handle authorization callback
   */
  async handleAuthorizationCallback(
    sessionId: string,
    config: OAuthConfig,
    state: string
  ): Promise<{
    ok: boolean;
    authorizationCode?: string;
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: 'Session not found' };
    }

    if (session.state !== state) {
      this.harness.recordEvent('oauth_error', config.provider, {
        sessionId,
        error: 'state mismatch',
      });
      return { ok: false, error: 'State mismatch' };
    }

    // Simulate different scenarios
    switch (config.scenario) {
      case 'success':
        session.status = 'authorized';
        session.authorizationCode = 'code_' + randomUUID().substring(0, 20);
        this.harness.recordEvent('oauth_authorized', config.provider, {
          sessionId,
          authorizationCode: session.authorizationCode,
        });
        return { ok: true, authorizationCode: session.authorizationCode };

      case 'cancel':
        session.status = 'error';
        session.error = 'User cancelled authorization';
        this.harness.recordEvent('oauth_cancelled', config.provider, { sessionId });
        return { ok: false, error: 'User cancelled' };

      case 'error':
        session.status = 'error';
        session.error = 'Authorization server error';
        this.harness.recordEvent('oauth_error', config.provider, {
          sessionId,
          error: 'server error',
        });
        return { ok: false, error: 'Server error' };

      case 'timeout':
        await new Promise((resolve) => setTimeout(resolve, 5000));
        session.status = 'error';
        session.error = 'Authorization timeout';
        this.harness.recordEvent('oauth_timeout', config.provider, { sessionId });
        return { ok: false, error: 'Timeout' };

      default:
        return { ok: false, error: 'Unknown scenario' };
    }
  }

  /**
   * Exchange authorization code for token
   */
  async exchangeCodeForToken(
    sessionId: string,
    config: OAuthConfig,
    authorizationCode: string
  ): Promise<{
    ok: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: 'Session not found' };
    }

    if (session.authorizationCode !== authorizationCode) {
      this.harness.recordEvent('oauth_token_error', config.provider, {
        sessionId,
        error: 'invalid authorization code',
      });
      return { ok: false, error: 'Invalid authorization code' };
    }

    session.accessToken = 'token_' + randomUUID().substring(0, 30);
    session.refreshToken = 'refresh_' + randomUUID().substring(0, 30);
    session.expiresAt = new Date(Date.now() + 3600000); // 1 hour
    session.status = 'token_granted';

    this.harness.recordEvent('oauth_token_exchanged', config.provider, {
      sessionId,
      expiresAt: session.expiresAt.toISOString(),
    });

    return {
      ok: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: 3600,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    sessionId: string,
    config: OAuthConfig,
    refreshToken: string
  ): Promise<{
    ok: boolean;
    accessToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: 'Session not found' };
    }

    if (session.refreshToken !== refreshToken) {
      return { ok: false, error: 'Invalid refresh token' };
    }

    session.accessToken = 'token_' + randomUUID().substring(0, 30);
    session.expiresAt = new Date(Date.now() + 3600000);

    this.harness.recordEvent('oauth_token_refreshed', config.provider, {
      sessionId,
    });

    return {
      ok: true,
      accessToken: session.accessToken,
      expiresIn: 3600,
    };
  }

  /**
   * Revoke token
   */
  async revokeToken(
    sessionId: string,
    config: OAuthConfig,
    token: string
  ): Promise<{ ok: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: 'Session not found' };
    }

    if (session.accessToken !== token) {
      return { ok: false, error: 'Invalid token' };
    }

    session.status = 'revoked';
    session.accessToken = undefined;
    session.refreshToken = undefined;

    this.harness.recordEvent('oauth_token_revoked', config.provider, {
      sessionId,
    });

    return { ok: true };
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): OAuthSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): OAuthSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Reset (for cleanup)
   */
  reset(): void {
    this.sessions.clear();
  }
}

export const createOAuthSimulator = (harness: TestHarness): OAuthSimulator => {
  return new OAuthSimulator(harness);
};
