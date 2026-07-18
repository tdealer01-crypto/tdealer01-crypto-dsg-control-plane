# GitHub Marketplace Screenshots Guide

## Required Screenshots (5 total)

All screenshots must be **1280×720px** PNG/JPEG format. Deploy production instance to `https://tdealer01-crypto-dsg-control-plane.vercel.app` before capturing.

---

### Screenshot 1: Dashboard Overview (Hero Shot)
**URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard`

**What to show:**
- Full dashboard with governance metrics widgets
- Key metrics visible: "Gate Evaluations", "Policy Version", "Audit Trail Status"
- Show the sidebar with navigation
- Include real data or representative numbers
- Ensure no personal/sensitive data is visible

**Capture tips:**
- Use a 1280×720 browser window
- Set zoom to 100%
- Screenshot the entire viewport
- Include some shadow/context around dashboard

**Key message:** "Real-time governance oversight at a glance"

---

### Screenshot 2: Trinity Multi-Agent System
**URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/trinity`

**What to show:**
- Trinity chat interface with agent coordination
- Show model selector (Claude vs NVIDIA GLM options)
- Display conversation or agent flow
- Show the interactive elements of the system
- Highlight the multi-agent orchestration capability

**Capture tips:**
- Show active chat or agent workflow
- Display both model options visible
- Include the chat interface with agent responses
- Make sure the UI is clean and readable

**Key message:** "Multi-model AI orchestration with governance"

---

### Screenshot 3: Finance Governance Controls
**URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/finance-governance` or similar

**What to show:**
- Finance governance policy interface
- Control flow diagram or visual representation
- Payment approval gates
- Multi-step workflow visualization
- Real or representative financial control data

**Capture tips:**
- Show visual policy representation
- Display control flow with gates clearly marked
- Include data tables or approval workflows
- Ensure legibility of all text

**Key message:** "Enterprise-grade AI-enforced financial controls"

---

### Screenshot 4: Compliance Evidence Export
**URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/compliance` or `/compliance-evidence-pack`

**What to show:**
- Compliance evidence matrix or export interface
- Show framework options (EU AI Act, ISO 42001, NIST RMF)
- Display evidence collection status
- Export button or download capability
- Evidence chain or audit trail visualization

**Capture tips:**
- Show compliance framework options clearly
- Display collected evidence summary
- Make export/download capability obvious
- Include timestamp and audit trail references

**Key message:** "Audit-ready compliance proof automatically generated"

---

### Screenshot 5: Revenue Dashboard & Billing
**URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/revenue` or `/dashboard/billing`

**What to show:**
- Revenue metrics and KPI cards
- Usage tracking (gates evaluated, compliance exports, etc.)
- Billing subscription status
- Pricing tier information
- Monthly/annual billing toggle

**Capture tips:**
- Display clear KPI metrics
- Show usage trends if available
- Include pricing information
- Make subscription status visible
- Use real or representative revenue data

**Key message:** "Usage-based billing with transparent metering"

---

## Capture Workflow

```bash
# 1. Deploy to production
npm run build && npm run deploy

# 2. Authenticate and navigate to each URL
# 3. Open browser DevTools (F12)
# 4. Set device viewport to 1280x720
# 5. Disable DevTools (F12 again)
# 6. Use browser screenshot tool or:
#    - macOS: Cmd+Shift+5 → Capture Window
#    - Windows: Shift+Win+S
#    - Linux: gnome-screenshot -a

# 7. Save as PNG to: marketplace-assets/screenshot-1.png, etc.
# 8. Verify dimensions: identify -verbose screenshot-1.png | grep "Geometry"
```

---

## Quality Standards

- ✅ No personal data or API keys visible
- ✅ Screenshots are recent (same day as submission)
- ✅ UI is clean and uncluttered
- ✅ Text is legible at all zoom levels
- ✅ All elements are properly lit/contrasted
- ✅ No browser chrome (except intentional UI elements)
- ✅ 1280×720px exactly

---

## If Screenshots Cannot Be Captured Locally

1. Use Figma mockups of the UI
2. Create composite screenshots from production using a capture service (e.g., Browserless, Percy)
3. Request screenshots from deployed staging instance
4. Use representative UI designs if features not yet live on production

---

## File Naming

```
marketplace-assets/screenshot-1-dashboard.png
marketplace-assets/screenshot-2-trinity.png
marketplace-assets/screenshot-3-finance.png
marketplace-assets/screenshot-4-compliance.png
marketplace-assets/screenshot-5-revenue.png
```

All files placed in: `./marketplace-assets/`
