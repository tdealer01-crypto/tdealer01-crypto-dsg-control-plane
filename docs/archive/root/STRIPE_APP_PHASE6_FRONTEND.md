# Phase 6: Frontend & Dashboard - Complete Execution Guide

**Branch**: `claude/stripe-apps-cli-setup-1UnVr` (continue from Phase 5)  
**Timeline**: 2 weeks  
**Effort**: Heavy 90% work - React 17 component building  

**Prerequisites**: Phase 5 API routes complete and working

---

## Overview

Phase 6 implements:
1. ✅ React 17 views for Stripe Dashboard (3 viewports)
2. ✅ DSG Control Plane dashboard pages
3. ✅ OAuth setup flow
4. ✅ Policy builder UI
5. ✅ Approval widget

---

## Step 1: Create Stripe Dashboard View Components

### ChargeGate.tsx (Complete)

```bash
cat > packages/stripe-app/src/views/ChargeGate.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import {
  Box,
  Button,
  Text,
  ContextView,
  Icon,
  Spacer,
} from '@stripe/ui-extension-sdk/ui';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  proof?: string;
}

const ChargeGate: React.FC<ExtensionContextValue> = (props) => {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get charge amount from Stripe context
  const chargeAmount = (props as any)?.charge?.amount || 0;
  const chargeId = (props as any)?.charge?.id || 'unknown';
  const stripeAccountId = (props as any)?.stripe_account_id || '';

  useEffect(() => {
    evaluateCharge();
  }, [chargeId]);

  const evaluateCharge = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_DSG_API_BASE}/api/stripe-app/gateway/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'stripe.charge.create',
            operation_type: 'charge',
            context: {
              stripe_account_id: stripeAccountId,
              stripe_event_id: chargeId,
              object_type: 'charge',
              object_id: chargeId,
              amount_cents: chargeAmount,
              currency: 'usd',
            },
          }),
        }
      );

      const data = await response.json();
      setDecision(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to evaluate charge'
      );
      // Fail-safe: default to REVIEW
      setDecision({
        decision: 'REVIEW',
        reason: 'Evaluation error - manual review required',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (decision?.decision) {
      case 'ALLOW':
        return 'success';
      case 'BLOCK':
        return 'danger';
      case 'REVIEW':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const getStatusIcon = () => {
    switch (decision?.decision) {
      case 'ALLOW':
        return 'check';
      case 'BLOCK':
        return 'close';
      case 'REVIEW':
        return 'alert';
      default:
        return 'info';
    }
  };

  return (
    <ContextView>
      <Box padding="large">
        <Text as="h3">DSG Governance Gate</Text>
        <Spacer size="small" />

        {loading ? (
          <Box>
            <Text>Evaluating governance policy...</Text>
          </Box>
        ) : decision ? (
          <Box>
            <Box display="flex" alignItems="center">
              <Icon name={getStatusIcon()} />
              <Spacer size="small" />
              <Text weight="semibold">
                {decision.decision === 'ALLOW'
                  ? 'Approved'
                  : decision.decision === 'BLOCK'
                    ? 'Blocked'
                    : 'Requires Review'}
              </Text>
            </Box>

            {decision.reason && (
              <Box marginTop="small">
                <Text size="small">{decision.reason}</Text>
              </Box>
            )}

            {decision.decision === 'REVIEW' && (
              <Box marginTop="medium">
                <Button onPress={() => evaluateCharge()}>
                  Re-evaluate
                </Button>
              </Box>
            )}
          </Box>
        ) : null}

        {error && (
          <Box marginTop="small">
            <Text color="danger">{error}</Text>
          </Box>
        )}
      </Box>
    </ContextView>
  );
};

export default ChargeGate;
EOF
```

### PaymentIntentGate.tsx (Complete)

