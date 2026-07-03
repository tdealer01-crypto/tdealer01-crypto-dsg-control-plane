# Marketplace Assets Guide

Guidelines for creating and managing all visual and copy assets required for GitHub Marketplace and Stripe App Marketplace listings.

---

## 1. Logo

### Requirements

| Attribute | Specification |
|-----------|---------------|
| Minimum size | 200×200px (GitHub Marketplace minimum) |
| Recommended size | 512×512px or 1024×1024px |
| Format | SVG (preferred) or PNG with transparent background |
| Shape | Square (not rounded; GitHub applies rounding automatically) |
| Color mode | Full color; also prepare a monochrome version |

### Variants to Prepare

1. **Full color** — primary logo for marketplace listing
2. **Dark background** — for dark-mode marketplace pages
3. **Monochrome / white** — for use on colored backgrounds
4. **Favicon** — 32×32px or 64×64px version

### Design Guidelines

- Keep the logo legible at 32×32px (favicon size)
- Avoid fine text that becomes unreadable at small sizes
- Use a consistent brand color palette matching the product UI
- Do not include a hard-coded background rectangle — let the platform handle shape

### File Naming Convention

```
assets/
  logo-full-color.svg
  logo-full-color@2x.png      # 1024×1024px
  logo-dark-bg.svg
  logo-monochrome.svg
  favicon.png                 # 32×32px
```

---

## 2. Screenshots

### Requirements

| Attribute | Specification |
|-----------|---------------|
| Minimum count | 3 (GitHub requires at least 1) |
| Maximum count | 5 recommended (10 allowed) |
| Minimum size | 1280×640px |
| Recommended size | 1280×800px or 1440×900px |
| Format | PNG (preferred) or JPEG (90%+ quality) |
| Content | Real UI — no mockups or placeholder data |

### Required Screenshots (in order)

#### Screenshot 1: Dashboard Overview
- **Page**: `/dashboard`
- **Content to show**: Governance status widgets, execution counts, health indicators
- **Goal**: First impression — conveys that the product is production-ready

#### Screenshot 2: Revenue Metrics
- **Page**: `/dashboard/revenue`
- **Content to show**: MRR/ARR KPI cards, revenue event timeline, conversion funnel
- **Goal**: Show built-in revenue tracking without extra tools

#### Screenshot 3: Trinity Agent System
- **Page**: `/dashboard/trinity`
- **Content to show**: 5-agent orchestration panel, job discovery results, governance constraints
- **Goal**: Highlight the AI multi-agent capability

#### Screenshot 4: Finance Governance
- **Page**: `/finance-governance`
- **Content to show**: Payment approval gate, multi-step workflow, audit trail
- **Goal**: Showcase regulated-industry readiness

#### Screenshot 5: Pricing Page
- **Page**: `/pricing`
- **Content to show**: Tier cards with clear pricing (Free, Pro, Business, Enterprise), CTA buttons
- **Goal**: Reduce friction — visitors see pricing before installing

### Screenshot Capture Tips

- Use a browser width of 1440px for consistent viewport
- Remove any personal data or real customer information before capturing
- Use browser DevTools device emulation for consistent viewport sizing
- Annotate screenshots with callouts if the feature is not immediately obvious
- Compress PNGs with tools like ImageOptim or TinyPNG before upload

---

## 3. Hero Image

### Requirements

| Attribute | Specification |
|-----------|---------------|
| Size | 1280×720px (16:9 aspect ratio) |
| Format | PNG or JPEG |
| Content | Main value proposition with product name |

### Recommended Content

- **Headline**: "AI Governance Platform for Regulated Workflows"
- **Sub-headline**: "Deterministic policy gating · Cryptographic audit trails · Stripe-native billing"
- **Visual element**: Dashboard screenshot or abstract governance/graph motif
- **Logo**: Top-left or top-center placement
- **Background**: Brand-consistent gradient or solid color

