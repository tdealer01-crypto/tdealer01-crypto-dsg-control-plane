# DSG ONE Login Page — Optimal User Flow Plan

## Current State Analysis

**File:** `app/login/page.tsx`  
**Component:** `components/LoginForm.tsx`

### Identified Issues

| # | Problem | Impact |
|---|---------|--------|
| 1 | "Continue with SSO" button has no onClick handler | User clicks nothing — dead end |
| 2 | Recovery email form has no loading state | User unsure if submission worked, may double-submit |
| 3 | Option cards lack hover/focus visual feedback | No affordance that elements are interactive |
| 4 | Error messages are static (resolved server-side via URL params) | No inline validation, no dynamic error display |
| 5 | No visual hierarchy between the 3 options | All options compete equally; user unsure which to pick |

---

## Improved User Flow — Step by Step

### Entry

**Step 1 — User lands on /login**

- Sees a clean two-column layout (left: authentication, right: trial/signup)
- Left column is visually dominant (slightly wider, brighter border) to signal "primary path"
- A dynamic notice banner appears at the top ONLY if there's an error or success message (e.g., from URL params `?error=...` or `?message=check-email`)
- The notice is color-coded: red for errors, green for success, with an icon and dismiss button

---

### Path A: Password Login (Returning Users)

**Step 2A — User sees "Password login" card**

- Card is at the top of the left column, visually highlighted with a subtle emerald accent border
- Label: "Returning users" above the heading
- Contains a single clear CTA button: "Continue with password"
- Hover state: button scales slightly (1.01), border glows emerald
- Focus state: visible ring for keyboard navigation

**Step 3A — User clicks "Continue with password"**

- Navigates to `/password-login?next=<encoded-redirect>`
- If the workspace requires SSO, the password form shows an inline dynamic error: "This organization requires single sign-on. Continue with SSO instead." with a link/button to trigger SSO

**Step 4A — User submits password form**

- On submit, the button shows a loading spinner and "Signing in..."
- On success → redirect to `/dashboard` (or `next` param)
- On failure → inline error appears below the field with specific message (invalid credentials, account locked, etc.)

---

### Path B: Recovery Link (Forgot Password)

**Step 2B — User sees "Send a recovery link" section**

- Located below the password card, separated by a divider
- Label: "Forgot your password?" above the heading
- Contains an email input field + "Send recovery link" button
- The section is visually secondary (smaller heading, muted border) to establish hierarchy

**Step 3B — User enters email and clicks "Send recovery link"**

- Client-side validation fires immediately on blur/submit:
  - Empty field → inline error: "Work email is required"
  - Invalid format → inline error: "Please enter a valid work email address"
- On submit:
  - Button enters loading state: spinner + "Sending..."
  - Input is disabled during submission
  - After successful submission:
    - Form replaces with success state: "Check your email! We sent a recovery link to **user@company.com**"
    - Below: "Didn't receive it? Resend in 45s" (countdown timer)
    - Below: "Back to login" link
  - On error:
    - Button returns to normal state
    - Inline error appears above the form: "Unable to send recovery link. Please try again." or specific server error
    - Email field retains value so user can correct and retry

**Step 4B — User clicks link in email**

- Link opens in same tab → validates token → creates session → redirect to `/dashboard`
- If token expired → show error: "This link has expired. Request a new recovery link." with a button to restart the flow

---

### Path C: Start Trial (New Users)

**Step 2C — User sees right column "New to DSG?" section**

- Right column has a softer background to differentiate it from auth actions
- Label: "New to DSG?" heading + subtext
- Primary CTA: "Start workspace trial" (emerald button, full width)
- Hover: scale + glow effect
- Below CTA: small text "14-day free trial, no credit card required"

**Step 3C — User clicks "Start workspace trial"**

- Navigates to `/signup?next=<encoded-redirect>`
- Signup form collects: workspace name, full name, email
- On submit → creates workspace + session → redirect to `/dashboard`

---

### Path D: SSO Login (Organizations Enforcing SSO)

**Step 2D — User sees "Continue with SSO" button**

- Located in the right column below the trial button
- Styled as a secondary text button (no border, emerald text) to not compete with primary actions
- Hover: underline + slight color shift

**Step 3D — User clicks "Continue with SSO"**

- Initiates OAuth/OIDC flow: redirects to `/api/auth/sso?next=<encoded-redirect>`
- If SSO is misconfigured → show error: "SSO is not configured for this workspace. Contact your admin."
- On successful SSO → redirect to `/dashboard`
- If SSO-required but user tried password login first → show inline error on password form: "This workspace requires SSO. Click 'Continue with SSO' instead."

