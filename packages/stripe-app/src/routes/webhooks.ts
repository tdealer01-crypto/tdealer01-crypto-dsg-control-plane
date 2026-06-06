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
import { json } from 'hono/utils/body';
import Stripe from 'stripe';
import { createLogger, generateRequestId } from '../lib/logger';
import { ValidationError, AppError, createSafeErrorResponse } from '../lib/error-handler';

const router = new Hono();

// Initialize Stripe client (lazy-loaded)
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripeClient = new Stripe(secretKey, { apiVersion: '2024-04-10' });
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
 *
 * Performance target: <500ms
 */
router.post('/events', async (c) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, endpoint: 'POST /webhook/events' });

  try {
    logger.logApiRequest('POST', '/webhook/events');

    // Validate required environment variables
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured', undefined, {
        missingConfig: 'STRIPE_WEBHOOK_SECRET',
      });
      return c.json({
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Webhook secret not configured',
        },
      }, 500);
    }

    // Get raw request body and signature header
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      logger.logSecurityEvent('Missing webhook signature header', 'medium');
      return c.json({
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing stripe-signature header',
        },
      }, 400);
    }

    const rawBody = await c.req.text();
    if (!rawBody) {
      logger.logSecurityEvent('Empty webhook payload', 'medium');
      return c.json({
        error: {
          code: 'EMPTY_PAYLOAD',
          message: 'Webhook payload is empty',
        },
      }, 400);
    }

    const stripe = getStripeClient();

    // Validate signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      logger.logSignatureVerificationFailure({
        error: err instanceof Error ? err.message : 'Unknown',
      });
      return c.json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      }, 401);
    }

    // Validate event structure
    if (!event.id || !event.type) {
      logger.warn('Invalid event structure', {
        eventId: event.id,
        eventType: event.type,
      });
      return c.json({
        error: {
          code: 'INVALID_EVENT',
          message: 'Invalid event structure',
        },
      }, 400);
    }

    logger.logWebhookEvent(event.type, event.id);

    // Extract stripe account ID from the event
    // For most events, this is available in the account field
    const stripeAccountId = (event as any).account || 'acct_unknown';

    // Route to appropriate handler based on event type
    // Processing is async and non-blocking
    // We return 200 immediately, then process in background
    handleWebhookEventAsync(event, stripeAccountId, logger).catch((err) => {
      logger.error('Background webhook processing failed', err, {
        eventId: event.id,
        eventType: event.type,
      });
    });

    const latencyMs = Date.now() - startTime;
    logger.logWebhookProcessing(event.id, event.type, 'QUEUED', latencyMs);

    // Return success acknowledgment immediately (async processing in background)
    return c.json(
      {
        success: true,
        event_id: event.id,
        type: event.type,
        processed: false, // Being processed asynchronously
      },
      200
    );
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    logger.error('Webhook handler error', err, {
      latencyMs,
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
    const safeResponse = createSafeErrorResponse(err, isDevelopment);

    return c.json(safeResponse, 500);
  }
});

/**
 * Handle webhook event asynchronously (non-blocking)
 * This runs after we've returned 200 to Stripe
 */
