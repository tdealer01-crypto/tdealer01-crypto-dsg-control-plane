import { Hono } from 'hono';
import Stripe from 'stripe';

const router = new Hono();

let stripeClient: Stripe | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes('REPLACE_ME') || value.endsWith('...')) {
    throw new Error(`${name} is required. Configure a real test-mode value in the server environment.`);
  }
  return value;
}

function getOptionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value || value.includes('REPLACE_ME') || value.endsWith('...')) {
    return fallback;
  }
  return value;
}

function getStripeClient(): Stripe {
  if (!stripeClient) {
    // Use the Stripe Client for every Stripe request. Do not pin apiVersion here;
    // stripe-node v22.2.0 bundles Stripe API 2026-05-27.dahlia.
    stripeClient = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'));
  }
  return stripeClient;
}

function getRootUrl(): string {
  return getOptionalEnv(
    'STRIPE_CONNECT_ROOT_URL',
    getOptionalEnv('DSG_API_URL', getOptionalEnv('APP_URL', 'http://localhost:3001'))
  );
}

function assertAccountId(accountId: string | undefined): string {
  if (!accountId || !accountId.startsWith('acct_')) {
    throw new Error('A connected account id starting with acct_ is required.');
  }
  return accountId;
}

async function createV2AccountLink(accountId: string): Promise<{ url: string }> {
  const rootUrl = getRootUrl();
  const payload = {
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant', 'customer'],
        refresh_url: `${rootUrl}/stripe/onboarding?accountId=${encodeURIComponent(accountId)}&refresh=1`,
        return_url: `${rootUrl}/stripe/onboarding?accountId=${encodeURIComponent(accountId)}&return=1`,
      },
    },
  };

  const stripe = getStripeClient() as Stripe & {
    v2?: {
      core?: {
        accountLinks?: { create: (body: typeof payload) => Promise<{ url: string }> };
      };
    };
    rawRequest?: (method: string, path: string, body: typeof payload) => Promise<{ body?: { url: string }; url?: string }>;
  };

  if (stripe.v2?.core?.accountLinks?.create) {
    return stripe.v2.core.accountLinks.create(payload);
  }

  if (typeof stripe.rawRequest === 'function') {
    const response = await stripe.rawRequest('POST', '/v2/core/account_links', payload);
    return response.body ?? (response as { url: string });
  }

  throw new Error('Installed stripe SDK does not expose Accounts v2 account links. Upgrade stripe-node to v22.2.0 or newer.');
}

