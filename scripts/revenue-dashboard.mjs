#!/usr/bin/env node

/**
 * Revenue Dashboard - Real-time revenue metrics
 * Calculates: MRR, ARR, customer count, overage revenue, forecasts
 * Output: JSON report + formatted console output
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function calculateRevenue() {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: {
      mrr: 0,
      arr: 0,
      customers: 0,
      activeSubscriptions: 0,
      overageRevenue: 0,
      totalRevenue: 0,
      churnRate: 0,
    },
    breakdown: {
      stripe: {},
      overage: {},
      marketplace: {},
    },
    forecast: {},
    status: 'pending',
  };

  try {
    console.log('📊 Calculating revenue metrics...\n');

    // 1. Stripe Subscriptions
    console.log('📌 Step 1: Fetching Stripe subscriptions...');
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      status: 'active',
      expand: ['data.customer'],
    });

    let stripeRevenue = 0;
    const planBreakdown = {};

    for (const sub of subscriptions.data) {
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      const planName = sub.items.data[0]?.price?.nickname || 'Unknown';

      stripeRevenue += amount;
      planBreakdown[planName] = (planBreakdown[planName] || 0) + 1;
    }

    report.metrics.activeSubscriptions = subscriptions.data.length;
    report.metrics.mrr = stripeRevenue;
    report.metrics.arr = stripeRevenue * 12;
    report.breakdown.stripe = {
      activeSubscriptions: subscriptions.data.length,
      monthlyRevenue: stripeRevenue,
      annualRevenue: stripeRevenue * 12,
      planBreakdown,
    };

    console.log(`   ✅ Found ${subscriptions.data.length} active subscriptions\n`);

    // 2. Usage Overage from Supabase
    console.log('📌 Step 2: Fetching usage & overage metrics...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: usageMetrics, error: usageError } = await supabase
      .from('usage_events')
      .select('*')
      .gte('created_at', thirtyDaysAgo)
      .eq('event_type', 'overage');

    if (usageError) {
      console.log(`   ⚠️  Usage table not found or accessible`);
    } else {
      const overageRevenue = (usageMetrics || []).reduce(
        (sum, evt) => sum + (evt.amount_usd || 0),
        0
      );

      report.metrics.overageRevenue = overageRevenue;
      report.breakdown.overage = {
        eventsThisMonth: usageMetrics?.length || 0,
        revenue: overageRevenue,
      };

      console.log(`   ✅ Found ${usageMetrics?.length || 0} overage events\n`);
    }

    // 3. Calculate Total & Customer Count
    console.log('📌 Step 3: Computing totals...');
    report.metrics.totalRevenue = report.metrics.mrr + report.metrics.overageRevenue;
    report.metrics.customers = subscriptions.data.length;

    // Simple churn estimation (demo)
    report.metrics.churnRate = 0.05; // 5% monthly churn (placeholder)

    console.log(`   ✅ Totals calculated\n`);

    // 4. Revenue Forecast
    console.log('📌 Step 4: Generating forecast...');
    const growthRate = 0.15; // 15% MoM assumption

    report.forecast = {
      growthAssumption: `${(growthRate * 100).toFixed(0)}% MoM`,
      next3Months: {
        mrr: report.metrics.mrr * Math.pow(1 + growthRate, 3),
        arr: (report.metrics.mrr * Math.pow(1 + growthRate, 3)) * 12,
      },
      next6Months: {
        mrr: report.metrics.mrr * Math.pow(1 + growthRate, 6),
        arr: (report.metrics.mrr * Math.pow(1 + growthRate, 6)) * 12,
      },
      next12Months: {
        mrr: report.metrics.mrr * Math.pow(1 + growthRate, 12),
        arr: (report.metrics.mrr * Math.pow(1 + growthRate, 12)) * 12,
      },
    };

    console.log(`   ✅ Forecast complete\n`);

    // 5. Format & Display Report
    console.log('\n' + '═'.repeat(60));
    console.log('📈 REVENUE METRICS - CURRENT MONTH');
    console.log('═'.repeat(60));
    console.log(`MRR (Monthly Recurring Revenue):    $${report.metrics.mrr.toFixed(2)}`);
    console.log(`ARR (Annual Recurring Revenue):     $${report.metrics.arr.toFixed(2)}`);
    console.log(`Total Customers:                    ${report.metrics.customers}`);
    console.log(`Active Subscriptions:               ${report.metrics.activeSubscriptions}`);
    console.log(`Overage Revenue (30-day):           $${report.metrics.overageRevenue.toFixed(2)}`);
    console.log(`───────────────────────────────────────────────────────────`);
    console.log(`Total Revenue (30-day):             $${report.metrics.totalRevenue.toFixed(2)}`);
    console.log(`Estimated Churn Rate:               ${(report.metrics.churnRate * 100).toFixed(1)}%`);
    console.log('═'.repeat(60));

    console.log('\n' + '═'.repeat(60));
    console.log('📊 12-MONTH REVENUE FORECAST');
    console.log(`Growth Assumption: ${report.forecast.growthAssumption}`);
    console.log('═'.repeat(60));
    console.log(`3-Month MRR:  $${report.forecast.next3Months.mrr.toFixed(2)}`);
    console.log(`6-Month MRR:  $${report.forecast.next6Months.mrr.toFixed(2)}`);
    console.log(`12-Month MRR: $${report.forecast.next12Months.mrr.toFixed(2)}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log(`12-Month ARR: $${report.forecast.next12Months.arr.toFixed(2)}`);
    console.log('═'.repeat(60));

    console.log('\n' + '═'.repeat(60));
    console.log('💳 SUBSCRIPTION BREAKDOWN');
    console.log('═'.repeat(60));
    Object.entries(planBreakdown).forEach(([plan, count]) => {
      console.log(`${plan.padEnd(20)} ${count} customer(s)`);
    });
    console.log('═'.repeat(60));

    report.status = 'complete';

    // Save report
    mkdirSync(join(__dirname, '../qa-logs'), { recursive: true });
    const reportPath = join(__dirname, '../qa-logs/revenue-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to: qa-logs/revenue-report.json`);

    return report;
  } catch (error) {
    console.error('\n❌ Error calculating revenue:', error.message);
    if (error.code === 'ERR_MISSING_CREDENTIALS') {
      console.error('\n📝 Missing environment variables:');
      console.error('   - STRIPE_SECRET_KEY');
      console.error('   - NEXT_PUBLIC_SUPABASE_URL');
      console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    }
    report.status = 'error';
    report.error = error.message;
    process.exit(1);
  }
}

// Run
await calculateRevenue();