---

## 4. Description Copy

### Short Description (160–280 characters)

For use in marketplace listing short description, meta tags, and social cards:

```
AI governance platform with real-time monitoring, compliance automation, and integrated revenue tracking. ISO 42001, NIST AI RMF, EU AI Act ready.
```

Character count: ~147 (within limit). Extend if platform allows more.

### Medium Description (280–500 characters)

For app store tiles, social media bios, and developer portal summaries:

```
DSG Control Plane is a production-grade AI governance and execution platform for regulated industries. Features: deterministic policy gating, Trinity multi-agent system, Stripe-native billing, ISO 42001 / NIST AI RMF compliance, EU AI Act risk classification, and cryptographic audit trails. Deploy to Vercel in 5 minutes.
```

### Long Description (1000–2000 characters)

For the full GitHub Marketplace and Stripe App listing body:

```
DSG Control Plane is a production-grade AI governance and execution platform 
designed for regulated industries and enterprise teams.

CORE CAPABILITIES

• Trinity AI Multi-Agent System — 5-agent orchestration (Mind, Hand, Eye, 
  Nerve, Spine) with deterministic policy gating and cryptographic proof 
  per execution. Each run produces planHash, proofHash, auditHash (SHA-256).

• Finance Governance & Payment Controls — AI-enforced payment approval gates 
  with multi-step workflows, real-time fraud prevention signals, and 
  finance compliance audit trails.

• AI Compliance (ISO 42001, NIST AI RMF) — Automated compliance evidence 
  collection, exportable compliance evidence packs, framework mapping.

• EU AI Act Risk-Based Governance — Risk classification, prohibited use-case 
  blocking, and high-risk system documentation templates.

• Delivery Proof — AI code proof reports with shareable links and production 
  readiness scoring. Self-serve lead magnet to enterprise scaling.

• Stripe Integration — Automated revenue event tracking, subscription 
  management, quota-based usage billing, and real-time KPI dashboard.

• Real-Time Monitoring & Audit Trails — Complete execution lineage with 
  replay capability, per-org billing isolation, and CCVS evidence chain.

SETUP IN 5 MINUTES

Deploy to Vercel → Connect Supabase → Set Stripe keys → Done.
No migration required. Works with any existing repository.

PRICING

Free → Pro ($49/mo) → Business ($199/mo) → Enterprise (custom)
14-day free trial on all paid tiers. No credit card required to start.
```

---

## 5. Social Media Copy

### Twitter / X (280 characters)

```
🚀 DSG Control Plane is live on GitHub Marketplace

AI governance + Stripe billing in one platform:
✅ Deterministic policy gating
✅ ISO 42001 / NIST AI RMF compliance
✅ Stripe-native revenue tracking
✅ Deploy in 5 minutes

Free tier available 👇
```

### LinkedIn Post

```
We've listed DSG Control Plane on GitHub Marketplace.

It's a production AI governance platform for regulated workflows — 
built for teams that need deterministic policy enforcement, not just logging.

What it does:
• 5-agent Trinity orchestration with cryptographic proof per execution
• ISO 42001, NIST AI RMF, EU AI Act compliance controls
• Stripe-native billing with real-time revenue KPI dashboard
• Deploy to Vercel in 5 minutes, no migration required

Free tier available. Pro from $49/month.

[Link to marketplace listing]
```

---

## 6. Asset Storage

Store all marketplace assets in the repository under:

```
assets/marketplace/
  logo/
    logo-full-color.svg
    logo-dark-bg.svg
    logo-monochrome.svg
    favicon.png
  screenshots/
    01-dashboard-overview.png
    02-revenue-metrics.png
    03-trinity-agent-system.png
    04-finance-governance.png
    05-pricing-page.png
  hero/
    hero-1280x720.png
```

Add `assets/` to `.gitignore` if binary files are too large for the repository. In that case, store assets in a separate GitHub release attachment or CDN.
