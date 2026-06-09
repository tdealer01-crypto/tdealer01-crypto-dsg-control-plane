import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';

/**
 * DSG Stripe Connect V2 sample integration
 *
 * This sample intentionally lives under examples/ so it does not change the
 * currently submitted Stripe Marketplace app/runtime. It demonstrates:
 * - Creating connected accounts with Stripe V2 Accounts
 * - Onboarding those accounts with Stripe V2 Account Links
 * - Creating products on connected accounts with the Stripe-Account header
 * - Rendering a simple storefront per connected account
 * - Creating direct-charge Checkout Sessions with an application fee
 * - Charging connected accounts for a platform subscription
 * - Opening Billing Portal sessions for connected accounts
 * - Handling Connect V2 thin events and Billing snapshot webhooks
 *
 * Important production notes:
 * - Replace the in-memory Maps with your database tables.
 * - Do not expose Stripe secret keys to browsers.
 * - Use your authenticated user ID instead of email in production mappings.
 * - Do not use the connected account ID as a public storefront slug forever;
 *   create a stable public shop slug and map it to the account ID in your DB.
 */

const app = express();
const port = Number(process.env.PORT || 4242);

/**
 * Helpful env reader.
 *
 * When a required value is missing, the app fails early with a clear message.
 * This avoids silent Stripe failures and keeps setup deterministic.
 */
function requireEnv(name, helpText) {
  const value = process.env[name];
  if (!value || value.includes('REPLACE_ME')) {
    throw new Error(
      `Missing required environment variable ${name}. ${helpText}\n` +
        `Add it to examples/stripe-connect-v2-sample/.env before running this sample.`
    );
  }
  return value;
}

const STRIPE_SECRET_KEY = requireEnv(
  'STRIPE_SECRET_KEY',
  'Use a Stripe test-mode secret key such as sk_test_... for local development.'
);

const ROOT_URL = process.env.ROOT_URL || `http://localhost:${port}`;
const APPLICATION_FEE_AMOUNT_CENTS = Number(process.env.APPLICATION_FEE_AMOUNT_CENTS || 123);

/**
 * Always create one Stripe Client and use it for every Stripe request.
 *
 * The request specifically asked not to pin the API version. The Stripe SDK
 * automatically uses the API version tied to the installed package/account.
 */
const stripeClient = new Stripe(STRIPE_SECRET_KEY);

/**
 * Demo-only in-memory storage.
 *
 * Replace these Maps with durable database tables:
 * - users: user_id, email, display_name, stripe_account_id
 * - products: optional local product cache keyed by connected account
 * - subscriptions: connected_account_id, subscription_id, status, price_id
 */
