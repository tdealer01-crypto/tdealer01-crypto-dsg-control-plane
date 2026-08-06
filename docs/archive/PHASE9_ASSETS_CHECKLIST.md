# Phase 9: Marketplace Assets Specifications Checklist

**Status:** Technical asset requirements and creation checklist  
**Product:** DSG Governance Gate  
**Purpose:** Ensure all visual and media assets meet Stripe Marketplace standards  
**Target Completion:** 1 week before submission

---

## Asset Submission Checklist

Use this form to track creation and verification of all required assets.

---

## SECTION 1: App Icon Assets

### Icon 1: Primary App Icon (1200×1200px)

**Purpose:** Main marketplace listing icon (shown at various scales)

**Specifications:**
- **Format:** PNG (RGBA, 32-bit color depth)
- **Dimensions:** 1200×1200 pixels
- **Color Space:** sRGB (web-safe)
- **File Size:** < 1 MB
- **Background:** Transparent (alpha channel required)
- **Padding:** Minimum 10% safe area (120px on each side for content)
- **Design Requirements:**
  - High contrast (distinguishable at 16px, 32px, 64px, 100px, 256px, 512px)
  - Square aspect ratio (1:1)
  - No text inside icon
  - Recognizable brand/symbol
  - Professional appearance
  - No gradients that fade to transparency (causes rendering issues)
  
**Scaling Test:**
- [ ] Icon visible at 16×16px (favicon-sized)
- [ ] Icon visible at 32×32px (favicon-sized)
- [ ] Icon visible at 64×64px (small listing)
- [ ] Icon visible at 100×100px (marketplace listing)
- [ ] Icon visible at 256×256px (sidebar)
- [ ] Icon visible at 512×512px (desktop shortcut)
- [ ] Icon visible at 1200×1200px (original)

**File Location:**
```
docs/PHASE9_MARKETING/assets/app-icon.png
```

**Verification Checklist:**
- [ ] File is PNG format (not JPG, WebP, or other)
- [ ] Dimensions exactly 1200×1200px
- [ ] File size < 1 MB
- [ ] Background is transparent (no white/solid fill)
- [ ] Color space confirmed sRGB
- [ ] No text or language-specific elements
- [ ] Passes online PNG validation (pngcheck or TinyPNG validation)
- [ ] Renders correctly in Stripe Dashboard preview

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

### Icon 2: Favicon (32×32px or ICO)

**Purpose:** Browser tab icon and shortcut icon

**Specifications:**
- **Formats Accepted:** PNG or ICO
- **Dimensions:** 32×32 pixels
- **File Size:** < 50 KB
- **Design:** Simplified version of primary icon (maintains recognizability at small size)
- **Color Space:** sRGB
- **Alignment:** Centered, with 2px padding from edges

**If Creating ICO:**
- Can include multiple resolutions: 16×16, 32×32, 48×48 (optional)
- Recommended: generate from 32×32 PNG to ensure consistency

**File Location:**
```
docs/PHASE9_MARKETING/assets/favicon.ico
```

**Verification Checklist:**
- [ ] Format is ICO or PNG
- [ ] Dimensions 32×32px (or multiresolution ICO)
- [ ] File size < 50 KB
- [ ] Matches primary icon design (simplified)
- [ ] Recognizable at actual favicon size
- [ ] Renders correctly in browser tab
- [ ] Renders correctly in bookmarks/shortcuts

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

## SECTION 2: Hero Image & Feature Graphics

### Hero Image (1920×1080px or 2048×900px)

**Purpose:** Large feature image displayed at top of marketplace listing

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1920×1080px (16:9 aspect ratio) OR 2048×900px (Stripe preference)
- **File Size:** < 2 MB
- **Color Space:** sRGB (JPG) or sRGB (PNG)
- **Content Requirements:**
  - High-quality product screenshot or lifestyle image
  - Shows primary use case (policy gating in action)
  - Includes on-brand colors
  - Optional text overlay: "Gate AI Operations in Stripe" (if readable and professional)
  - No watermarks or placeholder text
  
