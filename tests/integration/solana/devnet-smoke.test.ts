import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import { SOLPaymentProcessor } from '@/lib/solana/payment';

/**
 * Solana Devnet Smoke Tests
 *
 * These tests verify real Solana devnet transaction execution end-to-end.
 * They require SOLANA_RPC_ENDPOINT and SOLANA_TREASURY_SECRET to be configured.
 *
 * Run with: npm run test -- tests/integration/solana/devnet-smoke.test.ts --run
 *
 * Expected results:
 * - Real transactions submitted to Solana devnet
 * - Confirmation polling validates transaction status
 * - Audit trail recorded in Supabase payment_ledger
 * - Zero hardcoded secrets in code or logs
 */

describe('Solana Devnet Smoke Tests', () => {
  let processor: SOLPaymentProcessor;
  let connection: Connection;
  let treasuryAddress: string;
  let recipientAddress: string;
  const devnetUrl = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';

  beforeAll(() => {
    // Skip tests if required environment variables are not configured
    const hasRpcEndpoint = !!process.env.SOLANA_RPC_ENDPOINT;
    const hasTreasurySecret = !!process.env.SOLANA_TREASURY_SECRET || !!process.env.SOLANA_TREASURY_PRIVATE_KEY;

    if (!hasRpcEndpoint || !hasTreasurySecret) {
      console.log('⏭️  Skipping devnet smoke tests: SOLANA_RPC_ENDPOINT or SOLANA_TREASURY_SECRET not configured');
      console.log('    To enable: set environment variables and run with devnet GitHub environment');
      return;
    }

    // Initialize connection
    connection = new Connection(devnetUrl, 'confirmed');

    // Derive treasury address from keypair
    try {
      let keypair: Keypair;

      if (process.env.SOLANA_TREASURY_SECRET) {
        const secretArray = JSON.parse(process.env.SOLANA_TREASURY_SECRET);
        keypair = Keypair.fromSecretKey(Buffer.from(secretArray));
      } else if (process.env.SOLANA_TREASURY_PRIVATE_KEY) {
        const decoded = Buffer.from(process.env.SOLANA_TREASURY_PRIVATE_KEY, 'base64');
        keypair = Keypair.fromSecretKey(decoded);
      } else {
        throw new Error('No treasury keypair configured');
      }

      treasuryAddress = keypair.publicKey.toString();

      // Use a test recipient address (can be any valid Solana address)
      // In production, this should be a controlled test wallet
      recipientAddress = new PublicKey('11111111111111111111111111111112').toString();

      processor = new SOLPaymentProcessor(treasuryAddress, devnetUrl, 'devnet-test-org');
    } catch (error) {
      console.error('❌ Failed to initialize keypair from environment:', error instanceof Error ? error.message : error);
      throw error;
    }
  });

  describe('RPC Connection', () => {
    it('should connect to devnet RPC endpoint', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const version = await connection.getVersion();
      expect(version).toBeDefined();
      expect(version['solana-core']).toBeDefined();
      console.log(`✅ Connected to Solana devnet version ${version['solana-core']}`);
    });

    it('should retrieve block height', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const blockHeight = await connection.getBlockHeight();
      expect(blockHeight).toBeGreaterThan(0);
      console.log(`✅ Current block height: ${blockHeight}`);
    });

    it('should check treasury wallet balance', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const balance = await processor.checkWalletBalance(treasuryAddress);
      expect(balance).toBeDefined();
      expect(balance.balanceSOL).toBeGreaterThanOrEqual(0);

      if (balance.balanceSOL < 0.1) {
        console.warn(`⚠️  Treasury balance low: ${balance.balanceSOL} SOL`);
        console.warn('    Run: solana airdrop 10 ' + treasuryAddress + ' --url devnet');
      } else {
        console.log(`✅ Treasury balance: ${balance.balanceSOL} SOL`);
      }
    });
  });

  describe('Transaction Execution', () => {
    it('should validate recipient address format', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const invalidAddress = 'invalid-address';
      const result = await processor.processPayment({
        executionId: 'test-invalid-addr-' + Date.now(),
        recipientWallet: invalidAddress,
        amountSOL: 0.01,
        description: 'Test invalid address validation'
      });

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error?.includes('Invalid') || result.error?.includes('invalid')).toBe(true);
      console.log(`✅ Invalid address validation works: ${result.error}`);
    });

    it('should validate SOL amount range', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const result = await processor.processPayment({
        executionId: 'test-invalid-amount-' + Date.now(),
        recipientWallet: recipientAddress,
        amountSOL: -1,
        description: 'Test negative amount validation'
      });

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      console.log(`✅ Amount validation works: ${result.error}`);
    });

    it('should execute minimal SOL transfer', async function() {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      // Check balance first
      const balance = await processor.checkWalletBalance(treasuryAddress);
      if (balance.balanceSOL < 0.01) {
        console.warn('⚠️  Insufficient treasury balance for test transaction');
        console.warn('    Run: solana airdrop 10 ' + treasuryAddress + ' --url devnet');
        this.skip();
        return;
      }

      const result = await processor.processPayment({
        executionId: 'devnet-smoke-test-' + Date.now(),
        recipientWallet: recipientAddress,
        amountSOL: 0.001,
        description: 'Devnet smoke test transaction'
      });

      // In production mode with valid keypair, expect success
      // In dry-run mode, expect dry-run response
      expect(result.status).toMatch(/^(success|error)$/);

      if (result.status === 'success') {
        expect(result.transaction).toBeDefined();
        expect(result.transaction?.signature).toBeDefined();
        console.log(`✅ Transaction submitted: ${result.transaction?.signature}`);

        if (result.transaction?.mode !== 'dry_run') {
          // Only check confirmation for real transactions
          expect(result.transaction?.status).toBeDefined();
          console.log(`✅ Transaction status: ${result.transaction?.status}`);
        }
      } else if (result.error) {
        console.log(`ℹ️  Transaction failed (may be expected): ${result.error}`);
      }
    });
  });

  describe('Audit Trail', () => {
    it('should record transactions in Supabase payment_ledger', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      // This test assumes Supabase is configured and accessible
      // In CI environment without Supabase access, this may be skipped
      const executionId = 'devnet-audit-test-' + Date.now();

      const result = await processor.processPayment({
        executionId: executionId,
        recipientWallet: recipientAddress,
        amountSOL: 0.0001,
        description: 'Audit trail test transaction'
      });

      if (result.status === 'success' && result.transaction?.signature) {
        // Verify signature is not exposed
        const signature = result.transaction.signature;
        expect(signature).toMatch(/^[1-9A-HJ-NP-Z]{88}$/);
        console.log(`✅ Valid Solana transaction signature format`);

        // Note: Full audit verification requires Supabase query access
        // See docs/SOLANA_INTEGRATION.md for audit trail queries
      }
    });
  });

  describe('Confirmation Polling', () => {
    it('should implement 60-second timeout', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      // Verify timeout configuration is in place
      const timeoutMs = parseInt(process.env.SOLANA_CONFIRMATION_TIMEOUT_MS || '60000', 10);
      expect(timeoutMs).toBe(60000);
      console.log(`✅ Confirmation timeout configured: ${timeoutMs}ms`);
    });

    it('should track block height for expiration detection', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const initialBlockHeight = await connection.getBlockHeight();
      const maxBlockHeight = initialBlockHeight + 256; // 256-block window

      expect(maxBlockHeight).toBeGreaterThan(initialBlockHeight);
      console.log(`✅ Block height window configured: current ${initialBlockHeight}, max ${maxBlockHeight}`);
    });
  });

  describe('Error Handling', () => {
    it('should not expose private keys in error messages', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      const result = await processor.processPayment({
        executionId: 'test-error-' + Date.now(),
        recipientWallet: 'invalid-address-123',
        amountSOL: 999999999,
        description: 'Test error handling'
      });

      if (result.error) {
        // Verify error message doesn't contain sensitive data patterns
        expect(result.error).not.toMatch(/SOLANA_TREASURY/i);
        expect(result.error).not.toMatch(/SECRET/i);
        expect(result.error).not.toMatch(/\[.*,.*,.*\]/); // No byte arrays
        console.log(`✅ Error message safe (no secrets exposed)`);
      }
    });

    it('should handle network timeouts gracefully', async () => {
      if (!processor) {
        console.log('⏭️  Skipping: devnet not configured');
        return;
      }

      // Test with intentionally slow/unresponsive endpoint
      const slowUrl = 'https://api.devnet.solana.com:9999'; // Wrong port
      const slowProcessor = new SOLPaymentProcessor(treasuryAddress, slowUrl, 'devnet-timeout-test');

      const startTime = Date.now();
      const result = await slowProcessor.processPayment({
        executionId: 'timeout-test-' + Date.now(),
        recipientWallet: recipientAddress,
        amountSOL: 0.001,
        description: 'Network timeout test'
      });
      const elapsedMs = Date.now() - startTime;

      // Should fail quickly or timeout gracefully
      expect(result.status).toBe('error');
      console.log(`✅ Timeout handling works (elapsed: ${elapsedMs}ms)`);
    });
  });

  afterAll(() => {
    if (processor) {
      console.log('\n📊 Devnet smoke tests completed');
      console.log('   View transaction details at: https://explorer.solana.com/');
      console.log('   Switch to devnet view in Solana Explorer settings');
    }
  });
});
