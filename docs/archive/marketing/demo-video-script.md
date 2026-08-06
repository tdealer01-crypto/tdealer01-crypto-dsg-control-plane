# DSG Governance Gate - Demo Video Script (90 Seconds)

**Total Runtime**: 90 seconds  
**Format**: Screen recording + voiceover  
**Resolution**: 1080p (24fps)

---

## Scene 1: Problem Statement (0:00–0:15)

### Narration
> "Every day, your team moves millions through Stripe. But one question keeps you up at night: Can you prove every transaction was approved? Can you gate risky operations *before* they execute?"

### On Screen
- Montage of financial dashboard activity (3 seconds)
- Stripe Dashboard showing transaction list (5 seconds)
- Audit log showing post-execution records only (4 seconds)
- Red exclamation mark overlay (3 seconds)

### Visual Notes
- Use dark background (professional)
- Show transaction values ($5k, $50k, $250k)
- Highlight the problem: "Audit trails only *after* execution"

---

## Scene 2: Solution—Pre-Execution Gating (0:15–0:60)

### Section A: Real-Time Policy Evaluation (0:15–0:30)

**Narration**
> "Meet DSG Governance Gate. Pre-execution gating for Stripe."

**On Screen**
- Stripe Dashboard focused on a charge detail page (3 seconds)
- Show charge amount: $5,000
- Loading state: "DSG evaluating policy..." (2 seconds)
- DSG widget appears (green background) with decision: "ALLOW - Amount within limits" (5 seconds)
- Green checkmark animation (2 seconds)

**Visual Notes**
- DSG widget should appear in top-right of charge detail
- Use brand color (assume blue for DSG)
- Clear typography: Decision, reason, timestamp

---

### Section B: Approval Workflow Example (0:30–0:50)

**Narration**
> "For smaller charges—say, under $10,000—DSG auto-approves instantly. But for larger operations, it requires human review. Watch what happens when a $75,000 payout is requested."

**On Screen**
- Switch to payout detail page (1 second)
- Payout amount: $75,000 (1 second)
- DSG evaluates: "REVIEW - Requires 2 approvals" (3 seconds)
- Approval workflow widget appears showing:
  - Approver 1: [Pending] Finance Manager
  - Approver 2: [Pending] CEO
  (3 seconds)
- CFO clicks "Approve" button (1 second)
- Approval appears with timestamp + decision comment: "Verified customer identity, proceeds to CEO" (3 seconds)
- CEO approves (1 second)
- Final status: "APPROVED - Execution ready" with green badge (2 seconds)

**Visual Notes**
- Show real names/roles (e.g., "Sarah Chen (Finance Manager)")
- Display avatars if available
- Highlight approval timestamps
- Show comment field: "Why are you approving this?"

---

### Section C: Audit Trail (0:50–1:00)

**Narration**
> "Every decision gets a cryptographically-verified audit trail. No logs to fake. No decisions to hide. Here's the full chain of evidence for that $75k payout."

**On Screen**
- Switch to Audit Trail tab (1 second)
- Show audit log entry:
  ```
  ✓ 2026-06-06 14:23:45 UTC
    Operation: payout.create
    Amount: $75,000
    Decision: APPROVED (requires 2 approvals)
    
  ✓ Approver 1: Sarah Chen (Finance Manager)
    Time: 14:24:12 UTC | Proof Hash: 3f2d...a91c
    
  ✓ Approver 2: Robert Martinez (CEO)
    Time: 14:25:03 UTC | Proof Hash: 7e4c...b82f
    
  Final Proof Hash: a1b2c3d4e5f6...
  ```
  (7 seconds)

**Visual Notes**
- Display full audit trail with hashes visible
- Color code: Green for approved, yellow for pending, red for blocked
- Show timestamp precision (down to the second)
- Highlight proof hashes (can be truncated for video)

---

## Scene 3: Call-to-Action (1:00–1:30)

### Section A: Installation (1:00–1:15)

**Narration**
> "Install DSG from the Stripe App Marketplace in less than 60 seconds. No code. No infrastructure. Just policies."

**On Screen**
- Stripe App Marketplace screenshot (3 seconds)
- Search box: type "DSG Governance Gate" (2 seconds)
- DSG app card appears with icon, description, rating (3 seconds)
- "Install" button click (1 second)
- OAuth approval screen (2 seconds)
- Success screen: "Connected to your Stripe account" (2 seconds)
- Quick policy template selection (2 seconds)

**Visual Notes**
- Show smooth, fast installation flow
- Highlight "no code required" messaging
- Show policy templates: FinTech, SaaS, Enterprise