---

### Path E: Request Access (No Account)

**Step 2E — User sees "Request access" link**

- Located at the bottom of the right column
- Styled as a text link with underline
- Click → navigates to `/request-access`

---

## Visual Hierarchy Design

```
┌──────────────────────────────────────────────────────────┐
│  [Dynamic Notice Banner — only visible when applicable]  │
│                                                          │
│  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │ ★ RETURNING USERS       │  │  New to DSG?         │  │
│  │                          │  │                      │  │
│  │  Password login          │  │  Start workspace     │  │
│  │  ┌────────────────────┐  │  │  trial →             │  │
│  │  │ Continue with pass │  │  │                      │  │
│  │  └────────────────────┘  │  │  ─────────────────── │  │
│  │  ──────────────────────  │  │  Continue with SSO   │  │
│  │  Forgot password?        │  │                      │  │
│  │  ┌────────────────────┐  │  │  ─────────────────── │  │
│  │  │ Email [________]   │  │  │  Request access      │  │
│  │  │ [Send recovery link]│  │  │                      │  │
│  │  └────────────────────┘  │  │                      │  │
│  └─────────────────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Hierarchy Rules

1. **Left column = primary** (wider, brighter border, top-positioned password option)
2. **Password login = most prominent action** (full-width emerald button)
3. **Recovery link = secondary** (below divider, form-style interaction)
4. **Right column = tertiary** (softer background, for new users)
5. **SSO = subtle** (text button, not competing with primary CTAs)
6. **Request access = minimal** (text link, bottom)

---

## Interaction Feedback Matrix

| Element | Hover | Focus | Active/Click | Loading | Error |
|---------|-------|-------|--------------|---------|-------|
| Primary buttons (emerald) | scale(1.01), shadow-lg | ring-2 ring-emerald-400/50 | scale(0.98) | spinner + disabled | — |
| Text buttons (emerald) | underline | ring-1 ring-emerald-400/30 | color shift | spinner inline | — |
| Input fields | border brightens | ring-2 ring-emerald-400/40 | — | — | border-red + inline error text |
| Cards | border brightens slightly | ring-1 ring-white/20 | — | — | — |
| Notice banner | — | — | — | — | red bg / green bg |

---

## Error Handling — Dynamic Error Map

| Scenario | Display Location | Message | Action Available |
|----------|-----------------|---------|------------------|
| Invalid email format | Inline below field | "Please enter a valid work email address" | Correct email |
| Empty required field | Inline below field | "[Field] is required" | Fill field |
| SSO required | Replace password form | "This organization requires SSO" | "Continue with SSO" button |
| Approval required | Notice banner | "Workspace requires admin approval" | "Request access" link |
| Not allowed | Notice banner | "Account not allowed" | "Contact support" link |
| Recovery email failed | Above form | "Unable to send. Try again or contact support." | Retry button |
| Session expired | Notice banner | "Session expired. Please sign in again." | Refresh form |
| SSO misconfigured | Replace SSO button | "SSO not configured for this workspace" | "Contact admin" link |

---

## State Transitions Summary

```
[Landing] ──click password──→ [Password Form] ──success──→ [Dashboard]
   │                              │
   │                              └──sso-required──→ [SSO Flow] ──→ [Dashboard]
   │
   ├──submit recovery email──→ [Loading] ──success──→ [Email Sent Confirmation]
   │                              │
   │                              └──error──→ [Inline Error + Retry]
   │
   ├──click trial──→ [Signup Page] ──success──→ [Dashboard]
   │
   ├──click SSO──→ [SSO/OAuth Flow] ──success──→ [Dashboard]
   │                    │
   │                    └──error──→ [Error + Contact Admin]
   │
   └──click request access──→ [Request Access Page]
```

---

## Implementation Priority

1. **SSO button handler** — wire up onClick to initiate OAuth flow (P0, blocks org users)
2. **Loading state on recovery form** — add useState for submission status, disable button during submit (P0, prevents confusion)
3. **Hover/focus feedback** — add Tailwind transition classes to all interactive elements (P1, improves perceived quality)
4. **Dynamic inline errors** — add client-side validation + server error display in LoginForm (P1, reduces failed attempts)
5. **Visual hierarchy** — adjust card styling, spacing, and accent colors to guide attention (P2, improves conversion)
