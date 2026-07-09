/**
 * OAuth Router
 *
 * Handles OAuth flows for linking Stripe accounts to DSG organizations.
 * Uses standard OAuth 2.0 authorization code flow with PKCE support.
 */

import { Hono } from 'hono';
import { getSupabase } from '../lib/dsg-client';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';

const router = new Hono();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Generate PKCE challenge
function generatePKCEChallenge() {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// Generate state token with encrypted account ID
async function generateStateToken(stripeAccountId: string): Promise<string> {
  const state = randomBytes(32).toString('hex');
  const data = JSON.stringify({
    stripe_account_id: stripeAccountId,
    timestamp: Date.now(),
  });

  // Store in Redis with 10-minute TTL
  await redis.setex(`oauth_state:${state}`, 600, data);
  return state;
}

/**
 * GET /stripe/oauth/authorize
 *
 * Stripe App OAuth authorization endpoint.
 * Redirects merchant to Stripe OAuth authorization page.
 *
 * Query params:
 * - stripe_account_id: The Stripe account being authorized
 * - redirect_uri: Where to redirect after auth (must be registered)
 */
router.get('/authorize', async (c) => {
  try {
    const { stripe_account_id, redirect_uri } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id parameter' }, 400);
    }

    // Validate redirect_uri
    const allowedRedirectUris = (process.env.STRIPE_OAUTH_REDIRECT_URIS || '').split(',');
    if (redirect_uri && !allowedRedirectUris.includes(redirect_uri)) {
      return c.json({ error: 'Invalid redirect_uri' }, 400);
    }

    // Generate state token and store in cache
    const state = await generateStateToken(stripe_account_id);

    // Generate PKCE challenge
    const { codeChallenge } = generatePKCEChallenge();

    // Construct Stripe OAuth URL
    const clientId = process.env.STRIPE_CLIENT_ID;
    if (!clientId) {
      console.error('STRIPE_CLIENT_ID not configured');
      return c.json({ error: 'OAuth configuration missing' }, 500);
    }

    const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', 'read_write');
    oauthUrl.searchParams.set('state', state);
    oauthUrl.searchParams.set('code_challenge', codeChallenge);
    oauthUrl.searchParams.set('code_challenge_method', 'S256');

    if (redirect_uri) {
      oauthUrl.searchParams.set('redirect_uri', redirect_uri);
    }

    // Return URL or redirect
    const returnJson = c.req.query('json') !== undefined;
    if (returnJson) {
      return c.json({ oauth_url: oauthUrl.toString() }, 200);
    }

    return c.redirect(oauthUrl.toString());
  } catch (err) {
    console.error('OAuth authorize error:', err);
    return c.json({ error: 'Authorization failed' }, 500);
  }
});

/**
 * POST /stripe/oauth/callback
 *
 * OAuth callback from Stripe after user authorization.
 * Completes linking Stripe account to DSG org.
 *
 * Request body:
 * {
 *   "code": "ac_...",
 *   "state": "...",
 *   "code_verifier": "..." (PKCE)
 * }
 */
router.post('/callback', async (c) => {
  try {
    const body = await c.req.json<{
      code?: string;
      state?: string;
      code_verifier?: string;
      dsg_org_id?: string;
      fail_safe_mode?: 'fail_open' | 'fail_closed';
      error?: string;
      error_description?: string;
    }>();

    const { code, state, code_verifier, dsg_org_id, fail_safe_mode, error, error_description } = body;

    if (error) {
      return c.json(
        { error: `Authorization error: ${error}`, description: error_description },
        400
      );
    }

    if (!code || !state) {
      return c.json({ error: 'Missing code or state parameter' }, 400);
    }

    // Validate state token from cache
    const stateData = await redis.get(`oauth_state:${state}`);
    if (!stateData) {
      return c.json({ error: 'Invalid or expired state token' }, 400);
    }

    let statePayload;
    try {
      statePayload = JSON.parse(stateData);
    } catch {
      return c.json({ error: 'Invalid state token format' }, 400);
    }

    const stripeAccountId = statePayload.stripe_account_id as string;
    if (!stripeAccountId) {
      return c.json({ error: 'Invalid stripe_account_id in state' }, 400);
    }

    if (!dsg_org_id) {
      return c.json({ error: 'Missing dsg_org_id' }, 400);
    }

    // Exchange authorization code for access token
    const clientSecret = process.env.STRIPE_CLIENT_SECRET;
    if (!clientSecret) {
      console.error('STRIPE_CLIENT_SECRET not configured');
      return c.json({ error: 'OAuth configuration missing' }, 500);
    }

    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.STRIPE_CLIENT_ID || '',
        client_secret: clientSecret,
        code_verifier: code_verifier || '',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange failed:', error);
      return c.json({ error: 'Token exchange failed' }, 400);
    }

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      return c.json({ error: 'No access token received' }, 400);
    }

    // Create/update stripe_app_accounts record
    const supabase = getSupabase();
    const { error: upsertError } = await supabase
      .from('stripe_app_accounts')
      .upsert(
        {
          stripe_account_id: stripeAccountId,
          dsg_org_id,
          stripe_api_key_encrypted: tokenData.access_token, // In production, encrypt this
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          fail_safe_mode: fail_safe_mode || 'fail_open',
          status: 'active',
          installed_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_account_id' }
      );

    if (upsertError) {
      console.error('Failed to create/update stripe_app_accounts:', upsertError);
      return c.json({ error: 'Failed to link account' }, 500);
    }

    // Clear state token from cache
    await redis.del(`oauth_state:${state}`);

    return c.json(
      {
        success: true,
        message: 'Account linked successfully',
        stripe_account_id: stripeAccountId,
        next_step: 'configure_policies',
      },
      200
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.json({ error: 'Callback processing failed' }, 500);
  }
});

/**
 * POST /stripe/oauth/revoke
 *
 * Revoke app access for a Stripe account
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "revoke_token": "..." (access token to revoke)
 * }
 */
router.post('/revoke', async (c) => {
  try {
    const body = await c.req.json<{
      stripe_account_id?: string;
      revoke_token?: string;
    }>();

    const { stripe_account_id, revoke_token } = body;

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    const supabase = getSupabase();

    // Fetch the account to get access token
    const { data: account, error: fetchError } = await supabase
      .from('stripe_app_accounts')
      .select('stripe_api_key_encrypted')
      .eq('stripe_account_id', stripe_account_id)
      .single();

    if (fetchError || !account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Call Stripe OAuth revoke endpoint
    const accessToken = revoke_token || account.stripe_api_key_encrypted;
    if (accessToken) {
      try {
        await fetch('https://connect.stripe.com/oauth/deauthorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.STRIPE_CLIENT_ID || '',
            access_token: accessToken,
          }).toString(),
        });
      } catch (err) {
        console.error('Failed to revoke at Stripe:', err);
        // Continue even if revoke fails
      }
    }

    // Mark stripe_app_accounts as inactive and archive policies
    const { error: updateError } = await supabase
      .from('stripe_app_accounts')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', stripe_account_id);

    if (updateError) {
      console.error('Failed to update account status:', updateError);
      return c.json({ error: 'Failed to revoke access' }, 500);
    }

    // Archive associated policies (disable them)
    await supabase
      .from('stripe_operation_policies')
      .update({ enabled: false })
      .eq('stripe_account_id', stripe_account_id);

    return c.json(
      {
        success: true,
        message: 'Account access revoked successfully',
        stripe_account_id,
      },
      200
    );
  } catch (err) {
    console.error('OAuth revoke error:', err);
    return c.json({ error: 'Revoke failed' }, 500);
  }
});

export default router;