```bash
cat > packages/stripe-app/src/views/PaymentIntentGate.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import {
  Box,
  Text,
  ContextView,
  Icon,
  Spacer,
} from '@stripe/ui-extension-sdk/ui';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
}

const PaymentIntentGate: React.FC<ExtensionContextValue> = (props) => {
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);

  const piAmount = (props as any)?.payment_intent?.amount || 0;
  const piId = (props as any)?.payment_intent?.id || 'unknown';
  const stripeAccountId = (props as any)?.stripe_account_id || '';

  useEffect(() => {
    evaluatePaymentIntent();
  }, [piId]);

  const evaluatePaymentIntent = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_DSG_API_BASE}/api/stripe-app/gateway/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'stripe.payment_intent.create',
            operation_type: 'payment_intent',
            context: {
              stripe_account_id: stripeAccountId,
              stripe_event_id: piId,
              object_type: 'payment_intent',
              object_id: piId,
              amount_cents: piAmount,
              currency: 'usd',
            },
          }),
        }
      );
      const data = await response.json();
      setDecision(data);
    } catch (error) {
      setDecision({
        decision: 'REVIEW',
        reason: 'Evaluation error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContextView>
      <Box padding="large">
        <Text as="h3">DSG Governance - Payment Intent</Text>
        <Spacer size="small" />

        {loading ? (
          <Text>Evaluating...</Text>
        ) : decision ? (
          <Box>
            <Box display="flex" alignItems="center">
              <Icon
                name={
                  decision.decision === 'ALLOW'
                    ? 'check'
                    : decision.decision === 'BLOCK'
                      ? 'close'
                      : 'alert'
                }
              />
              <Spacer size="small" />
              <Text weight="semibold">{decision.decision}</Text>
            </Box>
            {decision.reason && (
              <Text size="small" marginTop="small">
                {decision.reason}
              </Text>
            )}
          </Box>
        ) : null}
      </Box>
    </ContextView>
  );
};

export default PaymentIntentGate;
EOF
```

### PayoutGate.tsx (Complete)

```bash
cat > packages/stripe-app/src/views/PayoutGate.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import {
  Box,
  Button,
  Text,
  ContextView,
  Icon,
  Spacer,
} from '@stripe/ui-extension-sdk/ui';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
}

const PayoutGate: React.FC<ExtensionContextValue> = (props) => {
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const payoutAmount = (props as any)?.payout?.amount || 0;
  const payoutId = (props as any)?.payout?.id || 'unknown';
  const stripeAccountId = (props as any)?.stripe_account_id || '';

  useEffect(() => {
    evaluatePayout();
  }, [payoutId]);

  const evaluatePayout = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_DSG_API_BASE}/api/stripe-app/gateway/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'stripe.payout.create',
            operation_type: 'payout',
            context: {
              stripe_account_id: stripeAccountId,
              stripe_event_id: payoutId,
              object_type: 'payout',
              object_id: payoutId,
              amount_cents: payoutAmount,
              currency: 'usd',
            },
          }),
        }
      );
      const data = await response.json();
      setDecision(data);
    } catch (error) {
      setDecision({ decision: 'REVIEW', reason: 'Evaluation error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await fetch(
        `${process.env.REACT_APP_DSG_API_BASE}/api/stripe-app/approval/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stripe_account_id: stripeAccountId,
            payout_id: payoutId,
          }),
        }
      );
      // Reload payout status
      evaluatePayout();
    } finally {
      setApproving(false);
    }
  };

  return (
    <ContextView>
      <Box padding="large">
        <Text as="h3">DSG Governance - Payout</Text>
        <Spacer size="small" />
        <Text size="small" color="muted">
          CRITICAL: All payouts require governance check
        </Text>
        <Spacer size="medium" />

        {loading ? (
          <Text>Evaluating payout...</Text>
        ) : decision ? (
          <Box>
            <Box display="flex" alignItems="center">
              <Icon
                name={
                  decision.decision === 'ALLOW'
                    ? 'check'
                    : decision.decision === 'BLOCK'
                      ? 'close'
                      : 'alert'
                }
              />
              <Spacer size="small" />
              <Text weight="semibold">{decision.decision}</Text>
            </Box>

            {decision.decision === 'REVIEW' && (
              <Box marginTop="medium">
                <Button
                  onPress={handleApprove}
                  disabled={approving}
                  variant="primary"
                >
                  {approving ? 'Approving...' : 'Approve Payout'}
                </Button>
              </Box>
            )}

            {decision.decision === 'BLOCK' && (
              <Box marginTop="medium">
                <Text color="danger" weight="semibold">
                  Payout blocked: {decision.reason}
                </Text>
              </Box>
            )}
          </Box>
        ) : null}
      </Box>
    </ContextView>
  );
};

