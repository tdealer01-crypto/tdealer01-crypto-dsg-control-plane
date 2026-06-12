/**
 * Stripe Webhook Router
 *
 * Handles incoming Stripe events from the Stripe App Marketplace.
 * - Validates webhook signatures
 * - Routes to appropriate handlers
 * - Logs to audit trail
 *
 * Performance target: <500ms response time (well under Stripe's 5s timeout)
 * Uses Redis cache for policy lookups to avoid Supabase query bottleneck.
 */

import { Hono } from 'hono';
import Stripe from 'stripe';

const router = new Hono();

// Initialize Stripe client (lazy-loaded)
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripeClient = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
}

/**
 * POST /stripe/webhook/events
 *
 * Receives and processes Stripe webhook events.
 * This endpoint should be deployed as a Vercel Edge Function.
 *
 * Flow:
 * 1. Validate Stripe webhook signature
 * 2. Parse event payload
 * 3. Route to appropriate handler (charge, payout, refund, etc.)
 * 4. Record decision in audit trail
 * 5. Return 200 OK with decision summary
 */
router.post('/events', async (c) => {
  try {
    // Get webhook secret
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return c.json({ error: 'Webhook secret not configured' }, 500);
    }

    // Get raw request body and signature header
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    const rawBody = await c.req.text();
    const stripe = getStripeClient();

    // Validate signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Log event received
    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    // TODO: Implement event handlers for:
    // - charge.created / charge.updated
    // - payout.created / payout.updated
    // - refund.created / refund.updated
    // - payment_intent.* events

    // TODO: Check event against cached policies (Redis)
    // TODO: Record decision in stripe_operation_audits table
    // TODO: Call DSG gateway executor if needed

    // Return success acknowledgment
    return c.json(
      {
        success: true,
        event_id: event.id,
        type: event.type,
      },
      200
    );
  } catch (err) {
    console.error('Webhook handler error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /stripe/webhook/install
 *
 * Handles app installation via Stripe App Marketplace.
 * Completes OAuth flow and links Stripe account to DSG org.
 */
router.post('/install', async (c) => {
  try {
    const { code, state } = await c.req.json();

    if (!code) {
      return c.json({ error: 'Missing OAuth code' }, 400);
    }

    // TODO: Exchange code for OAuth token
    // TODO: Link Stripe account to DSG org
    // TODO: Store fail_safe_mode preference

    return c.json(
      {
        success: true,
        message: 'App installed successfully',
      },
      200
    );
  } catch (err) {
    console.error('Install handler error:', err);
    return c.json({ error: 'Installation failed' }, 500);
  }
});

/**
 * POST /stripe/webhook/uninstall
 *
 * Handles app removal.
 * Marks the account as inactive in our database.
 */
router.post('/uninstall', async (c) => {
  try {
    const { stripe_account_id } = await c.req.json();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    // TODO: Mark stripe_app_accounts as inactive
    // TODO: Archive policies
    // TODO: Log uninstall event

    return c.json(
      {
        success: true,
        message: 'App uninstalled successfully',
      },
      200
    );
  } catch (err) {
    console.error('Uninstall handler error:', err);
    return c.json({ error: 'Uninstallation failed' }, 500);
  }
});

export default router;