const userToAccount = new Map();
const subscriptionStatusByAccount = new Map();

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; --bg:#f7f8fb; --card:#fff; --text:#172033; --muted:#5d6677; --brand:#625afa; --border:#e3e6ef; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
    header { padding:24px; background:#111827; color:#fff; }
    main { max-width:960px; margin:24px auto; padding:0 16px 48px; }
    .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px; margin:16px 0; box-shadow:0 8px 24px rgba(17,24,39,.05); }
    label { display:block; margin:12px 0 6px; font-weight:650; }
    input, select { box-sizing:border-box; width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:10px; font-size:15px; }
    button, .button { display:inline-block; border:0; border-radius:10px; background:var(--brand); color:white; padding:11px 16px; margin-top:14px; font-weight:700; cursor:pointer; text-decoration:none; }
    .muted { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; }
    code { background:#eef0f6; padding:2px 6px; border-radius:6px; }
    .ok { color:#057a55; font-weight:700; }
    .warn { color:#b45309; font-weight:700; }
  </style>
</head>
<body>
  <header><h1>${title}</h1><p>Stripe Connect V2 sample for DSG Governance Gate</p></header>
  <main>${body}</main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function centsToMoney(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

/**
 * Home page: one small dashboard where a seller can create or view their
 * connected account, start onboarding, create products, and manage subscription.
 */
app.get('/', async (req, res) => {
  const userId = String(req.query.userId || 'demo-user-1');
  const existingAccountId = userToAccount.get(userId) || String(req.query.accountId || '');

  let accountStatusHtml = '<p class="muted">No connected account selected yet.</p>';
  if (existingAccountId) {
    accountStatusHtml = await renderAccountStatus(existingAccountId);
  }

  res.send(
    htmlPage(
      'DSG Connect Sample Dashboard',
      `<section class="card">
        <h2>1. Create or load a connected account</h2>
        <p class="muted">For demo use, the user ID is passed in the URL. In production, use your authenticated user session.</p>
        <form method="post" action="/accounts">
          <label>User ID</label>
          <input name="userId" value="${escapeHtml(userId)}" />
          <label>Display name</label>
          <input name="displayName" placeholder="Example Shop" required />
          <label>Contact email</label>
          <input name="contactEmail" type="email" placeholder="owner@example.com" required />
          <button>Create connected account</button>
        </form>
      </section>

      <section class="card">
        <h2>2. Onboarding status</h2>
        ${accountStatusHtml}
        ${existingAccountId ? `<form method="post" action="/accounts/${escapeHtml(existingAccountId)}/account-link"><button>Onboard to collect payments</button></form>` : ''}
      </section>

      <section class="card">
        <h2>3. Create a connected-account product</h2>
        <form method="post" action="/products">
          <label>Connected account ID</label>
          <input name="accountId" value="${escapeHtml(existingAccountId)}" placeholder="acct_..." required />
          <label>Name</label>
          <input name="name" placeholder="DSG demo product" required />
          <label>Description</label>
          <input name="description" placeholder="A simple connected-account product" />
          <label>Price, in cents</label>
          <input name="priceInCents" type="number" min="50" value="1200" required />
          <label>Currency</label>
          <select name="currency"><option value="usd">USD</option><option value="thb">THB</option></select>
          <button>Create product on connected account</button>
        </form>
      </section>

      <section class="card">
        <h2>4. Storefront and platform subscription</h2>
        ${existingAccountId ? `
          <p><a class="button" href="/store/${escapeHtml(existingAccountId)}">Open storefront</a></p>
          <form method="post" action="/accounts/${escapeHtml(existingAccountId)}/subscription-checkout"><button>Subscribe connected account to platform plan</button></form>
          <form method="post" action="/accounts/${escapeHtml(existingAccountId)}/billing-portal"><button>Open billing portal</button></form>
        ` : '<p class="muted">Create or load a connected account first.</p>'}
      </section>`
    )
  );
});

app.use('/webhooks/connect-v2-thin', express.raw({ type: 'application/json' }));
app.use('/webhooks/billing', express.raw({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * Create a V2 connected account.
 *
 * Requirement: Only use the requested V2 properties. This code intentionally
 * does not pass top-level type: express, standard, or custom.
 */
app.post('/accounts', async (req, res, next) => {
  try {
    const userId = String(req.body.userId || '').trim();
    const displayName = String(req.body.displayName || '').trim();
    const contactEmail = String(req.body.contactEmail || '').trim();

    if (!userId || !displayName || !contactEmail) {
      return res.status(400).send('userId, displayName, and contactEmail are required.');
    }

    const account = await stripeClient.v2.core.accounts.create({
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

    // Demo DB mapping. Replace this with a real database write.
    userToAccount.set(userId, account.id);

    res.redirect(`/?userId=${encodeURIComponent(userId)}&accountId=${encodeURIComponent(account.id)}`);
  } catch (error) {
    next(error);
  }
});

/**
 * Get onboarding status from Stripe directly.
 *
 * This intentionally does not read onboarding status from the database, because
 * the demo requirement asks to retrieve the current status from Stripe every time.
 */
async function renderAccountStatus(accountId) {
  const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.merchant', 'requirements'],
  });

  const readyToProcessPayments =
    account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';

  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
  const onboardingComplete = requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

  return `<p><strong>Connected account:</strong> <code>${escapeHtml(accountId)}</code></p>
    <p><strong>Card payments:</strong> <span class="${readyToProcessPayments ? 'ok' : 'warn'}">${readyToProcessPayments ? 'active' : 'not active yet'}</span></p>
    <p><strong>Requirements status:</strong> <code>${escapeHtml(requirementsStatus || 'none')}</code></p>
    <p><strong>Onboarding:</strong> <span class="${onboardingComplete ? 'ok' : 'warn'}">${onboardingComplete ? 'complete enough for current requirements' : 'more information required'}</span></p>`;
}

/**
 * Create a V2 account onboarding link.
 */
app.post('/accounts/:accountId/account-link', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;

    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant', 'customer'],
          refresh_url: `${ROOT_URL}/?accountId=${encodeURIComponent(accountId)}&refresh=1`,
          return_url: `${ROOT_URL}/?accountId=${encodeURIComponent(accountId)}&returned=1`,
        },
      },
    });

    res.redirect(accountLink.url);
  } catch (error) {
    next(error);
  }
});

/**
 * Create products on the connected account.
 *
 * Passing { stripeAccount: accountId } makes the SDK send the Stripe-Account
 * header so the Product and default Price are created on the connected account.
 */
app.post('/products', async (req, res, next) => {
  try {
    const accountId = String(req.body.accountId || '').trim();
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const priceInCents = Number(req.body.priceInCents);
    const currency = String(req.body.currency || 'usd').toLowerCase();

    if (!accountId || !name || !Number.isInteger(priceInCents) || priceInCents < 50) {
      return res.status(400).send('accountId, name, and a price of at least 50 cents are required.');
    }

    await stripeClient.products.create(
      {
        name,
        description,
        default_price_data: {
          unit_amount: priceInCents,
          currency,
        },
      },
      {
        stripeAccount: accountId,
      }
    );

    res.redirect(`/store/${encodeURIComponent(accountId)}`);
  } catch (error) {
    next(error);
  }
});

/**
 * Simple storefront for one connected account.
 *
 * Demo uses account ID in the URL for clarity. In production, use a public
 * storefront slug such as /store/example-shop and look up the connected account
 * ID from your database.
 */
app.get('/store/:accountId', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;

    const products = await stripeClient.products.list(
      {
        limit: 20,
        active: true,
        expand: ['data.default_price'],
      },
      {
        stripeAccount: accountId,
      }
    );

    const cards = products.data
      .map((product) => {
        const price = product.default_price;
        const amount = price?.unit_amount || 0;
        const currency = price?.currency || 'usd';
        return `<div class="card">
          <h3>${escapeHtml(product.name)}</h3>
          <p class="muted">${escapeHtml(product.description || 'No description')}</p>
          <p><strong>${centsToMoney(amount, currency)}</strong></p>
          <form method="post" action="/checkout">
            <input type="hidden" name="accountId" value="${escapeHtml(accountId)}" />
            <input type="hidden" name="productId" value="${escapeHtml(product.id)}" />
            <button>Buy with Checkout</button>
          </form>
        </div>`;
      })
      .join('');

    res.send(
      htmlPage(
        'Simple Storefront',
        `<section class="card"><p>Connected account: <code>${escapeHtml(accountId)}</code></p><p class="muted">This demo fetches live products from the connected account using the Stripe-Account header.</p></section><section class="grid">${cards || '<p>No active products yet.</p>'}</section>`
      )
    );
  } catch (error) {
    next(error);
  }
});

