# DSG Governance Gate — Stripe UI Components Implementation Guide

This guide documents the Stripe UI components used in the DSG Governance Gate app and their implementation patterns.

## Views Architecture

### Root Views
The app uses these root components as foundational view containers:

1. **ContextView** (Primary)
   - Purpose: Display governance decisions next to Stripe payment details
   - Location: payment.detail viewport
   - Content: Policy decision badge, audit trail, proof details
   - Implementation: src/views/PaymentIntentGate.tsx, ChargeGate.tsx

2. **SettingsView** (Configuration)
   - Purpose: Allow users to configure policy thresholds and rules
   - Content: Amount limits, time windows, customer allowlists
   - Implementation: src/views/SettingsView.tsx (to create)

3. **SignInView** (OAuth)
   - Purpose: Display OAuth authentication flow
   - Content: Login prompt, authorization scopes, error handling
   - Implementation: src/handlers/oauth-handler.ts

### Child Components
- **FocusView**: Used for detailed audit trail review or policy configuration
  - Opens full-screen view for complex tasks
  - Example: Editing policy rules or reviewing full audit history

---

## Layout Components

### Box
Wraps other components with custom styling and spacing.

**Usage in DSG app:**
```typescript
import { Box } from '@stripe/ui-extension-sdk/components';

<Box padding="medium">
  <PolicyDecisionBadge decision={decision} />
  <AuditTrailLink auditId={auditId} />
</Box>
```

**Styling principles:**
- Use padding to separate policy badge from other content
- Use margin to create visual hierarchy
- Stripe design system: spacing units are `small`, `medium`, `large`

### Divider
Horizontal line to separate sections.

**Usage in DSG app:**
```typescript
<Divider />  // Separates policy decision from audit details
```

---

## Navigation Components

### Button
Primary action elements for user interactions.

**Buttons in DSG app:**

1. **View Audit Trail** (Primary)
   - Type: primary
   - Action: Opens FocusView with full audit history
   - Usage: Click to expand audit details

2. **Approve/Retry** (When in REVIEW state)
   - Type: danger (for approving) or default (for retry)
   - Action: Send decision back to DSG control plane
   - Usage: For manual review and approval workflows

3. **Configure Policy** (Settings)
   - Type: primary
   - Action: Opens SettingsView for policy configuration
   - Usage: Admin workflow

**Implementation:**
```typescript
import { Button } from '@stripe/ui-extension-sdk/components';

<Button 
  onClick={() => openAuditTrail(auditId)}
  variant="primary"
>
  View Full Audit Trail
</Button>

<Button
  onClick={() => approveDecision(chargeId)}
  variant="danger"
  disabled={decision !== 'REVIEW'}
>
  Approve Charge
</Button>
```

### Link
Subtler navigation for less prominent actions.

**Links in DSG app:**
- "View Policy Version" → Opens documentation for current policy
- "See Proof Details" → Shows mathematical proof hash in tooltip
- "Documentation" → Links to https://dsg.pics/docs/stripe-app

**Implementation:**
```typescript
import { Link } from '@stripe/ui-extension-sdk/components';

<Link href={`https://dsg.pics/docs/policies/${policyVersion}`}>
  Policy v{policyVersion}
</Link>
```

### Tabs
Display multiple sections of content within the same view.

**Tabs structure (if implementing extended UI):**
```
Tab 1: Policy Decision (current decision + timestamp)
Tab 2: Audit Trail (history of all evaluations)
Tab 3: Proof Details (technical proof hash and constraints)
```

**Implementation:**
```typescript
import { Tabs } from '@stripe/ui-extension-sdk/components';

<Tabs>
  <Tabs.Tab label="Decision" id="decision">
    <PolicyDecisionView />
  </Tabs.Tab>
  <Tabs.Tab label="Audit" id="audit">
    <AuditTrailView />
  </Tabs.Tab>
  <Tabs.Tab label="Proof" id="proof">
    <ProofDetailsView />
  </Tabs.Tab>