**Design Considerations:**
- Test readability at 800×450px (typical mobile display)
- Ensure important content is centered (safe area: central 90% of image)
- Use professional typography if including text
- Apply subtle shading/gradients if overlaying text for readability
- Avoid clutter; focus on core feature/benefit

**File Location:**
```
docs/PHASE9_MARKETING/assets/hero-image.png (or .jpg)
```

**Verification Checklist:**
- [ ] Dimensions are 1920×1080px or 2048×900px
- [ ] File size < 2 MB
- [ ] Format is PNG or JPG (not WebP)
- [ ] Color space is sRGB
- [ ] Image is high-quality (no pixelation at 100% zoom)
- [ ] Primary content visible at 50% scale (mobile view)
- [ ] No watermarks or copyright issues
- [ ] Professional appearance matches brand
- [ ] Renders correctly in Stripe Dashboard preview

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

## SECTION 3: Product Screenshots (3 required, up to 5)

### Screenshot 1: Dashboard Overview

**Purpose:** Show policy configuration interface

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1280×720px minimum (16:9 aspect ratio, landscape)
- **File Size:** < 2 MB per screenshot
- **Color Space:** sRGB
- **Content Requirements:**
  - Show policy editor with threshold settings
  - Display example policy (e.g., "Block charges > $5,000")
  - Highlight key UI elements (buttons, fields, settings)
  - Include caption: "Real-time policy configuration"
  - Sanitize any sensitive data (test credentials, real keys)
  - Use example/mock data that demonstrates feature clearly

**Screenshot Tips:**
- Use browser DevTools to capture at exact resolution
- Enable high DPI display setting if available
- Crop margins tightly; avoid extra whitespace
- Ensure text is readable at 50% scale
- Use consistent UI state (no error messages unless demonstrating error handling)

**File Location:**
```
docs/PHASE9_MARKETING/assets/screenshot-1-dashboard.png
```

**Verification Checklist:**
- [ ] Dimensions ≥1280×720px
- [ ] File size < 2 MB
- [ ] Shows policy editor clearly
- [ ] Example policy is visible and readable
- [ ] No sensitive data (API keys, credentials, real user info)
- [ ] Caption is present (in image or separate)
- [ ] Renders sharply at 50%, 75%, and 100% zoom
- [ ] Matches current product UI (not outdated)

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

### Screenshot 2: Operation Gating in Action

**Purpose:** Demonstrate real-time gating decision

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1280×720px minimum
- **File Size:** < 2 MB
- **Content Requirements:**
  - Show Stripe charge request being evaluated
  - Display decision result clearly: ALLOW, REVIEW, or BLOCK
  - Show decision reason/evidence/policy reference
  - Include caption: "Gate every Stripe operation before execution"
  - Mock data showing realistic charge amount, merchant, timestamp
  - Highlight decision indicator (color-coded if possible: green=ALLOW, yellow=REVIEW, red=BLOCK)

**Design Tips:**
- Use split-screen layout: request on left, decision on right
- Ensure decision is the focal point
- Use visual hierarchy to emphasize outcome
- Include relevant metadata (timestamp, policy version, risk score)

**File Location:**
```
docs/PHASE9_MARKETING/assets/screenshot-2-gating.png
```

**Verification Checklist:**
- [ ] Dimensions ≥1280×720px
- [ ] File size < 2 MB
- [ ] Shows charge/request clearly
- [ ] Decision result prominently displayed (ALLOW/REVIEW/BLOCK)
- [ ] Reason/evidence visible
- [ ] No sensitive data exposed
- [ ] Caption present
- [ ] Matches current product UI
- [ ] Text readable at 50% scale

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

### Screenshot 3: Audit Trail / Execution History

