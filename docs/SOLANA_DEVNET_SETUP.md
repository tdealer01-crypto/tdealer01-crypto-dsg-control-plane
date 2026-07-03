# Solana Devnet Setup & Configuration

**Audience:** DevOps/ops engineers deploying Solana integration to devnet or testnet environments.

**Status:** Phase 3 Feature 3 Complete (June 30, 2026)

This guide walks through generating a Treasury keypair, funding it with devnet SOL, and configuring the Control Plane for local development or production-like testing.

---

## Prerequisites Checklist

Before beginning, verify you have:

- [ ] Node.js 18+ or access to Solana CLI
- [ ] Solana CLI installed (`solana --version` should return a version)
  - Installation: https://docs.solana.com/cli/install-solana-cli-tools
- [ ] Access to repository environment configuration (GitHub Secrets, Vercel project, or `.env.local`)
- [ ] Outbound HTTPS access to Solana RPC endpoints
- [ ] (Optional) jq installed for JSON parsing: `brew install jq` or `apt install jq`

If using Solana CLI, verify installation:

```bash
solana --version
solana-keygen --version
```

---

## Step 1: Generate Treasury Keypair

The Treasury account signs all SOL transfers. Generate a new keypair using one of the two methods below.

### Option A: Using Solana CLI (Recommended)

**Simplest and most secure approach:**

```bash
# Create a new keypair file (will prompt for passphrase)
solana-keygen new --outfile ~/.config/solana/treasury-keypair.json

# Verify the keypair was created
ls -la ~/.config/solana/treasury-keypair.json

# Export the public key (address for funding)
solana-keygen pubkey ~/.config/solana/treasury-keypair.json
# Output: Example: 9B5X...Qw9w
```

**Extract keypair for environment variables:**

For Option A (Base64-encoded private key):

```bash
# Export as base64 (for SOLANA_TREASURY_PRIVATE_KEY)
cat ~/.config/solana/treasury-keypair.json | jq -r 'join(",") | @base64'
```

For Option B (JSON array of 64 bytes):

```bash
# Export as array (for SOLANA_TREASURY_SECRET)
cat ~/.config/solana/treasury-keypair.json | jq '.'
# Output: [123, 45, 67, ..., 89]  (64 bytes total)
```

### Option B: Using Node.js

**If Solana CLI is unavailable:**

Create a file `scripts/generate-treasury.js`:

```javascript
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

// Generate new keypair
const keypair = Keypair.generate();
const secretKey = keypair.secretKey;

console.log('Public Key (address):', keypair.publicKey.toString());
console.log('Private Key (base64):', Buffer.from(secretKey).toString('base64'));
console.log('Secret Array:', Array.from(secretKey));

// Optionally save to file
const keypairPath = process.env.HOME + '/.config/solana/treasury-keypair.json';
fs.writeFileSync(keypairPath, JSON.stringify(Array.from(secretKey)), { mode: 0o600 });
console.log(`\nKeypair saved to: ${keypairPath}`);
```

Run it:

```bash
node scripts/generate-treasury.js
```

Save the output values for the next step.

---

## Step 2: Fund the Treasury Account

Before executing transactions, the treasury account must have SOL to pay for fees and transfers.

### On Devnet (Free Airdrop)

**Devnet allows free airdropping of test SOL:**

```bash
# Get 10 SOL airdrop (repeat if needed)
solana airdrop 10 <treasury_public_key> --url devnet

# Verify balance
solana balance <treasury_public_key> --url devnet
# Output: 10 SOL
```

**Example:**

```bash
TREASURY_ADDR="9B5X...Qw9w"
solana airdrop 10 $TREASURY_ADDR --url devnet
solana balance $TREASURY_ADDR --url devnet
```

If airdrop fails (e.g., rate limit), wait a few minutes and retry.

### On Testnet (Manual Transfer)

**Testnet does not provide airdrop. Manually transfer SOL:**

1. Get testnet SOL from a faucet (varies by service).
2. Transfer to your treasury address:

