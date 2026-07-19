# 🎨 Brand Consistency Guide — DSG ONE

**Last Updated:** July 19, 2026  
**Version:** 1.0.0  
**Status:** Active

---

## 📖 Quick Start

### For Designers
1. Open **Claude Design** → `/design-sync` to pull DSG ONE brand system
2. Create designs using approved components from `design-system.json`
3. Export as React, Figma, or direct to Vercel
4. Verify consistency with checklist below

### For Developers
1. Use components from `app/components/` directory
2. Apply CSS variables from `app/dsg-brand.css`
3. Follow spacing scale (4px base unit: xs, sm, md, lg, xl, xxl)
4. Run brand consistency checks on save

### For Product Managers
1. All marketing materials must use approved colors
2. All CTAs must use Primary (Tertiary `#00d4aa`) button style
3. All prose follows typography hierarchy (H1 → Body)
4. All designs must pass accessibility (WCAG AA minimum)

---

## 🎯 Brand Identity

### Visual Personality

**DSG ONE** is perceived as:
- ✅ **Trustworthy** — Dark theme, premium materials
- ✅ **Modern** — Clean lines, ample spacing
- ✅ **Clear** — High contrast, readable text
- ✅ **Powerful** — Confident emerald green, purposeful design

### Target Audiences

| Audience | Context | Tone | Colors |
|----------|---------|------|--------|
| **Enterprise Operators** | Control plane dashboard | Professional, technical, authoritative | Dark + Emerald |
| **Business Users** | Customer-facing portal | Friendly, clear, trustworthy | Dark + Cyan |
| **Prospects** | Marketing site | Aspirational, premium, confident | Dark + All palette |

---

## 🎨 Color Usage Rules

### Primary Brand Color
**Tertiary: `#00d4aa` (Emerald Green)**

Used for:
- ✅ Primary call-to-action buttons
- ✅ Success states
- ✅ Highlights and emphasis
- ✅ Brand identity moments (hero sections, logos)

**Do NOT use for:**
- ❌ Body text (too bright)
- ❌ Backgrounds (insufficient contrast)
- ❌ Disabled states (means active in DSG)

### Secondary Brand Color
**Accent: `#22d3ee` (Cyan Blue)**

Used for:
- ✅ Secondary actions
- ✅ Links and navigation
- ✅ Hover states
- ✅ Decorative elements

### Text Colors
**Neutral: `#f7f5f2` (Off-white)**

