import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';

const app = express();
const rawBody = express.raw({ type: 'application/json' });

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.includes('REPLACE_ME') || value.endsWith('...')) {
    throw new Error(`Missing ${name}. Add a real test-mode value in .env or Vercel Environment Variables. Do not commit secrets.`);
  }
  return value;
}

function optionalEnv(name, fallback) {
  const value = process.env[name];
  if (!value || value.includes('REPLACE_ME') || value.endsWith('...')) return fallback;
  return value;
}

const STRIPE_SECRET_KEY = requiredEnv('STRIPE_SECRET_KEY');
const ROOT_URL = optionalEnv('ROOT_URL', 'http://localhost:4242');
const APPLICATION_FEE_AMOUNT_CENTS = Number(optionalEnv('APPLICATION_FEE_AMOUNT_CENTS', '123'));
const CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID = optionalEnv('CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID', 'price_REPLACE_ME');
const PORT = Number(process.env.PORT || 4242);

// Use one Stripe Client for all Stripe-related requests.
// Do not pin apiVersion here; the installed SDK uses its bundled/latest default.
const stripeClient = new Stripe(STRIPE_SECRET_KEY);

// Demo-only in-memory mappings. Replace with a real DB in production.
const demoUsers = new Map();
const subscriptionState = new Map();

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f7f7fb;color:#111;margin:0;padding:32px}.wrap{max-width:980px;margin:auto}.card{background:white;border:1px solid #e6e6ef;border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 6px 24px rgba(0,0,0,.05)}input,select,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #ccc;margin:4px 0}button{background:#635bff;color:#fff;border:0;cursor:pointer}.muted{color:#666}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}code{background:#f1f1f5;padding:2px 6px;border-radius:6px}</style></head><body><main class="wrap">${body}</main></body></html>`;
}

function assertAccountId(accountId) {
  if (!accountId || !accountId.startsWith('acct_')) throw new Error('Expected a connected account id that starts with acct_');
}

async function createAccountLink(accountId) {
  const payload = {
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant', 'customer'],
        refresh_url: `${ROOT_URL}/dashboard?accountId=${encodeURIComponent(accountId)}&refresh=1`,
        return_url: `${ROOT_URL}/dashboard?accountId=${encodeURIComponent(accountId)}&returned=1`,
      },
    },
  };

  // Preferred SDK shape from the Accounts v2 hosted-onboarding guide.
  if (stripeClient.v2?.core?.accountLinks?.create) {
    return stripeClient.v2.core.accountLinks.create(payload);
  }

  // Compatibility fallback: some installed stripe-node versions expose V2 accounts
  // before exposing the generated accountLinks resource. This still uses the
  // Stripe Client, but sends the v2 endpoint by path.
  if (typeof stripeClient.rawRequest === 'function') {
    const response = await stripeClient.rawRequest('POST', '/v2/core/account_links', payload);
    return response.body || response;
  }

  throw new Error('Installed stripe SDK does not expose v2.core.accountLinks.create or rawRequest. Run: npm install stripe@latest');
}

async function retrieveAccount(accountId) {
  assertAccountId(accountId);
  return stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.merchant', 'requirements'],
  });
}

app.use(express.urlencoded({ extended: true }));

app.get('/', async (_req, res) => {
  res.send(page('DSG Stripe Connect V2 Sample', `<h1>DSG Stripe Connect V2 Sample</h1><p class="muted">Isolated demo. Test mode only.</p><div class="grid"><section class="card"><h2>Create connected account</h2><form method="post" action="/accounts"><label>Display name<br><input name="display_name" required placeholder="Demo Merchant"></label><br><label>Email<br><input name="contact_email" type="email" required placeholder="merchant@example.com"></label><br><button>Create Accounts v2 account</button></form></section><section class="card"><h2>Open dashboard</h2><form method="get" action="/dashboard"><label>Account ID<br><input name="accountId" placeholder="acct_..."></label><br><button>Open</button></form></section></div>`));
});

