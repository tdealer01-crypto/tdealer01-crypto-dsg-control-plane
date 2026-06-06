/**
 * OAuth Router
 *
 * Handles OAuth flows for linking Stripe accounts to DSG organizations.
 * Uses standard OAuth 2.0 authorization code flow with PKCE support.
 */

import { Hono } from 'hono';

const router = new Hono();

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

    // TODO: Generate state token and store in temporary cache (TTL 10min)
    // TODO: State should include encrypted stripe_account_id
    // TODO: Validate redirect_uri against registered URIs
    // TODO: Generate PKCE challenge (code_challenge, code_challenge_method)
    // TODO: Construct Stripe OAuth URL with:
    //   - client_id (STRIPE_CLIENT_ID env var)
    //   - redirect_uri
    //   - scopes (e.g., "read_customers,write_charges")
    //   - state
    //   - code_challenge
    // TODO: Redirect to Stripe OAuth endpoint

    return c.json(
      {
        message: 'Redirect URL would be generated here',
        oauth_url: 'https://connect.stripe.com/oauth/authorize?...',
      },
      200
    );
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
      error?: string;
      error_description?: string;
    }>();

    const { code, state, code_verifier, error, error_description } = body;

    if (error) {
      return c.json(
        { error: `Authorization error: ${error}`, description: error_description },
        400
      );
    }

    if (!code || !state) {
      return c.json({ error: 'Missing code or state parameter' }, 400);
    }

    // TODO: Validate state token from cache
    // TODO: Decode state to extract stripe_account_id
    // TODO: Exchange authorization code for access token via Stripe API
    // TODO: Use PKCE code_verifier to verify code_challenge
    // TODO: Create/update stripe_app_accounts record with:
    //   - stripe_account_id
    //   - access_token (encrypted)
    //   - refresh_token (encrypted, if available)
    //   - token_expires_at
    //   - scopes
    //   - status = 'active'
    // TODO: Ask user for fail_safe_mode preference (via redirect to setup page)
    // TODO: Record account linking in audit trail
    // TODO: Clear state token from cache
    // TODO: Return success or redirect to setup page

    return c.json(
      {
        success: true,
        message: 'Account linked successfully',
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

    // TODO: Call Stripe OAuth revoke endpoint
    // TODO: Mark stripe_app_accounts as inactive
    // TODO: Archive associated policies
    // TODO: Record revocation in audit trail
    // TODO: Return success

    return c.json(
      {
        success: true,
        message: 'Account access revoked successfully',
      },
      200
    );
  } catch (err) {
    console.error('OAuth revoke error:', err);
    return c.json({ error: 'Revoke failed' }, 500);
  }
});

export default router;
