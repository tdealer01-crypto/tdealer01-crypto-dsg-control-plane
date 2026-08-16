/**
 * Live SOL Payment Module
 * Handles real Solana transfers and payment settlement.
 *
 * Truth boundary: dry-run mode never returns a confirmed payment, transaction
 * signature, or wallet balance. Only RPC/executor results may populate them.
 */

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { writeLedgerRecord } from './payment-ledger';
import { SolanaTransactionExecutor, loadTreasuryKeypair } from './transaction-executor';

export interface PaymentRequest {
  executionId: string;
  agentId: string;
  recipientWallet: string;
  amountSOL: number;
  idempotencyKey: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  executionId: string;
  transactionSignature: string;
  status: 'pending' | 'confirmed' | 'failed';
  amountSOL: number;
  recipientWallet: string;
  timestamp: string;
  confirmationBlockHeight?: number;
  error?: string;
}

export interface WalletBalance {
  wallet: string;
  balanceSOL: number;
  balanceLamports: number;
  lastUpdated: string;
}

export class SOLPaymentProcessor {
  private dryRun: boolean;
  private solanaEndpoint: string;
  private treasuryWallet: PublicKey;
  private orgId: string;
  private paymentHistory: Map<string, PaymentResult> = new Map();
  private walletBalanceCache: Map<string, WalletBalance> = new Map();
  private transactionExecutor?: SolanaTransactionExecutor;
  private initializationError?: string;

  constructor(
    treasuryWalletAddress: string,
    orgId: string,
    solanaEndpoint: string = 'https://api.mainnet-beta.solana.com',
    dryRun: boolean = false,
  ) {
    this.treasuryWallet = new PublicKey(treasuryWalletAddress);
    this.solanaEndpoint = solanaEndpoint;
    this.orgId = orgId;
    this.dryRun = dryRun;

    if (!dryRun) {
      try {
        const keypair = loadTreasuryKeypair();
        this.transactionExecutor = new SolanaTransactionExecutor({
          rpcEndpoint: solanaEndpoint,
          treasuryKeypair: keypair,
          commitment: 'confirmed',
          maxRetries: 3,
          confirmationTimeout: 60000,
        });
        console.log('[Payment] Transaction executor initialized');
      } catch (err) {
        this.initializationError = err instanceof Error ? err.message : String(err);
        console.error('[Payment] Transaction executor unavailable:', this.initializationError);
      }
    }
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const result: PaymentResult = {
      executionId: request.executionId,
      transactionSignature: '',
      status: 'pending',
      amountSOL: request.amountSOL,
      recipientWallet: request.recipientWallet,
      timestamp: new Date().toISOString(),
    };

    try {
      const cached = this.paymentHistory.get(request.idempotencyKey);
      if (cached) return cached;

      this.validatePaymentRequest(request);

      if (this.dryRun) {
        throw new Error('DRY_RUN_DOES_NOT_EXECUTE_PAYMENT');
      }
      if (!this.transactionExecutor) {
        throw new Error(
          this.initializationError
            ? `SOLANA_TRANSACTION_EXECUTOR_UNAVAILABLE:${this.initializationError}`
            : 'SOLANA_TRANSACTION_EXECUTOR_UNAVAILABLE',
        );
      }

      const balance = await this.checkWalletBalance(this.treasuryWallet.toString());
      if (balance.balanceSOL < request.amountSOL) {
        throw new Error(
          `Insufficient balance: ${balance.balanceSOL} SOL available, ${request.amountSOL} SOL required`,
        );
      }

      result.transactionSignature = await this.executeTransfer(
        request.recipientWallet,
        request.amountSOL,
        request.description,
      );
      result.status = 'confirmed';

      this.paymentHistory.set(request.idempotencyKey, result);

      try {
        await writeLedgerRecord({
          execution_id: request.executionId,
          agent_id: request.agentId,
          idempotency_key: request.idempotencyKey,
          recipient_wallet: request.recipientWallet,
          amount_sol: request.amountSOL,
          description: request.description,
          status: result.status as any,
          transaction_signature: result.transactionSignature,
          confirmation_block_height: result.confirmationBlockHeight,
          metadata: request.metadata,
          org_id: this.orgId,
        });
      } catch (ledgerErr) {
        console.error('[Payment] Confirmed on-chain payment but audit ledger write failed:', ledgerErr);
        // The chain transfer cannot be rolled back. Keep the actual confirmed
        // chain result, but surface the audit failure to callers.
        result.error = 'PAYMENT_CONFIRMED_AUDIT_LEDGER_WRITE_FAILED';
      }

      return result;
    } catch (err) {
      result.status = 'failed';
      result.error = err instanceof Error ? err.message : String(err);
      return result;
    }
  }

