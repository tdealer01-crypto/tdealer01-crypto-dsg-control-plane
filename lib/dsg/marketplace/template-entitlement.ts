export type TemplateEntitlementSaleStatus = 'PENDING' | 'CLEARED' | 'REFUNDED';

export type TemplateEntitlementReason =
  | 'TEMPLATE_NOT_FOUND'
  | 'SELLER_OWNER'
  | 'TEMPLATE_NOT_PUBLIC'
  | 'FREE_TEMPLATE'
  | 'PAYMENT_REQUIRED'
  | 'PURCHASE_CLEARED'
  | 'PURCHASE_PENDING'
  | 'PURCHASE_REFUNDED'
  | 'PURCHASE_NOT_CLEARED';

export type TemplateEntitlementInput = {
  actorId: string;
  template:
    | {
        id: string;
        sellerId: string | null;
        priceSatang: number;
        sharingMode: string | null;
      }
    | null;
  latestSale?: { status: TemplateEntitlementSaleStatus | string } | null;
};

export type TemplateEntitlementDecision = {
  allowed: boolean;
  reason: TemplateEntitlementReason;
  saleStatus: string | null;
  priceSatang: number | null;
  nextAction: string;
};

export function decideTemplateEntitlement(input: TemplateEntitlementInput): TemplateEntitlementDecision {
  const { actorId, template, latestSale } = input;

  if (!template) {
    return {
      allowed: false,
      reason: 'TEMPLATE_NOT_FOUND',
      saleStatus: null,
      priceSatang: null,
      nextAction: 'Select an existing marketplace template.',
    };
  }

  if (template.sellerId === actorId) {
    return {
      allowed: true,
      reason: 'SELLER_OWNER',
      saleStatus: null,
      priceSatang: template.priceSatang,
      nextAction: 'Allow the creator to use their own template.',
    };
  }

  if ((template.sharingMode ?? 'public') !== 'public') {
    return {
      allowed: false,
      reason: 'TEMPLATE_NOT_PUBLIC',
      saleStatus: null,
      priceSatang: template.priceSatang,
      nextAction: 'Publish the template before marketplace use.',
    };
  }

  if (template.priceSatang <= 0) {
    return {
      allowed: true,
      reason: 'FREE_TEMPLATE',
      saleStatus: null,
      priceSatang: template.priceSatang,
      nextAction: 'Allow access to the free public template.',
    };
  }

  if (!latestSale) {
    return {
      allowed: false,
      reason: 'PAYMENT_REQUIRED',
      saleStatus: null,
      priceSatang: template.priceSatang,
      nextAction: 'Start Stripe Checkout before granting access.',
    };
  }

  if (latestSale.status === 'CLEARED') {
    return {
      allowed: true,
      reason: 'PURCHASE_CLEARED',
      saleStatus: latestSale.status,
      priceSatang: template.priceSatang,
      nextAction: 'Allow access to the purchased template.',
    };
  }

  if (latestSale.status === 'PENDING') {
    return {
      allowed: false,
      reason: 'PURCHASE_PENDING',
      saleStatus: latestSale.status,
      priceSatang: template.priceSatang,
      nextAction: 'Wait for Stripe webhook confirmation before granting access.',
    };
  }

  if (latestSale.status === 'REFUNDED') {
    return {
      allowed: false,
      reason: 'PURCHASE_REFUNDED',
      saleStatus: latestSale.status,
      priceSatang: template.priceSatang,
      nextAction: 'Require a new cleared purchase before granting access.',
    };
  }

  return {
    allowed: false,
    reason: 'PURCHASE_NOT_CLEARED',
    saleStatus: latestSale.status,
    priceSatang: template.priceSatang,
    nextAction: 'Require a CLEARED marketplace sale before granting access.',
  };
}
