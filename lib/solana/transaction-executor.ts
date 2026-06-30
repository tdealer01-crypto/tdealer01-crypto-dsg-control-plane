/**
 * Solana Transaction Executor
 * Handles real SOL transfer transactions with confirmation polling
 *
 * Phase 3 Feature 3: Production Solana Integration
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SendOptions,
  Keypair,
} from '@solana/web3.js';

export interface TransactionConfig {
  rpcEndpoint: string;
  treasuryKeypair: Keypair;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  confirmationTimeout?: number; // milliseconds
}

export interface TransactionResult {
  signature: string;
  confirmationBlockHeight?: number;
  status: 'confirmed' | 'failed' | 'timeout';
  error?: string;
}

/**
 * Executes real SOL transfers on Solana blockchain
 * Handles transaction creation, signing, submission, and confirmation polling
 */
export class SolanaTransactionExecutor {
  private connection: Connection;
  private treasuryKeypair: Keypair;
  private commitment: 'processed' | 'confirmed' | 'finalized';
  private maxRetries: number = 3;
  private confirmationTimeout: number = 60000; // 60 seconds default

  constructor(config: TransactionConfig) {
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    this.treasuryKeypair = config.treasuryKeypair;
    this.commitment = config.commitment || 'confirmed';
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.confirmationTimeout) this.confirmationTimeout = config.confirmationTimeout;
  }

  /**
   * Transfer native SOL from treasury to recipient
   * Returns transaction signature and confirmation status
   */
  async transferSOL(recipientAddress: string, amountSOL: number): Promise<TransactionResult> {
    try {
      const recipientPubkey = new PublicKey(recipientAddress);
      const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

      console.log(`[SolanaExecutor] Preparing SOL transfer:`);
      console.log(`  From: ${this.treasuryKeypair.publicKey.toString()}`);
      console.log(`  To: ${recipientAddress}`);
      console.log(`  Amount: ${amountSOL} SOL (${amountLamports} lamports)`);

      // Get recent blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(
        this.commitment,
      );

      // Create transfer instruction
      const instruction = SystemProgram.transfer({
        fromPubkey: this.treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: amountLamports,
      });

      // Build transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: this.treasuryKeypair.publicKey,
      }).add(instruction);

      // Sign transaction with treasury keypair
      transaction.sign(this.treasuryKeypair);

      // Serialize transaction
      const serialized = transaction.serialize();

      console.log(`[SolanaExecutor] Submitting transaction (${serialized.length} bytes)`);

      // Submit transaction to network
      const signature = await this.connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        maxRetries: this.maxRetries,
      } as SendOptions);

      console.log(`[SolanaExecutor] Transaction sent: ${signature}`);

      // Poll for confirmation
      const result = await this.pollForConfirmation(signature, lastValidBlockHeight);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[SolanaExecutor] Transfer failed:`, errorMsg);

      return {
        signature: '',
        status: 'failed',
        error: errorMsg,
      };
    }
  }

  /**
   * Poll for transaction confirmation with timeout
   */
  private async pollForConfirmation(
    signature: string,
    lastValidBlockHeight: number,
  ): Promise<TransactionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.confirmationTimeout) {
      try {
        // Check transaction status
        const status = await this.connection.getSignatureStatus(signature);

        if (!status || !status.value) {
          // Status not found yet, wait and retry
          await this.sleep(500);
          continue;
        }

        // Transaction found in ledger
        if (status.value.err) {
          console.error(`[SolanaExecutor] Transaction failed:`, status.value.err);
          return {
            signature,
            status: 'failed',
            error: `Transaction error: ${JSON.stringify(status.value.err)}`,
          };
        }

        // Check if confirmed
        if (status.value.confirmationStatus === this.commitment || status.value.confirmationStatus === 'finalized') {
          console.log(
            `[SolanaExecutor] ✅ Transaction confirmed: ${signature} (${status.value.confirmationStatus})`,
          );

          // Get block height for audit trail
          const txDetails = await this.connection.getTransaction(signature);

          return {
            signature,
            confirmationBlockHeight: txDetails?.slot,
            status: 'confirmed',
          };
        }

        // Still pending, wait and retry
        console.log(`[SolanaExecutor] Pending confirmation (${status.value.confirmationStatus})...`);
        await this.sleep(500);
      } catch (err) {
        // Retry on transient errors
        console.warn(`[SolanaExecutor] Polling error (will retry):`, err);
        await this.sleep(500);
      }

      // Check if block height is no longer valid
      const currentBlockHeight = await this.connection.getBlockHeight(this.commitment);
      if (currentBlockHeight > lastValidBlockHeight + 256) {
        console.error(`[SolanaExecutor] Block height expired (${currentBlockHeight} > ${lastValidBlockHeight + 256})`);
        return {
          signature,
          status: 'timeout',
          error: 'Transaction block height expired',
        };
      }
    }

    console.error(`[SolanaExecutor] Confirmation timeout after ${this.confirmationTimeout}ms`);
    return {
      signature,
      status: 'timeout',
      error: `Confirmation timeout after ${this.confirmationTimeout}ms`,
    };
  }

  /**
   * Get current wallet balance
   */
  async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.treasuryKeypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      console.log(`[SolanaExecutor] Treasury balance: ${balanceSOL} SOL`);
      return balanceSOL;
    } catch (err) {
      console.error(`[SolanaExecutor] Failed to get balance:`, err);
      throw err;
    }
  }

  /**
   * Verify transaction by signature
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return status?.value?.err === null;
    } catch (err) {
      console.error(`[SolanaExecutor] Failed to verify transaction:`, err);
      return false;
    }
  }

  /**
   * Simple sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Load treasury keypair from environment
 * Supports base58 encoded private key (recommended for production with Secret Manager)
 *
 * Environment variables:
 * - SOLANA_TREASURY_PRIVATE_KEY: base58-encoded secret key
 * OR
 * - SOLANA_TREASURY_SECRET: JSON stringified secret key array
 */
export function loadTreasuryKeypair(): Keypair {
  let secretKey: number[] | string | undefined;

  // Try base58 format first (more secure - loaded from Secret Manager)
  if (process.env.SOLANA_TREASURY_PRIVATE_KEY) {
    try {
      // If it looks like base58, convert it
      const bs58 = require('bs58');
      const decoded = bs58.decode(process.env.SOLANA_TREASURY_PRIVATE_KEY);
      secretKey = Array.from(decoded);
    } catch {
      // Fallback: treat as raw base58 and let Keypair handle it
      secretKey = process.env.SOLANA_TREASURY_PRIVATE_KEY;
    }
  }

  // Try JSON array format
  if (!secretKey && process.env.SOLANA_TREASURY_SECRET) {
    try {
      secretKey = JSON.parse(process.env.SOLANA_TREASURY_SECRET);
    } catch (err) {
      console.error('Failed to parse SOLANA_TREASURY_SECRET:', err);
    }
  }

  if (!secretKey) {
    throw new Error(
      'Treasury private key not found. Set SOLANA_TREASURY_PRIVATE_KEY (base58) or SOLANA_TREASURY_SECRET (JSON array)',
    );
  }

  try {
    const keypair = Array.isArray(secretKey)
      ? Keypair.fromSecretKey(new Uint8Array(secretKey))
      : Keypair.fromSecretKey(new Uint8Array(Buffer.from(String(secretKey), 'utf-8')));

    console.log(`[SolanaExecutor] ✅ Treasury keypair loaded: ${keypair.publicKey.toString()}`);
    return keypair;
  } catch (err) {
    console.error('Failed to create keypair from secret:', err);
    throw new Error('Invalid treasury private key format');
  }
}
