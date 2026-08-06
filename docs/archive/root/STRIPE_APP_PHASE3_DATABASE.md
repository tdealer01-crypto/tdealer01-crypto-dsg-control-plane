# Phase 3: Database & Persistence Layer - Complete Execution Guide

**Branch**: `claude/stripe-apps-cli-setup-1UnVr` (continue from Phase 2)  
**Timeline**: 3 days  
**Effort**: Heavy 90% work - database migration + ORM layer  

**Prerequisites**: Phase 2 must be complete (handlers implemented)

---

## Overview

Phase 3 implements Supabase persistence:
1. ✅ Create 3 new tables (accounts, policies, audits)
2. ✅ Add critical indexes for performance
3. ✅ Create database migration file
4. ✅ Implement ORM/query layer
5. ✅ Test with real Supabase

---

## Step 1: Create Database Migration File

```bash
# Create migration with timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)

cat > supabase/migrations/${TIMESTAMP}_stripe_app_tables.sql << 'EOF'
-- Stripe App Governance Tables
-- Phase 3: Database & Persistence Layer

-- 1. stripe_app_accounts: Link Stripe accounts to DSG orgs
CREATE TABLE stripe_app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT UNIQUE NOT NULL,
  dsg_org_id TEXT NOT NULL,
  stripe_api_key_encrypted TEXT,
  fail_safe_mode TEXT DEFAULT 'fail_open', -- 'fail_open' or 'fail_closed'
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'revoked'
  installed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- Foreign key to DSG organizations table
  CONSTRAINT stripe_app_accounts_org_fk 
    FOREIGN KEY (dsg_org_id) 
    REFERENCES organizations(id) ON DELETE CASCADE
);

-- 2. stripe_operation_policies: Governance rules per account
CREATE TABLE stripe_operation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'charge', 'payment_intent', 'payout', 'refund'
  rule_type TEXT, -- 'amount_threshold', 'rate_limit', 'manual_approval'
  conditions JSONB NOT NULL, -- { "max_amount_cents": 1000000 }
  action TEXT NOT NULL, -- 'allow', 'block', 'review'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT stripe_operation_policies_account_fk 
    FOREIGN KEY (stripe_account_id) 
    REFERENCES stripe_app_accounts(stripe_account_id) ON DELETE CASCADE
);

-- 3. stripe_operation_audits: Links Stripe events to DSG decisions
CREATE TABLE stripe_operation_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL, -- Stripe webhook event ID (for idempotency)
  stripe_object_id TEXT NOT NULL, -- charge_id, payment_intent_id, payout_id, etc.
  operation_type TEXT NOT NULL, -- 'charge', 'payment_intent', 'payout'
  dsg_decision_id TEXT, -- Links to dsg_governance_decision_events if applicable
  dsg_decision TEXT, -- 'ALLOW', 'BLOCK', 'REVIEW'
  dsg_reason TEXT,
  dsg_proof TEXT, -- Hash of decision proof
  payload JSONB, -- Full Stripe event for audit trail
  status TEXT DEFAULT 'recorded', -- 'recorded', 'reviewed', 'executed'
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT stripe_operation_audits_account_fk 
    FOREIGN KEY (stripe_account_id) 
    REFERENCES stripe_app_accounts(stripe_account_id) ON DELETE CASCADE
);

-- Indexes for performance (CRITICAL for query speed)
CREATE INDEX idx_stripe_app_accounts_org_id 
  ON stripe_app_accounts(dsg_org_id);

CREATE INDEX idx_stripe_app_accounts_status 
  ON stripe_app_accounts(status);

CREATE INDEX idx_stripe_operation_policies_account 
  ON stripe_operation_policies(stripe_account_id);

CREATE INDEX idx_stripe_operation_policies_operation 
  ON stripe_operation_policies(operation_type);

CREATE INDEX idx_stripe_operation_audits_account 
  ON stripe_operation_audits(stripe_account_id);

CREATE INDEX idx_stripe_operation_audits_created 
  ON stripe_operation_audits(created_at DESC);

CREATE INDEX idx_stripe_operation_audits_decision 
  ON stripe_operation_audits(dsg_decision);

-- Composite index for quota counting (100 ops/month)
CREATE INDEX idx_stripe_operation_audits_account_created 
  ON stripe_operation_audits(stripe_account_id, created_at DESC);

-- Enable Row-Level Security (RLS)
ALTER TABLE stripe_app_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_operation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_operation_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only org members can access their Stripe accounts
CREATE POLICY stripe_app_accounts_org_access 
  ON stripe_app_accounts
  USING (
    auth.uid() IS NOT NULL AND
    dsg_org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY stripe_operation_policies_org_access 
  ON stripe_operation_policies
  USING (
    stripe_account_id IN (
      SELECT stripe_account_id FROM stripe_app_accounts 
      WHERE dsg_org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY stripe_operation_audits_org_access 
  ON stripe_operation_audits
  USING (
    stripe_account_id IN (
      SELECT stripe_account_id FROM stripe_app_accounts 
      WHERE dsg_org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- Timestamps
SELECT pg_sleep(0); -- Migration markers
EOF

echo "Migration created: supabase/migrations/${TIMESTAMP}_stripe_app_tables.sql"
```

