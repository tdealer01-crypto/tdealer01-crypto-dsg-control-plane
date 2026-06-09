import { Hono } from 'hono';
import Stripe from 'stripe';

const router = new Hono();
let stripeClient: Stripe | null = null;

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.includes('REPLACE_ME') || value.endsWith('...')) {
    throw new Error(`${name} is required for the Connect V2 storefront test UI.`);
  }
  return value;
}

function rootUrl(): string {
  return process.env.STRIPE_CONNECT_ROOT_URL || process.env.DSG_API_URL || process.env.APP_URL || 'http://localhost:3001';
}

function stripe(): Stripe {
  if (!stripeClient) {
    const key = env('STRIPE_SECRET_KEY');
    if (!key.startsWith('sk_test_')) {
      throw new Error('Storefront test UI is test-mode only. Use STRIPE_SECRET_KEY=sk_test_...');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

function assertAcct(value?: string): string {
  if (!value || !value.startsWith('acct_')) throw new Error('Expected account id starting with acct_.');
  return value;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)}</title><style>
body{margin:0;background:#f6f7fb;color:#111827;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1080px;margin:0 auto;padding:32px 20px 56px}.hero{background:linear-gradient(135deg,#111827,#3b2f86);color:white;border-radius:24px;padding:28px;box-shadow:0 16px 40px rgba(17,24,39,.18)}.hero h1{margin:0 0 10px;font-size:clamp(28px,6vw,48px);letter-spacing:-.04em}.hero p{color:#d9dcff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:20px}.card{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,.06)}.product{display:flex;flex-direction:column;justify-content:space-between;min-height:220px}.price{font-size:28px;font-weight:800;margin:10px 0}.muted{color:#6b7280}.badge{display:inline-flex;border-radius:999px;background:#eef2ff;color:#3730a3;padding:8px 12px;font-size:13px;font-weight:800}.risk{background:#fff7ed;border-color:#fed7aa}.risk .badge{background:#ffedd5;color:#9a3412}label{display:block;font-size:13px;color:#374151;font-weight:800;margin:10px 0 4px}input,textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:12px;padding:11px 12px;font:inherit}textarea{min-height:80px}button{border:0;border-radius:12px;background:#635bff;color:white;cursor:pointer;font-weight:800;padding:12px 14px;width:100%}button.secondary{background:#111827}code{background:#f3f4f6;padding:2px 6px;border-radius:7px}ul{padding-left:20px}.footer{margin-top:22px;font-size:13px;color:#6b7280}</style></head><body><main>${body}</main></body></html>`;
}

async function createAccountLink(accountId: string): Promise<{ url: string }> {
  const payload = {
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant', 'customer'],
        refresh_url: `${rootUrl()}/connect-v2-storefront/${encodeURIComponent(accountId)}?refresh=1`,
        return_url: `${rootUrl()}/connect-v2-storefront/${encodeURIComponent(accountId)}?return=1`,
      },
    },
  };
  const client = stripe() as Stripe & {
    v2?: { core?: { accountLinks?: { create: (body: typeof payload) => Promise<{ url: string }> } } };
    rawRequest?: (method: string, path: string, body: typeof payload) => Promise<{ body?: { url: string }; url?: string }>;
  };
  if (client.v2?.core?.accountLinks?.create) return client.v2.core.accountLinks.create(payload);
  if (typeof client.rawRequest === 'function') {
    const response = await client.rawRequest('POST', '/v2/core/account_links', payload);
    return response.body ?? (response as { url: string });
  }
  throw new Error('Installed Stripe SDK does not expose Accounts V2 account links. Upgrade stripe-node.');
}

async function accountStatus(accountId: string): Promise<Record<string, any> | null> {
  const client = stripe() as Stripe & { v2?: { core?: { accounts?: { retrieve: (id: string, params: { include: string[] }) => Promise<Record<string, any>> } } } };
  if (!client.v2?.core?.accounts?.retrieve) return null;
  return client.v2.core.accounts.retrieve(accountId, { include: ['defaults', 'configuration.merchant', 'requirements'] });
}

function accountPanel(accountId: string, account: Record<string, any> | null): string {
  const cardStatus = account?.configuration?.merchant?.capabilities?.card_payments?.status ?? 'unknown';
  const losses = account?.defaults?.responsibilities?.losses_collector ?? 'unknown';
  const fees = account?.defaults?.responsibilities?.fees_collector ?? 'unknown';
  const req = account?.requirements?.summary?.minimum_deadline?.status ?? 'unknown';
  return `<section class="card risk"><span class="badge">Test mode risk panel</span><h2>Connected account</h2><p><code>${esc(accountId)}</code></p><ul><li>Charge type: <b>direct charge</b></li><li>Merchant of record: <b>connected account</b></li><li>Card payments: <b>${esc(cardStatus)}</b></li><li>Requirements: <b>${esc(req)}</b></li><li>Fees collector: <b>${esc(fees)}</b></li><li>Negative balance losses collector: <b>${esc(losses)}</b></li></ul><p class="muted">Test mode only. Do not use live keys or claim production readiness.</p><form method="post" action="/connect-v2-storefront/${encodeURIComponent(accountId)}/onboard"><button type="submit" class="secondary">Open Stripe-hosted onboarding</button></form></section>`;
}

