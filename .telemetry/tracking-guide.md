# Tracking Implementation Guide — DSG ONE / ProofGate

**Version:** 1.0  
**Date:** July 12, 2026  
**Status:** Ready for engineering  
**Audience:** Backend engineers, full-stack developers

---

## Quick Start

### 1. Initialize PostHog Client

**File:** `lib/telemetry/posthog-client.ts` (create if missing)

```typescript
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_API_KEY || '',
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
        flushInterval: 5000, // 5s batching
      }
    );
  }
  return posthogClient;
}

export async function flushPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
```

### 2. Create Event Helper

**File:** `lib/telemetry/capture-event.ts`

```typescript
import { getPostHogClient } from './posthog-client';

export interface EventContext {
  userId: string;
  organizationId: string;
  workspaceId?: string;
  agentId?: string;
}

export async function captureEvent(
  event: string,
  context: EventContext,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    const posthog = getPostHogClient();
    
    posthog.capture({
      distinctId: context.userId,
      event,
      groups: {
        organization: context.organizationId,
        workspace: context.workspaceId || context.organizationId, // Fallback to org
        agent: context.agentId || undefined,
      },
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[Telemetry] Failed to capture event "${event}":`, error);
    // Don't throw — telemetry should never block user actions
  }
}
```

---

## Phase 1: Conversion Funnel (Week 1)

Implement these 8 events in order (dependencies matter).

### Event 1: `user_signup`

**Trigger:** User creates account  
**Location:** `/app/api/auth/signup/route.ts` or Supabase auth trigger  
**Dependencies:** Supabase auth setup

```typescript
// app/api/auth/signup/route.ts
import { captureEvent } from '@/lib/telemetry/capture-event';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, signupMethod } = body; // 'email' | 'google' | 'github'

  try {
    // ... existing signup logic ...
    
    const { data } = await supabase.auth.signUp({ email, password });
    const userId = data.user?.id;

    if (userId) {
      // Capture signup event (no org yet, so minimal context)
      await captureEvent('user_signup', {
        userId,
        organizationId: 'pending', // Placeholder until org created
      }, {
        signup_method: signupMethod || 'email',
        ref_code: body.refCode || null,
        email_domain: email.split('@')[1],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('auth/signup', error);
  }
}
```

---

### Event 2: `organization_created`

**Trigger:** User provisions organization  
**Location:** `/app/api/organization/create/route.ts` or Supabase trigger  
**Dependencies:** User must be signed in

```typescript
// app/api/organization/create/route.ts
import { captureEvent } from '@/lib/telemetry/capture-event';
import { requireAuth } from '@/lib/auth/require-auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, orgId } = auth;
  const body = await req.json();
  const { organizationName } = body;

  try {
    // ... existing org creation logic ...
    
    const { data } = await supabase
      .from('organizations')
      .insert([{
        id: orgId,
        name: organizationName,
        created_by: userId,
        plan: 'free',
      }])
      .select()
      .single();

    // Capture org creation
    await captureEvent('organization_created', {
      userId,
      organizationId: orgId,
    }, {
      organization_id: orgId,
      organization_name: organizationName,
      plan_tier: 'free',
      created_by_user_id: userId,
    });

    return NextResponse.json({ success: true, orgId });
  } catch (error) {
    return handleApiError('organization/create', error);
  }
}
```

---

### Event 3: `policy_created`

**Trigger:** Policy document saved  
**Location:** `/app/dashboard/markdoc-policies/new/page.tsx` (component) + `/app/api/policies/create/route.ts`  
**Dependencies:** Organization must exist

```typescript
// app/api/policies/create/route.ts
import { captureEvent } from '@/lib/telemetry/capture-event';
import { requireAuth } from '@/lib/auth/require-auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, orgId } = auth;
  const body = await req.json();
  const { policyName, policyType, workspaceId } = body;

  try {
    // Get existing policy count for org
    const { count: existingPolicies } = await supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active');

    const isFirstPolicy = (existingPolicies || 0) === 0;

    // ... existing policy creation logic ...
    
    const { data } = await supabase
      .from('policies')
      .insert([{
        id: policyId,
        organization_id: orgId,
        workspace_id: workspaceId || null,
        name: policyName,
        policy_type: policyType,
        status: 'draft',
        created_by: userId,
      }])
      .select()
      .single();

    // Capture policy creation
    await captureEvent('policy_created', {
      userId,
      organizationId: orgId,
      workspaceId: workspaceId || undefined,
    }, {
      organization_id: orgId,
      workspace_id: workspaceId || null,
      policy_id: policyId,
      policy_name: policyName,
      policy_type: policyType,
      is_first_policy: isFirstPolicy,
      created_by_user_id: userId,
    });

    return NextResponse.json({ success: true, policyId });
  } catch (error) {
    return handleApiError('policies/create', error);
  }
}
```

---

### Event 4: `agent_created`

**Trigger:** Agent/API consumer provisioned  
**Location:** `/app/dashboard/agents/connect/page.tsx` (component) + `/app/api/agents/create/route.ts`  
**Dependencies:** Organization must exist

```typescript
// app/api/agents/create/route.ts
import { captureEvent } from '@/lib/telemetry/capture-event';
import { requireAuth } from '@/lib/auth/require-auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, orgId } = auth;
  const body = await req.json();
  const { agentName, agentType, workspaceId } = body;

  try {
    // ... existing agent creation logic ...
    
    const { data } = await supabase
      .from('agents')
      .insert([{
        id: agentId,
        organization_id: orgId,
        workspace_id: workspaceId || null,
        name: agentName,
        agent_type: agentType || 'external_api',
        api_key_hash: hashApiKey(newApiKey),
        created_by: userId,
      }])
      .select()
      .single();

    // Capture agent creation
    await captureEvent('agent_created', {
      userId,
      organizationId: orgId,
      workspaceId: workspaceId || undefined,
    }, {
      organization_id: orgId,
      agent_id: agentId,
      agent_name: agentName,
      agent_type: agentType || 'external_api',
      created_by_user_id: userId,
    });

    return NextResponse.json({ success: true, agentId, apiKey: newApiKey });
  } catch (error) {
    return handleApiError('agents/create', error);
  }
}
```

---

### Event 5: `execution_submitted`

**Trigger:** Agent calls `/api/execute` with request  
**Location:** `/app/api/execute/route.ts` or `/app/api/spine/execute/route.ts`  
**Dependencies:** Agent must be created, policy must exist

```typescript
// app/api/execute/route.ts (core gate entry point)
import { captureEvent } from '@/lib/telemetry/capture-event';
import { extractAgentId } from '@/lib/auth/extract-agent-id'; // From Bearer token

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = extractAgentId(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { agentId, orgId, workspaceId } = auth;
  const body = await req.json();
  const { policyId, requestType } = body;

  try {
    // Generate execution ID early
    const executionId = generateUUID('exec_');

    // Check if this is first execution for agent
    const { count: agentExecutions } = await supabase
      .from('executions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    const isFirstExecution = (agentExecutions || 0) === 0;

    // Capture execution submitted
    await captureEvent('execution_submitted', {
      userId: agentId, // For agent-initiated events, use agent ID
      organizationId: orgId,
      workspaceId,
      agentId,
    }, {
      organization_id: orgId,
      agent_id: agentId,
      execution_id: executionId,
      policy_id: policyId,
      policy_version: getCurrentPolicyVersion(policyId),
      is_first_execution: isFirstExecution,
      request_type: requestType,
    });

    // ... continue with gate logic ...
  } catch (error) {
    return handleApiError('execute', error);
  }
}
```

---

### Event 6: `decision_made`

**Trigger:** Z3 solver produces decision  
**Location:** `/lib/spine/execute.ts` or `/lib/dsg/deterministic/gate.ts`  
**Dependencies:** Execution must be submitted

```typescript
// lib/spine/execute.ts (example)
import { captureEvent } from '@/lib/telemetry/capture-event';

export async function executeGate(
  execution: Execution,
  context: ExecutionContext
): Promise<GateDecision> {
  const startTime = Date.now();

  try {
    // ... Z3 solver logic ...
    
    const decision: GateDecision = {
      executionId: execution.id,
      decision: 'ALLOW' | 'BLOCK' | 'REVIEW' | 'ESCALATE' | 'UNSUPPORTED',
      policyVersion: execution.policyVersion,
      proofHash: generateProofHash(decision),
    };

    const latencyMs = Date.now() - startTime;

    // Capture decision
    await captureEvent('decision_made', {
      userId: execution.agentId,
      organizationId: execution.organizationId,
      workspaceId: execution.workspaceId,
      agentId: execution.agentId,
    }, {
      organization_id: execution.organizationId,
      execution_id: execution.id,
      decision: decision.decision,
      policy_id: execution.policyId,
      policy_version: execution.policyVersion,
      decision_latency_ms: latencyMs,
      proof_hash: decision.proofHash,
    });

    return decision;
  } catch (error) {
    console.error('[Gate] Error:', error);
    throw error;
  }
}
```

---

### Event 7: `checkout_started`

**Trigger:** User initiates Stripe checkout  
**Location:** `/app/api/billing/checkout/route.ts` or button click handler  
**Dependencies:** Organization must exist

```typescript
// app/api/billing/checkout/route.ts
import { captureEvent } from '@/lib/telemetry/capture-event';
import { requireAuth } from '@/lib/auth/require-auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, orgId } = auth;
  const body = await req.json();
  const { planTier } = body; // 'pro' | 'business' | 'enterprise'

  try {
    // Get current org plan
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', orgId)
      .single();

    const currentPlan = org?.plan || 'free';

    // Create Stripe checkout session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [{ price: PRICE_MAP[planTier], quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/pricing`,
      metadata: { organization_id: orgId, plan: planTier },
    });

    // Capture checkout started
    await captureEvent('checkout_started', {
      userId,
      organizationId: orgId,
    }, {
      organization_id: orgId,
      plan_tier: planTier,
      checkout_session_id: session.id,
      current_plan: currentPlan,
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    return handleApiError('billing/checkout', error);
  }
}
```

---

### Event 8: `subscription_created`

**Trigger:** Stripe webhook confirms subscription  
**Location:** `/app/api/billing/webhook/route.ts`  
**Dependencies:** Stripe configured

```typescript
// app/api/billing/webhook/route.ts (existing Stripe handler)
import { captureEvent } from '@/lib/telemetry/capture-event';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle customer.subscription.created / customer.subscription.updated
  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated') {
    
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

    try {
      // Get org ID from metadata or customer lookup
      const { data: billing } = await supabase
        .from('billing_subscriptions')
        .select('organization_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      const orgId = billing?.organization_id;

      // Capture subscription created
      await captureEvent('subscription_created', {
        userId: orgId || 'system', // No user context for webhook
        organizationId: orgId || 'unknown',
      }, {
        organization_id: orgId,
        plan_tier: getPlanFromPrice(subscription.items.data[0]?.price),
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        billing_period: getPeriodFromInterval(subscription.items.data[0]?.price),
        mrr: calculateMRR(subscription),
      });

      // ... update billing tables ...
    } catch (error) {
      console.error('[Billing Webhook] Event processing error:', error);
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## Phase 2: Operational Metrics (Week 2)

### Event 9-16: Quick Implementation

| Event | Location | Trigger |
|-------|----------|---------|
| `approval_requested` | `/app/api/approvals/queue/add/route.ts` | Decision = REVIEW/ESCALATE |
| `approval_completed` | `/app/api/approvals/[id]/decide/route.ts` | Approver submits decision |
| `execution_completed` | `/app/api/execute/route.ts` (end) | Final decision executed |
| `policy_updated` | `/app/api/policies/[id]/update/route.ts` | Policy rules changed |
| `policy_archived` | `/app/api/policies/[id]/archive/route.ts` | Policy deactivated |
| `workspace_created` | `/app/api/workspaces/create/route.ts` | User creates workspace |
| `team_member_invited` | `/app/api/team/invite/route.ts` | User invites team member |
| `approval_queue_checked` | `/app/dashboard/approvals/page.tsx` | Approver views queue |

**Example (approval_completed):**

```typescript
// app/api/approvals/[id]/decide/route.ts
import { captureEvent } from '@/lib/telemetry/capture-event';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  const { id } = await params;
  const body = await req.json();
  const { decision } = body; // 'approved' | 'rejected'

  const startTime = Date.now();

  try {
    // ... existing approval logic ...
    
    const { data: approval } = await supabase
      .from('approvals')
      .update({ status: decision, decided_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    const approvalTurnaroundMs = Date.now() - new Date(approval.created_at).getTime();

    // Capture approval completed
    await captureEvent('approval_completed', {
      userId: auth.userId,
      organizationId: approval.organization_id,
      workspaceId: approval.workspace_id,
    }, {
      organization_id: approval.organization_id,
      execution_id: approval.execution_id,
      approval_decision: decision,
      approver_user_id: auth.userId,
      approval_turnaround_ms: approvalTurnaroundMs,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('approvals/decide', error);
  }
}
```

---

## Phase 3: Compliance (Week 3)

### Event 17-21: Compliance Tracking

| Event | Location | Trigger |
|-------|----------|---------|
| `evidence_exported` | `/app/api/compliance/export/route.ts` | User exports audit pack |
| `audit_trail_queried` | `/app/api/audit/search/route.ts` | User searches audit |
| `execution_replayed` | `/app/api/execution/replay/route.ts` | Auditor replays decision |
| `compliance_report_generated` | `/app/api/compliance/report/route.ts` | User generates report |
| `proof_verified` | `/lib/dsg/proof/verify.ts` | Z3 proof validated |

---

## Testing Patterns

### Unit Test Example

**File:** `tests/unit/telemetry/capture-event.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { captureEvent } from '@/lib/telemetry/capture-event';
import * as posthog from '@/lib/telemetry/posthog-client';

vi.mock('@/lib/telemetry/posthog-client');

describe('captureEvent', () => {
  it('captures event with full context', async () => {
    const mockCapture = vi.fn();
    vi.mocked(posthog.getPostHogClient).mockReturnValue({
      capture: mockCapture,
    } as any);

    await captureEvent('policy_created', {
      userId: 'user_123',
      organizationId: 'org_456',
      workspaceId: 'ws_789',
    }, {
      policy_name: 'Transfer Limit',
      policy_type: 'amount_threshold',
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'policy_created',
        distinctId: 'user_123',
        groups: {
          organization: 'org_456',
          workspace: 'ws_789',
          agent: undefined,
        },
      })
    );
  });

  it('handles missing workspace gracefully', async () => {
    const mockCapture = vi.fn();
    vi.mocked(posthog.getPostHogClient).mockReturnValue({
      capture: mockCapture,
    } as any);

    await captureEvent('user_signup', {
      userId: 'user_123',
      organizationId: 'pending', // No org yet
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: {
          organization: 'pending',
          workspace: 'pending', // Fallback
        },
      })
    );
  });

  it('never throws (telemetry failure is non-fatal)', async () => {
    vi.mocked(posthog.getPostHogClient).mockImplementation(() => {
      throw new Error('PostHog unavailable');
    });

    // Should not throw
    await expect(
      captureEvent('policy_created', {
        userId: 'user_123',
        organizationId: 'org_456',
      })
    ).resolves.toBeUndefined();
  });
});
```

### Integration Test Example

**File:** `tests/integration/telemetry/conversion-funnel.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as posthog from '@/lib/telemetry/posthog-client';

describe('Conversion Funnel Telemetry', () => {
  let supabase: ReturnType<typeof createClient>;
  let capturedEvents: any[] = [];

  beforeEach(() => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Intercept PostHog captures
    const originalCapture = posthog.getPostHogClient().capture;
    posthog.getPostHogClient().capture = (event) => {
      capturedEvents.push(event);
      return originalCapture.call(posthog.getPostHogClient(), event);
    };
  });

  it('captures full conversion path: signup → org → policy → execution', async () => {
    // Step 1: Signup
    const signupRes = await fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
    });
    const { userId } = await signupRes.json();

    // Step 2: Create org
    const orgRes = await fetch('/api/organization/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ organizationName: 'Test Org' }),
    });
    const { orgId } = await orgRes.json();

    // Step 3: Create policy
    const policyRes = await fetch('/api/policies/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ policyName: 'Test Policy', policyType: 'amount_threshold' }),
    });
    const { policyId } = await policyRes.json();

    // Step 4: Create agent
    const agentRes = await fetch('/api/agents/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agentName: 'Test Agent' }),
    });
    const { agentId, apiKey } = await agentRes.json();

    // Step 5: Submit execution
    const execRes = await fetch('/api/execute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ policyId, requestType: 'transfer' }),
    });

    // Verify event sequence
    expect(capturedEvents).toContainEqual(expect.objectContaining({ event: 'user_signup' }));
    expect(capturedEvents).toContainEqual(expect.objectContaining({ event: 'organization_created' }));
    expect(capturedEvents).toContainEqual(expect.objectContaining({ event: 'policy_created' }));
    expect(capturedEvents).toContainEqual(expect.objectContaining({ event: 'agent_created' }));
    expect(capturedEvents).toContainEqual(expect.objectContaining({ event: 'execution_submitted' }));
    expect(capturedEvents).toContainEqual(expect.objectContaining({ event: 'decision_made' }));
  });
});
```

---

## Environment Setup

### `.env.local` (Development)

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_API_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### `.env.production` (Deployment)

```bash
# PostHog (production project)
NEXT_PUBLIC_POSTHOG_API_KEY=phc_prod_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# Stripe (production keys)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
```

---

## Instrumentation Checklist

### Phase 1: Conversion Funnel ✅ Week 1

- [ ] Setup PostHog client (`lib/telemetry/posthog-client.ts`)
- [ ] Create capture event helper (`lib/telemetry/capture-event.ts`)
- [ ] Add `user_signup` to auth flow
- [ ] Add `organization_created` to org provisioning
- [ ] Add `policy_created` to policy creation
- [ ] Add `agent_created` to agent provisioning
- [ ] Add `execution_submitted` to gate entry point
- [ ] Add `decision_made` to gate solver
- [ ] Add `checkout_started` to billing checkout
- [ ] Add `subscription_created` to Stripe webhook
- [ ] Test conversion path end-to-end
- [ ] Deploy to staging
- [ ] Validate events in PostHog dashboard

### Phase 2: Operational Metrics ✅ Week 2

- [ ] Add `approval_requested` to approval queue
- [ ] Add `approval_completed` to approval decision
- [ ] Add `execution_completed` to gate finish
- [ ] Add `policy_updated` to policy changes
- [ ] Add `policy_archived` to policy deactivation
- [ ] Add `workspace_created` to workspace provisioning
- [ ] Add `team_member_invited` to team invites
- [ ] Add `approval_queue_checked` to queue view
- [ ] Create operational dashboards
- [ ] Setup alerts for SLA breaches
- [ ] Deploy to staging
- [ ] Validate operational metrics

### Phase 3: Compliance ✅ Week 3

- [ ] Add `evidence_exported` to export handler
- [ ] Add `audit_trail_queried` to audit search
- [ ] Add `execution_replayed` to replay handler
- [ ] Add `compliance_report_generated` to report generation
- [ ] Add `proof_verified` to proof validation
- [ ] Create compliance dashboards
- [ ] Document audit trail access patterns
- [ ] Deploy to production
- [ ] Enable retention policies

---

## Troubleshooting

### Events Not Appearing in PostHog

**Problem:** Events captured but not visible in PostHog dashboard

**Solution:**
1. Check PostHog API key in env vars: `echo $NEXT_PUBLIC_POSTHOG_API_KEY`
2. Verify network request: DevTools → Network → filter `posthog`
3. Check PostHog project settings (ensure correct project ID)
4. Confirm event name matches schema (case-sensitive)
5. Wait 30-60s for PostHog to index events

**Debug code:**

```typescript
const posthog = getPostHogClient();
console.log('[Telemetry] Capturing event:', { event, distinctId, groups, properties });
posthog.capture({ /* ... */ });
```

### Group Hierarchy Not Showing

**Problem:** Events grouped by user, not organization

**Solution:**
1. Ensure `groups` object is included in every capture call
2. Verify `group_type_index` created in PostHog (Settings → Data Management → Group Types)
3. Check if values are null/undefined (causes grouping to fail)
4. Test with explicit group names:

```typescript
groups: {
  organization: 'org_12345', // Not null/undefined
  workspace: 'ws_12345',
  agent: 'agent_12345',
}
```

### High Latency on Event Capture

**Problem:** Gate latency increases after instrumentation

**Solution:**
1. PostHog capture should NOT block execution (async + fire-and-forget)
2. Use batching: `flushInterval: 5000` in client config
3. Move capture to background (async function, no await in critical path)
4. Example:

```typescript
// ❌ Bad: Blocks execution
await captureEvent('decision_made', context, properties);

// ✅ Good: Non-blocking
captureEvent('decision_made', context, properties).catch(console.error);
```

### Memory Leak in PostHog Client

**Problem:** Memory usage increases over time

**Solution:**
1. Implement graceful shutdown: `flushPostHog()` in server shutdown handlers
2. Example (Next.js):

```typescript
// app/api/health/route.ts
export async function GET() {
  // Flush before shutdown
  await flushPostHog();
  return NextResponse.json({ ok: true });
}
```

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| **Events captured** | 25+ events fully instrumented | Week 3 |
| **Conversion funnel visibility** | Signup → Upgrade tracked E2E | Week 1 |
| **PostHog dashboards** | 3 dashboards (funnel, health, compliance) | Week 2 |
| **Event latency** | Gate latency increase ≤ 5ms | Week 1 |
| **Data quality** | 99%+ events with valid org_id | Week 2 |
| **Team adoption** | All engineers trained | Week 1 |

---

## References

- **Product Model:** `.telemetry/product.md`
- **Tracking Plan:** `.telemetry/tracking-plan.md`
- **Audit:** `.telemetry/audit-current.md`
- **PostHog Docs:** https://posthog.com/docs
- **Stripe Webhooks:** https://stripe.com/docs/webhooks

---

**Version:** 1.0 | **Status:** Ready for implementation | **Last updated:** July 12, 2026