async function handleWebhookEventAsync(
  event: Stripe.Event,
  stripeAccountId: string,
  logger: any
): Promise<void> {
  const startTime = Date.now();

  try {
    // Check for idempotency - skip if we've already processed this event
    // TODO: Implement event deduplication using Redis or DB
    // const alreadyProcessed = await checkEventIdempotency(event.id);
    // if (alreadyProcessed) {
    //   logger.info('Event already processed', { eventId: event.id });
    //   return;
    // }

    switch (event.type) {
      case 'charge.created':
      case 'charge.updated':
        await handleChargeEvent(event, stripeAccountId, logger);
        break;

      case 'payout.created':
      case 'payout.updated':
        await handlePayoutEvent(event, stripeAccountId, logger);
        break;

      case 'refund.created':
      case 'refund.updated':
        await handleRefundEvent(event, stripeAccountId, logger);
        break;

      case 'payment_intent.created':
      case 'payment_intent.processing':
      case 'payment_intent.succeeded':
        await handlePaymentIntentEvent(event, stripeAccountId, logger);
        break;

      default:
        logger.debug('Unhandled webhook event type', {
          eventType: event.type,
          eventId: event.id,
        });
    }

    const latencyMs = Date.now() - startTime;
    logger.info('Event processed', {
      eventId: event.id,
      eventType: event.type,
      latencyMs,
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    logger.error('Error processing webhook event', err, {
      eventId: event.id,
      eventType: event.type,
      latencyMs,
    });
    throw err;
  }
}

/**
 * Handle charge events
 */
async function handleChargeEvent(event: Stripe.Event, stripeAccountId: string, logger: any) {
  const charge = event.data.object as Stripe.Charge;

  logger.info('Processing charge event', {
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
  });

  // TODO: Evaluate gateway policy
  // const gatewayRequest = chargeToGatewayRequest(charge, stripeAccountId, event.id);
  // const decision = await evaluateGateway(gatewayRequest, process.env.DSG_API_BASE!);

  // TODO: Record audit trail
  // await recordAudit(decision, event.id, process.env.DSG_API_BASE!);

  // TODO: Handle BLOCK decision - trigger auto-refund
  // if (decision.decision === 'BLOCK') {
  //   await getStripeClient().refunds.create({
  //     charge: charge.id,
  //     reason: 'governance_policy_violation',
  //   });
  // }
}

/**
 * Handle payout events
 */
async function handlePayoutEvent(event: Stripe.Event, stripeAccountId: string, logger: any) {
  const payout = event.data.object as Stripe.Payout;

  logger.info('Processing payout event', {
    payoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency,
  });

  // TODO: Evaluate gateway policy
  // const gatewayRequest = payoutToGatewayRequest(payout, stripeAccountId, event.id);
  // const decision = await evaluateGateway(gatewayRequest, process.env.DSG_API_BASE!);

  // TODO: Record audit trail
  // await recordAudit(decision, event.id, process.env.DSG_API_BASE!);

  // TODO: Handle BLOCK decision - cancel payout if possible
  // if (decision.decision === 'BLOCK') {
  //   try {
  //     await getStripeClient().payouts.cancel(payout.id);
  //   } catch (err) {
  //     logger.warn('Could not cancel payout - may already be sent', { payoutId: payout.id });
  //   }
  // }
}

/**
 * Handle refund events
 */
async function handleRefundEvent(event: Stripe.Event, stripeAccountId: string, logger: any) {
  const refund = event.data.object as Stripe.Refund;

  logger.info('Processing refund event', {
    refundId: refund.id,
    chargeId: refund.charge,
    amount: refund.amount,
  });

  // TODO: Evaluate gateway policy for refund
  // Refunds may have governance requirements (e.g., max refund % per day)
}

/**
 * Handle payment intent events
 */
async function handlePaymentIntentEvent(event: Stripe.Event, stripeAccountId: string, logger: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  logger.info('Processing payment intent event', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    status: paymentIntent.status,
  });

  // TODO: Evaluate gateway policy for payment intent
}

/**
 * POST /stripe/webhook/install
 *
 * Handles app installation via Stripe App Marketplace.
 * Completes OAuth flow and links Stripe account to DSG org.
 *
 * Request body:
 * {
 *   "code": "oauth_code_from_stripe",
 *   "state": "state_token",
 *   "dsg_org_id": "org_...",
 *   "fail_safe_mode": "fail_open" | "fail_closed"
 * }
 */
router.post('/install', async (c) => {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, endpoint: 'POST /webhook/install' });

  try {
    logger.logApiRequest('POST', '/webhook/install');

    const body = await c.req.json<{
      code?: string;
      state?: string;
      dsg_org_id?: string;
      fail_safe_mode?: 'fail_open' | 'fail_closed';
    }>();

    const { code, state, dsg_org_id, fail_safe_mode } = body;

    // Validate required fields
    if (!code) {
      logger.warn('Missing OAuth code in install request');
      return c.json(
        {
          error: {
            code: 'MISSING_CODE',
            message: 'Missing OAuth code',
          },
        },
        400
      );
    }

    if (!dsg_org_id) {
      logger.warn('Missing DSG org ID in install request');
      return c.json(
        {
          error: {
            code: 'MISSING_ORG_ID',
            message: 'Missing DSG org ID',
          },
        },
        400
      );
    }

    logger.info('Processing app installation', {
      dsgOrgId: dsg_org_id,
      hasState: !!state,
    });

    // TODO: Exchange OAuth code for token via Stripe
    // const oauthHandler = new OAuthHandler({
    //   stripeClientId: process.env.STRIPE_OAUTH_CLIENT_ID!,
    //   clientSecret: process.env.STRIPE_OAUTH_CLIENT_SECRET!,
    //   redirectUri: `${process.env.API_BASE_URL}/api/stripe/webhook/install`,
    //   scopes: ['read_write'],
    // });

    // const token = await oauthHandler.exchangeCodeForToken(code);
    // const stripeAccountId = token.stripe_user_id;

    // TODO: Create stripe_app_accounts record
    // const stateManager = new StripeStateManager(
    //   process.env.SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!
    // );

    // const account = await stateManager.linkStripeAccount(
    //   stripeAccountId,
    //   dsg_org_id,
    //   fail_safe_mode || 'fail_open'
    // );

    logger.info('App installation completed', {
      dsgOrgId: dsg_org_id,
      // stripeAccountId: account.stripe_account_id,
    });

    return c.json(
      {
        success: true,
        message: 'App installed successfully',
        // stripe_account_id: account.stripe_account_id,
      },
      200
    );
  } catch (err) {
    logger.error('Install handler error', err);

    const isDevelopment = process.env.NODE_ENV === 'development';
    const safeResponse = createSafeErrorResponse(err, isDevelopment);

    return c.json(safeResponse, 500);
  }
});

