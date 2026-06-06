/**
 * OAuth Router
 *
 * Handles OAuth flows for linking Stripe accounts to DSG organizations.
 */

import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /stripe/oauth/authorize
 *
 * OAuth authorization endpoint.
 * Redirects user to DSG auth flow with state parameter.
 */
router.get('/authorize', async (c) => {
  try {
    const { state } = c.req.query();

    if (!state) {
      return c.json({ error: 'Missing state parameter' }, 400);
    }

    // TODO: Validate state parameter
    // TODO: Redirect to DSG OAuth authorization endpoint
    // TODO: Include stripe_account_id in state (encrypted)

    return c.text('Redirecting to DSG authorization...');
  } catch (err) {
    console.error('OAuth authorize error:', err);
    return c.json({ error: 'Authorization failed' }, 500);
  }
});

/**
 * GET /stripe/oauth/callback
 *
 * OAuth callback from DSG.
 * Completes linking Stripe account to DSG org.
 */
router.get('/callback', async (c) => {
  try {
    const { code, state, error } = c.req.query();

    if (error) {
      return c.json({ error: `Authorization error: ${error}` }, 400);
    }

    if (!code || !state) {
      return c.json({ error: 'Missing code or state' }, 400);
    }

    // TODO: Decode state to get stripe_account_id
    // TODO: Exchange code for access token
    // TODO: Link stripe_account_id to dsg_org_id in stripe_app_accounts
    // TODO: Ask user for fail_safe_mode preference
    // TODO: Redirect to Stripe dashboard with success message

    return c.json({ success: true, message: 'Account linked successfully' }, 200);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.json({ error: 'Callback failed' }, 500);
  }
});

export default router;
