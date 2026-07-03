import { afterEach, describe, expect, it } from 'vitest';
import {
  GATE_PLANS,
  SKILLS_BUNDLES,
  DELIVERY_PROOF_PRICING,
  DEFAULT_PRICE_IDS,
  getPriceId,
  isSkillsBundle,
} from '../../../lib/billing/pricing-catalog';

const ENV_KEYS = [
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO',
] as const;
const saved: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('pricing catalog — single source of truth', () => {
  it('defines all three gate plans with trial days and env names', () => {
    expect(Object.keys(GATE_PLANS).sort()).toEqual(['business', 'enterprise', 'pro']);
    expect(GATE_PLANS.pro.trialDays).toBe(14);
    expect(GATE_PLANS.enterprise.trialDays).toBe(30);
    expect(GATE_PLANS.pro.priceEnv.monthly).toBe('STRIPE_PRICE_PRO_MONTHLY');
    expect(GATE_PLANS.pro.displayMonthlyUsd).toBe(99);
    expect(GATE_PLANS.enterprise.displayMonthlyUsd).toBe(499);
  });

  it('defines the five skills bundles with yearly = 9x monthly (25% discount)', () => {
    expect(Object.keys(SKILLS_BUNDLES)).toHaveLength(5);
    for (const bundle of Object.values(SKILLS_BUNDLES)) {
      expect(bundle.amountYearly).toBe(bundle.amountMonthly * 9);
    }
    expect(SKILLS_BUNDLES.finance_skills.amountMonthly).toBe(19900);
    expect(SKILLS_BUNDLES.enterprise_skills.amountMonthly).toBe(59900);
  });

  it('isSkillsBundle distinguishes bundles from core plans', () => {
    expect(isSkillsBundle('finance_skills')).toBe(true);
    expect(isSkillsBundle('pro')).toBe(false);
    expect(isSkillsBundle('')).toBe(false);
  });

  it('delivery-proof display tiers match the documented funnel ($0/$49/$199)', () => {
    expect(DELIVERY_PROOF_PRICING.free.label).toBe('$0');
    expect(DELIVERY_PROOF_PRICING.pro_scan.label).toBe('$49');
    expect(DELIVERY_PROOF_PRICING.unlimited.label).toBe('$199');
    expect(DELIVERY_PROOF_PRICING.unlimited.planKey).toBe('business');
  });

  it('getPriceId: env var wins over legacy and defaults', () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_env_first';
    process.env.STRIPE_PRICE_PRO = 'price_legacy';
    expect(getPriceId('pro', 'monthly')).toBe('price_env_first');
  });

  it('getPriceId: legacy monthly env wins over hardcoded default', () => {
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    process.env.STRIPE_PRICE_PRO = 'price_legacy';
    expect(getPriceId('pro', 'monthly')).toBe('price_legacy');
  });

  it('getPriceId: falls back to hardcoded live price IDs when no env set', () => {
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    delete process.env.STRIPE_PRICE_PRO;
    expect(getPriceId('pro', 'monthly')).toBe(DEFAULT_PRICE_IDS.pro.monthly);
    expect(getPriceId('enterprise', 'yearly')).toBe(DEFAULT_PRICE_IDS.enterprise.yearly);
  });
});
