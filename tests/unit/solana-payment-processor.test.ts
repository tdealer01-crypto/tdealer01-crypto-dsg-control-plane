/**
 * SOL payment processor truth-boundary tests.
 *
 * No payment/RPC API is mocked here. Dry-run is intentionally non-executing:
 * it cannot manufacture a transaction signature, confirmation, wallet balance,
 * payment history, or ledger evidence. Positive settlement is the responsibility
 * of the credentialed Solana integration path.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SOLPaymentProcessor, type PaymentRequest } from '../../lib/solana/payment';

const TREASURY = 'So11111111111111111111111111111111111111112';
const RECIPIENT = 'So11111111111111111111111111111111111111112';

function payment(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    executionId: 'exec-1',
    agentId: 'agent-1',
    recipientWallet: RECIPIENT,
    amountSOL: 0.001,
    idempotencyKey: 'key-1',
    description: 'test payment',
    ...overrides,
  };
}

describe('SOLPaymentProcessor', () => {
  let processor: SOLPaymentProcessor;

  beforeEach(() => {
    processor = new SOLPaymentProcessor(
      TREASURY,
      'test-org-id',
      'https://api.devnet.solana.com',
      true,
    );
  });

  describe('initialization', () => {
    it('starts in the explicitly requested dry-run mode', () => {
      expect(processor.isDryRun()).toBe(true);
    });

    it('can toggle the execution mode flag without claiming executor readiness', () => {
      processor.setDryRun(false);
      expect(processor.isDryRun()).toBe(false);
    });
  });

  describe('request validation', () => {
    it('rejects missing executionId', async () => {
      const result = await processor.processPayment(payment({ executionId: '' }));
      expect(result.status).toBe('failed');
      expect(result.transactionSignature).toBe('');
      expect(result.error).toContain('executionId');
    });

    it('rejects an invalid wallet', async () => {
      const result = await processor.processPayment(payment({ recipientWallet: 'invalid-wallet' }));
      expect(result.status).toBe('failed');
      expect(result.transactionSignature).toBe('');
      expect(result.error).toContain('Invalid Solana wallet address');
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects non-positive or non-finite amount %s',
      async (amountSOL) => {
        const result = await processor.processPayment(payment({ amountSOL }));
        expect(result.status).toBe('failed');
        expect(result.transactionSignature).toBe('');
        expect(result.error).toContain('finite number greater than 0');
      },
    );
  });

  describe('dry-run truth boundary', () => {
    it('never returns a confirmed payment or fabricated signature', async () => {
      const result = await processor.processPayment(payment());

      expect(result.status).toBe('failed');
      expect(result.transactionSignature).toBe('');
      expect(result.confirmationBlockHeight).toBeUndefined();
      expect(result.error).toBe('DRY_RUN_DOES_NOT_EXECUTE_PAYMENT');
    });

    it('does not convert metadata into settlement evidence', async () => {
      const result = await processor.processPayment(payment({
        metadata: {
          orchestrationId: 'orch-123',
          taskType: 'reputation-settlement',
        },
      }));

      expect(result.status).toBe('failed');
      expect(result.transactionSignature).toBe('');
      expect(result.error).toBe('DRY_RUN_DOES_NOT_EXECUTE_PAYMENT');
    });

    it('does not cache failed dry-run attempts as successful idempotent payments', async () => {
      const request = payment({ idempotencyKey: 'same-key' });
      const first = await processor.processPayment(request);
      const second = await processor.processPayment(request);

      expect(first.status).toBe('failed');
      expect(second.status).toBe('failed');
      expect(first.transactionSignature).toBe('');
      expect(second.transactionSignature).toBe('');
      expect(processor.getPaymentHistory()).toEqual([]);
    });

    it('keeps different failed dry-run requests out of confirmed payment history', async () => {
      await processor.processPayment(payment({ idempotencyKey: 'key-a', executionId: 'exec-a' }));
      await processor.processPayment(payment({ idempotencyKey: 'key-b', executionId: 'exec-b' }));

      expect(processor.getPaymentHistory()).toEqual([]);
      expect(processor.getPaymentHistory('exec-a')).toEqual([]);
      expect(processor.getPaymentHistory('exec-b')).toEqual([]);
    });

    it('refuses to invent a wallet balance', async () => {
      await expect(processor.checkWalletBalance(TREASURY)).rejects.toThrow(
        'DRY_RUN_HAS_NO_VERIFIED_WALLET_BALANCE',
      );
    });
  });

  describe('live mode without a real executor', () => {
    it('fails closed instead of synthesizing settlement when credentials are unavailable', async () => {
      processor.setDryRun(false);
      const result = await processor.processPayment(payment());

      expect(result.status).toBe('failed');
      expect(result.transactionSignature).toBe('');
      expect(result.error).toContain('SOLANA_TRANSACTION_EXECUTOR_UNAVAILABLE');
      expect(processor.getPaymentHistory()).toEqual([]);
    });

    it('does not fabricate wallet balance without an initialized executor', async () => {
      processor.setDryRun(false);
      await expect(processor.checkWalletBalance(TREASURY)).rejects.toThrow(
        'SOLANA_TRANSACTION_EXECUTOR_UNAVAILABLE',
      );
    });
  });
});
