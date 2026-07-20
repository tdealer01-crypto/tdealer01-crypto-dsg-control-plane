import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import type { Database, Json } from '../../../../lib/database.types';
import { sendTrialWelcome, sendUpgradeSuccess, sendPaymentFailed } from '../../../../lib/email/sales';
import { fulfillSubscription, revokeSubscription } from '../../../../lib/billing/fulfillment';
import { REVOKED_STATUSES } from '../../../../lib/billing/entitlements';
import { captureEvent } from '../../../../lib/telemetry/capture-event';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Structured logging helper for webhook operations
 */
function logWebhook(level: 'info' | 'error', message: string, data: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...data }));
}
type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type PriceMapping = {
  planKey: string | null;
  billingInterval: string | null;
};
type BillingSubscriptionInsert = Database['public']['Tables']['billing_subscriptions']['Insert'];

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey);
}

function getPriceMap(): Map<string, PriceMapping> {
  const map = new Map<string, PriceMapping>();

  const entries = [
    ['STRIPE_PRICE_PRO_MONTHLY', 'pro', 'monthly'],
    ['STRIPE_PRICE_PRO_YEARLY', 'pro', 'yearly'],
    ['STRIPE_PRICE_BUSINESS_MONTHLY', 'business', 'monthly'],
    ['STRIPE_PRICE_BUSINESS_YEARLY', 'business', 'yearly'],
    ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'enterprise', 'monthly'],
    ['STRIPE_PRICE_ENTERPRISE_YEARLY', 'enterprise', 'yearly'],
    ['STRIPE_PRICE_PRO', 'pro', 'monthly'],
    ['STRIPE_PRICE_BUSINESS', 'business', 'monthly'],
  ] as const;

  for (const [envName, planKey, billingInterval] of entries) {
    const value = process.env[envName];
    if (value) {
      map.set(value, { planKey, billingInterval });
    }
  }

  return map;
}

function toIso(value: number | null | undefined) {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000).toISOString();
}

async function lookupRefCode(supabase: SupabaseAdmin, email: string | null): Promise<string | null> {
  if (!email) return null;

  const { data: signup } = await (supabase as any)
    .from('trial_signups')
    .select('ref_code')
    .eq('email', email)
    .not('ref_code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (signup?.ref_code) return String(signup.ref_code);

  const { data: accessReq } = await (supabase as any)
    .from('access_requests')
    .select('ref_code')
    .eq('email', email)
    .not('ref_code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return accessReq?.ref_code ? String(accessReq.ref_code) : null;
}

async function resolveOrgIdByEmail(supabase: SupabaseAdmin, email: string | null) {
  if (!email) return null;

  const { data, error } = await supabase
    .from('users')
    .select('org_id')
    .eq('email', email)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]?.org_id) {
    return null;
  }

  return String(data[0].org_id);
}

async function getBillingCustomer(supabase: SupabaseAdmin, stripeCustomerId: string | null) {
  if (!stripeCustomerId) return null;

  const { data, error } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id, org_id, email, name')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function recordEvent(supabase: SupabaseAdmin, event: Stripe.Event) {
  const object = event.data.object as unknown as Record<string, unknown>;

  const stripeCustomerId =
    typeof object?.customer === 'string' ? object.customer : null;

  const stripeSubscriptionId =
    typeof object?.subscription === 'string'
      ? object.subscription
      : object?.object === 'subscription' && typeof object?.id === 'string'
        ? object.id
        : null;

  await supabase.from('billing_events').upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      payload: event as unknown as Json,
      processed_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_event_id',
    }
  );
}

function isDuplicateEventError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

  return (
    code === '23505' ||
    /duplicate key/i.test(message) ||
    /unique constraint/i.test(message)
  );
}

function generateMCPKey(): string {
  return 'dsg_' + crypto.randomBytes(24).toString('hex');
}

function hashMCPKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function getMCPKeyPrefix(key: string): string {
  return key.substring(0, 16) + '...';
}

async function claimEventProcessing(supabase: SupabaseAdmin, event: Stripe.Event) {
  const object = event.data.object as unknown as Record<string, unknown>;

  const stripeCustomerId =
    typeof object?.customer === 'string' ? object.customer : null;

  const stripeSubscriptionId =
    typeof object?.subscription === 'string'
      ? object.subscription
      : object?.object === 'subscription' && typeof object?.id === 'string'
        ? object.id
        : null;

  const { error } = await supabase.from('billing_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    payload: event as unknown as Json,
    processed_at: new Date().toISOString(),
  });

  if (error) {
    if (isDuplicateEventError(error)) return false;
    throw error;
  }

  return true;
}