```bash
# From an existing funded wallet
solana transfer <treasury_public_key> 5 --url testnet
```

3. Verify:

```bash
solana balance <treasury_public_key> --url testnet
```

### Recommended Balances

| Environment | Recommended | Use Case |
|-------------|-------------|----------|
| Devnet | 5-10 SOL | Development, integration testing |
| Testnet | 1-5 SOL | Pre-production validation |
| Mainnet | 10+ SOL | Production (real SOL) |

---

## Step 3: Configure Environment Variables

### Local Development (`.env.local`)

For local development with `npm run dev`:

```bash
# Copy .env.example if not already present
cp .env.example .env.local

# Edit .env.local with your treasury keypair
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_TREASURY_PRIVATE_KEY=<your_base64_encoded_key>
# OR
SOLANA_TREASURY_SECRET=[123,45,67,...,89]
```

**Do NOT commit `.env.local` to the repository.**

To verify locally:

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/agent/status
```

### Production Environment (Vercel)

**Never commit private keys. Use Vercel Environment Secrets:**

1. Go to your Vercel project dashboard.
2. Navigate to **Settings → Environment Variables**.
3. Add each variable as a **Secret** (not regular env var):

**For base64-encoded key:**

```
Name: SOLANA_TREASURY_PRIVATE_KEY
Value: <paste_base64_key_here>
Environments: Production
Type: Secret
```

**For JSON array:**

```
Name: SOLANA_TREASURY_SECRET
Value: [123,45,67,...,89]
Environments: Production
Type: Secret
```

**For RPC endpoint:**

```
Name: SOLANA_RPC_ENDPOINT
Value: https://api.devnet.solana.com
Environments: Production
```

**Using Vercel CLI:**

```bash
# Install Vercel CLI
npm i -g vercel

# Add secrets (you will be prompted for values)
vercel env add SOLANA_RPC_ENDPOINT production
vercel env add SOLANA_TREASURY_PRIVATE_KEY production

# View all secrets
vercel env ls production

# Redeploy to apply
vercel --prod
```

---

## Step 4: Validation Checklist

Run these checks to confirm setup is complete and working.

### 4.1 RPC Endpoint Health

Test connectivity to the Solana RPC endpoint:

```bash
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getVersion"
  }'

# Expected: {"jsonrpc":"2.0","result":{"solana-core":"1.x.x",...},"id":1}
```

### 4.2 Treasury Balance

Check the treasury wallet has sufficient balance:

```bash
solana balance <treasury_public_key> --url devnet

# Expected: 5+ SOL (or whatever you airdropped)
```

Alternatively, via RPC:

```bash
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getBalance",
    "params": ["<treasury_public_key>"]
  }'

# Expected: {"jsonrpc":"2.0","result":{"context":{...},"value":5000000000},"id":1}
# (value is in lamports; divide by 10^9 for SOL)
```

### 4.3 Environment Variable Test

Verify environment variables are loaded (local only):

```bash
# Start dev server
npm run dev

# In another terminal, check health endpoint
curl http://localhost:3000/api/agent/status

# Expected: {"status":"ok","commit":"...","environment":"development","timestamp":"..."}
```

If you see `SOLANA_TREASURY_PRIVATE_KEY not set`, the key is not in your `.env.local`.

### 4.4 Test Transaction (Optional)

Execute a test transfer to verify end-to-end flow:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer test_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test_agent",
    "action": {
      "type": "transfer_sol",
      "recipient": "<recipient_public_key>",
      "amount": 0.1,
      "description": "Test transfer"
    }
  }'

# Expected: 200 OK with transaction signature
# {"status":"success","transaction":{"signature":"...","status":"confirmed","amount":0.1}}
```

If you don't have a recipient address, create one:

```bash
solana-keygen new --outfile test-recipient-keypair.json
solana-keygen pubkey test-recipient-keypair.json
```

---

## Step 5: Switching Environments

