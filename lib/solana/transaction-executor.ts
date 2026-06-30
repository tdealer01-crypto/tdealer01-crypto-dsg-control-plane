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
    // Validate RPC endpoint
    if (!config.rpcEndpoint || typeof config.rpcEndpoint !== 'string') {
      throw new Error('Invalid RPC endpoint');
    }
    try {
      const url = new URL(config.rpcEndpoint);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('RPC endpoint must use http or https');
      }
    } catch {
      throw new Error('Invalid RPC endpoint URL');
    }

    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    this.treasuryKeypair = config.treasuryKeypair;
    this.commitment = config.commitment || 'confirmed';
    if (config.maxRetries !== undefined) this.maxRetries = Math.min(Math.max(config.maxRetries, 0), 10);
    if (config.confirmationTimeout !== undefined) this.confirmationTimeout = Math.max(config.confirmationTimeout, 1000);
  }

  /**
   * Transfer native SOL from treasury to recipient
   * Returns transaction signature and confirmation status
   */
  async transferSOL(recipientAddress: string, amountSOL: number): Promise<TransactionResult> {
    try {
      // Validate inputs before any cryptographic operations
      if (!recipientAddress || typeof recipientAddress !== 'string') {
        throw new Error('Invalid recipient address');
      }
      if (typeof amountSOL !== 'number' || amountSOL <= 0 || !Number.isFinite(amountSOL)) {
        throw new Error('Invalid SOL amount');
      }

      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientAddress);
      } catch {
        throw new Error('Invalid recipient public key format');
      }

      const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
      if (amountLamports <= 0 || amountLamports > Number.MAX_SAFE_INTEGER) {
        throw new Error('Transfer amount out of valid range');
      }

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
 * Environment variables (in priority order):
 * - SOLANA_TREASURY_SECRET: JSON stringified 64-byte secret key array [0, 1, 2, ...]
 * - SOLANA_TREASURY_PRIVATE_KEY: Base64-encoded 64-byte secret key (alternative format)
 */
export function loadTreasuryKeypair(): Keypair {
  const jsonSecret = process.env.SOLANA_TREASURY_SECRET;
  const base64Secret = process.env.SOLANA_TREASURY_PRIVATE_KEY;

  let secretKeyBytes: Uint8Array | undefined;

  // Try JSON array format first (most common from Solana CLI)
  if (jsonSecret) {
    try {
      const parsed = JSON.parse(jsonSecret);
      if (!Array.isArray(parsed) || parsed.length !== 64) {
        throw new Error('Secret key array must contain exactly 64 bytes');
      }
      // Validate all elements are integers 0-255
      if (!parsed.every((b: unknown) => typeof b === 'number' && b >= 0 && b <= 255)) {
        throw new Error('Secret key array contains invalid byte values');
      }
      secretKeyBytes = new Uint8Array(parsed);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse SOLANA_TREASURY_SECRET: ${errorMsg}`);
    }
  }

  // Try base64 format as fallback
  if (!secretKeyBytes && base64Secret) {
    try {
      const decoded = Buffer.from(base64Secret, 'base64');
      if (decoded.length !== 64) {
        throw new Error('Secret key must be exactly 64 bytes');
      }
      secretKeyBytes = new Uint8Array(decoded);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to decode SOLANA_TREASURY_PRIVATE_KEY: ${errorMsg}`);
    }
  }

  if (!secretKeyBytes) {
    throw new Error(
      'Treasury private key not found. Set SOLANA_TREASURY_SECRET (JSON array) or SOLANA_TREASURY_PRIVATE_KEY (base64)',
    );
  }

  try {
    const keypair = Keypair.fromSecretKey(secretKeyBytes);
    console.log(`[SolanaExecutor] ✅ Treasury keypair loaded: ${keypair.publicKey.toString()}`);
    return keypair;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid treasury private key: ${errorMsg}`);
  }
}
