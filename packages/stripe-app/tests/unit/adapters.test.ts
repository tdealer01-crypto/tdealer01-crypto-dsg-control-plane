import {
  chargeToGatewayRequest,
  paymentIntentToGatewayRequest,
  payoutToGatewayRequest,
} from '../../src/adapters/stripe-to-dsg-gate';
import { describe, it, expect } from 'vitest';

describe('Stripe to DSG Adapters', () => {
  const stripeAccountId = 'acct_test123';
  const stripeEventId = 'evt_test456';

  describe('chargeToGatewayRequest', () => {
    it('should convert Stripe charge to DSG gateway request', () => {
      const charge = {
        id: 'ch_test',
        amount: 10000,
        currency: 'usd',
        customer: 'cus_test',
        description: 'Test charge',
        metadata: { order_id: '123' },
      };

      const request = chargeToGatewayRequest(charge as any, stripeAccountId, stripeEventId);

      expect(request.action).toBe('stripe.charge.create');
      expect(request.operation_type).toBe('charge');
      expect(request.context.stripe_account_id).toBe(stripeAccountId);
      expect(request.context.amount_cents).toBe(10000);
      expect(request.context.currency).toBe('usd');
    });
  });

  describe('paymentIntentToGatewayRequest', () => {
    it('should convert Stripe payment intent to DSG gateway request', () => {
      const paymentIntent = {
        id: 'pi_test',
        amount: 5000,
        currency: 'usd',
        customer: 'cus_test',
        description: 'Test payment',
        metadata: { session_id: '456' },
      };

      const request = paymentIntentToGatewayRequest(
        paymentIntent as any,
        stripeAccountId,
        stripeEventId
      );

      expect(request.action).toBe('stripe.payment_intent.create');
      expect(request.operation_type).toBe('payment_intent');
      expect(request.context.amount_cents).toBe(5000);
    });
  });

  describe('payoutToGatewayRequest', () => {
    it('should convert Stripe payout to DSG gateway request', () => {
      const payout = {
        id: 'po_test',
        amount: 50000,
        currency: 'usd',
        metadata: { recipient: 'seller_123' },
      };

      const request = payoutToGatewayRequest(payout as any, stripeAccountId, stripeEventId);

      expect(request.action).toBe('stripe.payout.create');
      expect(request.operation_type).toBe('payout');
      expect(request.context.amount_cents).toBe(50000);
    });
  });
});