router.post('/accounts', async (c) => {
  try {
    const body = await c.req.json<{ display_name?: string; contact_email?: string }>();
    const displayName = body.display_name?.trim();
    const contactEmail = body.contact_email?.trim();

    if (!displayName || !contactEmail) {
      return c.json({ error: 'display_name and contact_email are required' }, 400);
    }

    const stripe = getStripeClient() as Stripe & {
      v2: {
        core: {
          accounts: { create: (body: Record<string, unknown>) => Promise<{ id: string }> };
        };
      };
    };

    // Accounts v2 creation: use only the documented properties. Do not pass
    // top-level type: 'express', 'standard', or 'custom'.
    const account = await stripe.v2.core.accounts.create({
      display_name: displayName,
      contact_email: contactEmail,
      identity: {
        country: 'us',
      },
      dashboard: 'full',
      defaults: {
        responsibilities: {
          fees_collector: 'stripe',
          losses_collector: 'stripe',
        },
      },
      configuration: {
        customer: {},
        merchant: {
          capabilities: {
            card_payments: {
              requested: true,
            },
          },
        },
      },
    });

    return c.json({ accountId: account.id }, 200);
  } catch (err) {
    console.error('Create Connect v2 account failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'create_account_failed' }, 500);
  }
});

router.post('/account-link', async (c) => {
  try {
    const body = await c.req.json<{ accountId?: string }>();
    const accountId = assertAccountId(body.accountId);
    const accountLink = await createV2AccountLink(accountId);
    return c.json({ url: accountLink.url }, 200);
  } catch (err) {
    console.error('Create Connect v2 account link failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'create_account_link_failed' }, 500);
  }
});

router.get('/account-status/:accountId', async (c) => {
  try {
    const accountId = assertAccountId(c.req.param('accountId'));
    const stripe = getStripeClient() as Stripe & {
      v2: {
        core: {
          accounts: {
            retrieve: (id: string, params: { include: string[] }) => Promise<Record<string, any>>;
          };
        };
      };
    };

    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant', 'requirements'],
    });

    const readyToProcessPayments =
      account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';
    const requirementsStatus = account?.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete = requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

    return c.json(
      {
        id: account.id,
        readyToProcessPayments,
        onboardingComplete,
        requirementsStatus: requirementsStatus ?? null,
        requirements: account.requirements ?? null,
      },
      200
    );
  } catch (err) {
    console.error('Retrieve Connect v2 account status failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'account_status_failed' }, 500);
  }
});

router.post('/products', async (c) => {
  try {
    const body = await c.req.json<{
      accountId?: string;
      name?: string;
      description?: string;
      priceInCents?: number;
      currency?: string;
    }>();
    const accountId = assertAccountId(body.accountId);
    const priceInCents = Number(body.priceInCents);

    if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400);
    if (!Number.isInteger(priceInCents) || priceInCents <= 0) {
      return c.json({ error: 'priceInCents must be a positive integer' }, 400);
    }

    const product = await getStripeClient().products.create(
      {
        name: body.name.trim(),
        description: body.description?.trim(),
        default_price_data: {
          unit_amount: priceInCents,
          currency: (body.currency ?? 'usd').toLowerCase(),
        },
      },
      { stripeAccount: accountId }
    );

    return c.json({ product }, 200);
  } catch (err) {
    console.error('Create connected account product failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'create_product_failed' }, 500);
  }
});

router.get('/products/:accountId', async (c) => {
  try {
    const accountId = assertAccountId(c.req.param('accountId'));
    const products = await getStripeClient().products.list(
      {
        limit: 20,
        active: true,
        expand: ['data.default_price'],
      },
      { stripeAccount: accountId }
    );

    return c.json({ products: products.data }, 200);
  } catch (err) {
    console.error('List connected account products failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'list_products_failed' }, 500);
  }
});

router.post('/checkout', async (c) => {
  try {
    const body = await c.req.json<{ accountId?: string; priceId?: string; quantity?: number }>();
    const accountId = assertAccountId(body.accountId);
    const priceId = body.priceId;
    if (!priceId?.startsWith('price_')) return c.json({ error: 'priceId is required' }, 400);

    const session = await getStripeClient().checkout.sessions.create(
      {
        line_items: [{ price: priceId, quantity: body.quantity ?? 1 }],
        payment_intent_data: {
          application_fee_amount: Number(getOptionalEnv('APPLICATION_FEE_AMOUNT_CENTS', '123')),
        },
        mode: 'payment',
        success_url: `${getRootUrl()}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getRootUrl()}/stripe/storefront/${encodeURIComponent(accountId)}`,
      },
      { stripeAccount: accountId }
    );

    return c.json({ url: session.url }, 200);
  } catch (err) {
    console.error('Create direct-charge Checkout session failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'checkout_failed' }, 500);
  }
});

router.post('/subscription-checkout', async (c) => {
  try {
    const body = await c.req.json<{ accountId?: string }>();
    const accountId = assertAccountId(body.accountId);
    const priceId = getRequiredEnv('CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID');

    const session = await getStripeClient().checkout.sessions.create({
      customer_account: accountId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getRootUrl()}/stripe/subscription/success?accountId=${encodeURIComponent(accountId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getRootUrl()}/stripe/onboarding?accountId=${encodeURIComponent(accountId)}&subscription=cancelled`,
    } as Stripe.Checkout.SessionCreateParams);

    return c.json({ url: session.url }, 200);
  } catch (err) {
    console.error('Create connected account subscription Checkout failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'subscription_checkout_failed' }, 500);
  }
});

router.post('/billing-portal', async (c) => {
  try {
    const body = await c.req.json<{ accountId?: string }>();
    const accountId = assertAccountId(body.accountId);

    const session = await getStripeClient().billingPortal.sessions.create({
      customer_account: accountId,
      return_url: `${getRootUrl()}/stripe/onboarding?accountId=${encodeURIComponent(accountId)}`,
    } as Stripe.BillingPortal.SessionCreateParams);

    return c.json({ url: session.url }, 200);
  } catch (err) {
    console.error('Create billing portal failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'billing_portal_failed' }, 500);
  }
});

router.post('/thin-webhook', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('stripe-signature');
    if (!signature) return c.json({ error: 'Missing stripe-signature header' }, 400);

    const stripe = getStripeClient() as Stripe & {
      parseThinEvent?: (payload: string, signature: string, secret: string) => { id: string; type: string };
      v2?: { core?: { events?: { retrieve: (id: string) => Promise<{ id: string; type: string }> } } };
    };
    const secret = getRequiredEnv('STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET');

    if (!stripe.parseThinEvent || !stripe.v2?.core?.events?.retrieve) {
      throw new Error('Installed stripe SDK does not expose thin event helpers. Upgrade stripe-node to v22.2.0 or newer.');
    }

    const thinEvent = stripe.parseThinEvent(payload, signature, secret);
    const event = await stripe.v2.core.events.retrieve(thinEvent.id);

    switch (event.type) {
      case 'v2.core.account[requirements].updated':
      case 'v2.core.account[configuration.merchant].capability_status_updated':
      case 'v2.core.account[configuration.customer].capability_status_updated':
      case 'v2.core.account[configuration.recipient].capability_status_updated':
        console.log('[Connect V2 thin webhook]', event.type, event.id);
        break;
      default:
        console.log('[Connect V2 thin webhook] unhandled', event.type);
    }

    return c.json({ received: true }, 200);
  } catch (err) {
    console.error('Connect v2 thin webhook failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'thin_webhook_failed' }, 400);
  }
});

router.post('/billing-webhook', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('stripe-signature');
    if (!signature) return c.json({ error: 'Missing stripe-signature header' }, 400);

    const event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getRequiredEnv('STRIPE_BILLING_WEBHOOK_SECRET')
    );

    const object = event.data.object as Stripe.Event.Data.Object & {
      customer_account?: string;
      customer?: string;
    };
    const accountId = object.customer_account ?? object.customer ?? null;

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'payment_method.attached':
      case 'payment_method.detached':
      case 'customer.updated':
      case 'customer.tax_id.created':
      case 'customer.tax_id.deleted':
      case 'customer.tax_id.updated':
      case 'billing_portal.configuration.created':
      case 'billing_portal.configuration.updated':
      case 'billing_portal.session.created':
        console.log('[Billing webhook]', event.type, accountId);
        break;
      default:
        console.log('[Billing webhook] unhandled', event.type, accountId);
    }

    return c.json({ received: true }, 200);
  } catch (err) {
    console.error('Billing webhook failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'billing_webhook_failed' }, 400);
  }
});

export default router;
