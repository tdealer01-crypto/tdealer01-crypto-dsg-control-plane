/**
 * Solana RPC Client Wrapper
 *
 * Real blockchain interaction for Trinity AI System
 * Replaces simulated transfers with actual Solana transactions
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  TransactionSignature,
  ConfirmOptions,
} from '@solana/web3.js';

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WALLET_KEYPAIR_B64 = process.env.SOLANA_WALLET_KEYPAIR || '';

// Singleton connection
let solanaConnection: Connection | null = null;
let walletKeypair: Keypair | null = null;

/**
 * Initialize Solana connection and wallet
 */
export function initializeSolana(): void {
  if (!solanaConnection) {
    solanaConnection = new Connection(RPC_URL, 'confirmed');
  }

  if (!walletKeypair && WALLET_KEYPAIR_B64) {
    try {
      const keypairBuffer = Buffer.from(WALLET_KEYPAIR_B64, 'base64');
      walletKeypair = Keypair.fromSecretKey(new Uint8Array(keypairBuffer));
    } catch (err) {
      console.error('Failed to load wallet keypair:', err);
      throw new Error('Invalid SOLANA_WALLET_KEYPAIR: must be valid base64-encoded keypair');
    }
  }
}

/**
 * Get the Solana connection instance
 */
export function getConnection(): Connection {
  if (!solanaConnection) {
    initializeSolana();
  }
  return solanaConnection!;
}

/**
 * Get the wallet keypair
 */
export function getWalletKeypair(): Keypair {
  if (!walletKeypair) {
    initializeSolana();
  }
  if (!walletKeypair) {
    throw new Error('Solana wallet keypair not configured. Set SOLANA_WALLET_KEYPAIR env var.');
  }
  return walletKeypair;
}

/**
 * Get wallet public key
 */
export function getWalletPublicKey(): PublicKey {
  return getWalletKeypair().publicKey;
}

/**
 * Get wallet balance in SOL
 */
export async function getWalletBalance(): Promise<number> {
  const connection = getConnection();
  const wallet = getWalletPublicKey();
  const balanceLamports = await connection.getBalance(wallet);
  return balanceLamports / LAMPORTS_PER_SOL;
}

/**
 * Transfer SOL from wallet to recipient (real blockchain transfer)
 */
export async function transferSOL(
  recipientAddress: string,
  amountSOL: number,
  options?: ConfirmOptions,
): Promise<TransactionSignature> {
  try {
    const connection = getConnection();
    const wallet = getWalletKeypair();
    const recipient = new PublicKey(recipientAddress);

    // Validate recipient address
    if (!PublicKey.isOnCurve(recipient)) {
      throw new Error(`Invalid recipient address: ${recipientAddress}`);
    }

    // Create transfer instruction
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    const instruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipient,
      lamports,
    });

    // Create and send transaction
    const transaction = new Transaction().add(instruction);

    const confirmOptions: ConfirmOptions = options || { maxRetries: 3 };
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      confirmOptions,
    );

    console.log(`[SOLANA] Transfer successful: ${signature}`);
    return signature;
  } catch (err) {
    console.error('[SOLANA] Transfer failed:', err);
    throw new Error(
      `Failed to transfer SOL: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Get token balance (for USDC, BONK, etc.)
 */
export async function getTokenBalance(
  tokenMintAddress: string,
  ownerAddress?: string,
): Promise<number> {
  try {
    const connection = getConnection();
    const owner = ownerAddress
      ? new PublicKey(ownerAddress)
      : getWalletPublicKey();
    const mint = new PublicKey(tokenMintAddress);

    // For now, return 0 - full token balance logic requires SPL token library
    // This is a placeholder for future SPL token support
    console.warn('[SOLANA] Token balance fetching not yet implemented');
    return 0;
  } catch (err) {
    console.error('[SOLANA] Token balance fetch failed:', err);
    return 0;
  }
}

/**
 * Check RPC connectivity
 */
export async function checkRPCHealth(): Promise<boolean> {
  try {
    const connection = getConnection();
    const version = await connection.getVersion();
    console.log(`[SOLANA] RPC version: ${version['solana-core']}`);
    return true;
  } catch (err) {
    console.error('[SOLANA] RPC health check failed:', err);
    return false;
  }
}

/**
 * Get latest blockhash for transaction
 */
export async function getLatestBlockhash() {
  const connection = getConnection();
  return await connection.getLatestBlockhash();
}

/**
 * Estimate transaction fee
 */
export async function estimateTransactionFee(amountSOL: number): Promise<number> {
  try {
    const connection = getConnection();
    // Solana base fee is typically 5000 lamports
    const baseFee = 5000;
    return baseFee / LAMPORTS_PER_SOL;
  } catch (err) {
    console.error('[SOLANA] Fee estimation failed:', err);
    return 0.00005; // Default to 5000 lamports
  }
}

/**
 * Get transaction details
 */
export async function getTransaction(signature: string) {
  try {
    const connection = getConnection();
    const transaction = await connection.getTransaction(signature, { commitment: 'confirmed' });
    return transaction;
  } catch (err) {
    console.error('[SOLANA] Failed to fetch transaction:', err);
    return null;
  }
}

export const SolanaClient = {
  initializeSolana,
  getConnection,
  getWalletKeypair,
  getWalletPublicKey,
  getWalletBalance,
  transferSOL,
  getTokenBalance,
  checkRPCHealth,
  getLatestBlockhash,
  estimateTransactionFee,
  getTransaction,
};