To move from devnet → testnet → mainnet, update `SOLANA_RPC_ENDPOINT`:

### Devnet (Free Testing)

```bash
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_TREASURY_PRIVATE_KEY=<your_key>
```

- Free airdrop available
- Good for development
- No real value

### Testnet (Pre-Production)

```bash
SOLANA_RPC_ENDPOINT=https://api.testnet.solana.com
SOLANA_TREASURY_PRIVATE_KEY=<your_key>
```

- No free airdrop; manual funding required
- Production-like conditions
- No real value

### Mainnet (Production)

```bash
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_TREASURY_PRIVATE_KEY=<your_key>
```

- **REAL SOL TRANSFERS** — use with caution
- Requires thorough testing and approval
- High security and audit requirements

---

## Security Best Practices

### 1. Never Commit Keys

- Do NOT add `.env.local` to git
- Do NOT paste keys in pull requests, issues, or logs
- Add `.env.local` to `.gitignore` (usually already present)

Verify:

```bash
git status | grep -i env
# Should NOT show .env.local or any key files
```

### 2. Use GitHub Secrets for CI/CD

If running tests in GitHub Actions:

```bash
# Go to Settings → Secrets and variables → Actions
# Add SOLANA_TREASURY_PRIVATE_KEY as a repository secret
# Then reference in workflow:
- name: Run Solana tests
  env:
    SOLANA_TREASURY_PRIVATE_KEY: ${{ secrets.SOLANA_TREASURY_PRIVATE_KEY }}
  run: npm run test:integration
```

### 3. Rotate Keys Regularly

For mainnet, rotate treasury keys periodically:

```bash
# Generate new keypair
solana-keygen new --outfile ~/treasury-new.json

# Fund new wallet from old
solana transfer <new_public_key> 9.9 --url mainnet-beta

# Update environment variables in Vercel
vercel env add SOLANA_TREASURY_PRIVATE_KEY production --force
```

### 4. Monitor Key Usage

In Supabase, check logs for which keys were used:

```sql
SELECT timestamp, agent_id, amount, recipient 
FROM payment_ledger 
WHERE status = 'confirmed' 
ORDER BY timestamp DESC 
LIMIT 20;
```

---

## Troubleshooting

### "Airdrop request failed"

**Cause:** Rate limiting or network issue.

**Solution:**

```bash
# Wait 30 seconds and retry
sleep 30
solana airdrop 10 <treasury_public_key> --url devnet
```

### "Invalid RPC endpoint URL"

**Cause:** Endpoint is malformed or unreachable.

**Solution:**

- Verify format: Must start with `https://` (or `http://` for localhost)
- Correct endpoints:
  - Devnet: `https://api.devnet.solana.com`
  - Testnet: `https://api.testnet.solana.com`
  - Mainnet: `https://api.mainnet-beta.solana.com`

### "Treasury keypair not found"

**Cause:** Environment variable not set or wrong format.

**Solution:**

```bash
# Check if variable is set
echo $SOLANA_TREASURY_PRIVATE_KEY

# If empty, add to .env.local
cat ~/.config/solana/treasury-keypair.json | jq -r 'join(",") | @base64'
# Copy output to SOLANA_TREASURY_PRIVATE_KEY=...
```

### "Confirmation timeout"

**Cause:** Transaction took too long to confirm (>60 seconds).

**Solution:**

- Check Solana network status: https://status.solana.com
- Try again with a different RPC endpoint (if fallback is available)
- Increase timeout in env: `SOLANA_CONFIRMATION_TIMEOUT_MS=90000`

---

## Related Documentation

- **SOLANA_INTEGRATION.md** — Architecture and full integration guide
- **SOLANA_MONITORING_SETUP.md** — Dashboard and alerting setup
- **SOLANA_RECOVERY_PROCEDURES.md** — Failure recovery playbook
- **.env.example** — All environment variable options

---

**Last Updated:** June 30, 2026  
**Version:** 1.0 (Phase 3 Feature 3)
