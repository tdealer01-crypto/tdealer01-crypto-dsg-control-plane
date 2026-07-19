---
version: "1.0.0"
name: DSG ONE Dark Prestige
release_date: "2026-07-19"
maintainer: "DSG Design Team"
target_platforms:
  - vercel
  - web
  - control-plane
  - customer-facing
colors:
  primary: "#07080b"
  secondary: "#1a1c22"
  tertiary: "#00d4aa"
  accent: "#22d3ee"
  neutral: "#f7f5f2"
  primary-60: "#33373b"
  primary-20: "#D1D5DB"
  emerald: "#10b981"
  amber: "#f59e0b"
  rose: "#f43f5e"
  violet: "#a855f7"
  blue: "#3b82f6"
  gray-50: "#fafaf9"
  gray-900: "#0a0a0a"
typography:
  h1:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.01em"
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
radius:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
shadows:
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
---

# 🎨 Brand Guidelines — DSG ONE

## Overview

**DSG ONE** คือ Enterprise AI Runtime Control Plane ที่เน้น:
- 🔐 **ความเชื่อถือ** — Deterministic, auditable, compliant
- 🎯 **ความเข้มข้น** — Professional, modern, premium
- ✨ **ความโปร่งใส** — Clear, accessible, intuitive

ระบบ Brand นี้ให้ความรู้สึกพรีเมียม สมดุล และน่าเชื่อถือผ่านการใช้สีโลหะ, ฟอนต์ที่ชัดเจน และเว้นวรรค ที่สอดคล้องกัน

---

## 🎨 Color Palette

### Core Colors

| Token | Hex | RGB | ใช้สำหรับ | Accessibility |
|-------|-----|-----|-----------|-------------|
| **Primary** | `#07080b` | 7, 8, 11 | หลักพื้นหลัง (background) | WCAG AA ✓ |
| **Secondary** | `#1a1c22` | 26, 28, 34 | Card, container backgrounds | WCAG AA ✓ |
| **Tertiary** | `#00d4aa` | 0, 212, 170 | Primary CTAs, success highlights | WCAG AA ✓ |
| **Accent** | `#22d3ee` | 34, 211, 238 | Secondary actions, links | WCAG AA ✓ |
| **Neutral** | `#f7f5f2` | 247, 245, 242 | Text on dark backgrounds | WCAG AAA ✓ |

### Status Colors

| Status | Color | Hex | ใช้สำหรับ |
|--------|-------|-----|-----------|
| ✅ Success | Emerald | `#10b981` | Approved, executed, complete |
| ⚠️ Warning | Amber | `#f59e0b` | Pending review, needs attention |
| ❌ Error | Rose | `#f43f5e` | Blocked, failed, critical |
| ℹ️ Info | Blue | `#3b82f6` | Information, help, status |
| 🔮 Special | Violet | `#a855f7` | SSO, premium features, governance |

### Opacity Scale

| Level | Opacity | Hex Suffix | ใช้สำหรับ |
|-------|---------|-----------|-----------|
| Subtle | 10% | CC (80 in decimal) | Disabled, subtle backgrounds |
| Light | 30% | 4D | Hover states, borders |
| Medium | 50% | 80 | Interactive elements |
| Full | 100% | FF | Text, active states |

**Example:** `#07080b80` = Primary color at 50% opacity

---

## 🔤 Typography System

### Hierarchy

**Heading 1** — Page titles, main sections
- Font: Inter, 48px, Bold (700)
- Line height: 1.1
- Letter spacing: -0.02em
- Use case: Hero sections, page titles

**Heading 2** — Section titles
- Font: Inter, 32px, Semi-bold (600)
- Line height: 1.2
- Letter spacing: -0.01em
- Use case: Card titles, section headers

**Heading 3** — Subsection titles
- Font: Inter, 24px, Semi-bold (600)
- Line height: 1.3
- Use case: Subsection headers

**Body** — Primary content
- Font: Inter, 14px, Regular (400)
- Line height: 1.7
- Use case: Paragraphs, descriptions, main text

**Body Small** — Secondary content
- Font: Inter, 12px, Regular (400)
- Line height: 1.6
- Use case: Captions, helper text, metadata

**Label** — UI labels
- Font: Inter, 12px, Medium (500)
- Line height: 1.5
- Letter spacing: 0.01em
- Use case: Button labels, form labels, badges

### Font Weights

- **400** — Regular (body text)
- **500** — Medium (labels, emphasis)
- **600** — Semi-bold (headings, strong)
- **700** — Bold (hero headings)

---

## 📏 Spacing System

All spacing follows a **4px base unit** scale:

| Token | Value | Use Case |
|-------|-------|----------|
| `xs` | 4px | Inline gaps, small margins |
| `sm` | 8px | Button padding, small gaps |
| `md` | 16px | Card padding, standard gaps |
| `lg` | 24px | Section gaps, component spacing |
| `xl` | 32px | Large gaps, page sections |
| `xxl` | 48px | Hero sections, major layout gaps |

**Example:** Button padding = `sm` (8px) top/bottom, `md` (16px) left/right

---

## 🔲 Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `sm` | 8px | Subtle corners (buttons, badges) |
| `md` | 12px | Standard corners (cards, inputs) |
| `lg` | 16px | Larger elements (modals, panels) |
| `xl` | 24px | Large containers, rounded cards |
| `full` | 9999px | Circles, fully rounded elements |

---

## 🌑 Shadows (Elevation)

| Level | CSS | Use Case |
|-------|-----|----------|
| `sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle depth, hover states |
| `md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards, default elevation |
| `lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Modals, overlays |

---

## 🎯 Component Guidelines

### Buttons

**Primary Button**
- Background: Tertiary (`#00d4aa`)
- Text: Primary (`#07080b`)
- Padding: `sm` (8px) vertical, `md` (16px) horizontal
- Radius: `sm` (8px)
- Hover: Darken 10%
- Font: Label (12px, medium 500)

