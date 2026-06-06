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
      expect(request.context.stripe_event_id).toBe(stripeEventId);
      expect(request.context.amount_cents).toBe(10000);
      expect(request.context.currency).toBe('usd');
      expect(request.context.customer_id).toBe('cus_test');
      expect(request.context.object_id).toBe('ch_test');
      expect(request.context.object_type).toBe('charge');
      expect(request.context.metadata).toEqual({ order_id: '123' });
    });

    it('should handle charge with minimal data', () => {
      const charge = {
        id: 'ch_minimal',
        amount: 500,
        currency: 'eur',
        customer: null,
        description: null,
        metadata: null,
      };

      const request = chargeToGatewayRequest(charge as any, stripeAccountId, stripeEventId);

      expect(request.action).toBe('stripe.charge.create');
      expect(request.context.amount_cents).toBe(500);
      expect(request.context.currency).toBe('eur');
      expect(request.context.customer_id).toBeUndefined();
      expect(request.context.description).toBeUndefined();
    });

    it('should preserve metadata fields', () => {
      const charge = {
        id: 'ch_meta',
        amount: 2000,
        currency: 'gbp',
        customer: 'cus_meta',
        metadata: { order_id: '999', ref: 'ABC123' },
      };

      const request = chargeToGatewayRequest(charge as any, stripeAccountId, stripeEventId);

      expect(request.context.metadata).toEqual({ order_id: '999', ref: 'ABC123' });
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
      expect(request.context.stripe_account_id).toBe(stripeAccountId);
      expect(request.context.stripe_event_id).toBe(stripeEventId);
      expect(request.context.amount_cents).toBe(5000);
      expect(request.context.currency).toBe('usd');
      expect(request.context.object_type).toBe('payment_intent');
      expect(request.context.object_id).toBe('pi_test');
      expect(request.context.customer_id).toBe('cus_test');
    });

    it('should handle payment intent with zero amount', () => {
      const paymentIntent = {
        id: 'pi_zero',
        amount: 0,
        currency: 'usd',
        customer: 'cus_zero',
      };

      const request = paymentIntentToGatewayRequest(
        paymentIntent as any,
        stripeAccountId,
        stripeEventId
      );

      expect(request.context.amount_cents).toBe(0);
    });

    it('should handle payment intent with null amount', () => {
      const paymentIntent = {
        id: 'pi_null',
        amount: null,
        currency: 'usd',
        customer: 'cus_null',
      };

      const request = paymentIntentToGatewayRequest(
        paymentIntent as any,
        stripeAccountId,
        stripeEventId
      );

      expect(request.context.amount_cents).toBe(0);
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
      expect(request.context.stripe_account_id).toBe(stripeAccountId);
      expect(request.context.stripe_event_id).toBe(stripeEventId);
      expect(request.context.amount_cents).toBe(50000);
      expect(request.context.currency).toBe('usd');
      expect(request.context.object_type).toBe('payout');
      expect(request.context.object_id).toBe('po_test');
      expect(request.context.metadata).toEqual({ recipient: 'seller_123' });
    });

    it('should handle payout with no metadata', () => {
      const payout = {
        id: 'po_nometa',
        amount: 25000,
        currency: 'eur',
        metadata: null,
      };

      const request = payoutToGatewayRequest(payout as any, stripeAccountId, stripeEventId);

      expect(request.context.metadata).toBeUndefined();
    });

    it('should handle large payout amounts', () => {
      const payout = {
        id: 'po_large',
        amount: 999999999,
        currency: 'usd',
        metadata: { amount_type: 'large' },
      };

      const request = payoutToGatewayRequest(payout as any, stripeAccountId, stripeEventId);

      expect(request.context.amount_cents).toBe(999999999);
    });
  });
});
