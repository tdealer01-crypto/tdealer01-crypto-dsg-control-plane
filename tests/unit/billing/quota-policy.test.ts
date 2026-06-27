import { describe, it, expect } from 'vitest';
import { buildQuotaSummary } from '../../../lib/billing/quota-policy';

describe('quota policy defaults', () => {
  it('resolves trial defaults and near-limit', () => {
    const summary = buildQuotaSummary('trial', 900);
    expect(summary.executionsPer30Days).toBe(1000);
    expect(summary.nearLimit).toBe(true);
    expect(summary.exceeded).toBe(false);
  });
});
