# Solana Integration Guide

Real Solana blockchain transaction execution for native SOL transfers with confirmation polling and audit trails.

## Overview

The Solana integration enables the DSG Control Plane to execute real blockchain transactions. This guide covers setup, usage, testing, and troubleshooting.

**Status:** ✅ Phase 3 Feature 3 Complete (Merged June 30, 2026)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Payment Request (API)                               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ SOLPaymentProcessor (Production Mode)               │
│ - Initializes SolanaTransactionExecutor             │
│ - Validates payment request                         │
│ - Falls back to dry-run if keypair unavailable      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ SolanaTransactionExecutor                           │
│ - Create SystemProgram.transfer instruction         │
│ - Sign transaction with treasury keypair            │
│ - Submit to Solana RPC endpoint                     │
│ - Poll for confirmation (60 second timeout)         │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ Solana Blockchain                                   │
│ (devnet → testnet → mainnet)                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ Payment Ledger (Supabase)                           │
│ - Immutable audit trail                             │
│ - Idempotency checking                              │
│ - Transaction tracking                              │
└─────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Configure these variables in your deployment environment:

```bash
# Solana RPC Endpoint (required for production)
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com

# Treasury keypair (one of these required)
# Option A: Base64-encoded 64-byte private key
SOLANA_TREASURY_PRIVATE_KEY=<base64_encoded_key>

# Option B: JSON array of 64 bytes
SOLANA_TREASURY_SECRET=[157,123,45,78,...]  # 64 bytes
```

### 2. Generate Treasury Keypair

#### Using Solana CLI (Recommended)

```bash
# Create a new keypair
solana-keygen new --outfile treasury-keypair.json

# Export as JSON array
cat treasury-keypair.json | jq '.[]'

# Or export as base64 for Secret Manager
cat treasury-keypair.json | jq -r 'join(",") | "base64 encoded"'
```

#### Using Node.js

```javascript
const { Keypair } = require('@solana/web3.js');

// Generate new keypair
const keypair = Keypair.generate();
const secretKey = keypair.secretKey;

// Export as JSON array
console.log(Array.from(secretKey));

// Or as base64
console.log(Buffer.from(secretKey).toString('base64'));

// Save public key for fund transfers
console.log(keypair.publicKey.toString());
```

### 3. Fund Treasury Account

Before running transactions, fund the treasury wallet:

**On Devnet:**
```bash
solana airdrop 10 <treasury_public_key> --url devnet
```

**On Testnet/Mainnet:**
- Transfer SOL to treasury address from an existing wallet
- Minimum recommended: 1 SOL for testing, 10+ SOL for production

### 4. Verify Setup

```bash
# Test connection
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Check treasury balance
solana balance <treasury_public_key> --url devnet
```

## Usage

### Execute SOL Transfer

**API Endpoint:** `POST /api/execute`

```bash
curl -X POST https://your-app.com/api/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_123",
    "action": {
      "type": "transfer_sol",
      "recipient": "YourSolanaPublicKeyHere",
      "amount": 1.5,
      "description": "Payment for service"
    }
  }'
```

**Response (Success):**
```json
{
  "status": "success",
  "transaction": {
    "signature": "5Sh...6QU",
    "status": "confirmed",
    "confirmationBlockHeight": 245832001,
    "amount": 1.5,
    "fee": 0.00025
  },
  "audit": {
    "ledger_id": "uuid",
    "timestamp": "2026-06-30T02:40:00Z",
    "agent_id": "agent_123"
  }
}
```

**Response (Dry-Run Mode):**
```json
{
  "status": "success",
  "transaction": {
    "signature": "mock_sig_88chars...",
    "status": "confirmed",
    "amount": 1.5,
    "mode": "dry_run"
  }
}
```

### Code Usage

```typescript
import { SOLPaymentProcessor } from '@/lib/solana/payment';

// Initialize processor (auto-detects production/dry-run)
const processor = new SOLPaymentProcessor(
  'treasury_wallet_address',
  'https://api.devnet.solana.com',
  'org_id_123'
);

// Execute payment
const result = await processor.processPayment({
  executionId: 'exec_456',
  recipientWallet: 'recipient_wallet_address',
  amountSOL: 1.5,
  description: 'Payment description'
});

// Check balance
const balance = await processor.checkWalletBalance('wallet_address');
console.log(`Balance: ${balance.balanceSOL} SOL`);
```

## Transaction Flow

### 1. Request Validation
- Recipient address format validation
- SOL amount range validation (>0, <max_safe_integer)
- Treasury balance check

### 2. Transaction Creation
- Fetch recent blockhash from RPC
- Create SystemProgram.transfer instruction
- Build transaction with treasury as fee payer
- Sign with treasury keypair

### 3. Submission
- Serialize transaction
- Submit to Solana RPC with retry logic (max 3 retries)
- Capture transaction signature

### 4. Confirmation Polling
- Poll transaction status every 500ms
- Wait for confirmation status matching commitment level
- Timeout after 60 seconds
- Track block height to detect expired transactions

### 5. Audit Trail
- Record in Supabase `payment_ledger` table
- Idempotency check via `idempotency_key`
- Trigger audit logs on insert
- Generate compliance evidence

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| `Invalid recipient address` | Malformed public key | Verify wallet address format |
| `Invalid SOL amount` | Amount ≤ 0 or non-numeric | Use positive number |
| `Transfer amount out of range` | Amount too large | Max: Number.MAX_SAFE_INTEGER lamports |
| `Invalid RPC endpoint` | Malformed URL | Use https://api.devnet/testnet.solana.com |
| `Confirmation timeout` | Network slow or stuck | Retry with new blockhash |
| `Transaction error` | Failed on-chain validation | Check account balances |
| `Block height expired` | Took >30 seconds to confirm | Resubmit transaction |