async function releaseEventClaim(supabase: SupabaseAdmin, eventId: string) {
  const { error } = await supabase
    .from('billing_events')
    .delete()
    .eq('stripe_event_id', eventId);

  if (error) {
    throw error;
  }
}

async function upsertBillingCustomer(
  supabase: SupabaseAdmin,
  payload: {
    stripe_customer_id: string | null;
    org_id: string | null;
    email: string | null;
    name: string | null;
  }
) {
  if (!payload.stripe_customer_id) return;

  await supabase.from('billing_customers').upsert(
    {
      stripe_customer_id: payload.stripe_customer_id,
      org_id: payload.org_id,
      email: payload.email,
      name: payload.name,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_customer_id',
    }
  );
}

function subscriptionToRecord(
  subscription: Stripe.Subscription,
  extras: {
    orgId: string | null;
    customerEmail: string | null;
  }
) {
  const item = subscription.items.data[0];
  const firstItem = subscription.items?.data?.[0];
  const priceId = item?.price?.id || null;

  const productValue = item?.price?.product;
  const productId =
    typeof productValue === 'string'
      ? productValue
      : productValue && typeof productValue === 'object' && 'id' in productValue
        ? String(productValue.id)
        : null;

  const priceMap = getPriceMap();
  const derived = priceId ? priceMap.get(priceId) : undefined;

  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || null,
    org_id: extras.orgId,
    customer_email: extras.customerEmail,
    status: subscription.status,
    plan_key: subscription.metadata?.plan_key || derived?.planKey || null,
    billing_interval:
      subscription.metadata?.billing_interval || derived?.billingInterval || null,
    price_id: priceId,

 product_id: productId,
 cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
 current_period_start: toIso(firstItem?.current_period_start?? null),
 current_period_end: toIso(firstItem?.current_period_end?? null),
 trial_start: toIso((subscription as any).trial_start?? (firstItem as any)?.trial_start?? null),
 trial_end: toIso((subscription as any).trial_end?? (firstItem as any)?.trial_end?? null),
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

async function upsertBillingSubscription(supabase: SupabaseAdmin, payload: BillingSubscriptionInsert) {
  await supabase.from('billing_subscriptions').upsert(payload, {
    onConflict: 'stripe_subscription_id',
  });
}

async function handleMCPSubscriptionActivation(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription
): Promise<void> {
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
  if (!stripeCustomerId) return;

  // Resolve org_id and auth_user_id from metadata or customer email
  const customerEmail = session.customer_details?.email || session.customer_email || null;
  const explicitOrgId = session.metadata?.org_id || null;
  const resolvedOrgId = explicitOrgId || (await resolveOrgIdByEmail(supabase, customerEmail));

  if (!resolvedOrgId || !customerEmail) return;

  // Get auth_user_id from users table
  const { data: userRow } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('org_id', resolvedOrgId)
    .eq('email', customerEmail)
    .limit(1)
    .maybeSingle();

  if (!userRow?.auth_user_id) return;

  try {
    // Generate MCP API key
    const rawKey = generateMCPKey();
    const keyHash = hashMCPKey(rawKey);
    const keyPrefix = getMCPKeyPrefix(rawKey);

    // Call create_mcp_api_key RPC
    const { data: keyId, error: createError } = await supabase
      .rpc('create_mcp_api_key', {
        p_actor_id: userRow.auth_user_id,
        p_key_hash: keyHash,
        p_key_prefix: keyPrefix,
        p_label: 'MCP Subscription Key',
      });

    if (createError || !keyId) {
      console.error('[billing] Failed to create MCP API key', createError);
      return;
    }

    // Get subscription period from Stripe subscription
    const item = subscription.items?.data?.[0];
    const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : new Date().toISOString();
    const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Call activate_mcp_subscription RPC
    const { error: activateError } = await supabase.rpc('activate_mcp_subscription', {
      p_key_id: keyId,
      p_stripe_subscription_id: subscription.id,
      p_stripe_customer_id: stripeCustomerId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });

    if (activateError) {
      console.error('[billing] Failed to activate MCP subscription', activateError);
      return;
    }

    console.log('[billing] MCP subscription activated', {
      keyId,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId,
    });
  } catch (error) {
    console.error('[billing] Error in handleMCPSubscriptionActivation', error);
  }
}

async function handleInvoiceEvent(
  supabase: SupabaseAdmin,
  event: Stripe.Event,
  stripe: Stripe
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId =
    typeof invoice.customer === 'string' ? invoice.customer : null;

  if (!stripeCustomerId) return;

  // Find the org associated with this customer
  const { data: billingCustomer } = await supabase
    .from('billing_customers')
    .select('org_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  const orgId = billingCustomer?.org_id ?? null;

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      console.log('[billing] invoice.payment_succeeded', {
        invoiceId: invoice.id,
        orgId,
        amountPaid: invoice.amount_paid,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
      });

      // Handle MCP subscription renewal
      const stripeSubscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : null;
      if (stripeSubscriptionId) {
        const { data: mcpKey } = await supabase
          .from('dsg_mcp_api_keys')
          .select('key_id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .limit(1)
          .maybeSingle();

        if (mcpKey) {
          const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : new Date().toISOString();
          const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const { error: renewError } = await supabase.rpc('renew_mcp_subscription_period', {
            p_stripe_subscription_id: stripeSubscriptionId,
            p_period_start: periodStart,
            p_period_end: periodEnd,
          });

          if (renewError) {
            console.error('[billing] Failed to renew MCP subscription', renewError);
          } else {
            console.log('[billing] MCP subscription renewed', { subscriptionId: stripeSubscriptionId });
          }
        }
      }

      // Metered usage charges are included in this invoice payment
      // Subscription status is already synced via customer.subscription.updated
      break;
    }
    case 'invoice.payment_failed': {
      console.warn('[billing] invoice.payment_failed', {
        invoiceId: invoice.id,
        orgId,
        amountDue: invoice.amount_due,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      });

      // Capture dunning event for analytics
      if (orgId) {
        await captureEvent('payment_failed', {
          userId: orgId,
          organizationId: orgId,
        }, {
          organization_id: orgId,
          stripe_invoice_id: invoice.id,
          stripe_customer_id: stripeCustomerId,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count,
          next_payment_attempt: invoice.next_payment_attempt,
        });
      }

      // Send dunning email to customer
      const billingCustomer = await getBillingCustomer(supabase, stripeCustomerId);

      if (billingCustomer?.email) {
        // Fire-and-forget email send (fail-open)
        // Plan key defaults to 'pro' since invoice dunning is relevant to paid plans
        void sendPaymentFailed({
          email: billingCustomer.email,
          planKey: 'pro',
          amountDue: invoice.amount_due,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt,
        }).catch(() => null);
      }

      break;
    }
    case 'invoice.finalized': {
      console.log('[billing] invoice.finalized', {
        invoiceId: invoice.id,
        orgId,
        amountDue: invoice.amount_due,
        autoAdvance: invoice.auto_advance,
      });
      // Invoice is finalized and ready for payment
      // This is where metered usage from the billing period is locked in
      break;
    }
    default:
      break;
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logWebhook('error', 'Missing STRIPE_WEBHOOK_SECRET', { requestId });
      return NextResponse.json(
        { error: 'Missing STRIPE_WEBHOOK_SECRET' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      logWebhook('error', 'Missing stripe-signature header', { requestId });
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const supabase = getSupabaseAdmin();

    logWebhook('info', 'Webhook received', {
      requestId,
      eventType: event.type,
      eventId: event.id,
    });

    const claimed = await claimEventProcessing(supabase, event);
    if (!claimed) {
      return NextResponse.json({ received: true, type: event.type, duplicate: true });
    }

    try {
      await recordEvent(supabase, event);

      // Cleanup placeholder records when real Stripe data arrives
      if (event.type === 'checkout.session.completed') {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const placeholderOrgId =
          checkoutSession.metadata?.org_id ||
          (await resolveOrgIdByEmail(
            supabase,
            checkoutSession.customer_details?.email || checkoutSession.customer_email || null
          ));
        if (placeholderOrgId) {
          await supabase
            .from('billing_subscriptions')
            .delete()
            .eq('org_id', placeholderOrgId)
            .like('stripe_subscription_id', 'placeholder_%');
          await supabase
            .from('billing_customers')
            .delete()
            .eq('org_id', placeholderOrgId)
            .like('stripe_customer_id', 'placeholder_%');
        }
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          const stripeCustomerId =
            typeof session.customer === 'string' ? session.customer : null;
          const customerEmail =
            session.customer_details?.email || session.customer_email || null;

          const explicitOrgId = session.metadata?.org_id || null;
          const orgId =
            explicitOrgId || (await resolveOrgIdByEmail(supabase, customerEmail));

          await upsertBillingCustomer(supabase, {
            stripe_customer_id: stripeCustomerId,
            org_id: orgId,
            email: customerEmail,
            name: session.customer_details?.name || null,
          });

          if (typeof session.subscription === 'string') {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription
            );

            const record = subscriptionToRecord(subscription, { orgId, customerEmail });
            await upsertBillingSubscription(supabase, record);

            // Handle MCP subscription activation
            if (record.plan_key === 'mcp_api') {
              await handleMCPSubscriptionActivation(supabase, session, subscription);
            } else if (orgId && record.plan_key) {
              // Entitlement: grant plan to org immediately on checkout (non-MCP plans)
              await fulfillSubscription(orgId, record.plan_key, subscription.status);
            }

            // D0: send trial welcome email
            if (customerEmail && subscription.trial_end && record.plan_key !== 'mcp_api') {
              void sendTrialWelcome({
                email: customerEmail,
                planKey: record.plan_key || 'pro',
                trialEnd: record.trial_end,
              });
            }

          }

          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const prevSubscription = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;

          const stripeCustomerId =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : null;

          const billingCustomer = await getBillingCustomer(supabase, stripeCustomerId);
          const record = subscriptionToRecord(subscription, {
            orgId: billingCustomer?.org_id || null,
            customerEmail: billingCustomer?.email || null,
          });

          await upsertBillingSubscription(supabase, record);

          // Capture subscription_created event (on subscription creation only)
          if (event.type === 'customer.subscription.created' && record.org_id) {
            // Extract MRR from subscription items (convert cents to dollars)
            const mrr = subscription.items?.data?.[0]?.price?.unit_amount
              ? subscription.items.data[0].price.unit_amount / 100
              : 0;
            await captureEvent('subscription_created', {
              userId: record.org_id, // Use org as distinct ID since no user context in webhook
              organizationId: record.org_id,
            }, {
              organization_id: record.org_id,
              plan_tier: record.plan_key || 'unknown',
              stripe_subscription_id: subscription.id,
              stripe_customer_id: stripeCustomerId,
              billing_period: record.billing_interval || 'monthly',
              mrr,
            });
          }

          // Entitlement: keep organizations.plan in sync with subscription state
          const orgId = record.org_id;
          if (orgId) {
            if (REVOKED_STATUSES.has(subscription.status)) {
              await revokeSubscription(orgId);
            } else if (record.plan_key) {
              await fulfillSubscription(orgId, record.plan_key, subscription.status);
            }
          }

          // Paid conversion: trialing → active is when money actually exchanges hands.
          // checkout.session.completed fires at trial start (before payment), so we
          // track the referral conversion here instead.
          const prevStatus = prevSubscription?.status;
          const isPaidConversion =
            event.type === 'customer.subscription.updated' &&
            prevStatus === 'trialing' &&
            subscription.status === 'active';

          if (isPaidConversion && billingCustomer?.email) {
            void sendUpgradeSuccess({
              email: billingCustomer.email,
              planKey: record.plan_key || 'pro',
              billingInterval: record.billing_interval || 'monthly',
            });

            const refCode = await lookupRefCode(supabase, billingCustomer.email);
            if (refCode) {
              void (supabase as any).rpc('increment_referral_conversions', { p_code: refCode }).maybeSingle();
            }
          }

          break;
        }

        default:
          break;
      }

      // Handle invoice events for metered billing
      if (event.type.startsWith('invoice.')) {
        await handleInvoiceEvent(supabase, event, stripe);
      }

      const duration = Date.now() - startTime;
      logWebhook('info', 'Webhook processed successfully', {
        requestId,
        eventType: event.type,
        eventId: event.id,
        duration,
        status: 'success',
      });
      return NextResponse.json({ received: true, type: event.type });
    } catch (error) {
      try {
        await releaseEventClaim(supabase, event.id);
      } catch (cleanupError) {
        logApiError('api/billing/webhook', cleanupError, {
          stage: 'release-event-claim',
          stripeEventId: event.id,
        });
      }
      throw error;
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logWebhook('error', 'Webhook processing failed', {
      requestId,
      duration,
      status: 'failed',
    });

    logApiError('api/billing/webhook', error, {
      stage: 'unhandled',
      requestId,
    });

    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 400 }
    );
  }
}
