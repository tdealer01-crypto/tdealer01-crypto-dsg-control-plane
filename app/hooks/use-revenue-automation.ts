// hooks/use-revenue-automation.ts
// Revenue Agent automation logic — Stripe integration & metered billing

import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export interface CustomerUsage {
  customerId: string;
  tier: "free" | "pro" | "business" | "enterprise";
  executionsThisMonth: number;
  executionLimit: number;
  overageRate: number;
  mrrContribution: number;
}

export interface DunningStatus {
  customerId: string;
  invoiceId: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  status: "retrying" | "recovered" | "failed" | "suspended";
}

const TIER_LIMITS = {
  free: 60,
  pro: 10_000,
  business: 100_000,
  enterprise: Infinity,
} as const;

const TIER_PRICES = {
  free: 0,
  pro: 99,
  business: 199,
  enterprise: 499,
} as const;

export async function recordExecution(customerId: string): Promise<{
  allowed: boolean;
  executionsUsed: number;
  executionLimit: number;
  overageCharged?: number;
}> {
  const supabase = await createClient();

  const { data: usage, error } = await supabase.rpc("increment_execution", {
    p_customer_id: customerId,
  });

  if (error) throw new Error(`Execution recording failed: ${error.message}`);

  const tier = usage.tier as keyof typeof TIER_LIMITS;
  const limit = TIER_LIMITS[tier];
  const executionsUsed = usage.executions_this_month;

  if (executionsUsed > limit && tier !== "enterprise") {
    await stripe.billing.meterEvents.create({
      event_name: "execution_overage",
      payload: {
        stripe_customer_id: usage.stripe_customer_id,
        value: "1",
      },
      timestamp: Math.floor(Date.now() / 1000),
    });

    return {
      allowed: true,
      executionsUsed,
      executionLimit: limit,
      overageCharged: 0.001,
    };
  }

  return {
    allowed: executionsUsed <= limit || tier === "enterprise",
    executionsUsed,
    executionLimit: limit,
  };
}

export async function checkAutoUpgradeEligibility(
  customerId: string
): Promise<{
  shouldPrompt: boolean;
  currentTier: string;
  suggestedTier: string;
  currentCost: number;
  suggestedCost: number;
  additionalExecutions: number;
}> {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("tier, executions_this_month, stripe_customer_id")
    .eq("id", customerId)
    .single();

  if (!customer) throw new Error("Customer not found");

  const tier = customer.tier as keyof typeof TIER_LIMITS;
  const limit = TIER_LIMITS[tier];
  const usage = customer.executions_this_month;
  const usagePercent = (usage / limit) * 100;

  if (usagePercent >= 80 && tier !== "enterprise") {
    const nextTier = getNextTier(tier);
    return {
      shouldPrompt: true,
      currentTier: tier,
      suggestedTier: nextTier,
      currentCost: TIER_PRICES[tier],
      suggestedCost: TIER_PRICES[nextTier as keyof typeof TIER_PRICES],
      additionalExecutions:
        TIER_LIMITS[nextTier as keyof typeof TIER_LIMITS] - limit,
    };
  }

  return {
    shouldPrompt: false,
    currentTier: tier,
    suggestedTier: tier,
    currentCost: TIER_PRICES[tier],
    suggestedCost: TIER_PRICES[tier],
    additionalExecutions: 0,
  };
}

export async function handlePaymentFailed(
  invoiceId: string,
  customerId: string
): Promise<DunningStatus> {
  const supabase = await createClient();

  const { data: dunning } = await supabase
    .from("dunning_queue")
    .select("*")
    .eq("invoice_id", invoiceId)
    .single();

  const retryCount = dunning ? dunning.retry_count + 1 : 1;

  if (retryCount > 8) {
    await supabase
      .from("customers")
      .update({ status: "suspended" })
      .eq("id", customerId);

    return {
      customerId,
      invoiceId,
      retryCount,
      maxRetries: 8,
      nextRetryAt: "N/A",
      status: "suspended",
    };
  }

  const backoffHours = Math.pow(2, retryCount - 1) * 4;
  const nextRetry = new Date(Date.now() + backoffHours * 60 * 60 * 1000);

  await supabase.from("dunning_queue").upsert({
    invoice_id: invoiceId,
    customer_id: customerId,
    retry_count: retryCount,
    next_retry_at: nextRetry.toISOString(),
    status: "retrying",
  });

  return {
    customerId,
    invoiceId,
    retryCount,
    maxRetries: 8,
    nextRetryAt: nextRetry.toISOString(),
    status: "retrying",
  };
}

export async function calculateMRR(): Promise<{
  totalMRR: number;
  subscriptionMRR: number;
  overageMRR: number;
  deliveryProofMRR: number;
  apiCallsMRR: number;
  customerCount: number;
  avgRevenuePerCustomer: number;
}> {
  const supabase = await createClient();

  const { data: revenue } = await supabase.rpc("calculate_mrr");

  return {
    totalMRR: revenue.total_mrr,
    subscriptionMRR: revenue.subscription_mrr,
    overageMRR: revenue.overage_mrr,
    deliveryProofMRR: revenue.delivery_proof_mrr,
    apiCallsMRR: revenue.api_calls_mrr,
    customerCount: revenue.customer_count,
    avgRevenuePerCustomer: revenue.total_mrr / revenue.customer_count,
  };
}

function getNextTier(
  current: "free" | "pro" | "business" | "enterprise"
): string {
  const tiers = ["free", "pro", "business", "enterprise"];
  const currentIndex = tiers.indexOf(current);
  return tiers[Math.min(currentIndex + 1, tiers.length - 1)];
}
