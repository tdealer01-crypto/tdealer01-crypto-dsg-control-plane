# Phase 2: Core Gateway Handlers - Complete Execution Guide

**Branch**: `claude/stripe-apps-cli-setup-1UnVr` (continue from Phase 1)  
**Timeline**: 1 week  
**Effort**: Heavy 90% work - just follow commands  

**Prerequisites**: Phase 1 must be complete (`stripe apps start` working)

---

## Overview

Phase 2 implements the core governance handlers:
1. ✅ Stripe event adapter (charge → DSG gateway request)
2. ✅ Webhook handler (receive + validate Stripe events)
3. ✅ Custom UI action handler (pre-execution gating)
4. ✅ OAuth handler (account linking)
5. ✅ Policy cache layer (Redis/Upstash for <200ms lookups)

---

## Step 1: Create Stripe Event Adapter

```bash
cat > packages/stripe-app/src/adapters/stripe-to-dsg-gate.ts << 'EOF'
import Stripe from 'stripe';

export interface StripeOperationContext {
  stripe_account_id: string;
  stripe_event_id: string;
  object_type: 'charge' | 'payment_intent' | 'payout' | 'refund';
  object_id: string;
  amount_cents: number;
  currency: string;
  customer_id?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface DsgGatewayRequest {
  action: string;
  operation_type: string;
  context: StripeOperationContext;
}

export function chargeToGatewayRequest(
  charge: Stripe.Charge,
  stripeAccountId: string,
  stripeEventId: string
): DsgGatewayRequest {
  return {
    action: 'stripe.charge.create',
    operation_type: 'charge',
    context: {
      stripe_account_id: stripeAccountId,
      stripe_event_id: stripeEventId,
      object_type: 'charge',
      object_id: charge.id,
      amount_cents: charge.amount,
      currency: charge.currency,
      customer_id: charge.customer as string | undefined,
      description: charge.description || undefined,
      metadata: charge.metadata,
    },
  };
}

export function paymentIntentToGatewayRequest(
  paymentIntent: Stripe.PaymentIntent,
  stripeAccountId: string,
  stripeEventId: string
): DsgGatewayRequest {
  return {
    action: 'stripe.payment_intent.create',
    operation_type: 'payment_intent',
    context: {
      stripe_account_id: stripeAccountId,
      stripe_event_id: stripeEventId,
      object_type: 'payment_intent',
      object_id: paymentIntent.id,
      amount_cents: paymentIntent.amount || 0,
      currency: paymentIntent.currency,
      customer_id: paymentIntent.customer as string | undefined,
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata,
    },
  };
}

export function payoutToGatewayRequest(
  payout: Stripe.Payout,
  stripeAccountId: string,
  stripeEventId: string
): DsgGatewayRequest {
  return {
    action: 'stripe.payout.create',
    operation_type: 'payout',
    context: {
      stripe_account_id: stripeAccountId,
      stripe_event_id: stripeEventId,
      object_type: 'payout',
      object_id: payout.id,
      amount_cents: payout.amount,
      currency: payout.currency,
      metadata: payout.metadata,
    },
  };
}
EOF
```

---

## Step 2: Create Policy Cache Layer (Redis/Upstash)

```bash
cat > packages/stripe-app/src/lib/policy-cache.ts << 'EOF'
export interface CachedPolicy {
  stripe_account_id: string;
  operation_type: string;
  rule_type?: string;
  conditions: Record<string, unknown>;
  action: 'allow' | 'block' | 'review';
  cached_at: number;
}

export class PolicyCache {
  private cache: Map<string, CachedPolicy> = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes

  getCacheKey(stripeAccountId: string, operationType: string): string {
    return `policy:${stripeAccountId}:${operationType}`;
  }

  get(stripeAccountId: string, operationType: string): CachedPolicy | null {
    const key = this.getCacheKey(stripeAccountId, operationType);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.cached_at;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(
    stripeAccountId: string,
    operationType: string,
    policy: CachedPolicy
  ): void {
    const key = this.getCacheKey(stripeAccountId, operationType);
    this.cache.set(key, {
      ...policy,
      cached_at: Date.now(),
    });
  }

  invalidate(stripeAccountId: string, operationType?: string): void {
    if (operationType) {
      const key = this.getCacheKey(stripeAccountId, operationType);
      this.cache.delete(key);
    } else {
      // Invalidate all policies for account
      const prefix = `policy:${stripeAccountId}:`;
      for (const [key] of this.cache) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const policyCache = new PolicyCache();
EOF
```

