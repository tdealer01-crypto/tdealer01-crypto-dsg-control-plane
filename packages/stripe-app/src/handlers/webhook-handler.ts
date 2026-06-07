import Stripe from 'stripe';
import {
  chargeToGatewayRequest,
  paymentIntentToGatewayRequest,
  payoutToGatewayRequest,
} from '../adapters/stripe-to-dsg-gate';
import { evaluateGateway, recordAudit } from '../lib/dsg-client';

export interface WebhookHandlerConfig {
  stripeSecretKey: string;
  webhookSecret: string;
  dsgApiBase: string;
}

export class StripeWebhookHandler {
  private stripe: Stripe;
  private config: WebhookHandlerConfig;

  constructor(config: WebhookHandlerConfig) {
    this.stripe = new Stripe(config.stripeSecretKey);
    this.config = config;
  }

  validateSignature(
    payload: Buffer,
    signature: string
  ): {
    valid: boolean;
    event?: Stripe.Event;
    error?: string;
  } {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return { valid: true, event };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid signature',
      };
    }
  }

  async handleChargeEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    const gatewayRequest = chargeToGatewayRequest(
      charge,
      stripeAccountId,
      event.id
    );

    const decision = await evaluateGateway(
      gatewayRequest,
      this.config.dsgApiBase
    );

    console.log(`[Webhook] Charge ${charge.id}: ${decision.decision}`);

    await recordAudit(decision, event.id, this.config.dsgApiBase);

    // If blocked after fact, trigger auto-reverse/refund
    if (decision.decision === 'BLOCK') {
      console.warn(
        `[Webhook] Charge ${charge.id} blocked. Initiating auto-refund.`
      );
      // TODO: Call refund endpoint
    }
  }

  async handlePaymentIntentEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const gatewayRequest = paymentIntentToGatewayRequest(
      paymentIntent,
      stripeAccountId,
      event.id
    );

    const decision = await evaluateGateway(
      gatewayRequest,
      this.config.dsgApiBase
    );

    console.log(
      `[Webhook] Payment Intent ${paymentIntent.id}: ${decision.decision}`
    );

    await recordAudit(decision, event.id, this.config.dsgApiBase);
  }

  async handlePayoutEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    const payout = event.data.object as Stripe.Payout;

    const gatewayRequest = payoutToGatewayRequest(payout, stripeAccountId, event.id);

    const decision = await evaluateGateway(
      gatewayRequest,
      this.config.dsgApiBase
    );

    console.log(`[Webhook] Payout ${payout.id}: ${decision.decision}`);

    await recordAudit(decision, event.id, this.config.dsgApiBase);

    // Critical: if payout blocked, freeze it
    if (decision.decision === 'BLOCK') {
      console.warn(`[Webhook] Payout ${payout.id} blocked. Freezing payout.`);
      // TODO: Call payout freeze endpoint
    }
  }

  async handleEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    try {
      switch (event.type as string) {
        case 'charge.created':
        case 'charge.updated':
          await this.handleChargeEvent(event, stripeAccountId);
          break;

        case 'payment_intent.created':
        case 'payment_intent.processing':
          await this.handlePaymentIntentEvent(event, stripeAccountId);
          break;

        case 'payout.created':
        case 'payout.updated':
          await this.handlePayoutEvent(event, stripeAccountId);
          break;

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(
        `[Webhook] Error handling event ${event.id}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }
}
