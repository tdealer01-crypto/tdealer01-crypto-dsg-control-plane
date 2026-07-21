// 🚀 DSG ONE: Backend Integration for Browser Revenue Dashboard
// File: app/api/revenue/[action]/route.ts
// Connects: Browser tool ↔ Stripe ↔ PostHog ↔ Database

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PostHog } from 'posthog-node';
import { handleApiError } from '@/lib/security/api-error';
import { requireInternalService } from '@/lib/auth/internal-service';
import { GATE_PLANS } from '@/lib/billing/pricing-catalog';

export const dynamic = 'force-dynamic';

// ========== INIT ==========

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function getPostHog() {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_API_KEY || '', {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
  });
}

// ========== TYPES ==========

interface CheckoutRequest {
  plan: 'trial' | 'pro' | 'agency' | 'enterprise';
  email: string;
}

interface AnalyticsRequest {
  action: 'summary' | 'events' | 'customers';
  days?: number;
}

const PROTECTED_REVENUE_ACTIONS = new Set([
  'analytics-summary',
  'events',
  'customers',
  'simulate-webhook',
]);

// ========== ROUTE HANDLER ==========

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    if (PROTECTED_REVENUE_ACTIONS.has(action)) {
      const auth = requireInternalService(req);
      if (auth.ok === false) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    // ========== ACTION: CHECKOUT ==========

    if (action === 'checkout') {
      const stripe = getStripe();
      const supabase = getSupabase();
      const posthog = getPostHog();
      const body: CheckoutRequest = await req.json();
      const { plan, email } = body;

      if (!plan || !email) {
        return NextResponse.json(
          { error: 'Missing plan or email' },
          { status: 400 }
        );
      }

      // 1. Get or create customer in database
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, email, plan')
        .eq('email', email)
        .single();

      let customerId = customer?.id;

      if (!customerId) {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([
            {
              email,
              plan,
              status: 'active',
              created_at: new Date().toISOString(),
            },
          ])
          .select('id')
          .single();

        if (createError) {
          throw new Error(`Failed to create customer: ${createError.message}`);
        }

        customerId = newCustomer.id;

        posthog.capture({
          distinctId: email,
          event: 'customer_created',
          properties: {
            customer_id: customerId,
            initial_plan: plan,
          },
        });
      }

      // 2. Create Stripe checkout session
      const priceMap: Record<string, string> = {
        trial: process.env.STRIPE_PRICE_TRIAL || 'price_trial',
        pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
        agency: process.env.STRIPE_PRICE_AGENCY || 'price_agency',
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
      };

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        line_items: [
          {
            price: priceMap[plan],
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
          customer_id: customerId,
          plan,
        },
      });

      posthog.capture({
        distinctId: email,
        event: 'checkout_started',
        properties: {
          plan,
          session_id: session.id,
          customer_id: customerId,
        },
      });

      // 4. Log to database
      await supabase.from('checkout_events').insert([
        {
          customer_id: customerId,
          plan,
          session_id: session.id,
          status: 'started',
          created_at: new Date().toISOString(),
        },
      ]);

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        customerId,
      });
    }

    // ========== ACTION: ANALYTICS SUMMARY ==========

    if (action === 'analytics-summary') {
      const supabase = getSupabase();
      const body: AnalyticsRequest = await req.json();
      const days = body.days || 30;

      // Get metrics from database
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 1. Checkout starters
      const { data: checkoutData } = await supabase
        .from('checkout_events')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'started');

      const checkoutsStarted = checkoutData?.length || 0;

      // 2. Subscriptions created
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('id, amount, plan')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'active');

      const subscriptionsCreated = subscriptionData?.length || 0;
      const totalRevenue = subscriptionData?.reduce(
        (sum, sub) => sum + (sub.amount || 0),
        0
      ) || 0;

      // 3. Calculate metrics
      const conversionRate =
        checkoutsStarted > 0
          ? ((subscriptionsCreated / checkoutsStarted) * 100).toFixed(2)
          : '0';

      const avgMRR =
        subscriptionsCreated > 0 ? (totalRevenue / subscriptionsCreated).toFixed(2) : '0';

      // 4. Get customer metrics
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .gte('created_at', startDate.toISOString());

      const newCustomers = customers?.length || 0;

      return NextResponse.json({
        success: true,
        metrics: {
          checkoutsStarted,
          subscriptionsCreated,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          conversionRate: parseFloat(conversionRate),
          avgMRR: parseFloat(avgMRR),
          newCustomers,
          timeRange: `Last ${days} days`,
        },
      });
    }

    // ========== ACTION: RECENT EVENTS ==========

    if (action === 'events') {
      const supabase = getSupabase();
      const body: AnalyticsRequest = await req.json();
      const days = body.days || 7;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get checkout events
      const { data: checkoutEvents } = await supabase
        .from('checkout_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Get subscription events
      const { data: subscriptionEvents } = await supabase
        .from('subscription_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Merge and sort
      const allEvents = [
        ...(checkoutEvents || []).map((e) => ({
          ...e,
          type: 'checkout',
        })),
        ...(subscriptionEvents || []).map((e) => ({
          ...e,
          type: 'subscription',
        })),
      ];

      allEvents.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return NextResponse.json({
        success: true,
        events: allEvents.slice(0, 20),
        total: allEvents.length,
      });
    }

    // ========== ACTION: CUSTOMER METRICS ==========

    if (action === 'customers') {
      const supabase = getSupabase();
      const body: AnalyticsRequest = await req.json();
      const days = body.days || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all customers with subscriptions
      const { data: customers } = await supabase
        .from('customers')
        .select(
          `
          id,
          email,
          plan,
          status,
          subscriptions:subscriptions(id, amount, status),
          created_at
        `
        )
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Calculate metrics
      const totalCustomers = customers?.length || 0;
      const activeSubscriptions = customers?.filter((c) =>
        c.subscriptions?.some((s: any) => s.status === 'active')
      ).length || 0;

      const churnedCustomers = customers?.filter(
        (c) =>
          c.subscriptions?.some((s: any) => s.status === 'cancelled')
      ).length || 0;

      const churnRate =
        totalCustomers > 0
          ? ((churnedCustomers / totalCustomers) * 100).toFixed(2)
          : '0';

      return NextResponse.json({
        success: true,
        metrics: {
          totalCustomers,
          activeSubscriptions,
          churnedCustomers,
          churnRate: parseFloat(churnRate),
          customers: customers || [],
        },
      });
    }

    // ========== ACTION: SIMULATE WEBHOOK ==========

    if (action === 'simulate-webhook') {
      const supabase = getSupabase();
      const posthog = getPostHog();
      const body = await req.json();
      const { eventType, plan } = body;
      // Simulated amounts follow the pricing catalog ('agency' is this
      // route's legacy alias for the business tier).
      const simulatedAmount =
        plan === 'enterprise'
          ? GATE_PLANS.enterprise.displayMonthlyUsd
          : plan === 'agency'
            ? GATE_PLANS.business.displayMonthlyUsd
            : GATE_PLANS.pro.displayMonthlyUsd;

      // Get a random customer for simulation
      const { data: customers } = await supabase
        .from('customers')
        .select('id, email')
        .limit(1);

      if (!customers || customers.length === 0) {
        return NextResponse.json(
          { error: 'No customers found' },
          { status: 404 }
        );
      }

      const customer = customers[0];

      if (eventType === 'subscription_created') {
        // Record subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .insert([
            {
              customer_id: customer.id,
              plan: plan || 'pro',
              amount: simulatedAmount,
              status: 'active',
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        posthog.capture({
          distinctId: customer.email,
          event: 'subscription_created',
          properties: {
            customer_id: customer.id,
            plan: plan || 'pro',
            amount: simulatedAmount,
          },
        });

        return NextResponse.json({
          success: true,
          event: 'subscription_created',
          subscription,
        });
      }

      if (eventType === 'invoice_paid') {
        // Record invoice
        const { data: invoice } = await supabase
          .from('invoices')
          .insert([
            {
              customer_id: customer.id,
              amount: simulatedAmount,
              status: 'paid',
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        posthog.capture({
          distinctId: customer.email,
          event: 'invoice_paid',
          properties: {
            customer_id: customer.id,
            amount: simulatedAmount,
          },
        });

        return NextResponse.json({
          success: true,
          event: 'invoice_paid',
          invoice,
        });
      }

      return NextResponse.json(
        { error: 'Unknown event type' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError('api/revenue', error);
  }
}

// ========== GET: Health Check ==========

export async function GET() {
  return NextResponse.json({
    status: 'revenue-api-active',
    endpoints: [
      'POST /api/revenue/checkout',
      'POST /api/revenue/analytics-summary',
      'POST /api/revenue/events',
      'POST /api/revenue/customers',
      'POST /api/revenue/simulate-webhook',
    ],
  });
}