**Purpose:** Show compliance-ready audit trail

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1280×720px minimum
- **File Size:** < 2 MB
- **Content Requirements:**
  - Show execution history with multiple rows
  - Display immutable timestamps (ISO 8601 format)
  - Show decision reasoning and policy version/hash
  - Highlight compliance-ready audit fields
  - Include caption: "Immutable audit trail for regulatory compliance"
  - Mock data showing varied decisions (ALLOW, BLOCK, REVIEW)
  - Show sortable columns (date, operation, decision, reason, user)

**Design Considerations:**
- Table format works well for audit logs
- Use alternating row colors for readability
- Ensure timestamps are clearly visible
- Show policy version/hash as separate column
- Include user/agent ID if applicable
- Use professional typography for table

**File Location:**
```
docs/PHASE9_MARKETING/assets/screenshot-3-audit.png
```

**Verification Checklist:**
- [ ] Dimensions ≥1280×720px
- [ ] File size < 2 MB
- [ ] Shows multiple audit log entries
- [ ] Timestamps visible and formatted clearly
- [ ] Decision column prominent
- [ ] Policy version/hash shown
- [ ] Reason/metadata visible
- [ ] No sensitive data (real customer info, payment data)
- [ ] Caption present
- [ ] Professional table formatting
- [ ] Text readable at 50% scale

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

### Screenshots 4-5: Optional Additional Screenshots

**Screenshot 4 (Optional): Integration Setup**

**Purpose:** Show OAuth flow or API setup

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1280×720px minimum
- **Content:** OAuth consent page, API key generation, webhook setup
- **File Location:** `docs/PHASE9_MARKETING/assets/screenshot-4-integration.png`
- **Status:** ☐ Created ☐ Verified ☐ Uploaded

**Screenshot 5 (Optional): Customer Success / Use Case**

**Purpose:** Show real-world or sanitized example use case

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1280×720px minimum
- **Content:** Case study example, metrics, ROI visualization
- **File Location:** `docs/PHASE9_MARKETING/assets/screenshot-5-usecase.png`
- **Status:** ☐ Created ☐ Verified ☐ Uploaded

---

## SECTION 4: Social Media & Sharing Assets

### Open Graph / Twitter Card Image

**Purpose:** Used when marketplace link is shared on social media

**Specifications:**
- **Format:** PNG or JPG
- **Dimensions:** 1200×630 pixels (recommended aspect ratio 1.91:1)
- **File Size:** < 1 MB
- **Color Space:** sRGB
- **Content Requirements:**
  - Include app logo (left or center)
  - Include app name/product name
  - Include value proposition (tagline, key benefit)
  - Use consistent brand colors (primary + 1-2 secondary)
  - Professional, clean design (not cluttered)
  - Readable at thumbnail size (350×180px typical)
  - No outside links or QR codes (not needed for OG card)

**Social Media Rendering:**
- Twitter: 1200×630px displayed as 600×315px (50% scale)
- LinkedIn: 1200×627px (displayed at various sizes)
- Facebook: 1200×630px (displayed at various sizes)
- Slack: 1200×627px (displayed at various sizes)

**File Location:**
```
docs/PHASE9_MARKETING/assets/og-card.png
```

**Verification Checklist:**
- [ ] Dimensions exactly 1200×630px
- [ ] File size < 1 MB
- [ ] Format PNG or JPG
- [ ] Color space sRGB
- [ ] App logo visible and recognizable
- [ ] App name clearly visible
- [ ] Value proposition readable
- [ ] Renders well at 50% scale (600×315px)
- [ ] No text cutoff at edges (use safe area)
- [ ] Test with OG validator (facebook.com/sharing/debugger)
- [ ] Test with Twitter card validator (cards-dev.twitter.com)

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

## SECTION 5: Video / Demo Assets

### Product Demo Video (Optional but Recommended)

**Purpose:** 30-60 second demo showing key features in action

