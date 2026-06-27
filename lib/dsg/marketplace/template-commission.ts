import type { DsgMarketTemplate } from '../app-builder/templates/template-registry';

export type TemplateSaleStatus = 'PENDING' | 'CLEARED' | 'REFUNDED';

export type TemplateSale = {
  saleId: string;
  templateId: string;
  sellerId: string;
  buyerId: string;
  /** Sale price in satang (1 THB = 100 satang) to avoid floating-point errors. */
  priceSatang: number;
  /** Platform commission rate in basis points (e.g. 2000 = 20%). */
  commissionRateBps: number;
  /** Computed automatically from priceSatang × commissionRateBps / 10000. */
  platformFeeSatang: number;
  /** Computed automatically: priceSatang − platformFeeSatang. */
  creatorPayoutSatang: number;
  createdAt: string;
  status: TemplateSaleStatus;
};

export type CommissionBreakdown = {
  priceSatang: number;
  commissionRateBps: number;
  platformFeeSatang: number;
  creatorPayoutSatang: number;
  platformFeeTHB: number;
  creatorPayoutTHB: number;
};

export type CreatorPayoutSummary = {
  sellerId: string;
  clearedSales: number;
  pendingSales: number;
  totalRevenueSatang: number;
  totalPlatformFeeSatang: number;
  clearedPayoutSatang: number;
  pendingPayoutSatang: number;
};

export type TemplateMonetizationEligibility = {
  eligible: boolean;
  templateId: string;
  reason: 'ELIGIBLE' | 'NOT_PUBLIC' | 'READINESS_GATES_INCOMPLETE' | 'PRICE_MISSING';
};

/** Default platform commission rate: 20% */
export const DEFAULT_COMMISSION_RATE_BPS = 2000;

export function computeCommission(priceSatang: number, commissionRateBps: number): CommissionBreakdown {
  const platformFeeSatang = Math.round((priceSatang * commissionRateBps) / 10_000);
  const creatorPayoutSatang = priceSatang - platformFeeSatang;
  return {
    priceSatang,
    commissionRateBps,
    platformFeeSatang,
    creatorPayoutSatang,
    platformFeeTHB: platformFeeSatang / 100,
    creatorPayoutTHB: creatorPayoutSatang / 100,
  };
}

export function buildTemplateSale(params: {
  saleId: string;
  templateId: string;
  sellerId: string;
  buyerId: string;
  priceSatang: number;
  commissionRateBps?: number;
}): TemplateSale {
  const rateBps = params.commissionRateBps ?? DEFAULT_COMMISSION_RATE_BPS;
  const breakdown = computeCommission(params.priceSatang, rateBps);
  return {
    saleId: params.saleId,
    templateId: params.templateId,
    sellerId: params.sellerId,
    buyerId: params.buyerId,
    priceSatang: params.priceSatang,
    commissionRateBps: rateBps,
    platformFeeSatang: breakdown.platformFeeSatang,
    creatorPayoutSatang: breakdown.creatorPayoutSatang,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };
}

export function summarizeCreatorPayouts(sellerId: string, sales: TemplateSale[]): CreatorPayoutSummary {
  const own = sales.filter((s) => s.sellerId === sellerId);
  let totalRevenue = 0;
  let totalFee = 0;
  let cleared = 0;
  let clearedPayout = 0;
  let pending = 0;
  let pendingPayout = 0;

  for (const sale of own) {
    totalRevenue += sale.priceSatang;
    totalFee += sale.platformFeeSatang;
    if (sale.status === 'CLEARED') {
      cleared++;
      clearedPayout += sale.creatorPayoutSatang;
    } else if (sale.status === 'PENDING') {
      pending++;
      pendingPayout += sale.creatorPayoutSatang;
    }
  }

  return {
    sellerId,
    clearedSales: cleared,
    pendingSales: pending,
    totalRevenueSatang: totalRevenue,
    totalPlatformFeeSatang: totalFee,
    clearedPayoutSatang: clearedPayout,
    pendingPayoutSatang: pendingPayout,
  };
}

/**
 * Checks whether a market template is eligible to be sold on the marketplace.
 * A template must be public, have no outstanding blockedUntil items, and be
 * passed in with a non-zero price to be considered eligible.
 */
export function checkTemplateMonetizationEligibility(
  template: DsgMarketTemplate,
  priceSatang: number,
): TemplateMonetizationEligibility {
  if (template.sharingMode !== 'public') {
    return { eligible: false, templateId: template.id, reason: 'NOT_PUBLIC' };
  }
  if (template.blockedUntil.length > 0) {
    return { eligible: false, templateId: template.id, reason: 'READINESS_GATES_INCOMPLETE' };
  }
  if (priceSatang <= 0) {
    return { eligible: false, templateId: template.id, reason: 'PRICE_MISSING' };
  }
  return { eligible: true, templateId: template.id, reason: 'ELIGIBLE' };
}