</Tabs>
```

---

## Content Components

### Badge
Indicates the status/state of a policy decision.

**Decision Badges in DSG app:**

1. **ALLOW Badge** (Green)
   - Variant: success
   - Text: "ALLOW"
   - Usage: Policy permits transaction

2. **REVIEW Badge** (Yellow)
   - Variant: warning
   - Text: "REVIEW"
   - Usage: Requires manual review OR fallback mode (API down)

3. **BLOCK Badge** (Red)
   - Variant: danger
   - Text: "BLOCK"
   - Usage: Policy rejects transaction

**Implementation:**
```typescript
import { Badge } from '@stripe/ui-extension-sdk/components';

function DecisionBadge({ decision }) {
  const variants = {
    'ALLOW': 'success',
    'REVIEW': 'warning',
    'BLOCK': 'danger'
  };
  
  return <Badge variant={variants[decision]}>{decision}</Badge>;
}
```

### Banner
Show alerts or important messages.

**Banners in DSG app:**

1. **Governance Service Unreachable**
   - Type: warning
   - Message: "Governance service unreachable — defaulting to REVIEW mode"
   - Action: Retry or contact support

2. **Policy Update Available**
   - Type: info
   - Message: "New policy version available. Refresh to apply."
   - Action: Refresh button

3. **Verification Failed**
   - Type: danger
   - Message: "Could not verify proof. Manual review required."
   - Action: Escalate to support

**Implementation:**
```typescript
import { Banner } from '@stripe/ui-extension-sdk/components';

{fallbackMode && (
  <Banner variant="warning" title="Service Unavailable">
    Governance service is currently unreachable. 
    Defaulting to safe REVIEW mode.
  </Banner>
)}
```

### Icon
Display icon graphics for visual clarity.

**Icons used in DSG app:**
- ✅ Check icon for ALLOW decisions
- ⚠️ Warning icon for REVIEW decisions
- ❌ X icon for BLOCK decisions
- 🔍 Search icon for audit trail
- ⚙️ Settings icon for policy config
- 📋 Document icon for proof details

**Implementation:**
```typescript
import { Icon } from '@stripe/ui-extension-sdk/components';

<Icon name="check-circle" color="success" /> ALLOW
<Icon name="alert-circle" color="warning" /> REVIEW
<Icon name="x-circle" color="danger" /> BLOCK
```

### List
Display policy decisions or audit entries in list format.

**List in DSG app:**
- Audit trail entries (multiple decisions over time)
- Related charges (batch decision view)

**Implementation:**
```typescript
import { List } from '@stripe/ui-extension-sdk/components';

<List>
  {auditEntries.map(entry => (
    <List.Item key={entry.id}>
      <div>
        <strong>{entry.decision}</strong> at {entry.timestamp}
      </div>
      <div>{entry.reason}</div>
    </List.Item>
  ))}
</List>
```

### Table
Display policy rules or decision matrix in tabular format.

**Tables in DSG app:**

1. **Policy Rules Table** (Settings view)
   - Columns: Rule Type, Threshold, Action
   - Rows: Amount limits, time windows, customer lists

2. **Audit Log Table** (Full audit view)
   - Columns: Timestamp, Charge ID, Amount, Decision, Policy Version

**Implementation:**
```typescript
import { Table } from '@stripe/ui-extension-sdk/components';