export default PayoutGate;
EOF
```

---

## Step 2: Create DSG Control Plane Dashboard Pages

### Stripe App Hub Page

```bash
mkdir -p app/dashboard/stripe-app

cat > app/dashboard/stripe-app/page.tsx << 'EOF'
import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import Link from 'next/link';
import Button from '@/components/ui/button';

export default async function StripeAppPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">DSG Stripe App</h1>
        <p className="text-gray-600 mt-2">
          Governance for Stripe operations - pre-execution gating + audit trails
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connect Card */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-2">Connect Stripe Account</h3>
          <p className="text-gray-600 text-sm mb-4">
            Link your Stripe account to enable governance controls
          </p>
          <Link href="/dashboard/stripe-app/connect">
            <Button>Connect Account</Button>
          </Link>
        </div>

        {/* Policies Card */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-2">Governance Policies</h3>
          <p className="text-gray-600 text-sm mb-4">
            Create and manage rules for charges, payouts, refunds
          </p>
          <Link href="/dashboard/stripe-app/policies">
            <Button>Manage Policies</Button>
          </Link>
        </div>

        {/* Audit Card */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-2">Audit Trail</h3>
          <p className="text-gray-600 text-sm mb-4">
            View all gated operations and compliance decisions
          </p>
          <Link href="/dashboard/stripe-app/audit">
            <Button>View Audit Log</Button>
          </Link>
        </div>

        {/* Approvals Card */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-2">Pending Approvals</h3>
          <p className="text-gray-600 text-sm mb-4">
            Review and approve operations that require manual review
          </p>
          <Link href="/dashboard/stripe-app/approvals">
            <Button>View Pending</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
EOF
```

### Connect Page

```bash
cat > app/dashboard/stripe-app/connect/page.tsx << 'EOF'
'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button';

export default function StripeConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  useEffect(() => {
    if (code && state) {
      // OAuth callback - exchange code for token
      handleOAuthCallback(code, state);
    }
  }, [code, state]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const response = await fetch('/api/stripe-app/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      if (response.ok) {
        router.push('/dashboard/stripe-app?success=true');
      } else {
        throw new Error('OAuth callback failed');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Failed to connect Stripe account');
    }
  };

  const handleConnectClick = async () => {
    // Initiate OAuth flow
    const response = await fetch('/api/stripe-app/oauth/authorize', {
      method: 'GET',
    });
    const { url } = await response.json();
    window.location.href = url;
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Connect Stripe Account</h1>
      <p className="text-gray-600">
        Click below to authorize DSG to manage your Stripe governance
      </p>

      <div className="border rounded-lg p-6">
        <Button onClick={handleConnectClick} fullWidth>
          Connect with Stripe
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        <p>This will redirect you to Stripe to authorize:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Read charge details</li>
          <li>Read/write payment intents</li>
          <li>Read payouts</li>
          <li>Read refunds</li>
        </ul>
      </div>
    </div>
  );
}
EOF
```

### Policies Page

```bash
cat > app/dashboard/stripe-app/policies/page.tsx << 'EOF'
'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';

interface Policy {
  id: string;
  operation_type: string;
  rule_type?: string;
  conditions: Record<string, unknown>;
  action: 'allow' | 'block' | 'review';
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationType, setOperationType] = useState('charge');
  const [action, setAction] = useState<'allow' | 'block' | 'review'>('review');
  const [maxAmount, setMaxAmount] = useState('50000');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/stripe-app/policies');
      const data = await response.json();
      setPolicies(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const response = await fetch('/api/stripe-app/policies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: operationType,
          rule_type: 'amount_threshold',
          conditions: { max_amount_cents: parseInt(maxAmount) },
          action,
        }),
      });

      if (response.ok) {
        fetchPolicies();
        alert('Policy created');
      }
    } catch (error) {
      alert('Failed to create policy');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Governance Policies</h1>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create New Policy</h2>

        <div>
          <label className="block text-sm font-medium mb-2">
            Operation Type
          </label>
          <Select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
          >
            <option value="charge">Charge</option>
            <option value="payment_intent">Payment Intent</option>
            <option value="payout">Payout</option>
            <option value="refund">Refund</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Max Amount</label>
          <Input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="50000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Action</label>
          <Select
            value={action}
            onChange={(e) =>
              setAction(e.target.value as 'allow' | 'block' | 'review')
            }
          >
            <option value="allow">Allow</option>
            <option value="review">Review</option>
            <option value="block">Block</option>
          </Select>
        </div>

        <Button onClick={handleCreatePolicy}>Create Policy</Button>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Active Policies</h2>

        {loading ? (
          <p>Loading...</p>
        ) : policies.length === 0 ? (
          <p className="text-gray-600">No policies configured</p>
        ) : (
          <div className="space-y-2">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{policy.operation_type}</p>
                  <p className="text-sm text-gray-600">
                    Action: {policy.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
EOF
```

### Audit Page

```bash
cat > app/dashboard/stripe-app/audit/page.tsx << 'EOF'
'use client';

import React, { useState, useEffect } from 'react';

interface AuditRecord {
  id: string;
  stripe_object_id: string;
  operation_type: string;
  dsg_decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  created_at: string;
  dsg_reason?: string;
}

export default function AuditPage() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const response = await fetch('/api/stripe-app/audit/operations');
      const data = await response.json();
      setAudits(data);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return 'text-green-600';
      case 'BLOCK':
        return 'text-red-600';
      case 'REVIEW':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Trail</h1>

      {loading ? (
        <p>Loading...</p>
      ) : audits.length === 0 ? (
        <p className="text-gray-600">No operations recorded yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Object ID</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Decision</th>
                <th className="text-left p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm">
                    {audit.stripe_object_id}
                  </td>
                  <td className="p-3">{audit.operation_type}</td>
                  <td className={`p-3 font-semibold ${getDecisionColor(audit.dsg_decision)}`}>
                    {audit.dsg_decision}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(audit.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
EOF
```

---

## Step 3: Update Root App Layout

```bash
cat >> app/layout.tsx << 'EOF'
// Add Stripe App styles and meta tags
export const metadata = {
  title: 'DSG Control Plane',
  description: 'AI Governance & Compliance Platform',
  viewport: 'width=device-width, initial-scale=1',
};
EOF
```

---

## Step 4: Create Stripe App Navigation Component

```bash
cat > components/stripe-app/StripeAppNav.tsx << 'EOF'
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard/stripe-app', label: 'Overview' },
  { href: '/dashboard/stripe-app/connect', label: 'Connect Account' },
  { href: '/dashboard/stripe-app/policies', label: 'Policies' },
  { href: '/dashboard/stripe-app/audit', label: 'Audit Trail' },
  { href: '/dashboard/stripe-app/approvals', label: 'Approvals' },
];

export default function StripeAppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4 border-b mb-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-4 py-2 border-b-2 ${
            pathname === link.href
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
EOF
```

---

## Step 5: Environment Variables

```bash
cat >> .env.local << 'EOF'
# Stripe App Frontend
REACT_APP_DSG_API_BASE=http://localhost:3000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOF
```

---

## Step 6: Run TypeScript Check

```bash
npm run type-check
```

---

## Step 7: Test Dashboard Pages Locally

```bash
npm run dev

# Visit:
# http://localhost:3000/dashboard/stripe-app
# http://localhost:3000/dashboard/stripe-app/connect
# http://localhost:3000/dashboard/stripe-app/policies
# http://localhost:3000/dashboard/stripe-app/audit
```

---

## ✅ Phase 6 Completion Checklist

- [ ] Stripe Dashboard views created (3 React components)
- [ ] ChargeGate view shows decision + reason
- [ ] PaymentIntentGate view functional
- [ ] PayoutGate view with approval button
- [ ] DSG dashboard hub page created
- [ ] Connect page with OAuth button
- [ ] Policies page with create form
- [ ] Audit page with decision table
- [ ] Navigation component created
- [ ] All pages responsive
- [ ] TypeScript check passes
- [ ] Local dev server running
- [ ] Views render in Stripe Dashboard
- [ ] All forms functional
- [ ] Ready for Phase 7 (Testing)

---

## Key Notes

- **React 17 Only**: No hooks from React 18
- **Stripe Components**: Use @stripe/ui-extension-sdk components
- **No Custom CSS**: Style via component props only
- **API Integration**: All pages call `/api/stripe-app/*` endpoints
- **OAuth Flow**: Initiated on Connect page, callback handled

---

## Next Phase

Phase 7: Testing & Verification (1 week)
- Unit tests for components
- Integration tests for API calls
- E2E tests with Stripe test account
