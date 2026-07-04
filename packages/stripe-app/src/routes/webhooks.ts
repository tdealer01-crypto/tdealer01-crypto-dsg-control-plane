/**
 * Stripe Webhook Router
 *
 * Handles incoming Stripe events from the Stripe App Marketplace.
 * - Validates webhook signatures
 * - Routes to appropriate handlers
 * - Logs to audit trail
 *
 * Performance target: <500ms response time (well under Stripe's 5s timeout)
 */

import { Hono } from 'hono';
import Stripe from 'stripe';
import {
  getSupabase,
  gatewayCheckStripeOperation,
  recordStripeDecision,
  getFailSafeMode,
} from '../lib/dsg-client';

const router = new Hono();

// Lazy-loaded Stripe client
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

// Extract amount and currency from various Stripe event object types
function extractEventContext(
  event: Stripe.Event
): { amount_cents?: number; currency?: string; customer_id?: string; object_id: string; object_type: string } {
  const obj = event.data.object as unknown as Record<string, unknown>;
  const amount = (obj.amount as number) || undefined;
  const currency = (obj.currency as string) || undefined;
  const customer = (obj.customer as string) || undefined;

  return {
    amount_cents: amount,
    currency,
    customer_id: customer,
    object_id: (obj.id as string) || event.id,
    object_type: event.type.split('.')[0],
  };
}

// Map Stripe event type to DSG operation type
function mapOperationType(eventType: string): string {
  if (eventType.startsWith('charge.')) return 'charge.create';
  if (eventType.startsWith('payout.')) return 'payout.create';
  if (eventType.startsWith('refund.')) return 'refund.create';
  if (eventType.startsWith('payment_intent.')) return 'charge.create';
  return eventType;
}

/**
 * POST /stripe/webhook/events
 *
 * Receives and processes Stripe webhook events.
 */
router.post('/events', async (c) => {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return c.json({ error: 'Webhook secret not configured' }, 500);
    }

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

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    // Extract the Stripe account ID from the event
    const stripeAccountId = event.account || '';

    // Skip processing if no account context (e.g., test events)
    if (!stripeAccountId) {
      return c.json({
        success: true,
        event_id: event.id,
        type: event.type,
        decision: 'SKIP',
        reason: 'No account context',
      }, 200);
    }

    // Extract context from event payload
    const ctx = extractEventContext(event);
    const operationType = mapOperationType(event.type);

    // Check if this event type should be governed
    const governedTypes = [
      'charge.created', 'charge.updated', 'charge.succeeded', 'charge.failed',
      'payout.created', 'payout.updated', 'payout.paid', 'payout.failed',
      'refund.created', 'refund.updated',
      'payment_intent.created', 'payment_intent.succeeded', 'payment_intent.payment_failed',
    ];

    if (!governedTypes.includes(event.type)) {
      // Not a governed event, just acknowledge
      return c.json({
        success: true,
        event_id: event.id,
        type: event.type,
        decision: 'ALLOW',
        reason: 'Event type not governed',
      }, 200);
    }

    // Evaluate against DSG policies
    let decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
    let reason: string;
    let policyId: string | undefined;

    try {
      const result = await gatewayCheckStripeOperation({
        stripe_account_id: stripeAccountId,
        action: operationType,
        amount_cents: ctx.amount_cents,
        currency: ctx.currency,
        context: {
          customer_id: ctx.customer_id,
          stripe_event_id: event.id,
          object_id: ctx.object_id,
          object_type: ctx.object_type,
        },
      });

      decision = result.decision;
      reason = result.reason;
      policyId = result.policy_id;
    } catch (err) {
      // Fail-safe: check account preference
      const failSafe = await getFailSafeMode(stripeAccountId);
      const isPayout = event.type.startsWith('payout.');
      // Payouts default to fail_closed, charges default to fail_open
      const defaultDecision = isPayout ? 'REVIEW' : (failSafe === 'closed' ? 'BLOCK' : 'ALLOW');

      decision = defaultDecision as 'ALLOW' | 'BLOCK' | 'REVIEW';
      reason = `Gateway error, fail-safe: ${defaultDecision} (${err instanceof Error ? err.message : 'Unknown'})`;
    }

    // Record decision in audit trail
    try {
      await recordStripeDecision(
        event.id,
        ctx.object_id,
        operationType,
        decision,
        policyId
      );
    } catch (err) {
      console.error('[Webhook] Audit recording failed:', err);
      // Don't fail the request if audit fails
    }

    // Log the decision
    console.log(
      `[Webhook] Decision for ${event.type} on ${ctx.object_id}: ${decision} (${reason})`
    );

    return c.json({
      success: true,
      event_id: event.id,
      type: event.type,
      decision,
      reason,
      policy_id: policyId,
    }, 200);
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
    const body = await c.req.json<{
      code?: string;
      state?: string;
      fail_safe_mode?: 'open' | 'closed';
    }>();

    if (!body.code) {
      return c.json({ error: 'Missing OAuth code' }, 400);
    }

    // Exchange authorization code for access token via Stripe OAuth
    const clientId = process.env.STRIPE_CLIENT_ID;
    const clientSecret = process.env.STRIPE_SECRET_KEY;
    if (!clientId || !clientSecret) {
      return c.json({ error: 'Stripe OAuth credentials not configured' }, 500);
    }

    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: body.code,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      console.error('[Install] OAuth token exchange failed:', tokenError);
      return c.json({ error: 'OAuth token exchange failed' }, 400);
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      stripe_user_id: string;
      scope: string;
      token_type: string;
    };

    // Link Stripe account to DSG org in Supabase
    const supabase = getSupabase();
    const { error } = await supabase
      .from('stripe_app_accounts')
      .upsert({
        stripe_account_id: tokenData.stripe_user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        scopes: tokenData.scope,
        status: 'active',
        fail_safe_mode: body.fail_safe_mode || 'open',
        linked_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Install] Failed to link account:', error.message);
      return c.json({ error: 'Failed to link account' }, 500);
    }

    // Record installation in audit trail
    await recordStripeDecision(
      `install_${Date.now()}`,
      tokenData.stripe_user_id,
      'app.install',
      'ALLOW',
      undefined
    );

    return c.json({
      success: true,
      stripe_account_id: tokenData.stripe_user_id,
      message: 'App installed successfully',
      next_step: 'configure_policies',
    }, 200);
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
    const body = await c.req.json<{ stripe_account_id?: string }>();

    if (!body.stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    const supabase = getSupabase();

    // Mark account as inactive
    const { error: acctError } = await supabase
      .from('stripe_app_accounts')
      .update({
        status: 'inactive',
        unlinked_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', body.stripe_account_id);

    if (acctError) {
      console.error('[Uninstall] Failed to mark account inactive:', acctError.message);
    }

    // Archive associated policies (disable but keep for audit)
    const { error: policyError } = await supabase
      .from('stripe_operation_policies')
      .update({ enabled: false })
      .eq('stripe_account_id', body.stripe_account_id);

    if (policyError) {
      console.error('[Uninstall] Failed to archive policies:', policyError.message);
    }

    // Record uninstall event in audit trail
    await recordStripeDecision(
      `uninstall_${Date.now()}`,
      body.stripe_account_id,
      'app.uninstall',
      'ALLOW',
      undefined
    );

    return c.json({
      success: true,
      message: 'App uninstalled successfully',
    }, 200);
  } catch (err) {
    console.error('Uninstall handler error:', err);
    return c.json({ error: 'Uninstallation failed' }, 500);
  }
});

export default router;