**Specifications - Video File:**
- **Format:** MP4 (H.264 video, AAC audio) or host on YouTube/Vimeo
- **Resolution:** 1920×1080p minimum (4K optional)
- **Frame Rate:** 24fps, 30fps, or 60fps
- **Bit Rate:** 5-10 Mbps (ensures quality without excessive file size)
- **File Size:** < 50 MB (if self-hosted) OR link to YouTube/Vimeo
- **Duration:** 30-60 seconds (Stripe may truncate longer videos)
- **Audio:** Professional background music + voiceover OR captions/subtitles

**Video Content Requirements:**
- **Sequence:** Dashboard (5 sec) → Create policy (10 sec) → Execute operation (10 sec) → View audit trail (10 sec) → Closing (5 sec)
- **Scene 1 - Dashboard:** Show clean interface, highlight key sections
- **Scene 2 - Policy Creation:** Create or edit policy, show threshold settings, show example
- **Scene 3 - Operation Execution:** Display charge/operation request, show gating decision in real-time, emphasize decision outcome
- **Scene 4 - Audit Trail:** Scroll through audit log, highlight immutable fields, show compliance features
- **Scene 5 - Closing:** Call-to-action text, product name, tagline

**Audio Requirements:**
- **Option A:** Professional background music (royalty-free) + voiceover (clear, professional, natural pacing)
- **Option B:** Captions/subtitles (synchronized with visuals, readable font size ≥16px)
- **Option C:** Both music and captions (recommended for accessibility)

**Voiceover Script Example:**
```
"Gate AI operations in Stripe. [Dashboard demo] Create policies in seconds, 
with real-time thresholds. [Policy creation] When operations arrive, 
our engine makes instant decisions. [Operation gating] Allow, review, or block 
based on your rules. [Decision display] Every decision is logged immutably 
for compliance. [Audit trail] DSG Governance Gate. Governance, at the speed of Stripe."
```

**File Location:**
```
docs/PHASE9_MARKETING/assets/product-demo.mp4
OR
YouTube URL: https://youtube.com/watch?v=________________
```

**Verification Checklist:**
- [ ] Format is MP4 with H.264 + AAC
- [ ] Resolution 1920×1080p or higher
- [ ] Frame rate 24/30/60 fps (consistent)
- [ ] Bit rate 5-10 Mbps
- [ ] File size < 50 MB (if self-hosted)
- [ ] Duration 30-60 seconds
- [ ] Audio is clear (music or voiceover or both)
- [ ] Captions present (if voiceover)
- [ ] Captions synchronized with visuals
- [ ] All 5 scenes included and clear
- [ ] No sensitive data (API keys, credentials)
- [ ] Professional production quality
- [ ] Renders without artifacts or corruption
- [ ] Test playback in browser and mobile

**Production Tips:**
- Use screen recording software (ScreenFlow, OBS, Camtasia)
- Record at native resolution (1920×1080p or higher)
- Use Figma/Sketch mockups if actual product unavailable
- Edit in DaVinci Resolve, Adobe Premiere, or similar
- Add text overlays/captions in post-production
- Export in H.264 MP4 format (high quality preset)
- Host on YouTube for embedding (recommended)

**Status:** ☐ Created ☐ Verified ☐ Uploaded

---

## SECTION 6: Documentation & Reference Assets

### Brand Guidelines Document

**Purpose:** Document brand colors, logo usage, typography, tone

**File Location:**
```
docs/PHASE9_MARKETING/brand-guidelines.md
```

**Content Requirements:**
- [ ] Primary color (HEX code, RGB values, usage)
- [ ] Secondary color(s) (HEX codes, RGB values, usage)
- [ ] Accent colors (HEX codes, usage for highlights/errors/success)
- [ ] Logo usage rules (minimum size, clear space, lockup variations)
- [ ] Logo do's and don'ts (no stretching, no rotating, no color changes)
- [ ] Typography (font families, sizes, line heights)
- [ ] Icon style guide (if using custom icons)
- [ ] Photography style (if using lifestyle images)
- [ ] Tone & voice guidelines (examples of on-brand language)
- [ ] Examples of correct vs. incorrect usage

