import Stripe from 'stripe';

const API_VERSION = '2026-06-24.dahlia';
const EXPECTED_EVENT_NAME = 'dsg_execution_overage';
const PRICE_LOOKUP_KEY = 'dsg_pro_overage_usd_0_001_monthly_2026';
const UNIT_AMOUNT_DECIMAL_CENTS = '0.1'; // USD $0.001 per execution

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function resolveProMonthlyPriceId() {
  return (
    process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_PRO?.trim() ||
    ''
  );
}

function assertExistingPrice(existing, meterId, productId) {
  const problems = [];
  if (existing.currency !== 'usd') problems.push(`currency=${existing.currency}`);
  if (existing.product !== productId) problems.push(`product=${existing.product}`);
  if (existing.unit_amount_decimal !== UNIT_AMOUNT_DECIMAL_CENTS) {
    problems.push(`unit_amount_decimal=${existing.unit_amount_decimal}`);
  }
  if (existing.recurring?.interval !== 'month') {
    problems.push(`interval=${existing.recurring?.interval}`);
  }
  if (existing.recurring?.usage_type !== 'metered') {
    problems.push(`usage_type=${existing.recurring?.usage_type}`);
  }
  if (existing.recurring?.meter !== meterId) {
    problems.push(`meter=${existing.recurring?.meter}`);
  }
  if (problems.length > 0) {
    throw new Error(
      `Existing overage Price ${existing.id} does not match DSG billing contract: ${problems.join(', ')}`,
    );
  }
}

async function main() {
  if (process.env.DSG_BOOTSTRAP_OVERAGE_ON_START !== 'true') {
    console.log('DSG_OVERAGE_BOOTSTRAP skipped: flag disabled');
    return;
  }

  const secretKey = requireEnv('STRIPE_SECRET_KEY');
  const configuredEventName =
    process.env.STRIPE_METER_EVENT_NAME?.trim() || EXPECTED_EVENT_NAME;
  if (configuredEventName !== EXPECTED_EVENT_NAME) {
    throw new Error(
      `STRIPE_METER_EVENT_NAME must be ${EXPECTED_EVENT_NAME}; got ${configuredEventName}`,
    );
  }

  const proMonthlyPriceId = resolveProMonthlyPriceId();
  if (!proMonthlyPriceId) {
    throw new Error('STRIPE_PRICE_PRO_MONTHLY (or legacy STRIPE_PRICE_PRO) is required');
  }

  const stripe = new Stripe(secretKey, { apiVersion: API_VERSION });

  // Bind the overage component to the exact Product already used by the live
  // Pro subscription. This avoids creating duplicate or cross-account products.
  const fixedProPrice = await stripe.prices.retrieve(proMonthlyPriceId);
  if (!fixedProPrice.active || fixedProPrice.currency !== 'usd') {
    throw new Error(`Configured Pro Price ${proMonthlyPriceId} is not an active USD Price`);
  }
  const productId =
    typeof fixedProPrice.product === 'string'
      ? fixedProPrice.product
      : fixedProPrice.product?.id;
  if (!productId) throw new Error('Configured Pro Price has no Product id');

  const matchingMeters = [];
  for await (const meter of stripe.billing.meters.list({ limit: 100 })) {
    if (meter.event_name === EXPECTED_EVENT_NAME && meter.status === 'active') {
      matchingMeters.push(meter);
      if (matchingMeters.length > 1) break;
    }
  }

  if (matchingMeters.length > 1) {
    throw new Error(
      `Multiple active Stripe Billing Meters use event_name=${EXPECTED_EVENT_NAME}; refusing ambiguous bootstrap`,
    );
  }

  const meter =
    matchingMeters[0] ||
    (await stripe.billing.meters.create({
      display_name: 'DSG Pro Overage Executions',
      event_name: EXPECTED_EVENT_NAME,
      default_aggregation: { formula: 'sum' },
      customer_mapping: {
        type: 'by_id',
        event_payload_key: 'stripe_customer_id',
      },
      value_settings: { event_payload_key: 'value' },
    }));

  const existingPrices = await stripe.prices.list({
    active: true,
    lookup_keys: [PRICE_LOOKUP_KEY],
    limit: 10,
  });

  let overagePrice = existingPrices.data[0];
  if (existingPrices.data.length > 1) {
    throw new Error(`Multiple active Prices use lookup_key=${PRICE_LOOKUP_KEY}`);
  }

  if (overagePrice) {
    assertExistingPrice(overagePrice, meter.id, productId);
  } else {
    overagePrice = await stripe.prices.create({
      product: productId,
      currency: 'usd',
      billing_scheme: 'per_unit',
      unit_amount_decimal: UNIT_AMOUNT_DECIMAL_CENTS,
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        meter: meter.id,
      },
      lookup_key: PRICE_LOOKUP_KEY,
      nickname: 'DSG Pro Overage — $0.001/execution',
      metadata: {
        plan_tier: 'pro',
        billing_component: 'overage',
        unit: 'execution',
        rate_usd: '0.001',
        source: 'dsg-control-plane-bootstrap',
      },
    });
  }

  console.log(
    'DSG_OVERAGE_BOOTSTRAP_RESULT',
    JSON.stringify({
      configured: true,
      meterId: meter.id,
      priceId: overagePrice.id,
      eventName: EXPECTED_EVENT_NAME,
      lookupKey: PRICE_LOOKUP_KEY,
      rateUsdPerExecution: '0.001',
    }),
  );
}

main().catch((error) => {
  console.error(
    'DSG_OVERAGE_BOOTSTRAP_ERROR',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