  async checkWalletBalance(walletAddress: string): Promise<WalletBalance> {
    const cached = this.walletBalanceCache.get(walletAddress);
    if (cached && this.isCacheFresh(cached)) return cached;

    if (this.dryRun) {
      throw new Error('DRY_RUN_HAS_NO_VERIFIED_WALLET_BALANCE');
    }
    if (!this.transactionExecutor) {
      throw new Error('SOLANA_TRANSACTION_EXECUTOR_UNAVAILABLE');
    }
    if (walletAddress !== this.treasuryWallet.toString()) {
      throw new Error('BALANCE_QUERY_ONLY_SUPPORTS_CONFIGURED_TREASURY_WALLET');
    }

    const balanceSOL = await this.transactionExecutor.getBalance();
    const balanceLamports = Math.floor(balanceSOL * LAMPORTS_PER_SOL);
    const balance: WalletBalance = {
      wallet: walletAddress,
      balanceSOL,
      balanceLamports,
      lastUpdated: new Date().toISOString(),
    };
    this.walletBalanceCache.set(walletAddress, balance);
    return balance;
  }

  private async executeTransfer(
    recipientWallet: string,
    amountSOL: number,
    description: string,
  ): Promise<string> {
    if (this.dryRun) {
      throw new Error('DRY_RUN_DOES_NOT_EXECUTE_TRANSFER');
    }
    if (!this.transactionExecutor) {
      throw new Error('SOLANA_TRANSACTION_EXECUTOR_UNAVAILABLE');
    }

    console.log('[Transfer] Executing SOL transfer', {
      from: this.treasuryWallet.toString(),
      to: recipientWallet,
      amountSOL,
      description,
      endpoint: this.solanaEndpoint,
    });

    const transfer = await this.transactionExecutor.transferSOL(recipientWallet, amountSOL);
    if (transfer.status !== 'confirmed' || !transfer.signature) {
      throw new Error(
        `Transaction ${transfer.status}: ${transfer.error || 'No confirmed signature returned'}`,
      );
    }
    return transfer.signature;
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.executionId) throw new Error('Missing executionId');
    if (!request.agentId) throw new Error('Missing agentId');
    if (!request.recipientWallet) throw new Error('Missing recipientWallet');
    if (!Number.isFinite(request.amountSOL) || request.amountSOL <= 0) {
      throw new Error('Amount must be a finite number greater than 0');
    }
    if (!request.idempotencyKey) throw new Error('Missing idempotencyKey');

    try {
      new PublicKey(request.recipientWallet);
    } catch {
      throw new Error(`Invalid Solana wallet address: ${request.recipientWallet}`);
    }
  }

  private isCacheFresh(balance: WalletBalance, maxAgeSec: number = 60): boolean {
    const ageMs = Date.now() - new Date(balance.lastUpdated).getTime();
    return ageMs < maxAgeSec * 1000;
  }

  getPaymentHistory(executionId?: string): PaymentResult[] {
    if (executionId) {
      const payment = Array.from(this.paymentHistory.values()).find(
        (item) => item.executionId === executionId,
      );
      return payment ? [payment] : [];
    }
    return Array.from(this.paymentHistory.values());
  }

  setDryRun(enabled: boolean): void {
    this.dryRun = enabled;
  }

  isDryRun(): boolean {
    return this.dryRun;
  }
}

let paymentProcessor: SOLPaymentProcessor | null = null;

export function initializePaymentProcessor(
  treasuryWallet: string,
  orgId: string,
  solanaEndpoint: string,
  dryRun: boolean,
): SOLPaymentProcessor {
  paymentProcessor = new SOLPaymentProcessor(treasuryWallet, orgId, solanaEndpoint, dryRun);
  return paymentProcessor;
}

export function getPaymentProcessor(): SOLPaymentProcessor {
  if (!paymentProcessor) {
    throw new Error('Payment processor not initialized. Call initializePaymentProcessor first.');
  }
  return paymentProcessor;
}