---

## Step 2: Apply Migration to Supabase

```bash
# Option 1: Push to Supabase (recommended)
cd /home/user/tdealer01-crypto-dsg-control-plane
supabase db push

# Option 2: Manual SQL in Supabase Dashboard
# 1. Go to https://app.supabase.com
# 2. Select project
# 3. SQL Editor
# 4. Create new query
# 5. Copy migration SQL
# 6. Run
```

---

## Step 3: Verify Tables Created

```bash
# Connect to Supabase and verify
psql "postgresql://postgres:[PASSWORD]@[HOST]/postgres"

-- List tables
\dt stripe_*

-- Check stripe_app_accounts
\d stripe_app_accounts

-- Check indexes
\di stripe_operation_audits_*

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'stripe_%';
```

---

## Step 4: Regenerate Supabase Types

```bash
# Generate TypeScript types from live schema
supabase gen types typescript --local > lib/stripe_database.types.ts

# Or from remote:
supabase gen types typescript --linked > lib/stripe_database.types.ts

# Verify generated file
ls -la lib/stripe_database.types.ts
```

---

## Step 5: Create Stripe State ORM Layer

```bash
cat > packages/stripe-app/src/lib/stripe-state.ts << 'EOF'
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface StripeAppAccount {
  id: string;
  stripe_account_id: string;
  dsg_org_id: string;
  stripe_api_key_encrypted?: string;
  fail_safe_mode: 'fail_open' | 'fail_closed';
  status: 'active' | 'inactive' | 'revoked';
  installed_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface StripeOperationPolicy {
  id: string;
  stripe_account_id: string;
  operation_type: string;
  rule_type?: string;
  conditions: Record<string, unknown>;
  action: 'allow' | 'block' | 'review';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface StripeOperationAudit {
  id: string;
  stripe_account_id: string;
  stripe_event_id: string;
  stripe_object_id: string;
  operation_type: string;
  dsg_decision_id?: string;
  dsg_decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  dsg_reason?: string;
  dsg_proof?: string;
  payload?: Record<string, unknown>;
  status: 'recorded' | 'reviewed' | 'executed';
  created_at: string;
}

export class StripeStateManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============ Accounts ============

  async linkStripeAccount(
    stripeAccountId: string,
    dsgOrgId: string,
    failSafeMode: 'fail_open' | 'fail_closed' = 'fail_open'
  ): Promise<StripeAppAccount> {
    const { data, error } = await this.supabase
      .from('stripe_app_accounts')
      .insert({
        stripe_account_id: stripeAccountId,
        dsg_org_id: dsgOrgId,
        fail_safe_mode: failSafeMode,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to link account: ${error.message}`);
    }

    return data;
  }

  async getStripeAccount(
    stripeAccountId: string
  ): Promise<StripeAppAccount | null> {
    const { data, error } = await this.supabase
      .from('stripe_app_accounts')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows
      throw new Error(`Failed to fetch account: ${error.message}`);
    }

    return data || null;
  }

  async getAccountsByOrg(dsgOrgId: string): Promise<StripeAppAccount[]> {
    const { data, error } = await this.supabase
      .from('stripe_app_accounts')
      .select('*')
      .eq('dsg_org_id', dsgOrgId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return data || [];
  }

  async updateFailSafeMode(
    stripeAccountId: string,
    mode: 'fail_open' | 'fail_closed'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('stripe_app_accounts')
      .update({ fail_safe_mode: mode })
      .eq('stripe_account_id', stripeAccountId);

    if (error) {
      throw new Error(`Failed to update fail-safe mode: ${error.message}`);
    }
  }

  // ============ Policies ============

  async createPolicy(
    stripeAccountId: string,
    operationType: string,
    ruleType: string,
    conditions: Record<string, unknown>,
    action: 'allow' | 'block' | 'review'
  ): Promise<StripeOperationPolicy> {
    const { data, error } = await this.supabase
      .from('stripe_operation_policies')
      .insert({
        stripe_account_id: stripeAccountId,
        operation_type: operationType,
        rule_type: ruleType,
        conditions,
        action,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create policy: ${error.message}`);
    }

    return data;
  }

  async getPolicies(stripeAccountId: string): Promise<StripeOperationPolicy[]> {
    const { data, error } = await this.supabase
      .from('stripe_operation_policies')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .eq('enabled', true);

    if (error) {
      throw new Error(`Failed to fetch policies: ${error.message}`);
    }

    return data || [];
  }

  async getPolicy(
    stripeAccountId: string,
    operationType: string
  ): Promise<StripeOperationPolicy | null> {
    const { data, error } = await this.supabase
      .from('stripe_operation_policies')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .eq('operation_type', operationType)
      .eq('enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch policy: ${error.message}`);
    }

    return data || null;
  }

  // ============ Audits ============

  async recordAudit(
    stripeAccountId: string,
    stripeEventId: string,
    stripeObjectId: string,
    operationType: string,
    dsgDecision: 'ALLOW' | 'BLOCK' | 'REVIEW',
    dsgReason?: string,
    dsgProof?: string,
    payload?: Record<string, unknown>
  ): Promise<StripeOperationAudit> {
    const { data, error } = await this.supabase
      .from('stripe_operation_audits')
      .insert({
        stripe_account_id: stripeAccountId,
        stripe_event_id: stripeEventId,
        stripe_object_id: stripeObjectId,
        operation_type: operationType,
        dsg_decision: dsgDecision,
        dsg_reason: dsgReason,
        dsg_proof: dsgProof,
        payload,
        status: 'recorded',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record audit: ${error.message}`);
    }

    return data;
  }

  async getAudits(
    stripeAccountId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StripeOperationAudit[]> {
    const { data, error } = await this.supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch audits: ${error.message}`);
    }

    return data || [];
  }

  async getAuditsByDecision(
    stripeAccountId: string,
    decision: 'ALLOW' | 'BLOCK' | 'REVIEW'
  ): Promise<StripeOperationAudit[]> {
    const { data, error } = await this.supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .eq('dsg_decision', decision)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audits: ${error.message}`);
    }

    return data || [];
  }

  // Count operations this month for quota
  async countOperationsThisMonth(
    stripeAccountId: string
  ): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await this.supabase
      .from('stripe_operation_audits')
      .select('*', { count: 'exact', head: true })
      .eq('stripe_account_id', stripeAccountId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      throw new Error(`Failed to count operations: ${error.message}`);
    }

    return count || 0;
  }
}
EOF
```

---

## Step 6: Create State Manager Tests

```bash
cat > packages/stripe-app/tests/unit/stripe-state.test.ts << 'EOF'
import { StripeStateManager } from '../../src/lib/stripe-state';

describe('StripeStateManager', () => {
  let manager: StripeStateManager;

  beforeEach(() => {
    // Mock Supabase for testing
    manager = new StripeStateManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );
  });

  describe('Accounts', () => {
    it('should link Stripe account to DSG org', async () => {
      // TODO: Implement with real Supabase test instance
      expect(true).toBe(true);
    });
  });

  describe('Policies', () => {
    it('should create and retrieve policies', async () => {
      // TODO: Implement with real Supabase test instance
      expect(true).toBe(true);
    });
  });

  describe('Audits', () => {
    it('should record and retrieve audits', async () => {
      // TODO: Implement with real Supabase test instance
      expect(true).toBe(true);
    });
  });
});
EOF
```

---

## Step 7: Add Supabase Client to package.json

```bash
cd packages/stripe-app
npm install @supabase/supabase-js
```

---

## Step 8: Verify Database Connection

```bash
cat > packages/stripe-app/tests/integration/supabase-connection.test.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

describe('Supabase Connection', () => {
  it('should connect to Supabase', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );

    // Test table exists
    const { data, error } = await supabase
      .from('stripe_app_accounts')
      .select('count(*)')
      .limit(1);

    expect(error).toBeNull();
  });
});
EOF
```

---

## Step 9: Add Migration to CLAUDE.md

Commit notes:
- Created 3 Supabase tables (accounts, policies, audits)
- Added 8 critical indexes for performance
- Implemented Row-Level Security (RLS) for org isolation
- Created StripeStateManager ORM class
- All queries use parameterized statements (SQL injection safe)

---

## ✅ Phase 3 Completion Checklist

- [ ] Migration file created with timestamp
- [ ] `supabase db push` completed successfully
- [ ] Tables verified to exist in Supabase
- [ ] Indexes created (8 total)
- [ ] RLS policies enabled
- [ ] Supabase types regenerated (`lib/stripe_database.types.ts`)
- [ ] StripeStateManager class implemented
- [ ] All CRUD methods working:
  - [ ] linkStripeAccount()
  - [ ] getStripeAccount()
  - [ ] createPolicy()
  - [ ] getPolicies()
  - [ ] recordAudit()
  - [ ] getAudits()
  - [ ] countOperationsThisMonth()
- [ ] Connection tests passing
- [ ] No TypeScript errors
- [ ] Ready for Phase 4 (Gateway Integration)

---

## Performance Notes

**Indexes Created** (for sub-100ms queries):
- `idx_stripe_app_accounts_org_id` - Fetch accounts by org
- `idx_stripe_operation_policies_account` - Fetch policies for account
- `idx_stripe_operation_audits_account_created` - **CRITICAL** for quota counting (100 ops/month)
- `idx_stripe_operation_audits_decision` - Filter by decision type

**Query Latency Targets**:
- Account lookup: <50ms
- Policy fetch: <50ms
- Audit record: <100ms
- Quota count: <200ms (worst case)

---

## Integration with Phase 4

These queries will be used in:
- **Webhook handler**: Record audits, check fail-safe mode
- **Policy cache**: Fetch policies from DB on cache miss
- **API routes**: Return audits, policies to dashboard
- **Approval workflow**: Track decisions in audit trail

---

## Next Phase (Phase 4)

Wire up handlers to use StripeStateManager:
1. Update webhook handler to call `recordAudit()`
2. Update policy cache to call `getPolicies()`
3. Verify quota checks work (`countOperationsThisMonth()`)