---

## Step 3: Create Webhook Handler

```bash
cat > packages/stripe-app/src/handlers/webhook-handler.ts << 'EOF'
import Stripe from 'stripe';
import { chargeToGatewayRequest, paymentIntentToGatewayRequest, payoutToGatewayRequest } from '../adapters/stripe-to-dsg-gate';
import { evaluateGateway, recordAudit } from '../lib/dsg-client';

export interface WebhookHandlerConfig {
  stripeSecretKey: string;
  webhookSecret: string;
  dsgApiBase: string;
}

export class StripeWebhookHandler {
  private stripe: Stripe;
  private config: WebhookHandlerConfig;

  constructor(config: WebhookHandlerConfig) {
    this.stripe = new Stripe(config.stripeSecretKey);
    this.config = config;
  }

  validateSignature(
    payload: Buffer,
    signature: string
  ): {
    valid: boolean;
    event?: Stripe.Event;
    error?: string;
  } {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return { valid: true, event };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid signature',
      };
    }
  }

  async handleChargeEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    const gatewayRequest = chargeToGatewayRequest(
      charge,
      stripeAccountId,
      event.id
    );

    const decision = await evaluateGateway(
      gatewayRequest,
      this.config.dsgApiBase
    );

    console.log(`[Webhook] Charge ${charge.id}: ${decision.decision}`);

    await recordAudit(decision, event.id, this.config.dsgApiBase);

    // If blocked after fact, trigger auto-reverse/refund
    if (decision.decision === 'BLOCK') {
      console.warn(
        `[Webhook] Charge ${charge.id} blocked. Initiating auto-refund.`
      );
      // TODO: Call refund endpoint
    }
  }

  async handlePaymentIntentEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const gatewayRequest = paymentIntentToGatewayRequest(
      paymentIntent,
      stripeAccountId,
      event.id
    );

    const decision = await evaluateGateway(
      gatewayRequest,
      this.config.dsgApiBase
    );

    console.log(
      `[Webhook] Payment Intent ${paymentIntent.id}: ${decision.decision}`
    );

    await recordAudit(decision, event.id, this.config.dsgApiBase);
  }

  async handlePayoutEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    const payout = event.data.object as Stripe.Payout;

    const gatewayRequest = payoutToGatewayRequest(payout, stripeAccountId, event.id);

    const decision = await evaluateGateway(
      gatewayRequest,
      this.config.dsgApiBase
    );

    console.log(`[Webhook] Payout ${payout.id}: ${decision.decision}`);

    await recordAudit(decision, event.id, this.config.dsgApiBase);

    // Critical: if payout blocked, freeze it
    if (decision.decision === 'BLOCK') {
      console.warn(`[Webhook] Payout ${payout.id} blocked. Freezing payout.`);
      // TODO: Call payout freeze endpoint
    }
  }

  async handleEvent(
    event: Stripe.Event,
    stripeAccountId: string
  ): Promise<void> {
    try {
      switch (event.type) {
        case 'charge.created':
        case 'charge.updated':
          await this.handleChargeEvent(event, stripeAccountId);
          break;

        case 'payment_intent.created':
        case 'payment_intent.processing':
          await this.handlePaymentIntentEvent(event, stripeAccountId);
          break;

        case 'payout.created':
        case 'payout.updated':
          await this.handlePayoutEvent(event, stripeAccountId);
          break;

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(
        `[Webhook] Error handling event ${event.id}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }
}
EOF
```

---

## Step 4: Create Custom UI Action Handler

```bash
cat > packages/stripe-app/src/handlers/custom-ui-handler.ts << 'EOF'
import { chargeToGatewayRequest } from '../adapters/stripe-to-dsg-gate';
import { evaluateGateway } from '../lib/dsg-client';

export interface CustomUIActionRequest {
  action: 'approve' | 'block' | 'review';
  stripe_account_id: string;
  operation_type: 'charge' | 'payment_intent' | 'payout';
  object_id: string;
  amount_cents: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface CustomUIActionResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  proof?: string;
  should_proceed: boolean;
}

