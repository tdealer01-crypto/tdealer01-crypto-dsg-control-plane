# Solana Transaction Recovery & Remediation

**Audience:** Operations/support teams diagnosing and recovering from Solana transaction failures.

**Status:** Phase 3 Feature 3 Complete (June 30, 2026)

This guide covers common failure scenarios, recovery decision trees, idempotency-safe resubmission, and audit trail documentation.

---

## Failure Scenarios & Symptoms

### Scenario 1: RPC Endpoint Timeout (60+ seconds)

**Symptoms:**
- Transaction submission succeeds, but confirmation polling times out
- Logs show: `Confirmation timeout after 60 seconds`
- Status in `payment_ledger`: `pending` → `failed` with `error_type = 'confirmation_timeout'`

**Root Causes:**
- RPC endpoint is overloaded or temporarily down
- Network congestion on Solana
- Transaction blockhash expired (>30 seconds old)

**Recovery Steps:**

```bash
# Step 1: Check if transaction landed on-chain
TX_SIGNATURE="<signature_from_error>"
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getSignatureStatus",
    "params": ["'$TX_SIGNATURE'"]
  }'

# If response includes "confirmationStatus": "confirmed" → transaction DID succeed
# If "err": null → will likely confirm soon, wait longer
# If "err": {...} → transaction failed on-chain
```

**If transaction landed (confirmed or pending):**

```sql
-- Update ledger to reflect actual status
UPDATE payment_ledger
SET status = 'confirmed',
    confirmed_at = NOW()
WHERE signature = '<tx_signature>';
```

**If transaction did not land (err is present):**

Proceed to "Scenario 2" below.

---

### Scenario 2: Transaction Rejected (On-Chain Failure)

**Symptoms:**
- Transaction signature is valid
- RPC returns error: `"err": {...}`
- Common errors: `insufficient_balance`, `invalid_account`, `custom(1)`

**Root Causes:**
- Treasury account has insufficient SOL (balance < transfer amount + fee)
- Recipient address is invalid or not rent-exempt
- Transaction exceeded blockhash window (>30 seconds)

**Recovery Steps:**

```bash
# Step 1: Check treasury balance
TREASURY_ADDR="<treasury_public_key>"
solana balance $TREASURY_ADDR --url devnet

# If balance < transfer amount + 0.00025:
# → Fund treasury account before retry
```

```bash
# Step 2: Verify recipient address
RECIPIENT_ADDR="<recipient_from_payment_ledger>"
solana account $RECIPIENT_ADDR --url devnet

# If account does not exist:
# → Create account or use rent-exempt recipient
# → Adjust transaction to include rent
```

```bash
# Step 3: Check on-chain transaction details
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["'$TX_SIGNATURE'", {"encoding": "json"}]
  }'

# Review "meta" section for "err" details and "logMessages"
```

**If fixable (e.g., insufficient balance):**

```sql
-- Update ledger to FAILED, document reason
UPDATE payment_ledger
SET status = 'failed',
    error_type = 'insufficient_balance',
    error_message = 'Treasury account balance: 0.5 SOL, needed: 1.5 SOL'
WHERE signature = '<tx_signature>';

-- Create recovery record (see Recovery Documentation section)
INSERT INTO recovery_log (payment_ledger_id, action, status, notes)
VALUES ('<ledger_id>', 'manual_remediation', 'pending', 'Awaiting treasury fund injection');
```

---

### Scenario 3: Signature Invalid

**Symptoms:**
- Error: `Invalid signature. Signature must be base58 encoded`
- Transaction never submitted to blockchain

**Root Causes:**
- Keypair corruption or missing
- Transaction signing failed silently
- Blockhash fetch failed

**Recovery Steps:**

```bash
# Step 1: Verify keypair is loaded
echo $SOLANA_TREASURY_PRIVATE_KEY
# Should output base64-encoded key (do NOT paste to logs)

# Step 2: If empty, keypair is missing
# → Set environment variable and retry

# Step 3: If present, validate keypair format
# Base64 format: should be ~88 characters
# JSON array format: should be [0, 1, 2, ..., 63] (64 bytes)
```

**If keypair is missing:**

```bash
# Restore keypair from backup or KMS
# Then redeploy with updated environment variables
vercel env add SOLANA_TREASURY_PRIVATE_KEY production
vercel --prod
```

**Update ledger:**

```sql
UPDATE payment_ledger
SET status = 'failed',
    error_type = 'signing_failed',
    error_message = 'Treasury keypair unavailable - signature generation failed'
WHERE signature IS NULL AND created_at > NOW() - INTERVAL '1 hour';
```

---

### Scenario 4: Blockhash Expired

**Symptoms:**
- Error: `Transaction simulation failed: Transaction blockhash not found`
- Logs show: `Block height expired`

