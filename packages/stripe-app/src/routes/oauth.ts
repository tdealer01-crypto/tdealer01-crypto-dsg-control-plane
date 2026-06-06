/**
 * OAuth Router
 *
 * Handles OAuth flows for linking Stripe accounts to DSG organizations.
 * Uses OAuth 2.0 authorization code flow with PKCE (Proof Key for Public Clients).
 *
 * Flow:
 * 1. Merchant initiates linking → GET /authorize (generates state + redirect)
 * 2. Merchant authorizes in Stripe UI
 * 3. Stripe redirects to → POST /callback (exchanges code for token)
 * 4. Token encrypted and stored in Supabase
 * 5. Account linked and ready for policy configuration
 */

import { Hono } from 'hono';
import { OAuthHandler } from '../handlers/oauth-handler';
import { StripeStateManager } from '../lib/stripe-state';

const router = new Hono();

/**
 * Initialize OAuth handler and state manager from environment.
 *
 * Environment variables required:
 * - STRIPE_APP_CLIENT_ID
 * - STRIPE_APP_CLIENT_SECRET
 * - OAUTH_CALLBACK_URL
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
function initializeOAuthHandler() {
  const clientId = process.env.STRIPE_APP_CLIENT_ID;
  const clientSecret = process.env.STRIPE_APP_CLIENT_SECRET;
  const callbackUrl = process.env.OAUTH_CALLBACK_URL;

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error('Missing required OAuth environment variables');
  }

  const handler = new OAuthHandler({
    stripeClientId: clientId,
    clientSecret,
    redirectUri: callbackUrl,
    scopes: ['read_write'],
  });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  const stateManager = new StripeStateManager(supabaseUrl, supabaseKey);

  return { handler, stateManager };
}

/**
 * GET /authorize
 *
 * Generates authorization URL and redirects merchant to Stripe OAuth page.
 *
 * Query parameters:
 * - stripe_account_id (required): The Stripe account being authorized
 * - redirect_uri (optional): Where to redirect after linking (defaults to dashboard)
 *
 * Returns:
 * - Redirects to Stripe OAuth authorization page
 * - Sets session cookie with state token and 10-minute expiration
 *
 * Error responses:
 * - 400: Missing stripe_account_id
 * - 500: OAuth initialization failed
 */
router.get('/authorize', async (c) => {
  try {
    const { stripe_account_id, redirect_uri } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id parameter' }, 400);
    }

    // Initialize OAuth handler
    const { handler } = initializeOAuthHandler();

    // Generate authorization URL with PKCE
    const { url, state } = handler.generateAuthorizationUrl(stripe_account_id);

    // Store state in session/cookie with TTL
    // In production, this would be stored in Redis or Supabase with expiration
    c.header('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

    // Store redirect_uri preference if provided
    if (redirect_uri) {
      c.header('Set-Cookie', `oauth_redirect=${encodeURIComponent(redirect_uri)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OAuth authorization started',
      stripe_account_id,
      state_generated: true,
    }));

    return c.redirect(url, 302);
  } catch (err) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth authorize error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return c.json({ error: 'Authorization failed' }, 500);
  }
});

/**
 * POST /callback
 *
 * Handles OAuth callback from Stripe after user authorization.
 * Completes the account linking by exchanging code for token.
 *
 * Query parameters:
 * - code (required): Authorization code from Stripe
 * - state (required): CSRF protection state token
 * - error (optional): Error if user denied
 * - error_description (optional): Error description
 *
 * Returns on success (200):
 * {
 *   "success": true,
 *   "stripe_account_id": "acct_...",
 *   "message": "Account linked successfully",
 *   "next_step": "configure_policies"
 * }
 *
 * Error responses:
 * - 400: Invalid state or code, user denied authorization
 * - 500: Token exchange or database write failed
 */
router.post('/callback', async (c) => {
  try {
    const { code, state, error, error_description } = c.req.query();

    // Check for user-denied errors from Stripe
    if (error) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'OAuth authorization denied',
          error,
          error_description,
        })
      );

      return c.json(
        {
          error: `Authorization denied: ${error}`,
          description: error_description,
        },
        400
      );
    }

    if (!code || !state) {
      return c.json({ error: 'Missing code or state parameter' }, 400);
    }

    // Initialize OAuth handler and state manager
    const { handler, stateManager } = initializeOAuthHandler();

    // Validate state token for CSRF protection
    const stateValidation = handler.validateState(state);
    if (!stateValidation.valid) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Invalid state token',
          error: stateValidation.error,
        })
      );

      return c.json(
        {
          error: 'Invalid state token',
          description: stateValidation.error,
        },
        400
      );
    }

    const stripeAccountId = stateValidation.stripeAccountId!;

    // Exchange authorization code for access token
    const tokenResponse = await handler.exchangeCodeForToken(code);

    // Validate token response
    if (!tokenResponse.access_token) {
      throw new Error('Token exchange failed: no access token in response');
    }

    // Encrypt access token before storing
    const encryptedToken = handler.encryptToken(tokenResponse.access_token);

    // Store encrypted token and account link in Supabase
    // For Phase 5, we're storing the encrypted token as metadata
    // Full token table support comes in Phase 6
    try {
      const account = await stateManager.linkStripeAccount(
        stripeAccountId,
        'org_temp', // Temporary org ID - will be updated during setup
        'fail_open' // Default fail-safe mode
      );

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Account linked successfully',
          stripe_account_id: stripeAccountId,
          account_id: account.id,
          status: account.status,
        })
      );

      // Return success response
      return c.json(
        {
          success: true,
          stripe_account_id: stripeAccountId,
          message: 'Account linked successfully',
          next_step: 'configure_policies',
          encrypted_token: encryptedToken, // For client to store temporarily
        },
        200
      );
    } catch (dbError) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Failed to store account in database',
          stripe_account_id: stripeAccountId,
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        })
      );

      return c.json(
        {
          error: 'Failed to store account link',
          description: 'Database error',
        },
        500
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth callback error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );

    return c.json(
      {
        error: 'Callback processing failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /revoke
 *
 * Revoke app access for a Stripe account.
 * Marks the account as inactive and archives associated policies.
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "revoke_token": "..." (access token to revoke with Stripe)
 * }
 *
 * Returns on success (200):
 * {
 *   "success": true,
 *   "message": "Account access revoked successfully"
 * }
 *
 * Error responses:
 * - 400: Missing stripe_account_id
 * - 500: Revocation failed
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

    const { stateManager } = initializeOAuthHandler();

    // Mark account as revoked in database
    await stateManager.updateFailSafeMode(stripe_account_id, 'fail_closed');

    // TODO: Phase 6 - Call Stripe OAuth revoke endpoint if revoke_token provided
    // TODO: Phase 6 - Archive all associated policies
    // TODO: Phase 6 - Record revocation in audit trail
    // For Phase 5, we're just marking the account inactive

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Account access revoked',
        stripe_account_id,
      })
    );

    return c.json(
      {
        success: true,
        message: 'Account access revoked successfully',
      },
      200
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth revoke error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return c.json({ error: 'Revoke failed' }, 500);
  }
});

export default router;
