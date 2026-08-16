/**
 * Stripe Gateway Provider
 *
 * Executes approved Stripe operations after gateway policy evaluation passes.
 * This module never returns synthetic payment IDs or success states.
 */

import type { GatewayToolProviderResult, GatewayToolRequest } from '@/lib/gateway/types';
import { getStripeClient } from '@/lib/stripe-products';

export interface StripeExecutionInput {
  amount_cents?: number;
  currency?: string;
  customer_id?: string;
  charge_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

function metadataToStrings(metadata?: Record<string, unknown>): Record<string, string> | undefined {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, String(value)])
  );
}

function requirePositiveAmount(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('invalid_amount_cents');
  }
  return amount;
}

function requireCurrency(currency: unknown): string {
  if (typeof currency !== 'string' || !/^[a-zA-Z]{3}$/.test(currency)) {
    throw new Error('invalid_currency');
  }
  return currency.toLowerCase();
}

export async function executeChargeCreate(
  input: StripeExecutionInput
): Promise<GatewayToolProviderResult> {
  try {
    const amount = requirePositiveAmount(input.amount_cents);
    const currency = requireCurrency(input.currency);
    if (!input.customer_id || typeof input.customer_id !== 'string') {
      throw new Error('customer_id_required');
    }

    const stripe = getStripeClient();
    const charge = await stripe.charges.create({
      amount,
      currency,
      customer: input.customer_id,
      description: input.description,
      metadata: metadataToStrings(input.metadata),
    });

    return {
      ok: charge.status === 'succeeded',
      provider: 'stripe',
      toolName: 'stripe.charge.create',
      action: 'charge.create',
      target: 'stripe',
      result: {
        charge_id: charge.id,
        amount_cents: charge.amount,
        currency: charge.currency,
        status: charge.status,
        paid: charge.paid,
      },
      error: charge.status === 'succeeded' ? undefined : `stripe_charge_${charge.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      provider: 'stripe',
      toolName: 'stripe.charge.create',
      action: 'charge.create',
      target: 'stripe',
      error: error instanceof Error ? error.message : 'charge_creation_failed',
    };
  }
}

export async function executePayoutCreate(
  input: StripeExecutionInput
): Promise<GatewayToolProviderResult> {
  try {
    const amount = requirePositiveAmount(input.amount_cents);
    const currency = requireCurrency(input.currency);
    const stripe = getStripeClient();
    const payout = await stripe.payouts.create({
      amount,
      currency,
      description: input.description,
      metadata: metadataToStrings(input.metadata),
    });

    return {
      ok: !['failed', 'canceled'].includes(payout.status),
      provider: 'stripe',
      toolName: 'stripe.payout.create',
      action: 'payout.create',
      target: 'stripe',
      result: {
        payout_id: payout.id,
        amount_cents: payout.amount,
        currency: payout.currency,
        status: payout.status,
      },
      error: ['failed', 'canceled'].includes(payout.status)
        ? `stripe_payout_${payout.status}`
        : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      provider: 'stripe',
      toolName: 'stripe.payout.create',
      action: 'payout.create',
      target: 'stripe',
      error: error instanceof Error ? error.message : 'payout_creation_failed',
    };
  }
}

export async function executeRefundCreate(
  input: StripeExecutionInput
): Promise<GatewayToolProviderResult> {
  try {
    if (!input.charge_id || typeof input.charge_id !== 'string') {
      throw new Error('charge_id_required');
    }

    const amount = input.amount_cents === undefined
      ? undefined
      : requirePositiveAmount(input.amount_cents);
    const metadata = metadataToStrings(input.metadata) ?? {};
    if (input.description) metadata.description = input.description;

    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      charge: input.charge_id,
      amount,
      metadata,
    });

    return {
      ok: refund.status === 'succeeded' || refund.status === 'pending',
      provider: 'stripe',
      toolName: 'stripe.refund.create',
      action: 'refund.create',
      target: 'stripe',
      result: {
        refund_id: refund.id,
        charge_id: input.charge_id,
        amount_cents: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
      error: refund.status === 'failed' || refund.status === 'canceled'
        ? `stripe_refund_${refund.status}`
        : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      provider: 'stripe',
      toolName: 'stripe.refund.create',
      action: 'refund.create',
      target: 'stripe',
      error: error instanceof Error ? error.message : 'refund_creation_failed',
    };
  }
}

export async function executeStripeGatewayProvider(
  request: GatewayToolRequest
): Promise<GatewayToolProviderResult> {
  const toolName = request.toolName;
  const input = request.input as StripeExecutionInput;

  if (toolName === 'stripe.charge.create') {
    return executeChargeCreate(input);
  }
  if (toolName === 'stripe.payout.create') {
    return executePayoutCreate(input);
  }
  if (toolName === 'stripe.refund.create') {
    return executeRefundCreate(input);
  }

  return {
    ok: false,
    provider: 'stripe',
    toolName,
    action: request.action,
    target: 'stripe',
    error: 'unknown_stripe_tool',
  };
}