**Secondary Button**
- Background: Secondary (`#1a1c22`)
- Text: Neutral (`#f7f5f2`)
- Border: 1px Accent (`#22d3ee`)
- Padding: Same as primary
- Radius: `sm` (8px)
- Hover: Increase border opacity to 60%

**Danger Button**
- Background: Rose (`#f43f5e`)
- Text: White
- Padding: Same as primary
- Radius: `sm` (8px)
- Hover: Darken 10%

### Cards

- Background: Secondary (`#1a1c22`)
- Border: 1px `rgba(255,255,255,0.1)`
- Padding: `md` (16px)
- Radius: `md` (12px)
- Shadow: `md`
- Hover shadow: `lg`

### Inputs & Forms

- Background: Primary (`#07080b`)
- Border: 1px `rgba(255,255,255,0.2)`
- Text: Neutral (`#f7f5f2`)
- Placeholder: Primary-60 (`#33373b`)
- Padding: `sm` (8px) vertical, `md` (16px) horizontal
- Radius: `sm` (8px)
- Focus: Border color → Accent (`#22d3ee`)

---

## ✅ Brand Consistency Checklist

When creating new designs:

- [ ] **Colors** — Using only approved palette (no custom hex values)
- [ ] **Typography** — Following font weights, sizes, line heights exactly
- [ ] **Spacing** — All gaps are multiples of 4px (xs, sm, md, lg, xl, xxl)
- [ ] **Radius** — Using defined radius tokens (not arbitrary values)
- [ ] **Shadows** — Using predefined shadow levels (sm, md, lg, xl)
- [ ] **Accessibility** — Text contrast meets WCAG AA/AAA
- [ ] **Responsive** — Mobile → tablet → desktop breakpoints defined
- [ ] **States** — Hover, active, disabled, loading states defined

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Device |
|-----------|-------|--------|
| `mobile` | < 640px | Phone |
| `tablet` | 640px — 1024px | Tablet |
| `desktop` | > 1024px | Desktop |

---

## 🌐 Usage Across Platforms

### Control Plane Dashboard
- Target: Internal operators, system admins
- Theme: Dark mode (primary)
- Components: Complex forms, data tables, charts
- Fonts: Label (buttons), Body (content), H2/H3 (sections)

### Customer-Facing Portal
- Target: End users, businesses
- Theme: Dark mode with optional light mode
- Components: Simple forms, cards, CTAs
- Fonts: H1 (hero), Body (content), Label (buttons)

### Marketing Site
- Target: Prospects, partners
- Theme: Both light and dark modes
- Components: Hero sections, feature cards, testimonials
- Fonts: H1/H2 (marketing), Body (description)

---

## 🔄 Design-to-Code Workflow

### Using Claude Design with DSG Brand

1. **Open Claude Design** → `/design-sync` pulls this system
2. **Create design** using approved components
3. **Export** as React components or code
4. **Verify** consistency with this guide
5. **Deploy** to Vercel

### Export Formats

- ✅ **Canva** — For marketing/promotional designs
- ✅ **React Components** — For web app integration
- ✅ **Figma** — For detailed design handoff
- ✅ **PDF** — For presentations/specs
- ✅ **Vercel** — Direct deployment

---

## 📚 Related Files

- `app/dsg-brand.css` — CSS variables implementation
- `app/components/` — React component library
- `app/dashboard/` — Control plane UI (using this brand)
- `.claude/design-sync.json` — Design system config for Claude Design

---

**Last Updated:** July 19, 2026  
**Version:** 1.0.0  
**Status:** Active  
**Platform:** Vercel, Web, Control Plane, Customer-Facing

| Token | ค่า | ใช้สำหรับ |
|-------|-----|-----------|
| sm | {% $markdoc.frontmatter.radius.sm %} | Small buttons, badges |
| md | {% $markdoc.frontmatter.radius.md %} | Input fields |
| lg | {% $markdoc.frontmatter.radius.lg %} | Cards |
| xl | {% $markdoc.frontmatter.radius.xl %} | Large cards, modals |
| full | {% $markdoc.frontmatter.radius.full %} | Avatars, pills |

---

## Components (คอมโพเนนต์)

### Buttons
- **Primary:** bg `tertiary` / text `primary` / rounded `xl` / hover scale 1.01
- **Secondary:** border `white/10` / bg `white/5` / rounded `xl`
- **Text:** text `emerald` / hover underline

### Cards
- **Default:** border `white/10` / bg `white/[0.02]` / rounded `2xl` / padding `lg`
- **Hover:** border `white/20` / bg `white/[0.04]` / translateY -2px

### Inputs
- **Default:** border `white/10` / bg `primary` / rounded `xl`
- **Focus:** border `tertiary/50` / ring `tertiary/20`

### Status Dots
- **OK:** bg `emerald` / shadow glow emerald
- **Warn:** bg `amber` / shadow glow amber
- **Error:** bg `rose` / shadow glow rose

---

## Do's and Don'ts

- **Do:** ใช้ dark background (#07080b) เป็นพื้นฐานทั้งหมด
- **Do:** ใช้ Emerald (#00d4aa) สำหรับ primary CTA เท่านั้น
- **Do:** ใช้ Thai language สำหรับ UI labels ทั้งหมด
- **Don't:** ใช้สีขาวเป็น background หลัก
- **Don't:** ผสมมุมมนและมุมเหลี่ยมในหน้าเดียวกัน
- **Don't:** ใช้ `bg-white` หรือ `text-black` โดยตรง — ใช้ neutral แทน
