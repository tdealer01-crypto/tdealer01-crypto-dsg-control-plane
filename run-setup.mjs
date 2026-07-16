import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required to run setup');
}

const stripe = new Stripe(stripeSecretKey);

async function main() {
  try {
    const account = await stripe.accounts.retrieve();
    console.log('Account:', account.id);
    
    // 1. Create Product
    const product = await stripe.products.create({
      name: 'DSG Execution Overage',
      description: 'Per-execution overage charges beyond plan quota',
      metadata: { plan_key: 'overage', source: 'dsg-control-plane-setup', meter_id: 'mtr_61UonJIY5OwhusBQX41KCAFwxVQo9UW8' }
    });
    console.log('Product:', product.id);
    
    // 2. Create Metered Price
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 100,
      recurring: { interval: 'month', usage_type: 'metered' },
      metadata: { plan_key: 'overage', billing_interval: 'monthly' }
    });
    console.log('Price:', price.id);
    
    // 3. Create 3 Plans
    const plans = [
      { key: 'pro', name: 'DSG Pro', monthly: 9900, yearly: 99000 },
      { key: 'business', name: 'DSG Business', monthly: 29900, yearly: 299000 },
      { key: 'enterprise', name: 'DSG Enterprise', monthly: 99900, yearly: 999000 }
    ];
    
    for (const plan of plans) {
      const product = await stripe.products.create({
        name: plan.name,
        metadata: { plan_key: plan.key, source: 'dsg-control-plane-setup' }
      });
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: plan.monthly,
        recurring: { interval: 'month' },
        metadata: { plan_key: plan.key, billing_interval: 'monthly' }
      });
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: plan.yearly,
        recurring: { interval: 'year' },
        metadata: { plan_key: plan.key, billing_interval: 'yearly' }
      });
      console.log('Plan', plan.key, 'monthly:', monthlyPrice.id, 'yearly:', yearlyPrice.id);
    }
    
    // 4. Create Metered Price
    const overageProduct = await stripe.products.create({
      name: 'DSG Execution Overage',
      description: 'Per-execution overage charges beyond plan quota',
      metadata: { plan_key: 'overage', source: 'dsg-control-plane-setup', meter_id: 'mtr_61UonJIY5OwhusBQX41KCAFwxVQo9UW8' }
    });
    const overagePrice = await stripe.prices.create({
      product: overageProduct.id,
      currency: 'usd',
      unit_amount: 100,
      recurring: { interval: 'month', usage_type: 'metered' },
      metadata: { plan_key: 'overage', billing_interval: 'monthly' }
    });
    console.log('Metered Price:', overagePrice.id);
    
    console.log('DONE!');
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main();
