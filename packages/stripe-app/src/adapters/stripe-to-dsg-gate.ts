import Stripe from 'stripe';

export interface StripeOperationContext {
  stripe_account_id: string;
  stripe_event_id: string;
  object_type: 'charge' | 'payment_intent' | 'payout' | 'refund';
  object_id: string;
  amount_cents: number;
  currency: string;
  customer_id?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface DsgGatewayRequest {
  action: string;
  operation_type: string;
  context: StripeOperationContext;
}

export function chargeToGatewayRequest(
  charge: Stripe.Charge,
  stripeAccountId: string,
  stripeEventId: string
): DsgGatewayRequest {
  return {
    action: 'stripe.charge.create',
    operation_type: 'charge',
    context: {
      stripe_account_id: stripeAccountId,
      stripe_event_id: stripeEventId,
      object_type: 'charge',
      object_id: charge.id,
      amount_cents: charge.amount,
      currency: charge.currency,
      customer_id: charge.customer as string | undefined,
      description: charge.description || undefined,
      metadata: charge.metadata,
    },
  };
}

export function paymentIntentToGatewayRequest(
  paymentIntent: Stripe.PaymentIntent,
  stripeAccountId: string,
  stripeEventId: string
): DsgGatewayRequest {
  return {
    action: 'stripe.payment_intent.create',
    operation_type: 'payment_intent',
    context: {
      stripe_account_id: stripeAccountId,
      stripe_event_id: stripeEventId,
      object_type: 'payment_intent',
      object_id: paymentIntent.id,
      amount_cents: paymentIntent.amount || 0,
      currency: paymentIntent.currency,
      customer_id: paymentIntent.customer as string | undefined,
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata,
    },
  };
}

export function payoutToGatewayRequest(
  payout: Stripe.Payout,
  stripeAccountId: string,
  stripeEventId: string
): DsgGatewayRequest {
  return {
    action: 'stripe.payout.create',
    operation_type: 'payout',
    context: {
      stripe_account_id: stripeAccountId,
      stripe_event_id: stripeEventId,
      object_type: 'payout',
      object_id: payout.id,
      amount_cents: payout.amount,
      currency: payout.currency,
      metadata: payout.metadata || undefined,
    },
  };
}