app.post('/accounts', express.urlencoded({ extended: true }), async (req, res, next) => {
  try {
    const displayName = String(req.body.display_name || '').trim();
    const contactEmail = String(req.body.contact_email || '').trim();
    if (!displayName || !contactEmail) throw new Error('display_name and contact_email are required');

    // Only use the requested Accounts v2 properties. No top-level type.
    const account = await stripeClient.v2.core.accounts.create({
      display_name: displayName,
      contact_email: contactEmail,
      identity: { country: 'us' },
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
            card_payments: { requested: true },
          },
        },
      },
    });

    demoUsers.set(contactEmail, account.id);
    res.redirect(`/dashboard?accountId=${encodeURIComponent(account.id)}`);
  } catch (err) {
    next(err);
  }
});

app.get('/dashboard', async (req, res, next) => {
  try {
    const accountId = String(req.query.accountId || '');
    const account = await retrieveAccount(accountId);
    const readyToProcessPayments = account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';
    const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete = requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

    res.send(page('Connected account dashboard', `<h1>Connected account dashboard</h1><p><code>${accountId}</code></p><section class="card"><h2>Onboarding status</h2><p>Card payments: <b>${readyToProcessPayments ? 'active' : 'not active yet'}</b></p><p>Requirements: <b>${requirementsStatus || 'unknown'}</b></p><p>Onboarding complete: <b>${onboardingComplete ? 'yes' : 'no'}</b></p><form method="post" action="/accounts/${accountId}/account-link"><button>Onboard to collect payments</button></form></section><section class="card"><h2>Create product on connected account</h2><form method="post" action="/products"><input type="hidden" name="accountId" value="${accountId}"><label>Name<br><input name="name" required placeholder="Governance report"></label><br><label>Description<br><input name="description" placeholder="Sample product"></label><br><label>Price cents<br><input name="priceInCents" required type="number" value="2500"></label><br><label>Currency<br><input name="currency" required value="usd"></label><br><button>Create product</button></form></section><section class="card"><h2>Storefront</h2><p><a href="/store/${accountId}">Open storefront for this connected account</a></p><p class="muted">Demo uses account ID in the URL. Production should use a stable public slug mapped to account ID server-side.</p></section><section class="card"><h2>Subscription</h2><form method="post" action="/accounts/${accountId}/subscription-checkout"><button>Subscribe connected account</button></form><form method="post" action="/accounts/${accountId}/billing-portal"><button>Open Billing Portal</button></form></section>`));
  } catch (err) {
    next(err);
  }
});

app.post('/accounts/:accountId/account-link', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;
    assertAccountId(accountId);
    const accountLink = await createAccountLink(accountId);
    res.redirect(accountLink.url);
  } catch (err) {
    next(err);
  }
});

app.post('/products', express.urlencoded({ extended: true }), async (req, res, next) => {
  try {
    const accountId = String(req.body.accountId || '');
    assertAccountId(accountId);
    const priceInCents = Number(req.body.priceInCents);
    if (!Number.isInteger(priceInCents) || priceInCents <= 0) throw new Error('priceInCents must be a positive integer');

    await stripeClient.products.create({
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      default_price_data: {
        unit_amount: priceInCents,
        currency: String(req.body.currency || 'usd').toLowerCase(),
      },
    }, { stripeAccount: accountId });

    res.redirect(`/store/${accountId}`);
  } catch (err) {
    next(err);
  }
});

