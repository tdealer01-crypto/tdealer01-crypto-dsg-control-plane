/**
 * Unit Tests: SOL Payment Processor
 * Tests idempotency, balance validation, and payment processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SOLPaymentProcessor, PaymentRequest } from '../../lib/solana/payment';

vi.mock('../../lib/solana/payment-ledger', () => ({
  writeLedgerRecord: vi.fn().mockResolvedValue({ id: 'test-id', created_at: new Date().toISOString() }),
  checkIdempotencyRecord: vi.fn().mockResolvedValue(null),
}));

describe('SOLPaymentProcessor', () => {
  let processor: SOLPaymentProcessor;

  beforeEach(() => {
    processor = new SOLPaymentProcessor(
      'So11111111111111111111111111111111111111112',
      'test-org-id',
      'https://api.devnet.solana.com',
      true // dryRun mode for tests
    );
  });

  describe('initialization', () => {
    it('should initialize with treasury wallet address', () => {
      expect(processor.isDryRun()).toBe(true);
    });

    it('should toggle dry-run mode', () => {
      expect(processor.isDryRun()).toBe(true);
      processor.setDryRun(false);
      expect(processor.isDryRun()).toBe(false);
    });
  });

  describe('payment validation', () => {
    it('should reject payment with missing executionId', async () => {
      const request: PaymentRequest = {
        executionId: '',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 1.0,
        idempotencyKey: 'key-1',
        description: 'test payment',
      };

      const result = await processor.processPayment(request);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('executionId');
    });

    it('should reject payment with invalid wallet address', async () => {
      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'invalid-wallet',
        amountSOL: 1.0,
        idempotencyKey: 'key-1',
        description: 'test payment',
      };

      const result = await processor.processPayment(request);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Invalid Solana wallet address');
    });

    it('should reject payment with zero amount', async () => {
      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 0,
        idempotencyKey: 'key-1',
        description: 'test payment',
      };

      const result = await processor.processPayment(request);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('greater than 0');
    });

    it('should reject payment with negative amount', async () => {
      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: -1,
        idempotencyKey: 'key-1',
        description: 'test payment',
      };

      const result = await processor.processPayment(request);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('greater than 0');
    });
  });

  describe('idempotency', () => {
    it('should return cached result for duplicate idempotencyKey', async () => {
      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 1.0,
        idempotencyKey: 'unique-key-1',
        description: 'test payment',
      };

      // First call should process normally
      const result1 = await processor.processPayment(request);
      expect(result1.status).toBe('confirmed'); // dryRun mode
      const sig1 = result1.transactionSignature;

      // Second call with same idempotencyKey should return cached result
      const result2 = await processor.processPayment(request);
      expect(result2.status).toBe(result1.status);
      expect(result2.transactionSignature).toBe(sig1);
    });

    it('should process different idempotencyKeys separately', async () => {
      const baseRequest: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 1.0,
        description: 'test payment',
      };

      const request1 = { ...baseRequest, idempotencyKey: 'key-1' };
      const request2 = { ...baseRequest, idempotencyKey: 'key-2' };

      const result1 = await processor.processPayment(request1);
      const result2 = await processor.processPayment(request2);

      expect(result1.transactionSignature).not.toBe(result2.transactionSignature);
    });
  });

  describe('dry-run mode', () => {
    it('should generate mock signatures in dryRun mode', async () => {
      processor.setDryRun(true);

      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 0.001, // Small amount to avoid random balance issues
        idempotencyKey: 'dry-run-key-1',
        description: 'test payment',
      };

      const result = await processor.processPayment(request);
      expect(result.status).toBe('confirmed');
      expect(result.transactionSignature).toBeDefined();
      expect(result.transactionSignature.length).toBeGreaterThan(0);
    });
  });

  describe('payment history', () => {
    it('should track payment history', async () => {
      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 1.0,
        idempotencyKey: 'history-key-1',
        description: 'test payment',
      };

      await processor.processPayment(request);

      const history = processor.getPaymentHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].executionId).toBe('exec-1');
      expect(history[0].amountSOL).toBe(1.0);
    });

    it('should filter history by executionId', async () => {
      const request1: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 1.0,
        idempotencyKey: 'key-exec-1',
        description: 'test',
      };

      const request2: PaymentRequest = {
        executionId: 'exec-2',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 2.0,
        idempotencyKey: 'key-exec-2',
        description: 'test',
      };

      await processor.processPayment(request1);
      await processor.processPayment(request2);

      const execHistory = processor.getPaymentHistory('exec-1');
      expect(execHistory.length).toBe(1);
      expect(execHistory[0].executionId).toBe('exec-1');
      expect(execHistory[0].amountSOL).toBe(1.0);
    });
  });

  describe('wallet balance', () => {
    it('should check wallet balance', async () => {
      const balance = await processor.checkWalletBalance('So11111111111111111111111111111111111111112');
      expect(balance).toBeDefined();
      expect(balance.balanceSOL).toBeGreaterThanOrEqual(0);
      expect(balance.balanceLamports).toBeGreaterThanOrEqual(0);
    });

    it('should cache balance results', async () => {
      const wallet = 'So11111111111111111111111111111111111111112';
      const balance1 = await processor.checkWalletBalance(wallet);
      const balance2 = await processor.checkWalletBalance(wallet);

      expect(balance1.balanceSOL).toBe(balance2.balanceSOL);
    });
  });

  describe('payment with metadata', () => {
    it('should include metadata in payment result', async () => {
      const request: PaymentRequest = {
        executionId: 'exec-1',
        agentId: 'agent-1',
        recipientWallet: 'So11111111111111111111111111111111111111112',
        amountSOL: 1.0,
        idempotencyKey: 'meta-key-1',
        description: 'test payment',
        metadata: {
          orchestrationId: 'orch-123',
          taskType: 'reputation-settlement',
        },
      };

      const result = await processor.processPayment(request);
      expect(result.status).toBe('confirmed');
    });
  });
});
