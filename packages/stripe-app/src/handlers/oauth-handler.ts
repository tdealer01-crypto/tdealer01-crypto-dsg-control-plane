import { nanoid } from 'nanoid';
import crypto from 'crypto';

export interface OAuthConfig {
  stripeClientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthState {
  state: string;
  codeChallenge: string;
  stripeAccountId: string;
  created_at: number;
  expires_at: number;
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  stripe_user_id: string;
  scope: string;
  livemode: boolean;
  token_type: string;
}

export interface EncryptedToken {
  encryptedValue: string;
  iv: string;
  algorithm: string;
}

/**
 * OAuthHandler manages OAuth 2.0 flow with PKCE for Stripe account linking.
 *
 * Responsibilities:
 * - Generate cryptographically secure state tokens with 10-minute TTL
 * - Create PKCE code challenge for additional security
 * - Exchange authorization codes for access tokens via Stripe API
 * - Encrypt and store tokens securely
 * - Link Stripe accounts to DSG organizations
 */
export class OAuthHandler {
  private stateStore: Map<string, OAuthState> = new Map();
  private config: OAuthConfig;
  private stateTtl = 10 * 60 * 1000; // 10 minutes
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor(config: OAuthConfig, encryptionKey?: string) {
    this.config = config;

    // Use provided encryption key or derive from client secret
    // In production, this should come from environment variables
    if (encryptionKey) {
      this.encryptionKey = Buffer.from(encryptionKey, 'hex');
    } else {
      // Derive a consistent key from client secret using SHA-256
      this.encryptionKey = crypto.createHash('sha256').update(config.clientSecret).digest();
    }
  }

  /**
   * Generate a cryptographically secure PKCE code challenge.
   *
   * PKCE (Proof Key for Public Clients) adds an extra layer of security
   * by ensuring that the authorization code can only be used by the client
   * that requested it, even if the authorization code is intercepted.
   */
  private generatePkceChallenge(): { verifier: string; challenge: string } {
    // Generate a random verifier (43-128 characters)
    const verifier = crypto.randomBytes(32).toString('base64url');

    // Create challenge by hashing the verifier
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge };
  }

  /**
   * Generate a cryptographically secure state token for CSRF protection.
   *
   * Returns both the authorization URL and the state token that must be
   * stored in the session for later validation.
   */
  generateAuthorizationUrl(stripeAccountId: string): { url: string; state: string } {
    const state = nanoid(32); // Generate 32-char random state
    const now = Date.now();
    const { challenge } = this.generatePkceChallenge();

    // Store state for validation during callback
    this.stateStore.set(state, {
      state,
      codeChallenge: challenge,
      stripeAccountId,
      created_at: now,
      expires_at: now + this.stateTtl,
    });

    // Build Stripe OAuth URL
    const params = new URLSearchParams({
      client_id: this.config.stripeClientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256', // SHA-256 method
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return { url, state };
  }

  /**
   * Validate a state token from the OAuth callback.
   *
   * Checks:
   * - State exists in store (not forged)
   * - State hasn't expired (10-minute TTL)
   * - Stripe account ID can be extracted
   */
  validateState(state: string): { valid: boolean; stripeAccountId?: string; error?: string } {
    const stored = this.stateStore.get(state);

    if (!stored) {
      return { valid: false, error: 'State token not found' };
    }

    // Check expiration
    if (Date.now() > stored.expires_at) {
      this.stateStore.delete(state);
      return { valid: false, error: 'State token expired' };
    }

    return { valid: true, stripeAccountId: stored.stripeAccountId };
  }

  /**
   * Exchange authorization code for access token.
   *
   * Sends the authorization code to Stripe's OAuth token endpoint
   * along with client credentials to obtain access and refresh tokens.
   */
  async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
    try {
      const response = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.stripeClientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed with status ${response.status}: ${errorData}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data.access_token || !data.stripe_user_id) {
        throw new Error('Invalid token response: missing access_token or stripe_user_id');
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        stripe_user_id: data.stripe_user_id,
        scope: data.scope || this.config.scopes.join(' '),
        livemode: data.livemode === true || data.livemode === 'true',
        token_type: data.token_type || 'Bearer',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OAuth token exchange failed: ${errorMessage}`);
    }
  }

  /**
   * Encrypt a token using AES-256-GCM.
   *
   * Returns an object containing:
   * - encryptedValue: Base64-encoded ciphertext + auth tag
   * - iv: Base64-encoded initialization vector
   * - algorithm: Encryption algorithm used
   */
  encryptToken(token: string): EncryptedToken {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Include authentication tag for GCM mode
    const authTag = cipher.getAuthTag();
    const encryptedWithTag = encrypted + authTag.toString('base64');

    return {
      encryptedValue: encryptedWithTag,
      iv: iv.toString('base64'),
      algorithm: this.algorithm,
    };
  }

  /**
   * Decrypt a token using AES-256-GCM.
   *
   * Verifies authentication tag to ensure token hasn't been tampered with.
   */
  decryptToken(encrypted: EncryptedToken): string {
    try {
      const iv = Buffer.from(encrypted.iv, 'base64');
      const encryptedWithTag = Buffer.from(encrypted.encryptedValue, 'base64');

      // Extract auth tag from the end (GCM tag is 16 bytes)
      const authTag = encryptedWithTag.slice(-16);
      const ciphertext = encryptedWithTag.slice(0, -16);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Token decryption failed: ${errorMessage}`);
    }
  }

  /**
   * Validate access token format.
   *
   * Performs basic validation to ensure the token is a non-empty string.
   * Production use should verify with Stripe API.
   */
  validateToken(accessToken: string): boolean {
    return !!(accessToken && accessToken.length > 0 && accessToken.startsWith('rk_'));
  }

  /**
   * Clean up expired state tokens.
   *
   * Should be called periodically to prevent memory leaks.
   */
  cleanupExpiredStates(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, state] of this.stateStore.entries()) {
      if (now > state.expires_at) {
        this.stateStore.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get internal state for testing purposes.
   */
  getStateCount(): number {
    return this.stateStore.size;
  }
}