app.get('/store/:accountId', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;
    assertAccountId(accountId);
    const products = await stripeClient.products.list({
      limit: 20,
      active: true,
      expand: ['data.default_price'],
    }, { stripeAccount: accountId });

    const items = products.data.map((product) => {
      const price = product.default_price;
      const amount = price?.unit_amount ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}` : 'No price';
      return `<section class="card"><h2>${product.name}</h2><p>${product.description || ''}</p><p><b>${amount}</b></p><form method="post" action="/checkout"><input type="hidden" name="accountId" value="${accountId}"><input type="hidden" name="priceId" value="${price?.id || ''}"><button ${price?.id ? '' : 'disabled'}>Buy with Checkout</button></form></section>`;
    }).join('');

    res.send(page('Storefront', `<h1>Storefront</h1><p class="muted">Demo URL uses connected account ID. Use a public slug in production.</p>${items || '<section class="card">No active products yet.</section>'}<p><a href="/dashboard?accountId=${accountId}">Back to dashboard</a></p>`));
  } catch (err) {
    next(err);
  }
});

app.post('/checkout', express.urlencoded({ extended: true }), async (req, res, next) => {
  try {
    const accountId = String(req.body.accountId || '');
    const priceId = String(req.body.priceId || '');
    assertAccountId(accountId);
    if (!priceId.startsWith('price_')) throw new Error('Expected priceId that starts with price_');

    const session = await stripeClient.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      payment_intent_data: { application_fee_amount: APPLICATION_FEE_AMOUNT_CENTS },
      mode: 'payment',
      success_url: `${ROOT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ROOT_URL}/store/${accountId}`,
    }, { stripeAccount: accountId });

    res.redirect(session.url);
  } catch (err) {
    next(err);
  }
});

app.post('/accounts/:accountId/subscription-checkout', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;
    assertAccountId(accountId);
    if (!CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID.startsWith('price_')) {
      throw new Error('CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID must be a real platform-level price_ id');
    }

    const session = await stripeClient.checkout.sessions.create({
      customer_account: accountId,
      mode: 'subscription',
      line_items: [{ price: CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
      success_url: `${ROOT_URL}/dashboard?accountId=${accountId}&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ROOT_URL}/dashboard?accountId=${accountId}&subscription=cancelled`,
    });

    res.redirect(session.url);
  } catch (err) {
    next(err);
  }
});

app.post('/accounts/:accountId/billing-portal', async (req, res, next) => {
  try {
    const accountId = req.params.accountId;
    assertAccountId(accountId);
    const session = await stripeClient.billingPortal.sessions.create({
      customer_account: accountId,
      return_url: `${ROOT_URL}/dashboard?accountId=${accountId}`,
    });
    res.redirect(session.url);
  } catch (err) {
    next(err);
  }
});

app.get('/success', (req, res) => {
  res.send(page('Success', `<section class="card"><h1>Payment success</h1><p>Checkout session: <code>${req.query.session_id || ''}</code></p><p>Fulfill the order server-side after webhook verification in production.</p></section>`));
});

app.post('/webhooks/connect-v2-thin', rawBody, async (req, res) => {
  const secret = requiredEnv('STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET');
  const signature = req.header('stripe-signature');
  try {
    const thinEvent = stripeClient.parseThinEvent(req.body, signature, secret);
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

    switch (event.type) {
      case 'v2.core.account[requirements].updated':
      case 'v2.core.account[configuration.merchant].capability_status_updated':
      case 'v2.core.account[configuration.customer].capability_status_updated':
      case 'v2.core.account[configuration.recipient].capability_status_updated':
        console.log('Connect V2 update event received:', event.type, event.id);
        break;
      default:
        console.log('Unhandled Connect V2 event:', event.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Connect V2 thin webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.post('/webhooks/billing', rawBody, async (req, res) => {
  const secret = requiredEnv('STRIPE_BILLING_WEBHOOK_SECRET');
  const signature = req.header('stripe-signature');
  try {
    const event = stripeClient.webhooks.constructEvent(req.body, signature, secret);
    const obj = event.data.object;
    const accountId = obj.customer_account || obj.customer || 'unknown';

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        subscriptionState.set(accountId, { eventType: event.type, objectId: obj.id, updatedAt: new Date().toISOString() });
        break;
      case 'payment_method.attached':
      case 'payment_method.detached':
      case 'customer.updated':
      case 'customer.tax_id.created':
      case 'customer.tax_id.deleted':
      case 'customer.tax_id.updated':
      case 'billing_portal.configuration.created':
      case 'billing_portal.configuration.updated':
      case 'billing_portal.session.created':
        console.log('Billing info event:', event.type, obj.id);
        break;
      default:
        console.log('Unhandled billing event:', event.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Billing webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send(page('Error', `<section class="card"><h1>Blocked</h1><p>${err.message}</p><p class="muted">Fix the setup issue, then retry. Secrets are intentionally not printed.</p></section>`));
});

app.listen(PORT, () => {
  console.log(`DSG Stripe Connect V2 sample running on ${ROOT_URL}`);
});
