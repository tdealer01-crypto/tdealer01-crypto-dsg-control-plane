---
version: alpha
name: DSG ONE Dark Prestige
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
typography:
  h1:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
  h2:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.7
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
---

# ระบบการออกแบบ — {% $markdoc.frontmatter.name %}

## Overview
ระบบนี้เน้นความพรีเมียม ร่วมสมัย และน่าเชื่อถือ ใช้ Dark theme เป็นหลัก พร้อม Emerald accent สำหรับ interactive elements

---

## Colors (จานสี)

| Token | Hex | ใช้สำหรับ |
|-------|-----|-----------|
| Primary | {% $markdoc.frontmatter.colors.primary %} | พื้นหลังหลัก |
| Secondary | {% $markdoc.frontmatter.colors.secondary %} | Card backgrounds |
| Tertiary | {% $markdoc.frontmatter.colors.tertiary %} | Primary actions, CTAs |
| Accent | {% $markdoc.frontmatter.colors.accent %} | Secondary actions, links |
| Neutral | {% $markdoc.frontmatter.colors.neutral %} | Text on dark bg |
| Emerald | {% $markdoc.frontmatter.colors.emerald %} | Success states |
| Amber | {% $markdoc.frontmatter.colors.amber %} | Warning states |
| Rose | {% $markdoc.frontmatter.colors.rose %} | Error states |
| Violet | {% $markdoc.frontmatter.colors.violet %} | SSO, special actions |
| Blue | {% $markdoc.frontmatter.colors.blue %} | Info states |

---

## Typography

### Headlines
- **Font:** {% $markdoc.frontmatter.typography.h1.fontFamily %}
- **H1:** {% $markdoc.frontmatter.typography.h1.fontSize %} / {% $markdoc.frontmatter.typography.h1.fontWeight %} / line-height {% $markdoc.frontmatter.typography.h1.lineHeight %}
- **H2:** {% $markdoc.frontmatter.typography.h2.fontSize %} / {% $markdoc.frontmatter.typography.h2.fontWeight %}

### Body
- **Font:** {% $markdoc.frontmatter.typography.body.fontFamily %}
- **Size:** {% $markdoc.frontmatter.typography.body.fontSize %}
- **Line Height:** {% $markdoc.frontmatter.typography.body.lineHeight %}

---

## Spacing (ระยะห่าง)

| Token | ค่า | ใช้สำหรับ |
|-------|-----|-----------|
| xs | {% $markdoc.frontmatter.spacing.xs %} | Inline elements gap |
| sm | {% $markdoc.frontmatter.spacing.sm %} | Button padding |
| md | {% $markdoc.frontmatter.spacing.md %} | Card padding |
| lg | {% $markdoc.frontmatter.spacing.lg %} | Section gap |
| xl | {% $markdoc.frontmatter.spacing.xl %} | Card border-radius |
| xxl | {% $markdoc.frontmatter.spacing.xxl %} | Page sections |

---

## Border Radius (มุมมน)

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