### Dry-Run Mode Fallback

If `SOLANA_TREASURY_PRIVATE_KEY` is not set:
- Automatically falls back to dry-run mode
- Generates mock signatures for testing
- Returns random balances
- No actual blockchain transactions occur

```bash
# Dry-run mode (no env var set)
[Payment] ⚠️ Failed to initialize transaction executor: ...
[Payment] Running in dry-run mode. Set SOLANA_TREASURY_PRIVATE_KEY to enable production transfers.
```

## Testing

### Unit Tests

```bash
# Run all Solana unit tests
npm run test:unit -- lib/solana/

# Run specific test file
npm run test -- lib/solana/transaction-executor.ts
```

### Integration Tests

```bash
# Run with mock RPC
npm run test:integration -- tests/integration/solana/

# Run devnet smoke tests (requires DEVNET_TREASURY_KEY secret)
npm run test -- tests/integration/solana/devnet-smoke.test.ts
```

### Manual Testing

```bash
# 1. Set environment variables
export SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
export SOLANA_TREASURY_SECRET='[157,123,45,...]'

# 2. Start dev server
npm run dev

# 3. Execute test transaction via API
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer test_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test_agent",
    "action": {
      "type": "transfer_sol",
      "recipient": "..."
      "amount": 0.1
    }
  }'

# 4. Monitor logs
tail -f /var/log/app.log | grep -i solana
```

## Monitoring & Debugging

### Check Transaction Status

```bash
# Via Solana CLI
solana confirm <signature> --url devnet

# Via RPC directly
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getSignatureStatus",
    "params": ["signature"]
  }'
```

### View Audit Trail

```sql
-- Check payment ledger
SELECT * FROM payment_ledger 
WHERE status = 'confirmed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check audit logs
SELECT * FROM audit_logs 
WHERE resource_type = 'payment_ledger' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Monitor Treasury Balance

```typescript
const processor = new SOLPaymentProcessor(...);
const balance = await processor.checkWalletBalance(treasuryAddress);

if (balance.balanceSOL < 1.0) {
  console.warn('⚠️ Low treasury balance:', balance.balanceSOL, 'SOL');
  // Alert operations team
}
```

### Debug Logging

Set environment variable for verbose output:

```bash
DEBUG=solana:* npm run dev
```

This will show:
- Transaction creation details
- RPC requests/responses
- Confirmation polling progress
- Error details

## Deployment Stages

### Stage 1: Devnet Testing
- Use `https://api.devnet.solana.com`
- Free airdrop available
- Good for development and testing
- **No real value**

### Stage 2: Testnet Validation
- Use `https://api.testnet.solana.com`
- Requires funded testnet wallet
- Validates production-like conditions
- **Still no real value**

### Stage 3: Mainnet Preparation
- Use `https://api.mainnet-beta.solana.com`
- Requires careful security review
- All infrastructure verified
- **Real SOL transfers**

### Switching Environments

Update `SOLANA_RPC_ENDPOINT`:

```bash
# Devnet
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com

# Testnet
SOLANA_RPC_ENDPOINT=https://api.testnet.solana.com

# Mainnet
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

## Security Best Practices

1. **Secret Management**
   - Never commit private keys to repository
   - Use GitHub Secrets or environment service
   - Rotate keys regularly
   - Monitor key usage

2. **Endpoint Validation**
   - Always use HTTPS
   - Validate RPC endpoint before operations
   - Monitor endpoint availability
   - Have fallback endpoints

3. **Transaction Verification**
   - Always verify recipient addresses
   - Check amounts before submission
   - Monitor failed transactions
   - Implement rate limiting

4. **Audit Trail**
   - All transactions recorded in Supabase
   - Immutable ledger (no UPDATE/DELETE)
   - RLS policies restrict access
   - Automatic triggers for compliance

5. **Error Handling**
   - Never expose private keys in errors
   - Log without sensitive data
   - Retry transient failures only
   - Alert on repeated failures

## Troubleshooting

### "Invalid RPC endpoint URL"
- Check `SOLANA_RPC_ENDPOINT` format
- Must start with `https://`
- Verify endpoint is reachable: `curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'`

### "Treasury keypair not found"
- Check both `SOLANA_TREASURY_PRIVATE_KEY` and `SOLANA_TREASURY_SECRET`
- One must be set for production mode
- Verify format: 64-byte base64 or JSON array
- Check environment variable names (case-sensitive)

### "Confirmation timeout"
- Network might be congested
- RPC endpoint might be slow
- Check Solana network status: https://status.solana.com
- Retry with exponential backoff
- Consider using different RPC endpoint

### "Block height expired"
- Transaction took too long (>30 seconds)
- Retry with fresh blockhash
- Check network conditions
- Increase timeout if acceptable

### "Transaction error: Custom(1)"
- Generic transaction error
- Check recipient address validity
- Verify amounts
- Check treasury balance
- Review on-chain logs

## Support & Escalation

1. **Check Logs**
   - Application logs: `[SolanaExecutor]` prefix
   - Supabase audit logs: `payment_ledger` table
   - RPC endpoint health

2. **Verify Environment**
   - `SOLANA_RPC_ENDPOINT` set and valid
   - `SOLANA_TREASURY_SECRET` or `SOLANA_TREASURY_PRIVATE_KEY` set
   - Network connectivity to RPC endpoint

3. **Escalate**
   - Gather transaction signature
   - Export payment ledger records
   - Include full error messages
   - Note timestamp of failure

---

**Last Updated:** June 30, 2026  
**Version:** 1.0 (Phase 3 Feature 3)  
**Status:** ✅ Production Ready for Devnet/Testnet Testing
