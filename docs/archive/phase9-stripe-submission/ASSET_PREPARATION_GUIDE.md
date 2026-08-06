# Asset Preparation Guide

**Status:** Guide for preparing submission assets  
**Timeline:** 1-2 hours to prepare all assets  
**Target:** All assets ready before running validation scripts

---

## Overview

This guide helps you prepare the visual assets needed for Stripe Marketplace submission:

1. **Icon** (1 file) - App icon displayed in marketplace
2. **Screenshots** (3-5 files) - Show app in action
3. **Legal Documents** (2 files, optional) - Privacy policy & TOS

All assets must be prepared BEFORE running the validation scripts.

---

## Icon: 1200x1200 PNG

### Specifications
- **Filename:** `icon-1200x1200.png`
- **Path:** `docs/phase9-stripe-submission/assets/icon-1200x1200.png`
- **Format:** PNG with transparency or solid background
- **Dimensions:** Exactly 1200 × 1200 pixels
- **File Size:** Recommended < 2MB (typically 200-500KB)
- **Background:** Transparent (recommended) or solid color
- **Design:** Clear and recognizable at small sizes (64×64 minimum)

### Design Guidelines

The icon should:
- Represent "governance" and "gates"
- Be professional and modern
- Have good contrast for readability
- Work in light and dark modes
- Avoid text or be readable at 64×64
- Use company colors (if available)

### Example Designs

**Option 1: Gate/Lock Icon**
```
A shield with a gate or door symbol
- Symbolizes governance and protection
- Clean, modern lines
- Easy to recognize at any size
```

**Option 2: Gate/Flow Icon**
```
Geometric gate or flow pattern
- Represents policy flow and gates
- Uses 2-3 brand colors
- Professional and scalable
```

**Option 3: D + G Monogram**
```
Stylized "DG" or "DSG" letters
- Represents DSG Governance
- Unique company branding
- Works well at all sizes
```

### How to Create

**Using Figma (Free):**
1. Go to figma.com
2. Create new file
3. Create 1200×1200 artboard
4. Design icon
5. Export as PNG (1200×1200)
6. Save to: `docs/phase9-stripe-submission/assets/icon-1200x1200.png`

**Using Canva (Free):**
1. Go to canva.com
2. Create "Logo" design (1200×1200)
3. Design icon
4. Download as PNG
5. Save to: `docs/phase9-stripe-submission/assets/icon-1200x1200.png`

**Using Adobe XD / Illustrator:**
1. Create 1200×1200 artboard
2. Design icon
3. Export as PNG (1200×1200, 72 dpi)
4. Save to: `docs/phase9-stripe-submission/assets/icon-1200x1200.png`

**Using Open Source Tools:**
- Inkscape (free, vector design)
- GIMP (free, raster design)
- Krita (free, digital painting)

### Quality Checklist

- [ ] Exactly 1200×1200 pixels
- [ ] PNG format
- [ ] Clear and legible at 64×64 size
- [ ] Good contrast for readability
- [ ] Professional appearance
- [ ] Works in light and dark modes
- [ ] No blurriness or compression artifacts
- [ ] File size < 2MB

---

## Screenshots: 1200×800 PNG

### Specifications

**All Screenshots:**
- **Format:** PNG
- **Dimensions:** 1200 × 800 pixels (3:2 aspect ratio)
- **File Size:** Recommended < 3MB per screenshot
- **Compression:** Use PNG compression, no artifacts

**Naming Convention:**
```
screenshot-[NUMBER]-[DESCRIPTION].png
screenshot-1-dashboard-integration.png
screenshot-2-governance-gate.png
screenshot-3-audit-trail.png
```

### Required Screenshots (3 minimum)

#### Screenshot 1: Dashboard Integration
**File:** `screenshot-1-dashboard-integration.png`  
**Path:** `docs/phase9-stripe-submission/assets/screenshot-1-dashboard-integration.png`

