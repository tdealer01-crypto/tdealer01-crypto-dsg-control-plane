# DSG Brand Guidelines

## Overview

DSG (Deterministic Execution & Governance) is the AI runtime governance and control plane platform. This guide ensures consistent brand representation across all materials.

### 🎨 Interactive Design System Tool

Explore colors, typography, components, and spacing with our **[Interactive Design System Tool](./design-system-tool.html)** — featuring:
- **Color Picker** with WCAG AA accessibility checker
- **Typography Scale** showcase
- **Component States** (buttons, alerts, etc.)
- **Spacing Scale** visualizer
- **Real-time Preview** and click-to-copy hex codes

Open the tool in your browser to interactively explore the DSG design system.

---

## Logo System

### Primary Logo
- **File:** DSG Primary Logo (Full Horizontal)
- **Usage:** Marketing materials, website headers, presentations
- **Minimum Size:** 120px width
- **Clear Space:** 1/4 of logo width on all sides
- **Background:** Works on white, light gray, or navy backgrounds

### Monogram Symbol
- **File:** DSG Monogram (Hexagonal Badge)
- **Usage:** Favicon, small icons, app badges, social media
- **Minimum Size:** 32px
- **Clear Space:** Equal to symbol width
- **Variations:** 
  - Color (Primary)
  - Monochrome (All navy)
  - Inverted (White on navy)

