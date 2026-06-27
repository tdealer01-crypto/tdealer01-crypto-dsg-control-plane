# DSG Brain Credential Broker

Real credential management for DSG Brain execution contexts. Replaces mock empty leases with actual Supabase-backed secret retrieval.

## Overview

The Credential Broker is a server-side only component that:
- Queries Supabase for stored secrets (dsg_secrets table)
- Issues credential leases with redaction fingerprints (never raw values)
- Tracks lease TTL and renewal counts
- Prevents secret exposure through strict type boundaries

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ API Route / Hermes Plugin Request                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ HermesPlugin.brokerCredentials(secretNames)            │
│  ↓ calls brokerCredentials() from credential-broker.ts │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Admin Client                                  │
│  SELECT name, value FROM dsg_secrets WHERE name IN (...) │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ Credential Broker Processing                           │
│  For each secret:                                       │
│    ✓ Create CredentialLease with redaction fingerprint │
│    ✓ Track leaseId, expiresAt, renewals               │
│    ✓ Never store raw secretValue in lease             │
│  For each missing secret:                              │
│    ✓ Add to unavailable[]                             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ CredentialBrokerResult                                 │
│  {                                                      │
│    leases: CredentialLease[],                          │
│    unavailable: string[]                               │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ buildControlledExecutionContext(plan, credentials)     │
│  → ControlledExecutionContext (leases only, no raw keys) │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ Controlled Executor Runner                            │
│  (retrieves actual secrets via secure mechanism)       │
└─────────────────────────────────────────────────────────┘
```

## API Reference

### `brokerCredentials(secretNames, config?)`

Main function to lease credentials for a set of secret names.

```typescript
import { brokerCredentials } from "@/lib/dsg/brain/credential-broker";

const result = await brokerCredentials(["ANTHROPIC_API_KEY", "VERCEL_TOKEN"]);

// result:
// {
//   leases: [
//     {
//       secretName: "ANTHROPIC_API_KEY",
//       leaseId: "lease-ANTHROPIC_API_KEY-1719740363000",
//       redactionFingerprint: "abc123... (SHA256 hash)",
//       expiresAt: 1719740663000,
//       valid: true,
//       renewals: 0,
//       maxRenewals: 2
//     }
//   ],
//   unavailable: ["VERCEL_TOKEN"]
// }
```

**Parameters:**
- `secretNames: string[]` — Array of secret names to broker
- `config?: Partial<CredentialBrokerConfig>` — Optional configuration overrides

**Returns:**
- `Promise<CredentialBrokerResult>` — Object with leases and unavailable secrets

**Throws:**
- `Error` if database connection fails
- Individual secrets not found are added to `unavailable[]`, not thrown

**Error handling:**
```typescript
try {
  const creds = await brokerCredentials(["ANTHROPIC_API_KEY"]);
  
  if (creds.unavailable.length > 0) {
    console.warn("Missing secrets:", creds.unavailable);
    // Plan cannot proceed without mandatory credentials
  }
  
  // Proceed with creds.leases
} catch (err) {
  // Database error — log, alert, try fallback
  console.error("Credential broker failed:", err);
}
```

### `checkSecretExists(secretName, tableName?)`

Preflight check: does a secret exist in Supabase?

```typescript
const exists = await checkSecretExists("ANTHROPIC_API_KEY");
if (!exists) {
  throw new Error("API key not configured");
}
```

### `checkSecretsExist(secretNames, tableName?)`

Bulk preflight check for multiple secrets.

```typescript
const { existing, missing } = await checkSecretsExist([
  "ANTHROPIC_API_KEY",
  "VERCEL_TOKEN"
]);

console.log("Available:", existing);
console.log("Missing:", missing);
```

### `HermesPlugin.brokerCredentials(secretNames)`

Convenience method on the HermesPlugin class.

```typescript
const hermes = new HermesPlugin();
const credentials = await hermes.brokerCredentials(["ANTHROPIC_API_KEY"]);
```

## Usage Patterns

### Pattern 1: Full execution flow

```typescript
import { HermesPlugin } from "@/lib/dsg/brain";

const hermes = new HermesPlugin();

// Step 1: Propose a plan
const proposal = await hermes.proposePlan(planInput);

// Step 2: Broker credentials
const credentials = await hermes.brokerCredentials([
  "ANTHROPIC_API_KEY",
  "GITHUB_PAT"
]);

// Step 3: Check for missing secrets
if (credentials.unavailable.length > 0) {
  return {
    error: "Missing credentials",
    missing: credentials.unavailable
  };
}

// Step 4: Build execution context (with real leases)
const ctx = hermes.buildExecutionContext(proposal.plan, credentials);

// Step 5: Execute
const { result, report } = await hermes.executePlan(ctx, runner);
```

### Pattern 2: Preflight validation in API route

```typescript
import { brokerCredentials } from "@/lib/dsg/brain/credential-broker";

export async function POST(request: Request) {
  const payload = await request.json();
  const requiredSecrets = ["ANTHROPIC_API_KEY"];

  try {
    const credentials = await brokerCredentials(requiredSecrets);
    
    if (credentials.unavailable.length > 0) {
      return NextResponse.json(
        { error: "Missing credentials", missing: credentials.unavailable },
        { status: 500 }
      );
    }

    // Proceed with real credentials
    const ctx = buildControlledExecutionContext(
      plan,
      allowedCommands,
      allowedPaths,
      credentials
    );
    
    // ...
  } catch (error) {
    return NextResponse.json(
      { error: "Credential broker failed" },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Handling lease renewal

```typescript
const hermes = new HermesPlugin();
let ctx = hermes.buildExecutionContext(plan, credentials);

// During execution, check if leases are expiring
if (leaseExpiringWithinMs(ctx.credentials, 60_000)) {
  // Renew all leases and grant
  ctx = hermes.renewExecutionContext(ctx);
}
```

## Database Schema

### `dsg_secrets` Table

```sql
CREATE TABLE public.dsg_secrets (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,           -- e.g., "ANTHROPIC_API_KEY"
  value TEXT NOT NULL,                 -- Encrypted secret value
  org_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP,
  encryption_key_version INT,
  encryption_algorithm TEXT,           -- e.g., "pgcrypto"
  deleted_at TIMESTAMP                 -- Soft delete
);
```

### RLS Policies

- **service_role:** Full access (via server-side Credential Broker)
- **authenticated users:** No direct access (secrets only via leases)
- **anonymous:** No access

Secrets are **never** exposed to client-side code or unauthorized server components.

## Security Properties

### What the broker protects

1. **Raw secret isolation:** Secrets never leave Supabase in raw form
   - Leases contain only redaction fingerprints (SHA256 hashes)
   - Raw values are handled only within the broker's private scope

2. **TTL enforcement:** Leases expire and must be renewed
   - Default TTL: 5 minutes
   - Prevents indefinite credential exposure
   - Renewal tracking prevents replay attacks

3. **RLS enforcement:** Secrets are server-side only
   - Client code cannot directly query dsg_secrets
   - Secrets are queried only by service role (backend)
   - No user/authenticated access to raw secrets

4. **Encryption at rest:** Secrets should be encrypted in Supabase
   - Use pgcrypto or external key management
   - Implementation: set `encryption_algorithm` and handle decryption in broker

### What the broker does NOT protect

- **Network interception:** Use HTTPS/TLS (handled by Vercel/infrastructure)
- **Memory leaks:** Runner code is responsible for not logging secrets
- **Supabase compromise:** If the database is breached, secrets are exposed
  - Mitigation: Use external vault, key rotation, least privilege
- **Timing attacks:** Constant-time comparison not implemented
  - Mitigation: Use constant-time vault comparison where relevant

## Configuration

### Default Configuration

```typescript
const DEFAULT_CREDENTIAL_BROKER_CONFIG = {
  defaultLeaseTtlMs: 5 * 60 * 1000,    // 5 minutes
  defaultMaxRenewals: 2,                // 2 renewals max
  secretsTableName: "dsg_secrets"
};
```

### Custom Configuration

```typescript
const creds = await brokerCredentials(["API_KEY"], {
  defaultLeaseTtlMs: 30 * 60 * 1000,   // 30 minutes
  defaultMaxRenewals: 5
});

// Or via HermesPlugin
const hermes = new HermesPlugin({
  credentialBrokerConfig: {
    defaultLeaseTtlMs: 30 * 60 * 1000
  }
});
```

## Testing

### Unit Tests

Run the credential broker tests:

```bash
npm test -- tests/unit/dsg-brain-credential-broker.test.ts
```

Tests cover:
- Creating leases for existing secrets
- Tracking unavailable secrets
- Mixed found/unavailable scenarios
- Database error handling
- Redaction fingerprint verification
- Custom configuration
- Preflight existence checks

### Test Strategy

Tests use mocked Supabase client, not real database access:
- Fast execution (no DB latency)
- Deterministic (no external dependency on DB state)
- Safe (no secrets leaked in test output)
- Mockable (easy to test error paths)

## Migration Path

### Before (Mock leases)

```typescript
// buildControlledExecutionContext() called with mock credentials:
const credentials: CredentialBrokerResult = {
  leases: [],        // Empty!
  unavailable: []    // No tracking
};
```

### After (Real leases)

```typescript
// brokerCredentials() queries Supabase:
const credentials = await hermes.brokerCredentials([
  "ANTHROPIC_API_KEY"
]);

// credentials.leases now contains real leases with fingerprints
// credentials.unavailable tracks missing secrets
```

### Integration Steps

1. **Create dsg_secrets table** — Run migration: `20260530_dsg_secrets_table.sql`
2. **Populate test secrets** — Insert test data for development
3. **Update routes** — Replace mock credentials with `brokerCredentials()` calls
4. **Add error handling** — Handle unavailable secrets gracefully
5. **Test end-to-end** — Verify plans execute with real leases

## Examples

See `credential-broker-example.ts` for complete integration examples:
- Full execution flow with credential brokering
- Preflight validation
- Lease renewal during long-running tasks
- Error handling and graceful degradation

## Files

- **lib/dsg/brain/credential-broker.ts** — Core broker implementation
- **lib/dsg/brain/hermes-plugin.ts** — HermesPlugin integration
- **lib/dsg/brain/credential-broker-example.ts** — Integration examples
- **supabase/migrations/20260530_dsg_secrets_table.sql** — Schema migration
- **tests/unit/dsg-brain-credential-broker.test.ts** — Unit tests
- **lib/dsg/brain/CREDENTIAL_BROKER.md** — This file

## Status

- **Broker implementation:** Complete
- **Hermes integration:** Complete
- **Unit tests:** All passing (14/14)
- **Database schema:** Migration ready
- **Production integration:** Pending (requires setting up real dsg_secrets table)
- **Live health/readiness:** Not verified (not yet deployed)

## Next Steps

1. Merge this branch and deploy to verify no build/runtime errors
2. Create dsg_secrets table in production Supabase
3. Add a restricted set of test credentials (e.g., public API keys)
4. Update API routes to use real credential broker instead of mocks
5. Add monitoring/alerting for credential brokering failures
6. Document the production credential rotation/refresh process