**What to show:**
- App integrated in Stripe Dashboard
- Charge detail view with governance gate
- Clear governance decision display
- Professional UI with branding

**How to capture:**
1. Log in to Stripe Dashboard (sandbox account)
2. Go to a charge detail page
3. Show governance gate panel/widget
4. Take screenshot: 1200×800
5. Crop and save

**Design tips:**
- Highlight the governance gate component
- Show decision indicator (PASS/REVIEW/BLOCK)
- Include Stripe dashboard context
- Use clear fonts and colors

#### Screenshot 2: Governance Gate Decision
**File:** `screenshot-2-governance-gate.png`  
**Path:** `docs/phase9-stripe-submission/assets/screenshot-2-governance-gate.png`

**What to show:**
- Policy evaluation result
- Decision: PASS, REVIEW, or BLOCK
- Reason for decision
- Policy rules applied
- Clear, understandable UI

**How to capture:**
1. Show app's governance decision UI
2. Display PASS decision (green, checkmark)
3. Show reason/justification
4. Include policy details if available
5. Take screenshot: 1200×800

**Design tips:**
- Make decision status very clear
- Show decision reason/evidence
- Use color (green=PASS, yellow=REVIEW, red=BLOCK)
- Professional layout

#### Screenshot 3: Audit Trail
**File:** `screenshot-3-audit-trail.png`  
**Path:** `docs/phase9-stripe-submission/assets/screenshot-3-audit-trail.png`

**What to show:**
- Immutable audit trail
- Historical governance decisions
- Timestamps and user info
- Cryptographic proof or hash
- Professional reporting UI

**How to capture:**
1. Show audit trail view in app
2. Display multiple decisions over time
3. Show timestamps and details
4. Include proof/hash information
5. Take screenshot: 1200×800

**Design tips:**
- Show historical context
- Include timestamps
- Display decision progression
- Professional table or timeline format

### Optional Screenshots (2 additional)

#### Screenshot 4: Policy Configuration
**File:** `screenshot-4-policy-config.png`

**What to show:**
- Policy management interface
- Configurable governance rules
- Easy rule creation UI
- Policy versioning or history

#### Screenshot 5: Approval Workflow
**File:** `screenshot-5-approval-workflow.png`

**What to show:**
- Multi-approval workflow
- Pending decisions queue
- Approve/reject buttons
- Role-based access control

### How to Capture Screenshots

**Option 1: Using Your App**

1. Set up test Stripe account (sandbox)
2. Create test charges
3. Run through governance workflows
4. Use browser dev tools to capture 1200×800
5. Or use screenshot tool:
   ```bash
   # macOS
   Cmd + Shift + 4, drag area, save
   
   # Linux
   gnome-screenshot -d 2 -c
   
   # Windows
   Snip & Sketch or Print Screen
   ```

**Option 2: Using Figma Mockup**

1. Create mockup in Figma
2. Design 1200×800 artboard
3. Mock Stripe Dashboard + your app
4. Add realistic data
5. Export as PNG

**Option 3: Using Existing App Screenshots**

If app is already deployed:
1. Open in browser at full resolution
2. Crop important sections to 1200×800
3. Ensure 72 dpi resolution
4. Save as PNG

### Screenshot Optimization

After capturing, optimize:

```bash
# Compress PNG while keeping quality
pngquant 256 screenshot-1-dashboard-integration.png \
  --output screenshot-1-dashboard-integration-opt.png

# Or use ImageMagick
convert screenshot-1-dashboard-integration.png \
  -strip -interlace Plane \
  screenshot-1-dashboard-integration-opt.png

# Verify size < 3MB
ls -lh screenshot-*.png
```

### Quality Checklist

For each screenshot:
- [ ] Exactly 1200×800 pixels
- [ ] PNG format
- [ ] Clear, readable text
- [ ] Professional appearance
- [ ] Shows app functionality clearly
- [ ] No private/sensitive data visible
- [ ] File size < 3MB
- [ ] No compression artifacts
- [ ] Properly cropped
- [ ] Good contrast