**Format Recommendation:**
- Markdown document with embedded color swatches
- Visual examples for logo usage
- Typography samples
- Do/Don't comparison images

**Status:** ☐ Created ☐ Verified ☐ Published

---

## Asset File Organization

**Recommended Folder Structure:**

```
docs/PHASE9_MARKETING/assets/
├── app-icon.png (1200×1200px)
├── favicon.ico (32×32px)
├── hero-image.png (1920×1080px or 2048×900px)
├── screenshot-1-dashboard.png (1280×720px+)
├── screenshot-2-gating.png (1280×720px+)
├── screenshot-3-audit.png (1280×720px+)
├── screenshot-4-integration.png (1280×720px+) [optional]
├── screenshot-5-usecase.png (1280×720px+) [optional]
├── og-card.png (1200×630px)
├── product-demo.mp4 [optional, or YouTube URL]
└── [README.txt with file descriptions]

docs/PHASE9_MARKETING/
├── brand-guidelines.md
├── app-descriptions.md
└── developer-documentation-template.md
```

---

## Asset Creation Timeline

**Week 1:**
- [ ] Day 1-2: Design primary app icon (1200×1200px)
- [ ] Day 3: Create favicon from primary icon
- [ ] Day 4: Design hero image
- [ ] Day 5: Capture/create screenshots 1-3

**Week 2:**
- [ ] Day 6-7: Capture optional screenshots 4-5
- [ ] Day 8: Create OG/Twitter card
- [ ] Day 9: Record and edit demo video
- [ ] Day 10: Review all assets, collect feedback
- [ ] Day 11-14: Iterate on assets based on feedback

**Week 3:**
- [ ] Day 15: Final verification and file organization
- [ ] Day 16: Prepare asset README/manifest
- [ ] Ready for upload to Stripe Dashboard

---

## Quality Assurance Checklist

**Before Final Submission:**

- [ ] All files in correct format (PNG for images, MP4 for video)
- [ ] All files at correct dimensions
- [ ] All file sizes within limits
- [ ] All files use sRGB color space
- [ ] All images render correctly in preview tools
- [ ] All text is readable at 50% scale
- [ ] No sensitive data in any asset
- [ ] No watermarks or copyright issues
- [ ] All assets follow brand guidelines
- [ ] Assets are consistent in style and quality
- [ ] Video plays without artifacts
- [ ] OG card validates with Facebook/Twitter tools
- [ ] Assets tested in browsers (Chrome, Firefox, Safari, Edge)
- [ ] Assets tested on mobile devices
- [ ] Assets compressed (use TinyPNG, ImageOptim for size reduction without quality loss)

---

## Common Asset Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Icon blurry at small sizes | Poorly designed at small scale | Redesign with simplicity, test at 16px |
| Screenshot text unreadable | Text too small | Ensure minimum 12px font, increase UI zoom |
| Hero image pixelated | Wrong resolution or upscaling | Create at native 1920×1080px or higher |
| Video has audio sync issues | Incorrect frame rate | Re-export at consistent 24/30/60 fps |
| Color mismatch across assets | Different color spaces | Convert all to sRGB before design |
| File too large | Uncompressed or high bitrate | Use PNG compression tools, reduce MP4 bitrate |
| OG card doesn't show in preview | Dimensions incorrect | Verify exactly 1200×630px |
| Favicon doesn't display | Format issue or browser cache | Use ICO format, test in incognito mode |

---

## Final Deliverables Checklist

Before submitting to Stripe:

- [ ] All 10 visual assets created and verified
- [ ] Brand guidelines document completed
- [ ] Demo video created (optional but recommended)
- [ ] All assets organized in PHASE9_MARKETING/assets/
- [ ] Asset manifest/README prepared
- [ ] All assets tested in Stripe Dashboard preview
- [ ] Legal review of any text/claims in images
- [ ] Product team approval of all visuals
- [ ] Design team sign-off

---

**Last Updated:** 2026-06-07  
**Next Step:** Upload all assets to Stripe Dashboard via App Listing form