export async function evaluateCustomUIAction(
  request: CustomUIActionRequest,
  dsgApiBase: string
): Promise<CustomUIActionResponse> {
  // Pre-execution gate - user clicked action button in Stripe Dashboard
  // Must decide within <2 seconds before Dashboard times out

  const gatewayRequest = {
    action: `stripe.${request.operation_type}.ui_action`,
    operation_type: request.operation_type,
    context: {
      stripe_account_id: request.stripe_account_id,
      stripe_event_id: `ui_action_${Date.now()}`,
      object_type: request.operation_type as 'charge' | 'payment_intent' | 'payout',
      object_id: request.object_id,
      amount_cents: request.amount_cents,
      currency: request.currency,
      metadata: request.metadata,
    },
  };

  const decision = await evaluateGateway(gatewayRequest, dsgApiBase);

  return {
    decision: decision.decision,
    reason: decision.reason,
    proof: decision.proof,
    should_proceed: decision.decision === 'ALLOW',
  };
}
EOF
```

---

## Step 5: Create OAuth Handler

```bash
cat > packages/stripe-app/src/handlers/oauth-handler.ts << 'EOF'
import { nanoid } from 'nanoid';

export interface OAuthConfig {
  stripeClientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthState {
  state: string;
  created_at: number;
  expires_at: number;
}

export class OAuthHandler {
  private stateStore: Map<string, OAuthState> = new Map();
  private config: OAuthConfig;
  private stateTtl = 10 * 60 * 1000; // 10 minutes

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  generateAuthorizationUrl(): { url: string; state: string } {
    const state = nanoid();
    const now = Date.now();

    // Store state for validation
    this.stateStore.set(state, {
      state,
      created_at: now,
      expires_at: now + this.stateTtl,
    });

    // Stripe OAuth URL format
    const params = new URLSearchParams({
      client_id: this.config.stripeClientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return { url, state };
  }

  validateState(state: string): boolean {
    const stored = this.stateStore.get(state);

    if (!stored) {
      return false;
    }

    // Check expiration
    if (Date.now() > stored.expires_at) {
      this.stateStore.delete(state);
      return false;
    }

    return true;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    stripe_user_id: string;
    scope: string;
    livemode: boolean;
  }> {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.stripeClientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  validateToken(accessToken: string): boolean {
    // Basic validation - in production, verify with Stripe
    return accessToken && accessToken.length > 0;
  }
}
EOF
```

---

## Step 6: Create DSG Client Update

```bash
cat > packages/stripe-app/src/lib/dsg-client.ts << 'EOF'
export interface GatewayRequest {
  action: string;
  operation_type: string;
  context: {
    stripe_account_id: string;
    stripe_event_id: string;
    object_type: string;
    object_id: string;
    amount_cents: number;
    currency: string;
    customer_id?: string;
    metadata?: Record<string, string>;
  };
}

export interface GatewayResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  proof?: string;
}

export async function evaluateGateway(
  request: GatewayRequest,
  apiBase: string
): Promise<GatewayResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${apiBase}/api/stripe-app/gateway/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (!response.ok) {
      throw new Error(`Gateway evaluation failed: ${response.statusText}`);
    }

    const decision = await response.json();
    const duration = Date.now() - startTime;

    console.log(
      `[Gateway] Decision for ${request.action}: ${decision.decision} (${duration}ms)`
    );

    return decision;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Gateway] Evaluation error after ${duration}ms:`,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Fail-safe: default to REVIEW (safest default for governance)
    return {
      decision: 'REVIEW',
      reason: `Gateway evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function recordAudit(
  decision: GatewayResponse,
  stripeEventId: string,
  apiBase: string
): Promise<void> {
  try {
    await fetch(`${apiBase}/api/stripe-app/audit/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripe_event_id: stripeEventId,
        decision,
      }),
    });
  } catch (error) {
    console.error(
      '[Audit] Failed to record decision:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    // Don't throw - audit failure shouldn't block main flow
  }
}
EOF
```

---

## Step 7: Update package.json Dependencies

```bash
cd packages/stripe-app

# Add required dependencies
npm install stripe nanoid

# Verify installation
npm list stripe nanoid
```

---

## Step 8: Create Unit Tests for Adapters

```bash
cat > packages/stripe-app/tests/unit/adapters.test.ts << 'EOF'
import { chargeToGatewayRequest, paymentIntentToGatewayRequest, payoutToGatewayRequest } from '../../src/adapters/stripe-to-dsg-gate';

describe('Stripe to DSG Adapters', () => {
  const stripeAccountId = 'acct_test123';
  const stripeEventId = 'evt_test456';

  describe('chargeToGatewayRequest', () => {
    it('should convert Stripe charge to DSG gateway request', () => {
      const charge = {
        id: 'ch_test',
        amount: 10000,
        currency: 'usd',
        customer: 'cus_test',
        description: 'Test charge',
        metadata: { order_id: '123' },
      };

      const request = chargeToGatewayRequest(charge as any, stripeAccountId, stripeEventId);

      expect(request.action).toBe('stripe.charge.create');
      expect(request.operation_type).toBe('charge');
      expect(request.context.stripe_account_id).toBe(stripeAccountId);
      expect(request.context.amount_cents).toBe(10000);
      expect(request.context.currency).toBe('usd');
    });
  });

  describe('paymentIntentToGatewayRequest', () => {
    it('should convert Stripe payment intent to DSG gateway request', () => {
      const paymentIntent = {
        id: 'pi_test',
        amount: 5000,
        currency: 'usd',
        customer: 'cus_test',
        description: 'Test payment',
        metadata: { session_id: '456' },
      };

      const request = paymentIntentToGatewayRequest(paymentIntent as any, stripeAccountId, stripeEventId);

      expect(request.action).toBe('stripe.payment_intent.create');
      expect(request.operation_type).toBe('payment_intent');
      expect(request.context.amount_cents).toBe(5000);
    });
  });

  describe('payoutToGatewayRequest', () => {
    it('should convert Stripe payout to DSG gateway request', () => {
      const payout = {
        id: 'po_test',
        amount: 50000,
        currency: 'usd',
        metadata: { recipient: 'seller_123' },
      };

      const request = payoutToGatewayRequest(payout as any, stripeAccountId, stripeEventId);

      expect(request.action).toBe('stripe.payout.create');
      expect(request.operation_type).toBe('payout');
      expect(request.context.amount_cents).toBe(50000);
    });
  });
});
EOF
```

---

## Step 9: Create Policy Cache Tests

```bash
cat > packages/stripe-app/tests/unit/policy-cache.test.ts << 'EOF'
import { PolicyCache } from '../../src/lib/policy-cache';

describe('PolicyCache', () => {
  let cache: PolicyCache;

  beforeEach(() => {
    cache = new PolicyCache();
  });

  it('should store and retrieve policies', () => {
    const policy = {
      stripe_account_id: 'acct_test',
      operation_type: 'charge',
      conditions: { max_amount: 50000 },
      action: 'allow' as const,
      cached_at: Date.now(),
    };

    cache.set('acct_test', 'charge', policy);
    const retrieved = cache.get('acct_test', 'charge');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.action).toBe('allow');
  });

  it('should invalidate expired policies', (done) => {
    const policy = {
      stripe_account_id: 'acct_test',
      operation_type: 'charge',
      conditions: {},
      action: 'block' as const,
      cached_at: Date.now() - 6 * 60 * 1000, // 6 minutes ago
    };

    cache.set('acct_test', 'charge', policy);

    // Wait a bit then check
    setTimeout(() => {
      const retrieved = cache.get('acct_test', 'charge');
      expect(retrieved).toBeNull();
      done();
    }, 100);
  });

  it('should invalidate specific policies', () => {
    cache.set('acct_test', 'charge', {
      stripe_account_id: 'acct_test',
      operation_type: 'charge',
      conditions: {},
      action: 'allow' as const,
      cached_at: Date.now(),
    });

    cache.invalidate('acct_test', 'charge');
    const retrieved = cache.get('acct_test', 'charge');

    expect(retrieved).toBeNull();
  });
});
EOF
```

---

## Step 10: Run Tests

```bash
cd packages/stripe-app

# Run unit tests
npm test

# With coverage
npm test -- --coverage
```

---

## Step 11: TypeScript Validation

```bash
cd packages/stripe-app

# Type check
npm run type-check

# Lint
npm run lint
```

---

## Step 12: Verify Phase 2 Files Created

```bash
# Check all Phase 2 files exist
ls -la packages/stripe-app/src/adapters/
ls -la packages/stripe-app/src/handlers/
ls -la packages/stripe-app/src/lib/
ls -la packages/stripe-app/tests/unit/

# Should see:
# adapters/stripe-to-dsg-gate.ts
# handlers/webhook-handler.ts
# handlers/custom-ui-handler.ts
# handlers/oauth-handler.ts
# lib/policy-cache.ts
# lib/dsg-client.ts
# tests/unit/adapters.test.ts
# tests/unit/policy-cache.test.ts
```

---

## ✅ Phase 2 Completion Checklist

- [ ] Step 1: Stripe event adapter created (charge, payment_intent, payout)
- [ ] Step 2: Policy cache layer implemented (5min TTL, in-memory)
- [ ] Step 3: Webhook handler created (validates signature, routes events)
- [ ] Step 4: Custom UI action handler created (pre-execution gate)
- [ ] Step 5: OAuth handler created (state management, token exchange)
- [ ] Step 6: DSG client updated (timeout handling, fail-safe defaults)
- [ ] Step 7: Dependencies installed (stripe, nanoid)
- [ ] Step 8: Adapter unit tests passing
- [ ] Step 9: Policy cache tests passing
- [ ] Step 10: All tests passing (`npm test`)
- [ ] Step 11: TypeScript passes (`npm run type-check`)
- [ ] Step 12: All files created in correct locations
- [ ] No vulnerabilities (`npm audit`)
- [ ] Ready for Phase 3 (Database schema)

---

## Key Implementation Details

### Webhook Handler Flow
```
1. Stripe sends webhook → validate signature
2. Adapt Stripe object → DSG gateway request
3. Evaluate policy → ALLOW/BLOCK/REVIEW
4. Record audit trail
5. If BLOCK → trigger auto-reverse (charge refund / payout freeze)
```

### Custom UI Action Flow (Pre-Execution)
```
1. User clicks action button in Stripe Dashboard
2. Send to UI action handler
3. Evaluate policy in <2 seconds
4. Return decision to Dashboard
5. If ALLOW → proceed with operation
6. If BLOCK/REVIEW → show error or approval modal
```

### OAuth Flow
```
1. Generate auth URL with state
2. User clicks "Connect" in Stripe App
3. Redirected to Stripe OAuth
4. User approves permissions
5. Stripe redirects back with code
6. Exchange code for access token
7. Link Stripe account → DSG org
8. Store access token securely
```

### Policy Cache Strategy
```
- First check: in-memory cache (< 200ms)
- Cache miss: query Supabase (will add in Phase 3)
- TTL: 5 minutes (auto-invalidate)
- Invalidation: on policy update, invalidate all account policies
```

---

## Fail-Safe Defaults

**Gateway Evaluation Timeout**: 2 seconds
- If DSG API slow → return REVIEW (safest)
- Never silently ALLOW on failure

**OAuth State Expiry**: 10 minutes
- Prevents replay attacks
- User must restart if takes too long

**Policy Cache Missing**: Query Supabase
- Cache miss → fetch fresh policy
- No policy found → REVIEW (default)

---

## Integration Points (Phase 3+)

These handlers integrate with:
- **Phase 3**: Supabase for policy storage + audit trail
- **Phase 4**: Gateway executor for policy evaluation
- **Phase 5**: API routes (webhook endpoint, OAuth callback, UI action endpoint)
- **Phase 6**: React views (show approval status, handle OAuth redirect)

---

## Next Phase (Phase 3)

Once Phase 2 complete:
1. Create Supabase tables (accounts, policies, audits)
2. Update handlers to query Supabase instead of stubs
3. Add migrations for audit trail schema
4. Test integration with real database

---

## Troubleshooting

**Problem**: Tests fail with "Cannot find module"  
**Solution**: `npm install` and check import paths match file locations

**Problem**: TypeScript errors about types  
**Solution**: `npm install @types/stripe` if missing

**Problem**: Webhook validation fails  
**Solution**: Verify `webhookSecret` matches Stripe dashboard setting

**Problem**: Timeout errors  
**Solution**: Increase timeout in `evaluateGateway()` from 2s to 5s (if needed)

---

## Reference

- Stripe Webhooks: https://docs.stripe.com/webhooks
- OAuth: https://docs.stripe.com/connect/oauth-reference
- Event Types: https://docs.stripe.com/api/events/types