---

## Legal Documents (Optional)

Stripe may accept URLs only, but having PDF versions is helpful.

### Privacy Policy PDF

**File:** `privacy-policy.pdf`  
**Path:** `docs/phase9-stripe-submission/assets/privacy-policy.pdf`

**How to create:**
1. Take your privacy policy (HTML or text)
2. Convert to PDF:
   ```bash
   # Using wkhtmltopdf
   wkhtmltopdf https://dsg.pics/privacy privacy-policy.pdf
   
   # Using LibreOffice
   libreoffice --headless --convert-to pdf privacy-policy.html
   
   # Using Google Chrome (via print to PDF)
   ```
3. Verify PDF is readable
4. Save to: `docs/phase9-stripe-submission/assets/privacy-policy.pdf`

### Terms of Service PDF

**File:** `terms-of-service.pdf`  
**Path:** `docs/phase9-stripe-submission/assets/terms-of-service.pdf`

**How to create:**
1. Take your ToS (HTML or text)
2. Convert to PDF (same methods as above)
3. Verify PDF is readable
4. Save to: `docs/phase9-stripe-submission/assets/terms-of-service.pdf`

---

## Asset Checklist

Before running validation scripts, check:

```
ICON:
[ ] icon-1200x1200.png exists
[ ] Exactly 1200×1200 pixels
[ ] PNG format
[ ] < 2MB file size
[ ] Professional appearance
[ ] Clear at 64×64 size

SCREENSHOTS:
[ ] screenshot-1-dashboard-integration.png exists
[ ] screenshot-2-governance-gate.png exists
[ ] screenshot-3-audit-trail.png exists
[ ] Each is 1200×800 pixels
[ ] PNG format
[ ] All readable and professional
[ ] Total < 10MB

OPTIONAL:
[ ] screenshot-4-policy-config.png (optional)
[ ] screenshot-5-approval-workflow.png (optional)
[ ] privacy-policy.pdf (optional)
[ ] terms-of-service.pdf (optional)

VERIFICATION:
[ ] All files in: docs/phase9-stripe-submission/assets/
[ ] All filenames match expected patterns
[ ] All files are PNG or PDF format
[ ] All files are valid (not corrupted)
```

---

## File Structure After Preparation

```
docs/phase9-stripe-submission/
└── assets/
    ├── icon-1200x1200.png                    ✓ REQUIRED
    ├── screenshot-1-dashboard-integration.png ✓ REQUIRED
    ├── screenshot-2-governance-gate.png       ✓ REQUIRED
    ├── screenshot-3-audit-trail.png           ✓ REQUIRED
    ├── screenshot-4-policy-config.png         ○ OPTIONAL
    ├── screenshot-5-approval-workflow.png     ○ OPTIONAL
    ├── privacy-policy.pdf                     ○ OPTIONAL
    └── terms-of-service.pdf                   ○ OPTIONAL
```

**Minimum:** 4 files (1 icon + 3 screenshots)  
**Recommended:** 8 files (1 icon + 5 screenshots + 2 legal docs)

---

## Next Steps After Preparation

Once all assets are ready:

```bash
# 1. Run validation script
bash docs/phase9-stripe-submission/scripts/validate-submission.sh

# Expected output: ✓ All validation checks passed!

# 2. Run final checklist
bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh

# Expected output: ✓ ALL 20 CHECKS PASSED!

# 3. Generate manifest
bash docs/phase9-stripe-submission/scripts/generate-submission-manifest.sh

# Expected output: Manifest generated successfully

# 4. Open Stripe Dashboard
# https://dashboard.stripe.com/apps

# 5. Follow submission guide
# docs/phase9-stripe-submission/PHASE9_SUBMISSION_READY.md
```

---

## Common Asset Issues & Solutions

### Icon is blurry or unclear

**Problem:** Icon doesn't look good at small sizes