- Use on dark backgrounds (#07080b or #1a1c22)
- Ensure contrast ratio ≥ 4.5:1 for WCAG AA
- For large text (18pt+), ≥ 3:1 is acceptable

### Status Colors
**Never remix these:**

| Status | Color | Hex | When to Use |
|--------|-------|-----|------------|
| ✅ Success | Emerald | `#10b981` | Completed, approved, passed |
| ⚠️ Warning | Amber | `#f59e0b` | Pending, needs attention, caution |
| ❌ Error | Rose | `#f43f5e` | Failed, blocked, critical |
| ℹ️ Info | Blue | `#3b82f6` | Information, help, status |
| 🔮 Special | Violet | `#a855f7` | Premium, SSO, unique actions |

---

## 🔤 Typography Guidelines

### Font Family
**Primary:** Inter (system-ui fallback)  
**Monospace:** Fira Code (for code blocks)

**Why Inter?**
- ✅ Modern, clean, highly readable
- ✅ Excellent line spacing (no cramping)
- ✅ Professional without being sterile
- ✅ Works equally well at all sizes

### Hierarchy Ladder

**Don't skip hierarchy levels.** Go H1 → Body or H2 → Body, never H1 → Label.

```
H1 (48px bold)
  └─ Main page title or hero headline

H2 (32px semibold)
  ├─ Section title
  └─ Card header

H3 (24px semibold)
  └─ Subsection title

Body (14px regular)
  └─ Primary content, paragraphs

Body Small (12px regular)
  └─ Captions, helper text

Label (12px medium)
  └─ Button labels, form labels
```

### Font Weight Rules

- **400 Regular** — Body text only
- **500 Medium** — Labels, emphasis within body
- **600 Semibold** — Headings (H2, H3)
- **700 Bold** — Hero headings (H1)

**Common mistake:** Using 500 or 600 for body text (makes it look heavy)

### Line Height & Letter Spacing

| Element | Font Size | Line Height | Letter Spacing |
|---------|-----------|-------------|----------------|
| H1 | 48px | 1.1 | -0.02em |
| H2 | 32px | 1.2 | -0.01em |
| H3 | 24px | 1.3 | 0em |
| Body | 14px | 1.7 | 0em |
| Label | 12px | 1.5 | 0.01em |

---

## 📐 Spacing & Layout

### Base Unit
**All spacing is a multiple of 4px.**

```
xs = 4px    (rare, inline only)
sm = 8px    (button padding)
md = 16px   (card padding, standard gaps)
lg = 24px   (section gaps)
xl = 32px   (component spacing)
xxl = 48px  (page sections)
```

### Component Spacing Examples

**Button**
- Vertical padding: `sm` (8px)
- Horizontal padding: `md` (16px)
- Gap between icons and text: `xs` (4px)

**Card**
- Padding: `md` (16px) on all sides
- Gap between cards: `lg` (24px)
- Content inside card: `md` (16px)

**Form Section**
- Section gap: `xl` (32px)
- Field gap: `md` (16px)
- Label-to-input gap: `sm` (8px)

**Page Layout**
- Horizontal padding: `xl` (32px) or 5% viewport
- Vertical section gap: `xxl` (48px)
- Max content width: 1280px (wide breakpoint)

### Border Radius Rules

| Component | Radius | Why |
|-----------|--------|-----|
| Button | `sm` (8px) | Subtle, professional |
| Input | `sm` (8px) | Matches button roundness |
| Card | `md` (12px) | Slightly rounder, softer |
| Modal | `lg` (16px) | Larger container, more prominent |
| Avatar | `full` (9999px) | Always circular |

**Never use:** 4px, 10px, 14px, 18px (not on the scale)

---

## 🌑 Elevation & Shadows

### Shadow Levels

| Level | Shadow | Z-Index | Use Case |
|-------|--------|---------|----------|
| `sm` | `0 1px 2px rgba(0,0,0,0.05)` | 10 | Subtle hover, disabled states |
| `md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | 20 | Card default, dropdown |
| `lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | 30 | Popover, floating actions |
| `xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | 40 | Modal, overlay backdrop |

**Avoid:** Custom shadow values or blur amounts

---

## ✅ Brand Consistency Checklist

Use this before finalizing any design:

### Colors
- [ ] Using only approved palette (no custom hex)
- [ ] Primary button is `#00d4aa` (Tertiary)
- [ ] Text is `#f7f5f2` (Neutral) on dark backgrounds
- [ ] Status colors match standard palette
- [ ] Contrast ratio ≥ 4.5:1 (WCAG AA) for all text
- [ ] No color used alone to convey meaning (include icons/text)

### Typography
- [ ] Font is Inter (not Helvetica, Arial, etc.)
- [ ] Font sizes match scale (not 13px, 15px, 17px)
- [ ] Font weights are 400, 500, 600, or 700 (not 350, 550, 650)
- [ ] Line heights match guidelines
- [ ] H1/H2/H3 hierarchy is correct (no H1 → Label)
- [ ] Button labels are Label style (12px, medium 500)

### Spacing
- [ ] All gaps are multiples of 4px
- [ ] Button padding is sm (v) × md (h)
- [ ] Card padding is md (16px)
- [ ] Section gaps are lg or xl
- [ ] Form field gaps are md
- [ ] Responsive margins scale appropriately

### Radius
- [ ] Button corners are `sm` (8px)
- [ ] Input corners are `sm` (8px)
- [ ] Card corners are `md` (12px)
- [ ] No arbitrary radius values (not 7px, 15px, etc.)

### Shadows
- [ ] Cards have `md` shadow by default
- [ ] Hover increases shadow to `lg`
- [ ] Modals have `xl` shadow
- [ ] Buttons have no shadow (exception: hover state `sm`)

### Responsiveness
- [ ] Mobile layout tested (< 640px)
- [ ] Tablet layout tested (640px — 1024px)
- [ ] Desktop layout tested (> 1024px)
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets ≥ 48px × 48px

### Accessibility
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Focus styles visible (2px outline)
- [ ] Semantic HTML used
- [ ] Alt text provided for images
- [ ] Keyboard navigation works
- [ ] Screen reader tested (if text)

---

## 🔄 Design-to-Code Workflow

### Step 1: Design in Claude Design
```bash
/design-sync          # Pull DSG ONE brand system
/design               # Create new design
# Design using approved components
```

### Step 2: Review & Validate
- Open design in Claude Design editor
- Run brand consistency check
- Verify accessibility (WCAG AA)
- Get peer review

### Step 3: Export to Code
```bash
/design-export        # Export design
# Choose format: React, Figma, Canva, Vercel
```

### Step 4: Integrate into Codebase
```bash
# Copy exported React components to app/components/
# Use CSS variables from app/dsg-brand.css
npm run typecheck     # Verify TypeScript
npm run build         # Verify Next.js build
```

### Step 5: Deploy to Vercel
```bash
# Push to branch claude/design-brand-consistency-bhh264
git push origin claude/design-brand-consistency-bhh264

# GitHub Actions will:
# - Run brand consistency checks
# - Verify accessibility
# - Deploy preview to Vercel
# - Generate design report
```

---

## 🛠️ Implementation Files

| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `DESIGN.md` | Brand guidelines (visual reference) | Quarterly |
| `design-system.json` | Design system config for Claude Design | On brand change |
| `.claude/design-sync.json` | Design-to-code sync configuration | On workflow change |
| `app/dsg-brand.css` | CSS variables implementation | On brand change |
| `app/components/` | React component library | Continuous |
| `app/dashboard/` | Control plane UI (using brand) | Continuous |
| `app/products/` | Customer-facing UI (using brand) | Continuous |

---

## 🚨 Common Mistakes

### ❌ Color
- ❌ Using tertiary green for text (too bright, unreadable)
- ❌ Custom hex values instead of approved palette
- ❌ Status colors remixed or modified

### ❌ Typography
- ❌ Mixing Inter with Helvetica or custom fonts
- ❌ Font sizes not on scale (13px instead of 12px or 14px)
- ❌ Skipping hierarchy (H1 → Label instead of H1 → Body)

### ❌ Spacing
- ❌ Using 5px, 7px, 10px, 15px gaps (not multiples of 4)
- ❌ Buttons padded asymmetrically (16px on all sides instead of 8px v, 16px h)
- ❌ Inconsistent card padding

### ❌ Shadows
- ❌ Custom shadow values
- ❌ Too many shadow levels (using all 4 on one page)
- ❌ Shadows on buttons (reserved for elevation)

### ❌ Accessibility
- ❌ Relying on color alone (no contrast check)
- ❌ Focus styles removed or invisible
- ❌ Text smaller than 12px
- ❌ Links without underline or icon indicator

---

## 📞 Support

### Questions?
- 📖 Read `DESIGN.md` (visual reference)
- 📋 Check `design-system.json` (technical specs)
- 🔧 Review `.claude/design-sync.json` (configuration)
- 🎯 See this file (how to apply rules)

### Design Review
- Submit PR with design changes
- Request review from Design Team Lead
- Run automatic consistency checks (`npm run design:check`)
- Deploy preview to Vercel for visual verification

### Feedback
- Slack: `#design-system`
- GitHub Issues: `label:design-system`
- Email: design@dsg.pics

---

## 📚 Related Documentation

- [`DESIGN.md`](DESIGN.md) — Visual brand guide and system tokens
- [`design-system.json`](design-system.json) — Machine-readable design system
- [`.claude/design-sync.json`](.claude/design-sync.json) — Claude Design integration config
- [`app/dsg-brand.css`](app/dsg-brand.css) — CSS variables implementation
- [`CLAUDE.md`](CLAUDE.md) — General project guidelines

---

**Version:** 1.0.0  
**Last Updated:** July 19, 2026  
**Maintained By:** DSG Design Team  
**Status:** Active