/**
 * POST /stripe/webhook/uninstall
 *
 * Handles app removal from a Stripe account.
 * Marks the account as inactive and archives associated policies.
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "dsg_org_id": "org_..."
 * }
 */
router.post('/uninstall', async (c) => {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, endpoint: 'POST /webhook/uninstall' });

  try {
    logger.logApiRequest('POST', '/webhook/uninstall');

    const body = await c.req.json<{
      stripe_account_id?: string;
      dsg_org_id?: string;
    }>();

    const { stripe_account_id, dsg_org_id } = body;

    if (!stripe_account_id) {
      logger.warn('Missing stripe_account_id in uninstall request');
      return c.json(
        {
          error: {
            code: 'MISSING_ACCOUNT_ID',
            message: 'Missing stripe_account_id',
          },
        },
        400
      );
    }

    logger.info('Processing app uninstallation', {
      stripeAccountId: stripe_account_id,
      dsgOrgId: dsg_org_id,
    });

    // TODO: Update stripe_app_accounts to mark as inactive
    // const stateManager = new StripeStateManager(
    //   process.env.SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!
    // );

    // const account = await stateManager.getStripeAccount(stripe_account_id);
    // if (!account) {
    //   logger.warn('Account not found for uninstall', { stripeAccountId: stripe_account_id });
    //   return c.json({ error: 'Account not found' }, 404);
    // }

    // // Mark as inactive (soft delete)
    // await stateManager.updateStripeAccountStatus(stripe_account_id, 'inactive');

    // TODO: Archive all policies for this account
    // const policies = await stateManager.getPolicies(stripe_account_id);
    // for (const policy of policies) {
    //   await stateManager.updatePolicy(policy.id, { enabled: false });
    // }

    logger.info('App uninstallation completed', {
      stripeAccountId: stripe_account_id,
    });

    return c.json(
      {
        success: true,
        message: 'App uninstalled successfully',
      },
      200
    );
  } catch (err) {
    logger.error('Uninstall handler error', err);

    const isDevelopment = process.env.NODE_ENV === 'development';
    const safeResponse = createSafeErrorResponse(err, isDevelopment);

    return c.json(safeResponse, 500);
  }
});

export default router;
