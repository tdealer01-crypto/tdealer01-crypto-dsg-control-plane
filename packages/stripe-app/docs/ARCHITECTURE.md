# DSG Stripe App - Technical Architecture

**Version**: 1.0.0  
**Last Updated**: 2025-06-06

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Flow](#high-level-flow)
3. [Components](#components)
4. [Data Model](#data-model)
5. [Integration Points](#integration-points)
6. [Security Architecture](#security-architecture)
7. [Scalability](#scalability)
8. [Deployment](#deployment)
9. [Monitoring](#monitoring)

---

## System Overview

**DSG Governance Gate** is a Stripe App that intercepts Stripe operations and evaluates them against governance policies before execution.

### Core Responsibility

- **Receive**: Stripe operations (charges, payments, refunds, payouts)
- **Evaluate**: Apply governance policies in deterministic manner
- **Decide**: ALLOW / REVIEW / BLOCK
- **Record**: Immutable audit trail with cryptographic proofs
- **Enforce**: Apply decision in Stripe Dashboard UI

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Stripe Dashboard                              │
│  (User sees governance decisions in operation detail views)      │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ 1. Install App (OAuth)
         │
┌────────▼──────────────────────────────────────────────────────┐
│              Stripe App Marketplace                              │
│  (Distribution & discovery)                                      │
└────────┬──────────────────────────────────────────────────────┘
         │
         │ 2. Backend API Calls
         │ 3. Webhook Events
         │
┌────────▼────────────────────────────────────────────────────────┐
│         DSG Stripe App (Vercel)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Routes                                                │   │
│  │ - OAuth (authorize, token, callback)                      │   │
│  │ - Gateway Evaluation                                       │   │
│  │ - Policy CRUD                                              │   │
│  │ - Audit Trail                                              │   │
│  │ - Webhooks                                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Business Logic                                            │   │
│  │ - Policy Evaluation Engine                                │   │
│  │ - Webhook Signature Validation                            │   │
│  │ - Stripe API Adapter                                      │   │
│  │ - Proof Hash Generation                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Cache Layer (Upstash Redis)                              │   │
│  │ - Policy cache (5 min TTL)                                │   │
│  │ - Decision cache (optional)                               │   │
│  │ - Session cache                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬─────────────────────────────────────────────────────────┘
         │
         │ 4. Database Queries
         │
┌────────▼────────────────────────────────────────────────────────┐
│         Supabase (PostgreSQL + RLS)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tables                                                    │   │
│  │ - stripe_accounts (connected accounts)                    │   │
│  │ - governance_policies (rules)                             │   │
│  │ - operation_audit (decisions & proofs)                    │   │
│  │ - pending_reviews (operations awaiting approval)          │   │
│  │ - decision_proofs (hash chain)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Security                                                  │   │
│  │ - Row-Level Security (RLS) by account_id                 │   │
│  │ - Service role for admin operations                       │   │
│  │ - Audit triggers on all mutations                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
         │
         │ 5. Dashboard Integration
         │
┌────────▼────────────────────────────────────────────────────────┐
│         DSG Control Plane (Main App)                             │
│  - Dashboard for policy management                               │
│  - Audit trail viewer                                            │
│  - Review queue for pending operations                           │
│  - Analytics and reporting                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## High-Level Flow

### Flow 1: Installation & OAuth

```
1. User clicks "Install" in Stripe Marketplace
   ↓
2. Stripe OAuth popup appears
   ↓
3. User approves permissions (charge_read, charge_write, etc.)
   ↓
4. Stripe returns OAuth code
   ↓
5. Backend exchanges code for access token
   ↓
6. Store Stripe account details in Supabase
   ↓
7. Redirect to DSG Control Plane onboarding
   ↓
8. User completes policy setup
   ↓
9. App is ready to gate operations
```

### Flow 2: Operation Evaluation

```
1. User attempts operation in Stripe Dashboard (e.g., create charge)
   ↓
2. Stripe Dashboard calls DSG Gateway API
   POST /api/stripe-app/gateway/evaluate
   ↓
3. API validates request signature
   ↓
4. Load policies from cache (or DB if cache miss)
   ↓
5. Evaluate operation against each policy (in priority order)
   ↓
6. First matching policy determines decision
   ↓
7. Generate deterministic proof hash:
     hash = SHA256(policy_id || policy_version || context || timestamp)
   ↓
8. Store decision in audit trail (Supabase)
   ↓
9. Return decision + proof to Stripe Dashboard
   ↓
10. Dashboard UI shows result to user:
    - ALLOW: Operation proceeds
    - REVIEW: Route to approval queue
    - BLOCK: Show error to user
```

### Flow 3: Webhook Event Processing

```
1. Stripe webhook event occurs (e.g., charge.succeeded)
   ↓
2. Stripe sends POST to /api/stripe-app/webhook/events
   ↓
3. Validate webhook signature using STRIPE_WEBHOOK_SECRET
   ↓
4. Extract event type and data
   ↓
5. Route to appropriate handler (chargeHandler, payoutHandler, etc.)
   ↓
6. Handler evaluates against policies (same as Flow 2)
   ↓
7. Record event and decision in audit trail
   ↓
8. If decision is REVIEW, create pending review entry
   ↓
9. Return 200 OK to Stripe
```

### Flow 4: Manual Review & Resolution

```
1. User sees pending review in DSG Control Plane dashboard
   ↓
2. User reviews operation details and audit trail
   ↓
3. User clicks "Approve" or "Reject"
   ↓
4. Send POST /api/stripe-app/audit/operations/{id}/resolve
   ↓
5. Update audit trail with resolution
   ↓
6. Return decision to Stripe (if needed)
   ↓
7. Update operation status in Stripe Dashboard
   ↓
8. Notify user of result
```

---

## Components

### 1. API Routes Layer

**Location**: `packages/stripe-app/src/routes/**`

#### OAuth Routes
- `GET  /api/stripe-app/oauth/authorize` - Initiate OAuth flow
- `POST /api/stripe-app/oauth/token` - Exchange code for token
- `GET  /api/stripe-app/oauth/callback` - Handle OAuth redirect

#### Gateway Routes
- `POST /api/stripe-app/gateway/evaluate` - Main evaluation endpoint
- `GET  /api/stripe-app/account` - Get connected account info
- `POST /api/stripe-app/test` - Health check endpoint

#### Webhook Routes
- `POST /api/stripe-app/webhook/events` - Stripe webhooks

#### Policy Routes
- `GET  /api/stripe-app/policies` - List policies
- `POST /api/stripe-app/policies` - Create policy
- `GET  /api/stripe-app/policies/{id}` - Get policy details
- `PUT  /api/stripe-app/policies/{id}` - Update policy
- `DELETE /api/stripe-app/policies/{id}` - Delete policy

#### Audit Routes
- `GET  /api/stripe-app/audit/operations` - List operations
- `GET  /api/stripe-app/audit/operations/{id}` - Get operation details
- `POST /api/stripe-app/audit/operations/{id}/resolve` - Resolve review

### 2. Business Logic Layer

**Location**: `packages/stripe-app/src/lib/**`

#### Policy Engine
- `PolicyEvaluator`: Evaluates context against policy rules
- `PolicyCache`: Redis-backed policy cache
- `PolicyRepository`: Database access for policies

#### Stripe Integration
- `StripeClient`: Wrapper around Stripe API
- `StripeWebhookValidator`: Validates webhook signatures
- `StripeAdapter`: Adapts Stripe events to internal format

#### Proof & Evidence
- `ProofGenerator`: Generates deterministic proof hashes
- `AuditTrail`: Records decisions and evidence
- `EvidenceChain`: Links decisions together

#### Authentication
- `OAuthManager`: Handles OAuth token exchange
- `TokenValidator`: Validates and decodes tokens
- `AccountResolver`: Gets account from token

### 3. Data Access Layer

**Location**: `packages/stripe-app/src/db/**`

Database models:
- `StripeAccount` - Connected Stripe accounts
- `GovernancePolicy` - Policy definitions
- `OperationAudit` - Audit trail entries
- `PendingReview` - Operations awaiting approval
- `DecisionProof` - Proof hashes

All models use Supabase client with TypeScript types from `lib/database.types.ts`.

### 4. Cache Layer

**Location**: `packages/stripe-app/src/cache/**`

**Provider**: Upstash Redis (REST API)

**What's Cached**:
- Policies (5 minute TTL)
- Account info (5 minute TTL)
- Session tokens (1 hour TTL)
- Policy version metadata (1 hour TTL)

**Cache Strategy**:
1. Check Redis for key
2. If miss, query Supabase
3. Store result in Redis with TTL
4. Return to caller

**Invalidation**:
- On policy update: invalidate policy cache
- On account update: invalidate account cache
- TTL-based expiration

### 5. Verification & Testing

**Location**: `packages/stripe-app/tests/**`

Test categories:
- **Unit Tests**: Policy evaluation, proof generation
- **Integration Tests**: OAuth flow, database operations
- **API Tests**: Route handlers, error cases
- **Webhook Tests**: Signature validation, event processing
- **Performance Tests**: Cache hit rates, latency

---

## Data Model

### Core Tables

#### stripe_accounts
```sql
CREATE TABLE stripe_accounts (
  id UUID PRIMARY KEY,
  stripe_account_id TEXT UNIQUE NOT NULL,
  oauth_token TEXT NOT NULL, -- encrypted
  token_expires_at TIMESTAMP,
  refresh_token TEXT, -- encrypted
  scope TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- RLS: User can only access own organization's accounts
  org_id UUID NOT NULL REFERENCES organizations(id)
);
```

#### governance_policies
```sql
CREATE TABLE governance_policies (
  id UUID PRIMARY KEY,
  stripe_account_id TEXT NOT NULL REFERENCES stripe_accounts(stripe_account_id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'amount_threshold', 'rate_limit', 'custom'
  rule JSONB NOT NULL, -- { operator, field, value }
  action TEXT NOT NULL, -- 'allow', 'review', 'block'
  priority INTEGER NOT NULL DEFAULT 10,
  version INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_policies_account_priority ON governance_policies(stripe_account_id, priority);
```

#### operation_audit
```sql
CREATE TABLE operation_audit (
  id UUID PRIMARY KEY,
  stripe_account_id TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'charge.create', 'refund.create', etc
  context JSONB NOT NULL, -- { amount_cents, currency, customer_id, ... }
  decision TEXT NOT NULL, -- 'ALLOW', 'REVIEW', 'BLOCK'
  reason TEXT NOT NULL,
  policy_id UUID REFERENCES governance_policies(id),
  policy_version INTEGER,
  decision_id TEXT UNIQUE NOT NULL,
  proof_hash TEXT NOT NULL, -- SHA256 hash
  proof_timestamp TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT now(),
  
  -- RLS: User can only view own organization's audits
  org_id UUID NOT NULL REFERENCES organizations(id)
);

CREATE INDEX idx_audit_account_date ON operation_audit(stripe_account_id, created_at);
CREATE INDEX idx_audit_decision ON operation_audit(decision);
```

#### pending_reviews
```sql
CREATE TABLE pending_reviews (
  id UUID PRIMARY KEY,
  operation_audit_id UUID NOT NULL REFERENCES operation_audit(id),
  stripe_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  assigned_to UUID REFERENCES users(id),
  review_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  
  org_id UUID NOT NULL REFERENCES organizations(id)
);

CREATE INDEX idx_pending_status ON pending_reviews(status, created_at);
```

#### decision_proofs
```sql
CREATE TABLE decision_proofs (
  id UUID PRIMARY KEY,
  decision_id TEXT UNIQUE NOT NULL,
  operation_audit_id UUID NOT NULL REFERENCES operation_audit(id),
  proof_hash TEXT NOT NULL,
  proof_timestamp TIMESTAMP NOT NULL,
  policy_id UUID REFERENCES governance_policies(id),
  policy_version INTEGER,
  parent_proof_hash TEXT, -- Link to previous proof in chain
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_proofs_hash ON decision_proofs(proof_hash);
CREATE INDEX idx_proofs_parent ON decision_proofs(parent_proof_hash);
```

### Proof Generation

**Deterministic hash computation**:

```
proof_hash = SHA256(
  policy_id || 
  ":" || 
  policy_version || 
  ":" || 
  JSON.stringify(context) || 
  ":" || 
  proof_timestamp
)
```

**Properties**:
- Same inputs → same hash (deterministic)
- Different policy → different hash
- Policy updated → hash changes (version incremented)
- Immutable audit trail

---

## Integration Points

### 1. Stripe Integration

**What's Connected**:
- OAuth 2.0 for account linking
- Webhook events for operation monitoring
- Stripe API for operation details (optional)

**Authentication**:
- OAuth tokens stored in Supabase (encrypted)
- Webhook signatures validated with `STRIPE_WEBHOOK_SECRET`

**Limitations**:
- Read-only access to operations (via webhooks)
- Cannot modify Stripe data directly
- Cannot create/delete charges from app

### 2. DSG Control Plane Integration

**What's Connected**:
- User authentication (OAuth/JWT)
- Dashboard for policy management
- Audit trail viewer
- Review queue interface

**API Communication**:
- Stripe app → Control Plane: POST with API key
- Control Plane → Stripe app: Webhook callbacks

**Data Sharing**:
- Policies defined in DSG Control Plane
- Sync to Stripe app via API
- Audit trail visible in both places

### 3. Supabase Integration

**Features Used**:
- PostgreSQL database
- Row-Level Security (RLS)
- Real-time subscriptions (optional)
- Auth helpers

**Security Model**:
- RLS policies by `org_id`
- Service role for admin operations
- User tokens for authenticated access

---

## Security Architecture

### Authentication & Authorization

#### OAuth Flow
```
1. User clicks "Install" in Stripe
2. Stripe redirects to /oauth/authorize
3. Show Stripe OAuth consent screen
4. User approves, receives code
5. Exchange code for token using client_secret
6. Store token encrypted in Supabase
7. Issue JWT to user for dashboard access
```

#### Token Management
- **Stripe OAuth tokens**: Encrypted at rest in Supabase
- **JWT tokens**: Issued for DSG dashboard, 1 hour expiry
- **API keys**: Bearer token format, used in Authorization header

#### RLS Policies
```sql
-- Users can only access their organization's data
ALTER POLICY "stripe_accounts_select" ON stripe_accounts 
  USING (org_id = current_user_org_id());

-- Service role has full access for admin operations
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
```

### Data Security

#### Encryption at Rest
- Stripe OAuth tokens: `pgcrypto` extension AES256
- Database encryption: Supabase handles at disk level
- Backup encryption: Supabase automated

#### Encryption in Transit
- All HTTPS with TLS 1.3
- Certificate pinning in mobile apps (optional)

#### Secrets Management
- Environment variables never in code
- Vercel Secrets for deployment
- Never log secrets or tokens

### Request Validation

#### Webhook Signature Validation
```javascript
const signature = request.headers.get('stripe-signature');
const rawBody = await request.text();
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
// Only process if signature valid
```

#### CORS & CSP
```json
{
  "connect-src": [
    "https://tdealer01-crypto-dsg-control-plane.vercel.app/",
    "https://dsg-stripe-app.vercel.app/"
  ]
}
```

#### Body Size Limits
- Standard requests: 10 MB
- Webhook events: 20 MB
- Policy uploads: 1 MB

### Audit & Compliance

#### Immutable Audit Trail
- All operations logged with timestamp
- Cryptographic proofs for decisions
- Proof chain linking decisions together
- Logs cannot be deleted (soft delete only)

#### Compliance Evidence
- Hash chain for proof of execution
- Policy version tracking
- Decision reason recorded
- User attribution (who made decision)

---

## Scalability

### Performance Targets

| Operation | P50 | P99 |
|-----------|-----|-----|
| Policy evaluation | 10 ms | 50 ms |
| Audit write | 20 ms | 100 ms |
| Policy list | 50 ms | 200 ms |
| Webhook process | 100 ms | 500 ms |

### Caching Strategy

**Policies**:
- Cache in Redis, 5 min TTL
- Invalidate on policy update
- ~100 bytes per policy
- Typical account: 5-20 policies (~2 KB)

**Accounts**:
- Cache in Redis, 5 min TTL
- 1 KB per account
- Clear on update

**Session**:
- Cache JWT in Redis, 1 hour TTL
- Validate signature on use
- Allow early logout invalidation

### Database Optimization

**Indexes**:
- `stripe_accounts(stripe_account_id)` - Account lookup
- `governance_policies(stripe_account_id, priority)` - Policy evaluation
- `operation_audit(stripe_account_id, created_at)` - Audit queries
- `decision_proofs(proof_hash)` - Proof verification

**Query Patterns**:
- Paginated audit trail (100 ops per page)
- Policy list with filtering
- Recent decisions (last 24 hours)

### Vercel Deployment

**Function Configuration**:
- Max duration: 60 seconds
- Memory: 1024 MB per function
- Concurrency: Auto-scaling

**Regions**:
- Primary: `iad1` (US East)
- Optional: Multi-region with routing rules

---

## Deployment

### Prerequisites

1. **Vercel Account**
   - Organization setup
   - Connected GitHub/GitLab
   - Domain configured

2. **Stripe Account**
   - Live or test mode
   - API keys generated
   - App registered

3. **Supabase Project**
   - Database created
   - Migrations applied
   - Service role key available

4. **Upstash Redis**
   - Database created
   - REST endpoint configured

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/dsg-pics/tdealer01-crypto-dsg-control-plane.git
cd packages/stripe-app

# 2. Install dependencies
npm ci

# 3. Build application
npm run build

# 4. Deploy to Vercel
vercel --prod

# 5. Add environment variables
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
# ... (repeat for all vars from .env.production.example)

# 6. Verify deployment
curl https://dsg-stripe-app.vercel.app/api/health
# Expected: { "status": "healthy", "version": "1.0.0" }

# 7. Deploy Stripe app manifest
stripe apps deploy
```

### Rollback

```bash
# Revert to previous Vercel deployment
vercel rollback

# Or redeploy specific commit
git checkout <commit-sha>
npm run build
vercel --prod
```

---

## Monitoring

### Health Checks

**Endpoint**: `GET /api/health`

```json
{
  "status": "healthy",
  "service": "dsg-stripe-app",
  "version": "1.0.0",
  "timestamp": "2025-06-06T12:00:00Z"
}
```

### Error Tracking

**Tool**: Sentry (optional)

```javascript
import * as Sentry from '@sentry/node';

Sentry.captureException(error, {
  tags: {
    'stripe_account_id': accountId,
    'operation_type': operationType,
    'policy_id': policyId
  }
});
```

### Performance Monitoring

**Tool**: Vercel Analytics

- Function execution time
- Memory usage
- Error rates
- Request distribution

### Database Monitoring

**Tool**: Supabase Dashboard

- Query performance
- Table size trends
- Slow query detection
- Backup status

### Metrics to Track

1. **Throughput**: Evaluations per minute
2. **Latency**: P50/P99 evaluation time
3. **Errors**: Error rate and types
4. **Cache**: Hit rate, memory usage
5. **Webhook**: Delivery success rate
6. **Policy**: Coverage, false positive rate

---

## Testing

### Test Coverage Goals

- Unit tests: 80% code coverage
- Integration tests: 60% workflow coverage
- E2E tests: Critical paths (install, evaluate, review)

### Test Environments

1. **Local**: `npm run test`
2. **CI**: GitHub Actions with test database
3. **Staging**: Vercel preview deployment
4. **Production**: Canary deployments (optional)

---

## Runbook

### Common Issues

**Issue**: Policy changes not taking effect
- **Cause**: Redis cache not invalidated
- **Solution**: Clear cache manually or wait 5 min TTL

**Issue**: Webhook signature validation failing
- **Cause**: Webhook secret mismatch
- **Solution**: Verify STRIPE_WEBHOOK_SECRET in environment

**Issue**: Database connection timeout
- **Cause**: Supabase connection pool exhausted
- **Solution**: Scale Vercel function memory or reduce concurrency

---

**Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**Stability**: Production-Ready
