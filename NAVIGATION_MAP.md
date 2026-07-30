# Navigation Architecture — 4-Pillar Scaffold

This document maps the DSG control plane navigation into 4 semantic pillars, organized by user intent and workflow.

## Overview

The navigation is organized into **4 pillars**:

```
┌──────────────────────────────────────────────────────────────┐
│  Monitor  │  Verify  │  Audit  │  Optimize                  │
└──────────────────────────────────────────────────────────────┘
```

Each pillar contains related routes that support a specific operational domain.

---

## 1. Monitor Pillar

**Purpose**: Observe and track runtime state, execution health, and agent status.

**User Intent**: "What is happening right now?"

### Routes

| Route | Label | Purpose | Feature Flag |
|-------|-------|---------|--------------|
| `/dashboard` | Dashboard | Overview of platform state and metrics | `ENABLE_MONITOR_DASHBOARD` |
| `/dashboard/executions` | Executions | View execution history and status | — |
| `/dashboard/agents` | Agents | Manage and monitor AI agents | — |
| `/dashboard/capacity` | Capacity | Track system capacity and limits | — |
| `/dashboard/live-control` | Live Control | Real-time control and intervention | — |

### When to Use

- New operators getting started
- Monitoring execution flow
- Checking agent health
- Capacity planning decisions
- Emergency response scenarios

---

## 2. Verify Pillar

**Purpose**: Define policies, verify decisions, and approve AI actions before execution.

**User Intent**: "Should this action be allowed?"

### Routes

| Route | Label | Purpose | Feature Flag |
|-------|-------|---------|--------------|
| `/dashboard/policies` | Policies | Define and manage governance policies | — |
| `/dashboard/verification` | Verification | Verify policy decisions | — |
| `/dashboard/proofs` | Proofs | View formal proofs and evidence | — |
| `/approvals` | Approvals | Approve or reject pending actions | — |
| `/dashboard/audit` | Audit Log | View audit trail of verified decisions | — |

### When to Use

- Establishing governance rules
- Verifying policy compliance
- Approving critical operations
- Policy change reviews
- Audit trail inspection

---

## 3. Audit Pillar

**Purpose**: Track compliance evidence, detect breaches, and maintain audit records.

**User Intent**: "What happened and why?"

### Routes

| Route | Label | Purpose | Feature Flag |
|-------|-------|---------|--------------|
| `/dashboard/compliance-evidence-pack` | Evidence Pack | Export compliance evidence bundle | — |
| `/dashboard/breach-signal` | Breach Signal | Detect and respond to anomalies | — |
| `/dashboard/integration` | Integrations | External system integrations | — |
| `/gateway/monitor` | Gateway Monitor | Monitor gateway traffic | — |

### When to Use

- Compliance audits
- Investigating incidents
- Exporting evidence for third parties
- Detecting anomalies
- Breach response workflows

---

## 4. Optimize Pillar

**Purpose**: Optimize performance, billing, and resource utilization.

**User Intent**: "How can I improve efficiency and cost?"

### Routes

| Route | Label | Purpose | Feature Flag |
|-------|-------|---------|--------------|
| `/dashboard/billing` | Billing | View billing, usage, and costs | `ENABLE_BILLING_UI` |
| `/dashboard/capacity` | Capacity | Capacity planning and limits | — |
| `/dashboard/ledger` | Ledger | Financial transaction ledger | — |
| `/dashboard/payout-safety` | Payout Safety | Financial safety controls | — |
| `/dashboard/settings/security` | Security | Security configuration | — |

### When to Use

- Cost analysis and optimization
- Setting usage limits
- Financial reconciliation
- Budget planning
- Security hardening

---

## Component Architecture

### PrimaryNav Component

**File**: `components/Navigation/PrimaryNav.tsx`

**Props**:
- `expandedPillar?: string | null` — Controlled expanded pillar (optional)
- `onPillarToggle?: (pillarId: string) => void` — Callback when pillar expands/collapses

**Usage**:

```tsx
// Uncontrolled (self-manages state)
<PrimaryNav />

// Controlled (parent manages state)
<PrimaryNav
  expandedPillar="monitor"
  onPillarToggle={(pillarId) => console.log(pillarId)}
/>
```

**Types**:

```typescript
interface Pillar {
  id: 'monitor' | 'verify' | 'audit' | 'optimize';
  name: string;
  ariaLabel: string;
  icon: React.ReactNode;
  description: string;
  routes: PillarRoute[];
}

interface PillarRoute {
  path: string;
  label: string;
  icon?: React.ReactNode;
  featureFlag?: string;
}
```

---

## Feature Flags

Feature flags control Phase 1 rollout. Set via environment variables:

```bash
FEATURE_FLAG_ENABLE_MONITOR_DASHBOARD=true
FEATURE_FLAG_ENABLE_BILLING_UI=true
FEATURE_FLAG_ENABLE_AUDIT_LOG=false
FEATURE_FLAG_ENABLE_DELIVERY_PROOF=true
```

### Flag Registry