**Solution:**
1. Increase contrast and simplify design
2. Avoid thin lines (< 4px)
3. Use bold, clear shapes
4. Test at 64×64 size
5. Recreate with vector design (not raster)

### Screenshot is wrong size

**Problem:** Screenshot is 800×600 instead of 1200×800

**Solution:**
```bash
# Resize using ImageMagick
convert screenshot-1-old.png -resize 1200x800! screenshot-1-new.png

# Or crop a larger screenshot
convert screenshot-1-large.png -gravity Center -crop 1200x800+0+0 \
  screenshot-1-cropped.png

# Verify new size
identify screenshot-1-new.png
# Output: screenshot-1-new.png PNG 1200x800 ...
```

### Screenshot has sensitive data

**Problem:** Screenshot shows API keys, passwords, or customer data

**Solution:**
1. Retake screenshot with redacted/masked data
2. Use fake test data instead
3. Blur sensitive information using an image editor
4. Use Figma mockup instead of real app

### File is too large (> 3MB)

**Problem:** PNG screenshot is 5MB+

**Solution:**
```bash
# Optimize using pngquant (best quality/size)
pngquant 256 screenshot-1.png \
  --output screenshot-1-optimized.png

# Or use ImageMagick
convert screenshot-1.png -strip -interlace Plane \
  screenshot-1-optimized.png

# Check size
ls -lh screenshot-1-optimized.png
```

### PDF is corrupted

**Problem:** PDF file won't open

**Solution:**
1. Regenerate from HTML or Word document
2. Use a different conversion tool
3. Try online converter: https://pdfcrowd.com
4. Or just use URLs instead (Stripe may accept URLs only)

---

## Design Inspiration

Look at other Stripe apps in the marketplace for inspiration:

- Visit: https://marketplace.stripe.com
- Search for "governance" or "risk management" apps
- Note icon styles, screenshot layouts, descriptions

But remember:
- Don't copy designs
- Create original assets
- Match your brand
- Keep professional quality

---

## Tools Reference

| Task | Tools | Cost |
|------|-------|------|
| Icon design | Figma, Canva, Adobe XD | Free-$, most free tier |
| Screenshot capture | Built-in tools, Snip & Sketch | Free |
| Image optimization | ImageMagick, pngquant | Free |
| PDF conversion | wkhtmltopdf, LibreOffice | Free |
| Mockup creation | Figma, Adobe XD, Mockup Generator | Free-$ |

---

## Timeline

| Task | Time | Status |
|------|------|--------|
| Design icon (1200×1200) | 30-60 min | [ ] |
| Capture/create screenshots (3-5) | 30-60 min | [ ] |
| Optimize and verify assets | 20-30 min | [ ] |
| Create legal docs (optional) | 15-20 min | [ ] |
| Run validation scripts | 5 min | [ ] |
| **Total** | **1.5-2.5 hours** | [ ] |

---

## Final Verification

Before moving to submission:

```bash
# 1. Check all files exist
ls -lah docs/phase9-stripe-submission/assets/

# Expected output:
# -rw-r--r-- icon-1200x1200.png
# -rw-r--r-- screenshot-1-*.png
# -rw-r--r-- screenshot-2-*.png
# -rw-r--r-- screenshot-3-*.png

# 2. Verify file types
file docs/phase9-stripe-submission/assets/*

# Expected output:
# icon-1200x1200.png: PNG image data
# screenshot-1-*.png: PNG image data
# etc.

# 3. Verify dimensions
identify docs/phase9-stripe-submission/assets/*.png

# Expected output:
# icon-1200x1200.png PNG 1200x1200 ...
# screenshot-1-*.png PNG 1200x800 ...

# 4. Check file sizes
du -h docs/phase9-stripe-submission/assets/

# Expected: icon < 2MB, screenshots < 3MB each
```

---

**Next:** Run validation scripts once assets are ready.

```bash
bash docs/phase9-stripe-submission/scripts/validate-submission.sh
```

**Questions?** See README.md → Support & Questions
