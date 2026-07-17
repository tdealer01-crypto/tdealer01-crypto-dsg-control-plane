/**
 * Trial to Paid Conversion API
 * POST /api/onboarding/convert
 * Converts trial account to paid subscription
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

interface ConversionRequest {
  plan: 'pro' | 'business' | 'enterprise';
  interval?: 'monthly' | 'yearly';
  promoCode?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id,is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as ConversionRequest;
    const { plan, interval = 'monthly' } = body;

    // Get trial account
    const { data: trial } = await admin
      .from('trial_accounts')
      .select('id,lead_id')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!trial) {
      return NextResponse.json(
        { error: 'No active trial found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    const { data: billing } = await admin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    let customerId = billing?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          org_id: profile.org_id,
          trial_converted: 'true',
        },
      });
      customerId = customer.id;

      // Save customer ID
      await admin.from('billing_customers').insert({
        org_id: profile.org_id,
        stripe_customer_id: customerId,
      });
    }

    // Get price ID for plan
    const priceEnvKey = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
    const priceId = process.env[priceEnvKey];

    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${plan}-${interval}` },
        { status: 500 }
      );
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        org_id: profile.org_id,
        trial_conversion: 'true',
      },
    });

    // Update trial account to converted
    await admin
      .from('trial_accounts')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('org_id', profile.org_id);

    // Update billing subscription
    await admin.from('billing_subscriptions').upsert({
      org_id: profile.org_id,
      stripe_subscription_id: subscription.id,
      plan_key: plan,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    // Log interaction if from lead
    if (trial.lead_id) {
      await admin.from('lead_interactions').insert({
        lead_id: trial.lead_id,
        interaction_type: 'trial_converted',
        metadata: { plan, interval, subscription_id: subscription.id },
      });

      // Update lead status
      await admin
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', trial.lead_id);
    }

    return NextResponse.json(
      {
        ok: true,
        subscription: {
          id: subscription.id,
          plan,
          interval,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
        },
        message: `Upgraded to ${plan} plan`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Conversion failed',
      },
      { status: 500 }
    );
  }
}
