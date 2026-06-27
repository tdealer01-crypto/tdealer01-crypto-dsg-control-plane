import { nanoid } from 'nanoid';

export interface OAuthConfig {
  stripeClientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthState {
  state: string;
  created_at: number;
  expires_at: number;
}

export class OAuthHandler {
  private stateStore: Map<string, OAuthState> = new Map();
  private config: OAuthConfig;
  private stateTtl = 10 * 60 * 1000; // 10 minutes

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  generateAuthorizationUrl(): { url: string; state: string } {
    const state = nanoid();
    const now = Date.now();

    // Store state for validation
    this.stateStore.set(state, {
      state,
      created_at: now,
      expires_at: now + this.stateTtl,
    });

    // Stripe OAuth URL format
    const params = new URLSearchParams({
      client_id: this.config.stripeClientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return { url, state };
  }

  validateState(state: string): boolean {
    const stored = this.stateStore.get(state);

    if (!stored) {
      return false;
    }

    // Check expiration
    if (Date.now() > stored.expires_at) {
      this.stateStore.delete(state);
      return false;
    }

    return true;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    stripe_user_id: string;
    scope: string;
    livemode: string | boolean;
  }> {
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
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  validateToken(accessToken: string): boolean {
    // Basic validation - in production, verify with Stripe
    return !!(accessToken && accessToken.length > 0);
  }
}