/**
 * Direct charge Checkout Session.
 *
 * The Checkout Session is created on the connected account by passing the
 * Stripe-Account header. The platform earns money via application_fee_amount.
 */
app.post('/checkout', async (req, res, next) => {
  try {
    const accountId = String(req.body.accountId || '').trim();
    const productId = String(req.body.productId || '').trim();

    if (!accountId || !productId) {
      return res.status(400).send('accountId and productId are required.');
    }

    const product = await stripeClient.products.retrieve(
      productId,
      { expand: ['default_price'] },
      { stripeAccount: accountId }
    );

    const price = product.default_price;
    if (!price?.unit_amount || !price?.currency) {
      return res.status(400).send('Product must have a default one-time price.');
    }

    const session = await stripeClient.checkout.sessions.create(
      {
        line_items: [
          {
            price_data: {
              currency: price.currency,
              unit_amount: price.unit_amount,
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: APPLICATION_FEE_AMOUNT_CENTS,
        },
        mode: 'payment',
        success_url: `${ROOT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${ROOT_URL}/store/${encodeURIComponent(accountId)}?canceled=1`,
      },
      {
        stripeAccount: accountId,
      }
    );

    res.redirect(303, session.url);
  } catch (error) {
    next(error);
  }
});

app.get('/success', (req, res) => {
  res.send(htmlPage('Payment success', `<section class="card"><p class="ok">Checkout completed.</p><p>Session: <code>${escapeHtml(req.query.session_id || '')}</code></p><p><a class="button" href="/">Back to dashboard</a></p></section>`));
});

/**
 * Charge a platform subscription to the connected account.
 *
 * V2 accounts can be used as both the connected account and the customer account.
 */
app.post('/accounts/:accountId/subscription-checkout', async (req, res, next) => {
  try {
    const priceId = requireEnv(
      'CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID',
      'Create a recurring price on the platform account and set this to price_... .'
    );

    const accountId = req.params.accountId;
    const session = await stripeClient.checkout.sessions.create({
      customer_account: accountId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${ROOT_URL}/?accountId=${encodeURIComponent(accountId)}&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ROOT_URL}/?accountId=${encodeURIComponent(accountId)}&subscription=canceled`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    next(error);
  }
});

/**
 * Billing Portal session for connected account subscription management.
 */
app.post('/accounts/:accountId/billing-portal', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;

    const session = await stripeClient.billingPortal.sessions.create({
      customer_account: accountId,
      return_url: `${ROOT_URL}/?accountId=${encodeURIComponent(accountId)}`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    next(error);
  }
});

/**
 * Connect V2 thin-event webhook handler.
 *
 * Configure a Stripe destination with thin payload style and connected-account
 * events, then forward to this endpoint. Thin events only include minimal data,
 * so the handler retrieves the full event data from Stripe after verification.
 */
app.post('/webhooks/connect-v2-thin', async (req, res) => {
  try {
    const webhookSecret = requireEnv(
      'STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET',
      'Set this to the whsec_... value for your Connect V2 thin-event destination.'
    );
    const signature = req.header('stripe-signature');

    // SDK support for parseThinEvent is required for V2 thin events.
    const thinEvent = stripeClient.parseThinEvent(req.body, signature, webhookSecret);
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

    switch (event.type) {
      case 'v2.core.account[requirements].updated':
        // TODO DB write: mark connected account as requiring re-onboarding or refresh status from Accounts API.
        console.log('[thin-event] requirements updated', event.id);
        break;
      case 'v2.core.account[configuration.merchant].capability_status_updated':
        // TODO DB write: refresh merchant capability status, especially card_payments.
        console.log('[thin-event] merchant capability updated', event.id);
        break;
      case 'v2.core.account[configuration.customer].capability_status_updated':
        // TODO DB write: refresh customer configuration capability status.
        console.log('[thin-event] customer capability updated', event.id);
        break;
      case 'v2.core.account[configuration.recipient].capability_status_updated':
        // This sample does not create recipient configuration, but the handler is here for completeness.
        console.log('[thin-event] recipient capability updated', event.id);
        break;
      default:
        console.log('[thin-event] ignored event type', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Connect V2 thin webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * Billing snapshot webhook handler.
 *
 * These events are not thin events. Use normal constructEvent verification.
 */
app.post('/webhooks/billing', async (req, res) => {
  try {
    const webhookSecret = requireEnv(
      'STRIPE_BILLING_WEBHOOK_SECRET',
      'Set this to the whsec_... value for your platform Billing webhook endpoint.'
    );
    const signature = req.header('stripe-signature');
    const event = stripeClient.webhooks.constructEvent(req.body, signature, webhookSecret);

    switch (event.type) {
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const accountId = subscription.customer_account;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const quantity = subscription.items?.data?.[0]?.quantity;
        const paused = Boolean(subscription.pause_collection);
        const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

        // TODO DB write: subscriptions table keyed by connected account ID.
        subscriptionStatusByAccount.set(accountId, {
          status: subscription.status,
          priceId,
          quantity,
          paused,
          cancelAtPeriodEnd,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const accountId = subscription.customer_account;
        // TODO DB write: revoke access for this connected account.
        subscriptionStatusByAccount.set(accountId, { status: 'canceled' });
        break;
      }
      case 'payment_method.attached':
      case 'payment_method.detached':
      case 'customer.updated':
      case 'customer.tax_id.created':
      case 'customer.tax_id.deleted':
      case 'customer.tax_id.updated':
      case 'billing_portal.configuration.created':
      case 'billing_portal.configuration.updated':
      case 'billing_portal.session.created':
        // TODO DB write: record billing metadata changes only. Do not treat customer billing email as login identity.
        console.log('[billing-event]', event.type, event.id);
        break;
      default:
        console.log('[billing-event] ignored', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Billing webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).send(
    htmlPage(
      'Sample error',
      `<section class="card"><p class="warn">${escapeHtml(err.message)}</p><p class="muted">Check your environment variables and Stripe Dashboard configuration.</p></section>`
    )
  );
});

app.listen(port, () => {
  console.log(`DSG Stripe Connect V2 sample running on ${ROOT_URL}`);
});