---

### Section B: Closing (1:15–1:30)

**Narration**
> "Pre-execution gating. Proof hashes. Compliance ready. Start with 100 free operations. Upgrade to unlimited when you're ready."

**On Screen**
- DSG brand logo (2 seconds)
- Key features listed on screen:
  - ✓ Pre-execution gating
  - ✓ Approval workflows
  - ✓ Cryptographic audit trails
  - ✓ Stripe Dashboard native
  (4 seconds)
- Website screenshot: dsg-platform.com (2 seconds)
- Call-to-action button: "Get Started - Install on Stripe" (2 seconds)

**Visual Notes**
- Use brand colors (blue + green)
- Professional, modern aesthetic
- Clear, readable fonts

---

## Production Notes

### Video Specifications
- **Length**: 90 seconds (exact)
- **Resolution**: 1080p (1920 × 1080)
- **Frame Rate**: 24 fps
- **Codec**: H.264 or ProRes
- **Audio**: 48 kHz, stereo

### Audio Track
- **Voiceover**: Professional, calm, confident tone
- **Music**: Subtle, non-distracting instrumental (royalty-free)
  - Recommendation: Audiojungle or Epidemic Sound
  - Tempo: 100–110 BPM, modern/tech genre
  - Fade in at 0:00, fade out at 1:25
- **Sound Effects**: 
  - Gentle notification chime when DSG decision appears
  - Subtle click sound for button interactions
  - Approval success sound (soft bell or chime)

### Visuals & Branding
- **Color Scheme**:
  - Primary: DSG blue (assume #0066CC or similar)
  - Success: Green (#22c55e)
  - Review: Yellow (#f59e0b)
  - Block: Red (#ef4444)
- **Typography**: 
  - Primary font: Modern sans-serif (e.g., Inter, Poppins)
  - Font sizes: 32pt for headers, 16pt for body
- **Graphics**:
  - Real Stripe Dashboard screenshots (use test/sandbox)
  - Custom DSG widget overlay (design separately)
  - Animated transitions between scenes (100ms crossfade)

### Recording Tips
- **Screen Capture**: Use OBS or ScreenFlow at 1080p
- **Cursor**: Visible, moderate speed (not too fast)
- **Timing**: Script is 90 seconds at 140 words/min; adjust pacing
- **Test**: Record a test run first to verify timing and visuals

### Post-Production
- **Editing Software**: Final Cut Pro, Adobe Premiere, or DaVinci Resolve
- **Subtitle**: Add burned-in subtitles for accessibility
- **Watermark**: DSG logo in bottom-right corner (optional)
- **Thumbnail**: Create YouTube thumbnail with key frame (e.g., "APPROVAL" state)

### Hosting
- **Platform**: YouTube
- **Title**: "DSG Governance Gate for Stripe—90 Second Demo"
- **Description**: Link to blog post + Stripe Marketplace
- **Tags**: governance, stripe, fintech, audit, compliance, saas

---

## Script Timing Breakdown

| Scene | Duration | Words | Notes |
|-------|----------|-------|-------|
| Problem | 15 sec | ~40 | Set context, establish pain |
| Solution A | 15 sec | ~30 | Real-time decision |
| Solution B | 20 sec | ~55 | Approval workflow |
| Solution C | 10 sec | ~30 | Audit trail proof |
| CTA A | 15 sec | ~35 | Installation flow |
| CTA B | 15 sec | ~25 | Closing pitch |
| **Total** | **90 sec** | **~215** | Target: 140 wpm |

---

## Alternative Endings (Choose One)

### Ending Option 1: Free Trial Focus
**0:55–1:30** Instead of installation walk-through, focus on pricing:
- "Try free: 100 operations/month, no credit card"
- Show pricing page screenshot
- Emphasize: "Upgrade to unlimited when you're ready"

### Ending Option 2: Customer Testimonial
**1:00–1:30** Include a short testimonial:
- "FinTech platform reduced compliance audit time from 3 weeks to 2 days"
- Quote: "DSG turned governance from a burden into a feature"
- Attribution: Logo/name of customer

### Ending Option 3: Feature Roadmap
**1:00–1:30** Highlight upcoming features:
- AI-powered policy suggestions
- Custom approval chains
- Advanced compliance reporting
- "Coming soon: everything you need"

---

## Accessibility Checklist

- [ ] Closed captions burned in
- [ ] High contrast for text overlays
- [ ] Audio description track (separate file)
- [ ] Avoid flashing/strobing effects
- [ ] Readable font sizes (minimum 24pt for video)