**Root Causes:**
- Transaction took >30 seconds from creation to submission
- RPC endpoint returned stale blockhash
- High network congestion

**Recovery Steps:**

```bash
# Step 1: Verify transaction was created recently
SELECT created_at, submitted_at, (EXTRACT(EPOCH FROM (submitted_at - created_at))) as elapsed_sec
FROM payment_ledger
WHERE signature = '<tx_signature>';

# If elapsed > 30 seconds, blockhash may have expired

# Step 2: Retry with fresh blockhash (same idempotency key)
# → Trigger resubmission via API with same executionId
# System will fetch new blockhash and resubmit
```

**Idempotent Resubmission:**

The system uses `idempotency_key` to prevent duplicate transfers. Retrying with the same execution ID is safe:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer $API_KEY" \
  -H "Idempotency-Key: exec_<same_id_as_original>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_123",
    "action": {
      "type": "transfer_sol",
      "recipient": "<recipient>",
      "amount": 1.5
    }
  }'
```

**System behavior:**

- First call: Creates transaction, fetches blockhash, submits, polls for confirmation
- Retry call (same key): Checks if ledger entry exists, if so returns cached result
- No duplicate transfer will occur

---

### Scenario 5: Insufficient Treasury Balance

**Symptoms:**
- Recurring failures with `insufficient_balance` or `account lacks lamports`
- Treasury balance drops below transaction amounts

**Root Causes:**
- High transaction volume draining treasury
- No automated fund replenishment
- Misconfigured withdrawal limits

**Recovery Steps:**

```bash
# Step 1: Check current balance
TREASURY_ADDR="<treasury_public_key>"
solana balance $TREASURY_ADDR --url devnet

# Step 2: If < 1.0 SOL, fund immediately
# Devnet (free):
solana airdrop 10 $TREASURY_ADDR --url devnet

# Testnet/Mainnet (manual):
# Transfer from funded wallet to treasury
solana transfer $TREASURY_ADDR 5 --url testnet
```

```sql
-- Document fund injection
INSERT INTO balance_ledger (wallet_address, balance_sol, source, timestamp)
VALUES ('<treasury_address>', 10.0, 'manual_airdrop', NOW());

-- Reset failed transactions for retry
UPDATE payment_ledger
SET status = 'pending',  -- Back to pending for retry
    retry_count = 0
WHERE status = 'failed'
  AND error_type = 'insufficient_balance'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Automated Prevention (Future):**

Configure low-balance alerts:

```bash
# In monitoring script (cron):
BALANCE=$(solana balance $TREASURY_ADDR --url devnet | awk '{print $1}')
if (( $(echo "$BALANCE < 2.0" | bc -l) )); then
  # Trigger alert/page on-call
  curl -X POST $SLACK_WEBHOOK \
    -H "Content-Type: application/json" \
    -d '{"text": "Treasury balance low: '$BALANCE' SOL"}'
fi
```

---

## Recovery Decision Tree

```
Payment Failed?
│
├─ Check transaction signature
│  ├─ Signature invalid or null → Scenario 3 (Signing Failed)
│  │
│  └─ Signature valid
│     └─ Query RPC for signature status
│        │
│        ├─ Confirmed → Update ledger to confirmed (false alarm)
│        │
│        ├─ Not found (timed out) → Scenario 1 (Timeout)
│        │  └─ Wait longer or retry with new blockhash
│        │
│        └─ Error present → Scenario 2 (On-Chain Failure)
│           ├─ insufficient_balance → Scenario 5 (Low Funds)
│           ├─ invalid_recipient → Fix recipient address, retry
│           ├─ blockhash_expired → Scenario 4 (Expired)
│           └─ other → Escalate to engineering
```

---

## Idempotency-Safe Resubmission

The payment system is idempotent using `idempotency_key`. This allows safe resubmission without duplicate transfers.

### How Idempotency Works

```sql
-- Every payment has unique idempotency_key
SELECT
  idempotency_key,
  signature,
  status,
  created_at
FROM payment_ledger
WHERE idempotency_key = 'exec_123';

-- If you retry with same idempotency_key:
-- System checks if entry exists
-- If yes → returns existing result (no new transaction)
-- If no → submits new transaction
```

### Safe Retry Process

```bash
# Original request (fails mid-confirmation)
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer $API_KEY" \
  -H "Idempotency-Key: exec_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_456",
    "action": {"type": "transfer_sol", "recipient": "...", "amount": 1.5}
  }'
# Response: 500 error (timeout)

# Safe retry (same idempotency key):
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer $API_KEY" \
  -H "Idempotency-Key: exec_abc123"  # SAME KEY
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_456",
    "action": {"type": "transfer_sol", "recipient": "...", "amount": 1.5}
  }'
# Response: 200 OK (returns cached result, no duplicate transfer)
```

**Key Rules:**