<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Timestamp</Table.HeaderCell>
      <Table.HeaderCell>Charge</Table.HeaderCell>
      <Table.HeaderCell>Decision</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {auditEntries.map(entry => (
      <Table.Row key={entry.id}>
        <Table.Cell>{entry.timestamp}</Table.Cell>
        <Table.Cell>{entry.chargeId}</Table.Cell>
        <Table.Cell><Badge variant={...}>{entry.decision}</Badge></Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

### Tooltip
Provide contextual information about proof details or technical fields.

**Tooltips in DSG app:**
- Proof hash explanation
- Policy version details
- Evaluation timestamp precision

**Implementation:**
```typescript
import { Tooltip } from '@stripe/ui-extension-sdk/components';

<Tooltip text="Deterministic hash of policy constraints and input data">
  <span>Proof: {proofHash}</span>
</Tooltip>
```

### Spinner
Indicate loading state while fetching policy decisions.

**Loading states in DSG app:**
- Fetching policy decision from governance API
- Loading audit trail entries
- Verifying proof authenticity

**Implementation:**
```typescript
import { Spinner } from '@stripe/ui-extension-sdk/components';

{isLoading && <Spinner />}
{!isLoading && <PolicyDecisionView decision={decision} />}
```

---

## Form Components

### TextField
Text input for policy configuration.

**TextFields in DSG app:**
- Policy rule name
- Reason for manual override
- Customer allowlist entries

**Implementation:**
```typescript
import { TextField } from '@stripe/ui-extension-sdk/components';

<TextField
  label="Policy Rule Name"
  placeholder="e.g., VIP Customer Override"
  value={ruleName}
  onChange={setRuleName}
/>
```

### CurrencyField
Input for amount thresholds in policy configuration.

**CurrencyFields in DSG app:**
- ALLOW threshold (auto-approve up to $X)
- REVIEW threshold (manual review between $X and $Y)
- BLOCK threshold (reject above $Y)

**Implementation:**
```typescript
import { CurrencyField } from '@stripe/ui-extension-sdk/components';

<CurrencyField
  label="ALLOW Threshold"
  currency="USD"
  value={allowThreshold}
  onChange={setAllowThreshold}
/>
```

### Select
Dropdown for selecting policy templates or rule types.

**Selects in DSG app:**
- Policy template selection (preset rules)
- Rule type (amount, time window, customer)
- Customer allowlist

**Implementation:**
```typescript
import { Select } from '@stripe/ui-extension-sdk/components';

<Select
  label="Rule Type"
  value={ruleType}
  onChange={setRuleType}
  options={[
    { value: 'amount', label: 'Amount Threshold' },
    { value: 'time', label: 'Time Window' },
    { value: 'customer', label: 'Customer Allowlist' }
  ]}
/>
```

### Checkbox
Boolean toggle for enable/disable rules.

**Checkboxes in DSG app:**
- Enable/disable specific policy rules
- Apply to all payment types (charges, payouts, refunds)

**Implementation:**
```typescript
import { Checkbox } from '@stripe/ui-extension-sdk/components';

<Checkbox
  label="Apply to Payouts"
  checked={applyToPayouts}
  onChange={setApplyToPayouts}
/>
```

### Switch
Alternative to checkbox for on/off states.

**Switches in DSG app:**
- Enable/disable governance for this account
- Enable fallback REVIEW mode
- Enable audit logging

**Implementation:**
```typescript
import { Switch } from '@stripe/ui-extension-sdk/components';

<Switch
  label="Enable Policy Enforcement"
  checked={policyEnabled}
  onChange={setPolicyEnabled}
/>
```

---

## Chart Components

### MeterChart
Display policy utilization or quota progress.

**Meter chart in DSG app:**
- Monthly evaluated events vs. free tier limit (1,000 events)
- Storage used vs. plan limit

**Implementation:**
```typescript
import { MeterChart } from '@stripe/ui-extension-sdk/components';

<MeterChart
  title="Free Tier Usage"
  value={evaluatedEventsThisMonth}
  max={1000}
  segments={[
    { value: evaluatedEventsThisMonth, color: 'success' },
    { value: 1000 - evaluatedEventsThisMonth, color: 'gray' }
  ]}
/>
```

### LineChart
Visualize decision trends over time.

**Line chart in DSG app (optional advanced feature):**
- Policy decisions per day (ALLOW vs BLOCK trend)
- Decision volume over time

**Implementation:**
```typescript
import { LineChart } from '@stripe/ui-extension-sdk/components';

<LineChart
  title="Policy Decisions Over Time"
  data={dailyDecisions.map(d => ({
    name: d.date,
    ALLOW: d.allowCount,
    BLOCK: d.blockCount,
    REVIEW: d.reviewCount
  }))}
/>
```

---

## Design Principles for DSG Governance Gate

### Color Semantics
- **Green (ALLOW)**: Transaction approved, safe to proceed
- **Yellow (REVIEW)**: Requires human attention, neutral/cautious
- **Red (BLOCK)**: Transaction rejected, not permitted
- **Gray**: Disabled, inactive, or historical state

### Layout Hierarchy
1. **Primary**: Policy decision badge (large, prominent)
2. **Secondary**: Reason/explanation text
3. **Tertiary**: Policy version, proof hash, timestamp
4. **Interactive**: Audit trail link, settings button

### Loading States
- Always show Spinner while fetching governance decision
- Never leave user unsure if system is thinking or if decision is final
- Timeout after 5 seconds → show fallback REVIEW mode

### Error Handling
- **Network Error**: Show Banner with "Governance service unreachable"
- **Invalid Permission**: Show Banner explaining OAuth re-authorization needed
- **Parse Error**: Show Banner with "Could not verify decision proof"
- **Timeout**: Default to REVIEW badge (safe failure mode)

### Accessibility
- All badges must have color + icon (not just color)
- All interactive elements must have clear labels
- Tooltips for technical/complex information
- Keyboard navigation support for all buttons

### Mobile Responsiveness
- ButtonGroup collapses into overflow menu on small screens
- Table switches to card layout on mobile
- Spinner centered and visible on all screen sizes

---

## Implementation Roadmap

### Phase 1: MVP (Current)
- ✅ ContextView with policy decision badge
- ✅ Banner for error/fallback states
- ✅ Tooltip for proof details
- ✅ Link to audit trail

### Phase 2: Settings & Configuration
- SettingsView with form components
- CurrencyField for policy thresholds
- Select for rule templates
- Checkbox for enable/disable

### Phase 3: Enhanced Audit & Analytics
- FocusView for full audit trail
- Table with filter/sort capabilities
- LineChart for decision trends
- MeterChart for quota usage

### Phase 4: Advanced Features
- Accordion for policy rule breakdown
- Tabs for decision/audit/proof views
- Menu for bulk actions
- Toast for confirmation messages

---

## Testing Stripe UI Components

### Unit Tests
```typescript
import { render, screen } from '@testing-library/react';
import DecisionBadge from './DecisionBadge';

test('renders ALLOW badge with success variant', () => {
  render(<DecisionBadge decision="ALLOW" />);
  expect(screen.getByText('ALLOW')).toHaveAttribute('variant', 'success');
});
```

### Integration Tests
- Test Button click handlers
- Test Form submission
- Test Navigation between views
- Test Loading states

### E2E Tests (Playwright)
```typescript
test('displays policy decision on payment detail view', async () => {
  await page.goto('/charges/ch_test_xyz');
  await expect(page.locator('[data-testid="decision-badge"]')).toContainText('ALLOW');
});
```

---

## Resources

- [Stripe UI Extension SDK Docs](https://docs.stripe.com/stripe-apps/components)
- [Design Patterns for Stripe Apps](https://docs.stripe.com/stripe-apps/patterns.md)
- [Style Guide](https://docs.stripe.com/stripe-apps/style.md)
- [UI Testing Best Practices](https://docs.stripe.com/stripe-apps/ui-testing.md)

---

**Last Updated**: 2026-07-04
**Implementation Status**: Phase 1 (MVP) — Ready for payment.detail view
**Next Phase**: Settings/Configuration UI (Phase 2)
