import { describe, it, expect } from 'vitest';
import {
  computeCommission,
  buildTemplateSale,
  summarizeCreatorPayouts,
  checkTemplateMonetizationEligibility,
  DEFAULT_COMMISSION_RATE_BPS,
} from '../../lib/dsg/marketplace/template-commission';
import type { DsgMarketTemplate } from '../../lib/dsg/app-builder/templates/template-registry';

const publicTemplate: DsgMarketTemplate = {
  id: 'booking-appointment',
  name: 'Booking / Appointment',
  category: 'operations',
  idealCustomer: 'Service businesses.',
  businessOutcome: 'Customers book appointments.',
  requiredPages: ['/book'],
  requiredApis: ['/api/bookings'],
  requiredData: ['appointments'],
  requiredIntegrations: [],
  readinessGates: ['security-rbac'],
  riskLevel: 'medium',
  smokeTests: ['smoke:first-value-flow'],
  blockedUntil: [],
  customizationSteps: ['Set time slots.'],
  version: '1.0.0',
  sharingMode: 'public',
};

describe('computeCommission', () => {
  it('calculates 20% platform fee correctly', () => {
    const result = computeCommission(10_000, DEFAULT_COMMISSION_RATE_BPS);
    expect(result.platformFeeSatang).toBe(2_000);
    expect(result.creatorPayoutSatang).toBe(8_000);
    expect(result.platformFeeTHB).toBe(20);
    expect(result.creatorPayoutTHB).toBe(80);
  });

  it('rounds fractional satang without losing total', () => {
    const result = computeCommission(333, 2000);
    expect(result.platformFeeSatang + result.creatorPayoutSatang).toBe(333);
  });

  it('supports custom commission rates', () => {
    const result = computeCommission(10_000, 3000); // 30%
    expect(result.platformFeeSatang).toBe(3_000);
    expect(result.creatorPayoutSatang).toBe(7_000);
  });
});

describe('buildTemplateSale', () => {
  it('creates a sale in PENDING status with correct breakdown', () => {
    const sale = buildTemplateSale({
      saleId: 'sale-1',
      templateId: 'booking-appointment',
      sellerId: 'seller-uuid',
      buyerId: 'buyer-uuid',
      priceSatang: 50_000,
    });
    expect(sale.status).toBe('PENDING');
    expect(sale.platformFeeSatang).toBe(10_000); // 20% of 50,000
    expect(sale.creatorPayoutSatang).toBe(40_000);
    expect(sale.commissionRateBps).toBe(DEFAULT_COMMISSION_RATE_BPS);
  });

  it('respects custom commission rate when provided', () => {
    const sale = buildTemplateSale({
      saleId: 'sale-2',
      templateId: 'booking-appointment',
      sellerId: 'seller-uuid',
      buyerId: 'buyer-uuid',
      priceSatang: 10_000,
      commissionRateBps: 1000, // 10%
    });
    expect(sale.platformFeeSatang).toBe(1_000);
    expect(sale.creatorPayoutSatang).toBe(9_000);
  });
});

describe('summarizeCreatorPayouts', () => {
  const sales = [
    buildTemplateSale({ saleId: 's1', templateId: 'tmpl-1', sellerId: 'alice', buyerId: 'buyer-1', priceSatang: 10_000 }),
    buildTemplateSale({ saleId: 's2', templateId: 'tmpl-1', sellerId: 'alice', buyerId: 'buyer-2', priceSatang: 10_000 }),
    buildTemplateSale({ saleId: 's3', templateId: 'tmpl-2', sellerId: 'bob', buyerId: 'buyer-3', priceSatang: 20_000 }),
  ];
  // Mark one of alice's sales as CLEARED
  sales[0].status = 'CLEARED';

  it('scopes summary to the correct seller', () => {
    const summary = summarizeCreatorPayouts('alice', sales);
    expect(summary.sellerId).toBe('alice');
    expect(summary.clearedSales).toBe(1);
    expect(summary.pendingSales).toBe(1);
  });

  it('computes cleared vs pending payout correctly', () => {
    const summary = summarizeCreatorPayouts('alice', sales);
    expect(summary.clearedPayoutSatang).toBe(8_000); // 80% of 10,000
    expect(summary.pendingPayoutSatang).toBe(8_000);
  });

  it('does not include other sellers in the summary', () => {
    const aliceSummary = summarizeCreatorPayouts('alice', sales);
    expect(aliceSummary.totalRevenueSatang).toBe(20_000); // only alice's two sales
  });
});

describe('checkTemplateMonetizationEligibility', () => {
  it('approves a public template with no blockedUntil items and a positive price', () => {
    const result = checkTemplateMonetizationEligibility(publicTemplate, 10_000);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('ELIGIBLE');
  });

  it('rejects a non-public template', () => {
    const result = checkTemplateMonetizationEligibility({ ...publicTemplate, sharingMode: 'private' }, 10_000);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('NOT_PUBLIC');
  });

  it('rejects a template with outstanding blockedUntil items', () => {
    const result = checkTemplateMonetizationEligibility(
      { ...publicTemplate, blockedUntil: ['Deployment proof required'] },
      10_000,
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('READINESS_GATES_INCOMPLETE');
  });

  it('rejects a template with zero price', () => {
    const result = checkTemplateMonetizationEligibility(publicTemplate, 0);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('PRICE_MISSING');
  });
});