| Flag Name | Default | Purpose |
|-----------|---------|---------|
| `ENABLE_MONITOR_DASHBOARD` | `true` | Show Monitor pillar dashboard |
| `ENABLE_BILLING_UI` | `true` | Show Optimize pillar billing UI |
| `ENABLE_AUDIT_LOG` | `false` | Show Audit pillar features |
| `ENABLE_DELIVERY_PROOF` | `true` | Show Delivery Proof scanning |

### Usage in Components

**Server-side**:

```typescript
import { vercelFlagClient } from '@/lib/vercel-flags';

const flags = await vercelFlagClient().flags();
if (flags.ENABLE_MONITOR_DASHBOARD) {
  // Render dashboard
}
```

**Client-side**:

```typescript
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

export default function MyComponent() {
  const { enabled, loading } = useFeatureFlag('ENABLE_BILLING_UI');
  
  if (loading) return <Skeleton />;
  if (!enabled) return null;
  return <BillingUI />;
}
```

---

## Accessibility (WCAG 2.2 AA)

### Skip Link

To be implemented: Add skip-to-main-content link at the top of dashboard layout.

```html
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
<main id="main-content">...</main>
```

### Keyboard Navigation

- **Tab**: Move between pillars and routes
- **Enter/Space**: Expand/collapse pillar
- **Arrow Keys**: Can be added to cycle through pillar (future)
- **Escape**: Close expanded pillar (future enhancement)

### ARIA Landmarks

- `<nav>` with `aria-label="Main navigation: Monitor, Verify, Audit, Optimize"`
- Pillar buttons with `aria-expanded` to indicate state
- Pillar buttons with `aria-haspopup="menu"` for dropdown
- Route regions with `aria-label="[Pillar] routes"`

### Focus Indicators

All interactive elements have visible focus states using Tailwind transition classes.

---

## Integration with Existing Navigation

### Current State

The existing `DashboardNav` component (`components/DashboardNav.tsx`) uses 5 sections:
- Overview
- Govern
- Finance
- Build
- Manage

### Transition Plan

**Phase 1** (current): Both navigations coexist
- Keep `DashboardNav` for backward compatibility
- Add `PrimaryNav` as optional alternative
- Support feature flags to control visibility

**Phase 2** (future): Gradual migration
- Update `app/dashboard/layout.tsx` to use `PrimaryNav`
- Maintain feature flags for rollback
- Monitor usage analytics

**Phase 3** (future): Full migration
- Remove old `DashboardNav`
- Consolidate all pillar routes
- Complete accessibility audit

---

## Migration Path for Feature Agents

Other Phase 1 agents building on this navigation scaffold should:

1. **Use `PrimaryNav`** instead of adding to old `DashboardNav`
2. **Add routes to the appropriate pillar**:
   - Monitor pillar → execution/health features
   - Verify pillar → governance/approval features
   - Audit pillar → compliance/evidence features
   - Optimize pillar → billing/capacity features
3. **Respect feature flags**:
   - Add `featureFlag` property to routes that need gating
   - Check flags in component visibility logic
4. **Update NAVIGATION_MAP.md** when adding new routes

---

## Testing

All navigation components have comprehensive WCAG 2.2 AA tests in:

**File**: `tests/unit/components/PrimaryNav.test.tsx`

**Test Coverage**:
- ✅ Pillar structure renders correctly
- ✅ Routes are navigable via keyboard
- ✅ ARIA labels present and correct
- ✅ Active states highlight correctly
- ✅ Feature flags can be toggled
- ✅ Controlled and uncontrolled component modes
- ✅ Dropdown behavior (open/close)
- ✅ WCAG 2.2 AA compliance

**Run Tests**:

```bash
npm run test -- tests/unit/components/PrimaryNav.test.tsx
```

---

## Future Enhancements

- [ ] Add icons to routes within pillars
- [ ] Implement escape key to close dropdowns
- [ ] Add arrow key navigation between pillars
- [ ] Mobile hamburger menu variant
- [ ] Search/filter routes
- [ ] Customizable pillar ordering per user role
- [ ] Breadcrumb trail in page header
- [ ] Analytics tracking for navigation usage
- [ ] Quick actions sidebar (shortcuts)
- [ ] Collapsible sidebar mode for narrow screens

---

## Known Limitations

1. **Feature flags** currently read from environment at build time
   - Real-time flag toggling requires edge computing or client fetch
   - Current approach suitable for deployment/preview toggles

2. **Route validation** is not enforced
   - Navigate to non-existent routes will 404
   - Consider schema validation in future

3. **Route permissions** are not enforced at navigation level
   - Auth/RBAC enforced at page/layout level
   - Consider adding permission checks to route visibility

---

## Support

For questions about the navigation architecture:
1. See `components/Navigation/PrimaryNav.tsx` for component implementation
2. See `lib/vercel-flags.ts` for feature flag system
3. Run tests to understand expected behavior: `npm run test -- PrimaryNav.test.tsx`
4. Check deployment guide: `docs/RUNBOOK_DEPLOY.md`
