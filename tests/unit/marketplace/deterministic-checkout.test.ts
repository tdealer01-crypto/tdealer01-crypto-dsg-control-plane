import { describe, it, expect } from 'vitest';
import {
  calculateCheckoutFees,
  formatCents,
} from '@/lib/marketplace/deterministic-checkout';

describe('Deterministic Checkout Calculation', () => {
  describe('calculateCheckoutFees', () => {
    it('should calculate fees correctly with 10% fee percentage', () => {
      // Test case: $100 (10000 cents) with 10% fee
      // platform_fee = 10000 * 0.10 = 1000 cents
      // seller_payout = 10000 - 1000 = 9000 cents
      const result = calculateCheckoutFees(10000, 10);

      expect(result.amount_cents).toBe(10000);
      expect(result.fee_percentage).toBe(10);
      expect(result.platform_fee_cents).toBe(1000);
      expect(result.seller_payout_cents).toBe(9000);
    });

    it('should satisfy Z3 invariant: platform_fee + seller_payout = amount_total', () => {
      const testCases = [
        { amount_cents: 10000, fee_percentage: 10 },
        { amount_cents: 5000, fee_percentage: 15 },
        { amount_cents: 99999, fee_percentage: 5 },
        { amount_cents: 1, fee_percentage: 0 }, // edge case: no fee
        { amount_cents: 10000, fee_percentage: 100 }, // edge case: 100% fee
      ];

      testCases.forEach(({ amount_cents, fee_percentage }) => {
        const result = calculateCheckoutFees(amount_cents, fee_percentage);
        const sum = result.platform_fee_cents + result.seller_payout_cents;
        expect(sum).toBe(amount_cents);
      });
    });

    it('should handle 0% fee (no platform charge)', () => {
      const result = calculateCheckoutFees(10000, 0);

      expect(result.platform_fee_cents).toBe(0);
      expect(result.seller_payout_cents).toBe(10000);
      expect(result.platform_fee_cents + result.seller_payout_cents).toBe(10000);
    });

    it('should handle 100% fee (all to platform)', () => {
      const result = calculateCheckoutFees(10000, 100);

      expect(result.platform_fee_cents).toBe(10000);
      expect(result.seller_payout_cents).toBe(0);
    });

    it('should round fees correctly with fractional cents', () => {
      // Test case: $100.01 (10001 cents) with 10% fee
      // 10001 * 0.10 = 1000.1 → rounds to 1000
      // seller_payout = 10001 - 1000 = 9001
      const result = calculateCheckoutFees(10001, 10);

      expect(result.platform_fee_cents).toBe(1000);
      expect(result.seller_payout_cents).toBe(9001);
      expect(result.platform_fee_cents + result.seller_payout_cents).toBe(10001);
    });

    it('should throw on negative amount_cents', () => {
      expect(() => calculateCheckoutFees(-1000, 10)).toThrow(
        /invalid amount_cents/i,
      );
    });

    it('should throw on zero amount_cents', () => {
      expect(() => calculateCheckoutFees(0, 10)).toThrow(
        /invalid amount_cents/i,
      );
    });

    it('should throw on non-integer amount_cents', () => {
      expect(() => calculateCheckoutFees(100.5, 10)).toThrow(
        /invalid amount_cents/i,
      );
    });

    it('should throw on negative fee_percentage', () => {
      expect(() => calculateCheckoutFees(10000, -5)).toThrow(
        /invalid fee_percentage/i,
      );
    });

    it('should throw on fee_percentage > 100', () => {
      expect(() => calculateCheckoutFees(10000, 101)).toThrow(
        /invalid fee_percentage/i,
      );
    });

    it('should include Z3 verification message in result', () => {
      const result = calculateCheckoutFees(10000, 10);

      expect(result.z3_verification).toContain('Z3 verified');
      expect(result.z3_verification).toContain('1000');
      expect(result.z3_verification).toContain('9000');
      expect(result.z3_verification).toContain('10000');
    });
  });

  describe('formatCents', () => {
    it('should format cents as currency string', () => {
      expect(formatCents(10050)).toBe('$100.50');
      expect(formatCents(1000)).toBe('$10.00');
      expect(formatCents(50)).toBe('$0.50');
      expect(formatCents(1)).toBe('$0.01');
      expect(formatCents(0)).toBe('$0.00');
    });
  });
});