function productCard(accountId: string, product: Stripe.Product, price: Stripe.Price): string {
  const amount = price.unit_amount ?? 0;
  const priceText = `${(amount / 100).toFixed(2)} ${(price.currency ?? 'usd').toUpperCase()}`;
  return `<article class="card product"><div><span class="badge">Connected product</span><h2>${esc(product.name)}</h2><p class="muted">${esc(product.description || 'No description')}</p><div class="price">${esc(priceText)}</div><p class="muted">Product <code>${esc(product.id)}</code></p><p class="muted">Price <code>${esc(price.id)}</code></p></div><form method="post" action="/connect-v2-storefront/${encodeURIComponent(accountId)}/checkout"><input type="hidden" name="priceId" value="${esc(price.id)}"/><button type="submit">Checkout direct charge</button></form></article>`;
}

router.get('/', (c) => c.html(page('DSG Connect V2 Storefront Test', `<section class="hero"><span class="badge">Test mode only</span><h1>DSG Connect V2 Storefront Test</h1><p>Open <code>/connect-v2-storefront/acct_...</code> after creating a test connected account.</p></section><section class="card"><h2>Truth boundary</h2><p>This is sample integration in test mode only. No live key, no live selling, no production-ready claim.</p></section>`)));

router.get('/:accountId', async (c) => {
  try {
    const accountId = assertAcct(c.req.param('accountId'));
    const account = await accountStatus(accountId);
    const prices = await stripe().prices.list({ active: true, limit: 100, expand: ['data.product'] }, { stripeAccount: accountId });
    const cards = prices.data.filter((p) => typeof p.product !== 'string').map((p) => productCard(accountId, p.product as Stripe.Product, p)).join('');
    return c.html(page('DSG Storefront Test', `<section class="hero"><span class="badge">Storefront test UI</span><h1>DSG Test Storefront</h1><p>Direct charges run on <code>${esc(accountId)}</code> with platform application fee.</p></section><div class="grid">${accountPanel(accountId, account)}<section class="card"><span class="badge">Create test product</span><h2>Add product</h2><form method="post" action="/connect-v2-storefront/${encodeURIComponent(accountId)}/products"><label>Name</label><input name="name" required value="DSG Test Product"/><label>Description</label><textarea name="description">Test product created on the connected account.</textarea><label>Price in cents</label><input name="priceInCents" type="number" min="50" step="1" required value="2500"/><label>Currency</label><input name="currency" required value="usd"/><button type="submit">Create connected-account product</button></form></section></div><h2>Products</h2><div class="grid">${cards || '<section class="card"><h2>No products yet</h2><p class="muted">Create a product above.</p></section>'}</div><p class="footer">Test mode only. No live keys, no live sales, no production-ready claim.</p>`));
  } catch (error) {
    return c.html(page('Storefront error', `<section class="card"><h1>Blocked</h1><p>${esc(error instanceof Error ? error.message : 'unknown_error')}</p></section>`), 500);
  }
});

router.post('/:accountId/onboard', async (c) => {
  try {
    const accountId = assertAcct(c.req.param('accountId'));
    const link = await createAccountLink(accountId);
    return c.redirect(link.url, 303);
  } catch (error) {
    return c.html(page('Onboarding error', `<section class="card"><h1>Blocked</h1><p>${esc(error instanceof Error ? error.message : 'unknown_error')}</p></section>`), 500);
  }
});

router.post('/:accountId/products', async (c) => {
  try {
    const accountId = assertAcct(c.req.param('accountId'));
    const body = await c.req.parseBody();
    const name = String(body.name ?? '').trim();
    const description = String(body.description ?? '').trim();
    const amount = Number(body.priceInCents);
    const currency = String(body.currency ?? 'usd').toLowerCase();
    if (!name) throw new Error('Product name is required.');
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Price must be a positive integer in cents.');
    await stripe().products.create({ name, description, default_price_data: { unit_amount: amount, currency } }, { stripeAccount: accountId });
    return c.redirect(`/connect-v2-storefront/${encodeURIComponent(accountId)}`, 303);
  } catch (error) {
    return c.html(page('Create product error', `<section class="card"><h1>Blocked</h1><p>${esc(error instanceof Error ? error.message : 'unknown_error')}</p></section>`), 500);
  }
});

router.post('/:accountId/checkout', async (c) => {
  try {
    const accountId = assertAcct(c.req.param('accountId'));
    const body = await c.req.parseBody();
    const priceId = String(body.priceId ?? '');
    if (!priceId.startsWith('price_')) throw new Error('priceId is required.');
    const session = await stripe().checkout.sessions.create({ line_items: [{ price: priceId, quantity: 1 }], payment_intent_data: { application_fee_amount: Number(process.env.APPLICATION_FEE_AMOUNT_CENTS || '123') }, mode: 'payment', success_url: `${rootUrl()}/connect-v2-storefront/${encodeURIComponent(accountId)}?checkout=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${rootUrl()}/connect-v2-storefront/${encodeURIComponent(accountId)}?checkout=cancelled` }, { stripeAccount: accountId });
    if (!session.url) throw new Error('Stripe Checkout session URL was not returned.');
    return c.redirect(session.url, 303);
  } catch (error) {
    return c.html(page('Checkout error', `<section class="card"><h1>Blocked</h1><p>${esc(error instanceof Error ? error.message : 'unknown_error')}</p></section>`), 500);
  }
});

export default router;