### Monochrome Variation
- **File:** DSG Monochrome with Text
- **Usage:** Print, PDFs, restricted color environments
- **Color:** Navy (#001F3F) only
- **Background:** White or light gray
- **Minimum Size:** 120px width

---

## Color Palette

### Primary Colors

| Color | Name | Hex Code | RGB | CSS Variable | Usage |
|-------|------|----------|-----|--------------|-------|
| 🔴 | Red (Primary) | #E10600 | 225, 6, 0 | --dsg-red | Alerts, CTAs, critical states |
| 🟦 | Sapphire (Blue) | #0F52BA | 15, 82, 186 | --dsg-sapphire | Primary brand, headers, trust |
| ✨ | Gold | #D4AF37 | 212, 175, 55 | --dsg-gold | Premium features, highlights |
| ✨ | Gold Soft | #F7DC78 | 247, 220, 120 | --dsg-gold-soft | Gradients, accents, borders |

### Dark Theme Colors

| Color | Name | Hex Code | RGB | CSS Variable | Usage |
|-------|------|----------|-----|--------------|-------|
| ⚫ | Black | #050507 | 5, 5, 7 | --dsg-black | Primary background |
| ⚫ | Black 2 | #090B12 | 9, 11, 18 | --dsg-black-2 | Secondary background |
| 🔵 | Sapphire Soft | #4F8CFF | 79, 140, 255 | --dsg-sapphire-soft | Light accent, hover states |
| 🟡 | Line | rgba(247, 220, 120, 0.16) | - | --dsg-line | Dividers, subtle borders |
| ⚪ | Text | #F8FAFC | 248, 250, 252 | --dsg-text | Primary text color |
| 🔇 | Muted | #AAB3C5 | 170, 179, 197 | --dsg-muted | Secondary text, disabled |

### Semantic Colors

| Color | Hex Code | RGB | Usage |
|-------|----------|-----|-------|
| Success | #4CAF50 | 76, 175, 80 | Positive actions, confirmations, success states |
| Warning | #FF9800 | 255, 152, 0 | Warnings, cautions, attention needed |
| Error | #E10600 | 225, 6, 0 | Errors, critical issues (same as primary red) |
| Info | #4F8CFF | 79, 140, 255 | Information, notifications (sapphire soft) |
| Neutral | #AAB3C5 | 170, 179, 197 | Disabled states, secondary text (muted) |

### Gradient & Effects

| Effect | Value | Usage |
|--------|-------|-------|
| Sapphire Glow | rgba(15, 82, 186, 0.28) | Shadow/glow effects for sapphire elements |
| Red Deep | #7F0509 | Deep red for hover/active states |
| Panel Opacity | 0.86 | Card/panel semi-transparent background |
| Panel 2 Opacity | 0.92 | Secondary panel more opaque background |

---

## Typography

### Primary Font
- **Family:** Inter (or system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- **Usage:** All UI text, body copy, headings

### Secondary Font
- **Family:** Courier New (for code blocks and monospace)
- **Usage:** Code examples, technical documentation

### Font Sizes & Weights

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Page Title) | 48px | 700 (Bold) | 1.2 |
| H2 (Section Header) | 36px | 700 (Bold) | 1.3 |
| H3 (Subsection) | 28px | 600 (SemiBold) | 1.3 |
| H4 (Heading) | 24px | 600 (SemiBold) | 1.4 |
| Body | 16px | 400 (Regular) | 1.6 |
| Small | 14px | 400 (Regular) | 1.5 |
| Caption | 12px | 400 (Regular) | 1.4 |
| Code | 14px | 500 (Medium) | 1.5 |

---

## Spacing & Layout

### Base Spacing Scale
- **4px:** Extra small gaps, inline elements
- **8px:** Small padding, compact components
- **16px:** Standard padding, card margins
- **24px:** Medium spacing, section separation
- **32px:** Large spacing, major sections
- **48px:** Extra large spacing, page sections
- **64px:** Maximum spacing, layout breaks

### Component Spacing

| Component | Padding | Margin | Gap |
|-----------|---------|--------|-----|
| Button | 12px 20px | 0 | - |
| Input | 12px 16px | 0 | - |
| Card | 24px | 16px | - |
| Section Header | 0 | 24px bottom | - |
| List Items | 16px | 0 | 8px |
| Grid/Flex | - | 0 | 16px-24px |

### Layout Grid
- **Desktop (1200px+):** 12-column grid, 24px gutters
- **Tablet (768px-1199px):** 8-column grid, 16px gutters
- **Mobile (<768px):** 4-column grid, 16px gutters, full-width padding 16px

---

## Component States & Interactions

### Button States

| State | Background | Text | Border | Cursor |
|-------|-----------|------|--------|--------|
| Default | Primary color | White | None | pointer |
| Hover | Darken 10% | White | None | pointer |
| Active/Pressed | Darken 15% | White | 2px primary | pointer |
| Disabled | Muted (#AAB3C5) | Muted | 1px muted | not-allowed |
| Focus | Primary + ring | White | 2px ring | pointer |

### Link States

| State | Color | Decoration | Weight |
|-------|-------|-----------|--------|
| Default | Sapphire Soft (#4F8CFF) | Underline | 400 |
| Visited | #8B7CB8 | Underline | 400 |
| Hover | Gold Soft (#F7DC78) | Underline + underline-offset 2px | 500 |
| Active | Red (#E10600) | Underline | 500 |
| Focus | Sapphire + ring | Underline + ring | 500 |

### Input States

| State | Border | Background | Text | Ring |
|-------|--------|-----------|------|------|
| Default | --dsg-line (gold soft 0.16) | rgba(9, 11, 18, 0.5) | --dsg-text | None |
| Hover | Sapphire Soft (0.4) | rgba(9, 11, 18, 0.6) | --dsg-text | None |
| Focus | Sapphire Soft (0.6) | rgba(9, 11, 18, 0.8) | --dsg-text | Sapphire Glow |
| Error | Red (0.6) | rgba(225, 6, 0, 0.1) | Red | Red Glow (0.2) |
| Disabled | Muted (0.2) | rgba(9, 11, 18, 0.3) | Muted | None |

### Shadows & Depth

| Level | Shadow |
|-------|--------|
| Subtle | 0 2px 8px rgba(0, 0, 0, 0.12) |
| Medium | 0 6px 16px rgba(0, 0, 0, 0.18) |
| Elevated | 0 22px 80px rgba(0, 0, 0, 0.32) |
| Card (inset) | inset 0 1px 0 rgba(255, 255, 255, 0.06) |

---

## Dark Mode Specifications

### Background Layers
- **L0 (Darkest):** --dsg-black (#050507) - Page background
- **L1 (Dark):** --dsg-black-2 (#090B12) - Card backgrounds, panels
- **L2 (Less Dark):** rgba(9, 11, 18, 0.86) - Overlay, modal backgrounds
- **L3 (Slight):** rgba(15, 82, 186, 0.12) - Subtle highlights for blue cards

### Text Layers
- **Primary:** --dsg-text (#F8FAFC) - Main body text, headlines
- **Secondary:** --dsg-muted (#AAB3C5) - Secondary text, hints, labels
- **Tertiary:** rgba(170, 179, 197, 0.6) - Disabled text, very subtle

### Border Styles
- **Primary:** --dsg-line (gold soft 0.16) - Subtle dividers, card borders
- **Accent:** Sapphire Soft (0.26) - Blue-themed borders, emphasis
- **Alert:** Red (0.32) - Error/warning borders

### Gradient Backgrounds
- **Radial Red:** radial-gradient(circle at 14% 0%, rgba(225, 6, 0, 0.22), transparent 34%)
- **Radial Blue:** radial-gradient(circle at 86% 9%, rgba(15, 82, 186, 0.26), transparent 34%)
- **Radial Gold:** radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.13), transparent 48%)
- **Grid Pattern:** Linear gradients for subtle grid at 44px intervals with 0.024 opacity

---

## Logo Usage Rules

### ✅ DO

- Use the logo with plenty of white space (1/4 width minimum)
- Scale proportionally to maintain aspect ratio
- Use on contrasting backgrounds for visibility
- Use official color versions or monochrome
- Include clear space around logo

### ❌ DON'T

- Stretch, skew, or rotate the logo
- Change logo colors (except monochrome/inverted)
- Add effects like shadows or outlines
- Place on busy/patterned backgrounds
- Reduce below minimum sizes (120px width for full logo, 32px for monogram)
- Separate the symbol from text in primary logo
- Use outdated logo versions

---

## Color Application

### Web & Digital (Dark Theme Primary)
- **Backgrounds:** 
  - Page: --dsg-black (#050507)
  - Cards/Panels: --dsg-black-2 (#090B12) with 0.86-0.92 opacity
  - Overlays: rgba(9, 11, 18, 0.5-0.8)
- **Primary CTAs:** Red (#E10600) with white text, sapphire glow on hover
- **Secondary CTAs:** Sapphire (#0F52BA) with light text, gold accent
- **Accent CTAs:** Gold (#D4AF37) to (#F7DC78) gradient for premium
- **Links:** Sapphire Soft (#4F8CFF) with underline, gold on hover
- **Borders:** --dsg-line (gold 0.16) for subtle, sapphire for emphasis
- **Text:** --dsg-text (#F8FAFC) primary, --dsg-muted (#AAB3C5) secondary
- **Glows/Shadows:** Sapphire glow (0.28), red glow (0.22), gold lines (0.2)

### Web & Digital (Light Theme Alternative)
- **Backgrounds:** White or light gray
- **Primary CTAs:** Sapphire (#0F52BA) with white text
- **Secondary CTAs:** Red (#E10600) with white text
- **Accent:** Gold (#D4AF37) for highlights
- **Text:** Sapphire (#0F52BA) body, muted secondary
- **Borders:** Sapphire or light gray

### Print & PDF
- **Use monochrome logo (Sapphire only)**
- **Background:** White or light gray (minimum 90% gray)
- **Text:** Sapphire (#0F52BA) for body, white on sapphire backgrounds
- **Accent:** Red (#E10600) for highlights, gold for premium
- **CMYK Approximations:**
  - Sapphire: 100C 70M 0Y 5K
  - Red: 0C 100M 100Y 0K
  - Gold: 15C 30M 100Y 10K

---

## Product Components

### Navigation Bar
- **Background:** rgba(5, 5, 7, 0.88) with gold border-bottom
- **Text:** --dsg-text (#F8FAFC)
- **Logo:** Full horizontal or monogram
- **Active Link:** Gold (#F7DC78) underline, sapphire text
- **Hover:** Increase opacity to 1.0, gold glow
- **Accessibility:** Focus ring on links, sufficient contrast ratio

### Call-to-Action Buttons

**Primary (Gold/Premium)**
- **Background:** Linear gradient from #F7DC78 to #D4AF37
- **Text:** #060608 (dark text on light background)
- **Border:** None
- **Hover:** Increase saturation, shadow elevation
- **Active:** Darken gradient by 8%
- **Focus:** Ring 2px solid gold, offset 2px
- **Shadow:** 0 14px 34px rgba(212, 175, 55, 0.22)

**Secondary (Sapphire)**
- **Background:** rgba(15, 82, 186, 0.18)
- **Border:** 1px solid rgba(79, 140, 255, 0.42)
- **Text:** #DBEAFE (light blue)
- **Hover:** Increase background opacity to 0.26, sapphire glow
- **Active:** Sapphire border 2px
- **Focus:** Ring sapphire glow 0.28

**Danger (Red)**
- **Background:** rgba(225, 6, 0, 0.14)
- **Border:** 1px solid rgba(225, 6, 0, 0.38)
- **Text:** #FECACA (light red)
- **Hover:** Increase background opacity to 0.2, red glow
- **Active:** Red border 2px
- **Focus:** Ring red glow 0.22

### Alert & Status Badges

| Type | Background | Border | Text | Icon |
|------|-----------|--------|------|------|
| Success | rgba(76, 175, 80, 0.2) | 1px #4CAF50 | #4CAF50 | Check icon |
| Warning | rgba(255, 152, 0, 0.2) | 1px #FF9800 | #FF9800 | Alert icon |
| Error | rgba(225, 6, 0, 0.2) | 1px #E10600 | #FECACA | X icon |
| Info | rgba(15, 82, 186, 0.2) | 1px sapphire soft | #DBEAFE | Info icon |
| Note | rgba(212, 175, 55, 0.1) | 1px --dsg-line | #F7DC78 | Star icon |

### Code Blocks
- **Background:** rgba(5, 5, 7, 0.95) with gold border-left
- **Border-left:** 3px --dsg-gold-soft
- **Text:** --dsg-text (#F8FAFC)
- **Line Numbers:** --dsg-muted (#AAB3C5), right-aligned
- **Syntax Highlight:**
  - Keywords: Sapphire Soft (#4F8CFF)
  - Strings: Gold (#D4AF37)
  - Comments: Muted (#AAB3C5)
  - Numbers: Sapphire (#0F52BA)
  - Functions: Sapphire Soft (#4F8CFF)
- **Copy Button:** Positioned top-right, appears on hover

### Cards & Panels
- **Standard Card:** 
  - Border: 1px --dsg-line
  - Background: Linear gradient (top) + --dsg-panel
  - Box-shadow: 0 22px 80px rgba(0,0,0,0.32) + inset light
- **Blue Card Variant:**
  - Border: 1px sapphire (0.26)
  - Background: Sapphire gradient + --dsg-panel-2
  - Shadow: 0 22px 80px sapphire (0.12)
- **Red Card Variant:**
  - Border: 1px red (0.32)
  - Background: Red gradient + --dsg-panel-2
  - No shadow (alert emphasis)

### Badge/Chip
- **Background:** rgba(212, 175, 55, 0.1)
- **Border:** 1px rgba(247, 220, 120, 0.34)
- **Text:** --dsg-gold-soft (#F7DC78)
- **Padding:** 8px 14px
- **Border-radius:** 999px (full round)
- **Typography:** 0.72rem, 800 weight, 0.2em letter-spacing, uppercase

---

## Imagery & Icons

### Icon Style
- **Style:** Outlined or filled
- **Colors:** Navy (#001F3F) primary, Cyan (#00BCD4) accent, Cardinal Red (#CC0000) for alerts
- **Minimum Size:** 16px
- **Stroke Width:** 2px for outlined icons

### Photography
- **Theme:** Technology, governance, AI, collaboration
- **Colors:** Incorporate brand colors naturally
- **Tone:** Professional, trustworthy, innovative
- **Avoid:** Generic stock photos, outdated tech imagery

---

## Application Examples

### Marketing Materials (Dark Theme)
```
Background: Radial gradients of red (14% 0%), sapphire (86% 9%), gold (50% 0%)
Over: Linear gradient from #050507 to #090B12
Header: DSG Logo on sapphire or transparent
Headline: --dsg-text (#F8FAFC), 48px bold
Subheading: Gold Soft (#F7DC78), 28px semibold
CTA Button: Gold gradient #F7DC78→#D4AF37 with shadow
Secondary CTA: Sapphire border with light text
Accents: Sapphire Soft (#4F8CFF) for highlights, Gold for premium
```

### Dashboard Components (Dark Theme)
```
Top Bar: rgba(5, 5, 7, 0.88) with gold border-bottom
Sidebar: --dsg-black (#050507)
Main Content: --dsg-black with subtle grid pattern
Headers: --dsg-text (#F8FAFC), 28-36px
Card Headers: 24px bold, sapphire or gold text
Links: Sapphire Soft (#4F8CFF) with underline
Breadcrumbs: Muted text with sapphire active
Status Badge: Color-coded (green/warning/red/blue)
Success Messages: Green (#4CAF50) on rgba(76, 175, 80, 0.1)
Error Messages: Red (#E10600) on rgba(225, 6, 0, 0.14)
Warning Messages: Orange (#FF9800) on rgba(255, 152, 0, 0.1)
Info Messages: Sapphire Soft on rgba(15, 82, 186, 0.1)
```

### Documentation (Dark Theme)
```
Page Background: --dsg-black (#050507)
Headers: --dsg-text (#F8FAFC), 28-48px
Subheaders: Gold Soft (#F7DC78), 20-28px
Body Text: --dsg-text (#F8FAFC), 16px, 1.6 line-height
Secondary Text: --dsg-muted (#AAB3C5)
Code Blocks: rgba(5, 5, 7, 0.95) with gold left border
Inline Code: Gold (#D4AF37) on rgba(212, 175, 55, 0.1)
Links: Sapphire Soft (#4F8CFF), underline on hover
Blockquote: Sapphire border-left (2px), italic, muted text
Callouts: 
  - Info: Sapphire border-left with sapphire (0.1) background
  - Warning: Gold border-left with gold (0.1) background
  - Danger: Red border-left with red (0.1) background
  - Success: Green border-left with green (0.1) background
Tables:
  - Header Row: Sapphire background, white text, bold
  - Data Rows: Alternate row colors (black, black-2)
  - Borders: --dsg-line (gold 0.16)
  - Hover Row: Sapphire (0.08) background
```

---

## Brand Voice & Tone

### Voice
- **Professional** but approachable
- **Technical** yet clear
- **Confident** in our capabilities
- **Transparent** about limitations

### Tone
- **Documentation:** Clear, concise, instructive
- **Marketing:** Compelling, benefit-focused, aspirational
- **Support:** Helpful, patient, solution-oriented
- **Social Media:** Engaging, informative, community-focused

---

## File Formats & Specifications

### Logo Files
- **SVG:** Vector format for web (scalable, smallest file size)
- **PNG:** 300dpi for print, 72dpi for web
- **PDF:** For print materials (press release, documents)

### Color Specifications
- **Web:** Hex codes (#001F3F)
- **Print:** CMYK values (on request)
- **Mobile:** RGB values (0, 31, 63)

---

## Implementation Checklist

### For Developers
- [ ] Import CSS variables from `app/dsg-brand.css` 
- [ ] Use semantic color variables (--dsg-red, --dsg-sapphire, --dsg-gold, etc.)
- [ ] Apply spacing scales (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- [ ] Implement component states (hover, active, disabled, focus)
- [ ] Test dark mode appearance and contrast ratios
- [ ] Verify button/link keyboard navigation and focus rings
- [ ] Check image alt text and icon ARIA labels
- [ ] Validate color contrast for WCAG AA compliance (4.5:1 minimum)

### For Designers
- [ ] Use approved color palette in design files
- [ ] Maintain consistent typography scales
- [ ] Apply proper spacing and alignment to grid
- [ ] Design for both dark and light themes
- [ ] Include focus states and interactive feedback
- [ ] Use component library for consistency
- [ ] Test designs at multiple screen sizes
- [ ] Validate with accessibility checklist

### For Product/Marketing
- [ ] Use official logo files only (no recreations)
- [ ] Maintain clear space around logos
- [ ] Include brand colors in marketing materials
- [ ] Ensure messaging aligns with brand voice
- [ ] Get approval before external partnerships
- [ ] Track brand consistency across channels

---

## Accessibility Guidelines

### Color Contrast
- **Minimum WCAG AA:** 4.5:1 for body text, 3:1 for large text
- **Enhanced WCAG AAA:** 7:1 for body text, 4.5:1 for large text
- **Do not rely solely on color:** Use text labels, icons, or patterns

### Focus States
- **All interactive elements must have visible focus indicators**
- Focus ring: 2px solid, offset 2px, minimum contrast 3:1
- Focus ring color: Primary brand color or high-contrast alternative

### Motion & Animation
- **Respect prefers-reduced-motion:** Disable animations for users who opt out
- **Keep animations under 300ms:** Prevent motion sickness
- **Use consistent timing:** Maintain predictable motion patterns
- **Provide pause controls:** Allow users to pause auto-playing content

### Typography
- **Line height minimum 1.5:** For body text (1.6 is preferred)
- **Font size minimum 16px:** For body text, up to 1.5x on mobile
- **Letter spacing:** Keep natural, avoid extreme compression
- **Avoid justified text:** Align left for readability
- **Use semantic HTML headings:** h1 > h2 > h3, etc.

---

## Asset Management

### Logo Storage
- Official logos: `docs/assets/logos/`
- Favicon variants: `docs/assets/logos/favicon/`
- Social media avatars: `docs/assets/logos/social/`

### Color Assets
- Brand palette PNG: `docs/assets/colors/dsg-brand-palette.png`
- Full brand board: `docs/assets/dsg-full-brand-board.png`
- CSS variables: `app/dsg-brand.css`

### Icon Library
- System icons: Use Lucide React (already in dependencies)
- Brand-specific icons: Store in `public/icons/`
- Icon sizing: 16px (small), 24px (standard), 32px (large), 48px+ (hero)

---

## Compliance & Approval

### Logo Usage Approval
- **Minor variations (colors, sizing within guidelines):** No approval needed
- **Significant changes (redraws, new layouts):** Email branding@dsg.pics
- **External use (partnerships, press):** Board approval required
- **Turnaround:** 2-3 business days for approval requests

### Brand Guideline Updates
- **This document is source of truth** for all DSG brand decisions
- Report discrepancies via GitHub issues with label `brand-guidelines`
- Update cycle: Quarterly or as needed
- Breaking changes: Coordinate with product and marketing teams

### Asset Requests
- **Official logos:** `docs/assets/logos/` (SVG, PNG, PDF formats)
- **Color swatches:** `docs/assets/colors/` (PNG, Figma library)
- **Typography samples:** In this document, test via `npm run dev`
- **Custom assets:** Submit request with use case to branding@dsg.pics

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-07-13 | Complete redesign for dark theme, added component states, spacing guidelines, accessibility, implementation checklist |
| 1.0 | 2026-07-04 | Initial brand guidelines |

---

**Last Updated:** 2026-07-13  
**Maintained By:** DSG Branding Team  
**Contact:** branding@dsg.pics  
**Approval:** board-review@dsg.pics  
**Bug Reports:** GitHub Issues #brand-guidelines