1. Always include `Idempotency-Key` header with unique execution ID
2. Retry with the exact same key — system will recognize it as a retry
3. No duplicate transfer will occur, even if you retry 10 times
4. Idempotency keys expire after 24 hours (can be reclaimed)

---

## Supabase Queries for Diagnostics

### Check Payment Ledger Entry

```sql
SELECT
  id,
  agent_id,
  amount,
  recipient,
  status,
  signature,
  error_type,
  error_message,
  created_at,
  submitted_at,
  confirmed_at,
  idempotency_key
FROM payment_ledger
WHERE id = '<ledger_id>'
ORDER BY created_at DESC;
```

### Find Recent Failed Payments

```sql
SELECT
  id,
  agent_id,
  amount,
  recipient,
  signature,
  error_type,
  error_message,
  created_at
FROM payment_ledger
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check Audit Trail for Transaction

```sql
SELECT
  id,
  resource_id,
  action,
  changes,
  created_by,
  created_at
FROM audit_logs
WHERE resource_type = 'payment_ledger'
  AND resource_id = '<payment_ledger_id>'
ORDER BY created_at DESC;
```

### Retry Attempt History

```sql
SELECT
  id,
  signature,
  retry_count,
  last_retry_at,
  status
FROM payment_ledger
WHERE idempotency_key = '<idempotency_key>'
ORDER BY created_at DESC;
```

---

## Manual Transaction Status Check via Solana CLI

```bash
# Check signature status
TX_SIG="<signature>"
solana confirm $TX_SIG --url devnet

# Expected output:
# "Confirmed" → transaction is on-chain
# "Not found" → transaction not yet confirmed or failed
```

### Via RPC Direct

```bash
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getSignatureStatus",
    "params": ["'$TX_SIG'"]
  }' | jq '.result.value'

# Response:
# {
#   "confirmationStatus": "confirmed",
#   "confirmations": 32,
#   "err": null
# }
```

### Full Transaction Details

```bash
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["'$TX_SIG'", {"encoding": "json"}]
  }' | jq '.result'

# Review: meta.err, meta.logMessages, meta.postBalances
```

---

## Recovery Documentation Template

When recovering a transaction, document the incident in `recovery_log` table for audit trail:

```sql
INSERT INTO recovery_log (
  payment_ledger_id,
  action,
  status,
  notes,
  recovered_at,
  engineer_name
) VALUES (
  '<ledger_id>',
  'confirmation_resubmit',  -- action taken
  'succeeded',               -- outcome
  'Transaction timed out after 60s, resubmitted with new blockhash. Confirmed on retry.',
  NOW(),
  'ops_engineer_name'
);
```

**Action Types:**
- `timeout_retry` — Resubmitted after timeout
- `blockhash_refresh` — Refreshed and resubmitted
- `manual_approval` — Manually approved (if needed)
- `fund_injection` — Treasury funded
- `balance_correction` — Manual ledger update

**Status Values:**
- `pending` — Recovery in progress
- `succeeded` — Transaction confirmed after recovery
- `failed` — Recovery unsuccessful, escalation required
- `partially_successful` — Some payments recovered, some still pending

---

## Escalation Criteria

**Escalate to engineering if:**

1. Same error occurs >10 times in 1 hour
2. Error type is not in known list (Scenario 1-5 above)
3. Recovery steps do not resolve issue within 30 minutes
4. Multiple agents affected simultaneously
5. Treasury was properly funded but insufficient_balance still occurs

**Escalation Information to Gather:**

```bash
# Collect this data before escalating
echo "=== Escalation Data ===" > escalation-report.txt
echo "Time window: [start] to [end]" >> escalation-report.txt
echo "Affected agent(s): $(cat payment_ledger.csv | cut -d, -f2 | sort -u)" >> escalation-report.txt
echo "Error type: [error_type]" >> escalation-report.txt
echo "Error count: [N]" >> escalation-report.txt
echo "" >> escalation-report.txt

# Export ledger
psql -h $DB_HOST -d $DB_NAME -c "
  COPY (
    SELECT id, agent_id, amount, status, error_type, created_at
    FROM payment_ledger
    WHERE created_at >= '[start_time]'
      AND created_at <= '[end_time]'
  ) TO STDOUT CSV HEADER;
" >> escalation-report.txt

# Include RPC health check
curl -s https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
  >> escalation-report.txt
```

---

## Related Documentation

- **SOLANA_INTEGRATION.md** — Architecture and full integration guide
- **SOLANA_DEVNET_SETUP.md** — Initial setup and configuration
- **SOLANA_MONITORING_SETUP.md** — Dashboards and alerting
- **SOLANA_DISASTER_RECOVERY.md** — On-call runbook and mitigation

---

**Last Updated:** June 30, 2026  
**Version:** 1.0 (Phase 3 Feature 3)
