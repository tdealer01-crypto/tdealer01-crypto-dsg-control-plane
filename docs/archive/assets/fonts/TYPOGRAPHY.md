# DSG Typography System

Official typography guidelines for consistent brand communication.

## Primary Font Family

**Inter** (or system fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)

### Font Files

- **Font:** Inter (Google Fonts: https://fonts.google.com/specimen/Inter)
- **License:** Open Font License (OFL)
- **Weights Available:** 100, 200, 300, 400, 500, 600, 700, 800, 900
- **Variants:** Regular, Italic, Variable

### Web Implementation

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-primary: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  --font-mono: "Courier New", Courier, monospace;
}
```

## Secondary Font

**Courier New** (for code blocks and monospace)

- **Usage:** Code examples, technical documentation, pre-formatted text
- **Fallback:** Courier, monospace
- **Weight:** 400 (Regular), 700 (Bold)

## Type Scale

### Heading Hierarchy

| Element | Size | Weight | Line Height | Letter Spacing | Usage |
|---------|------|--------|-------------|----------------|-------|
| **H1** (Page Title) | 48px | 700 (Bold) | 1.2 (58px) | -0.5px | Main page headings |
| **H2** (Section Header) | 36px | 700 (Bold) | 1.3 (47px) | -0.3px | Section titles |
| **H3** (Subsection) | 28px | 600 (SemiBold) | 1.3 (36px) | -0.2px | Subsection titles |
| **H4** (Heading) | 24px | 600 (SemiBold) | 1.4 (34px) | 0px | Minor headings |
| **H5** (Small Heading) | 20px | 600 (SemiBold) | 1.4 (28px) | 0px | Labels, small headings |
| **H6** (Smallest Heading) | 16px | 600 (SemiBold) | 1.5 (24px) | 0px | Micro headings |

### Body & Text

| Element | Size | Weight | Line Height | Letter Spacing | Usage |
|---------|------|--------|-------------|----------------|-------|
| **Body** (Default) | 16px | 400 (Regular) | 1.6 (26px) | 0px | Main body text, paragraphs |
| **Small** | 14px | 400 (Regular) | 1.5 (21px) | 0px | Secondary text, captions |
| **Caption** | 12px | 400 (Regular) | 1.4 (17px) | 0.3px | Tiny labels, timestamps |
| **Code** (Inline) | 14px | 500 (Medium) | 1.5 (21px) | 0px | Inline code snippets |
| **Code** (Block) | 13px | 400 (Regular) | 1.6 (21px) | 0px | Code blocks, pre-formatted |

## Font Pairing Examples

### Headlines + Body

```
H1: "Prove Your AI Policy Works — Formally" (Inter Bold, 48px)
Body: "Formal proof at scale with deterministic governance" (Inter Regular, 16px)
```

### Dashboard UI

```
Section Title: "DSG Executions" (Inter SemiBold, 24px)
Metric Label: "Total Events" (Inter Regular, 14px)
Metric Value: "2,501" (Inter Bold, 32px)
```

### Documentation

```
H2: "Quick Start" (Inter Bold, 36px)
Body: "Get started in 5 minutes" (Inter Regular, 16px)
Code: npm run verify:policy:hpc:local (Courier New, 13px)
```

## Responsive Sizing

For mobile devices (< 768px width):

| Element | Desktop | Mobile | Scale |
|---------|---------|--------|-------|
| H1 | 48px | 32px | 66% |
| H2 | 36px | 28px | 78% |
| H3 | 28px | 24px | 86% |
| Body | 16px | 16px | 100% |
| Small | 14px | 12px | 86% |

## CSS Variables

```css
:root {
  /* Font Families */
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  --font-mono: "Courier New", Courier, monospace;
  
  /* Weights */
  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  
  /* Sizes */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 28px;
  --text-3xl: 36px;
  --text-4xl: 48px;
  
  /* Line Heights */
  --lh-tight: 1.2;
  --lh-normal: 1.5;
  --lh-relaxed: 1.6;
}
```

## Accessibility

- **Minimum Font Size:** 12px (captions only)
- **Minimum Contrast:** 4.5:1 (normal text), 3:1 (large text)
- **Line Height:** Minimum 1.5 for body text
- **Letter Spacing:** 0px for headings, 0px for body (variable for display)

---

**Last Updated:** 2026-07-04
**Design System:** branding@dsg.pics
