import { describe, expect, it } from 'vitest';
import { decideTemplateEntitlement } from '../../lib/dsg/marketplace/template-entitlement';

const paidTemplate = {
  id: 'template-1',
  sellerId: 'seller-1',
  priceSatang: 49_000,
  sharingMode: 'public',
};

describe('decideTemplateEntitlement', () => {
  it('allows the seller to use their own template', () => {
    const decision = decideTemplateEntitlement({ actorId: 'seller-1', template: paidTemplate });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('SELLER_OWNER');
  });

  it('allows free public templates without a purchase', () => {
    const decision = decideTemplateEntitlement({
      actorId: 'buyer-1',
      template: { ...paidTemplate, sellerId: 'seller-1', priceSatang: 0 },
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('FREE_TEMPLATE');
  });

  it('blocks paid templates when no purchase exists', () => {
    const decision = decideTemplateEntitlement({ actorId: 'buyer-1', template: paidTemplate });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('PAYMENT_REQUIRED');
  });

  it('blocks pending purchases until Stripe webhook clears the sale', () => {
    const decision = decideTemplateEntitlement({
      actorId: 'buyer-1',
      template: paidTemplate,
      latestSale: { status: 'PENDING' },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('PURCHASE_PENDING');
    expect(decision.nextAction).toContain('Stripe webhook');
  });

  it('allows cleared purchases', () => {
    const decision = decideTemplateEntitlement({
      actorId: 'buyer-1',
      template: paidTemplate,
      latestSale: { status: 'CLEARED' },
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('PURCHASE_CLEARED');
  });

  it('blocks refunded purchases', () => {
    const decision = decideTemplateEntitlement({
      actorId: 'buyer-1',
      template: paidTemplate,
      latestSale: { status: 'REFUNDED' },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('PURCHASE_REFUNDED');
  });

  it('blocks non-public templates for non-sellers', () => {
    const decision = decideTemplateEntitlement({
      actorId: 'buyer-1',
      template: { ...paidTemplate, sharingMode: 'private' },
      latestSale: { status: 'CLEARED' },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('TEMPLATE_NOT_PUBLIC');
  });

  it('blocks missing templates', () => {
    const decision = decideTemplateEntitlement({ actorId: 'buyer-1', template: null });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('TEMPLATE_NOT_FOUND');
  });
});
