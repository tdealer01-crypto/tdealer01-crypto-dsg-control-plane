# Simulation + AGI Integration Analysis
**Date:** 2026-06-10  
**Branch:** `claude/pr702-simulation-repo-h4fbfu`  
**Goal:** Design the integration path for simulation features with PR702 (Safe DOM Mirror Phase 1) and AGI systems

---

## Executive Summary

The codebase currently contains **7 distinct simulation/execution features**. PR702 adds a **deterministic Safe DOM Mirror library** (Phase 1 only). The integration strategy is to:

1. **Short-term:** Merge PR702 as a deterministic library layer
2. **Medium-term:** Connect Safe DOM to existing Virtual PC simulator and Browserbase executor
3. **Long-term:** Build AGI control plane that uses Safe DOM + deterministic gates for controlled execution

**Current Status:** PR702 is code-complete with unit tests. Integration points are identified but not yet implemented.

---

## Part 1: Existing Simulation Features (Codebase Inventory)

### 1.1 Terminal Sandbox Executor
**File:** `lib/executors/terminal-sandbox.ts`  
**Purpose:** Execute shell commands safely in isolated temp directories  
**Capabilities:**
- Whitelist: `ls`, `node`, `npm`, `python`, `git`, `curl`
- Blocklist: `rm`, `sudo`, `kill`, `ssh`, etc.
- Prevents: command chaining, substitution, piping
- Output: stdout/stderr + SHA256 hash (15s timeout, 64 KB max)
- Environment filtering: strips secrets

**Use Case:** Local/local-like command execution for agents under deterministic control

**Integration with PR702:** Safe DOM principles (filter dangerous operations) could be applied to command execution audit trail.

---

### 1.2 Virtual PC / Remote Mouse Simulation
**File:** `lib/dsg/app-builder/virtual-pc-generated-files.ts`  
**Purpose:** Generate a React GUI simulator for virtual PC + remote mouse control  
**Capabilities:**
- Virtual monitor (1000x640)
- Mouse action tracking (move, click, double-click)
- Governed API endpoint for remote mouse actions
- Cursor position tracking + coordinate transformation
- Decision response (ALLOW/REVIEW/BLOCK)
- Tamper-proof audit hashing

**Frontend Interaction:**
- Shift+click to move cursor
- Regular click to execute action
- Real-time decision feedback

**Use Case:** Agent-controlled GUI automation under human oversight; proof-of-concept for safe DOM interaction

**Integration with PR702:** This is a **direct consumer of Safe DOM**. Virtual PC can:
1. Extract DOM elements from the rendered page
2. Build a Safe DOM manifest
3. Expose only safe elements to the agent
4. Verify each agent action against the manifest

---

### 1.3 Try/Demo Gate (Trial Simulation)
**File:** `app/api/try/gate/route.ts`  
**Purpose:** Simulate DSG Gate approval workflow for trial users  
**Capabilities:**
- Session-based action declaration (TTL 1–120 min)
- Pattern-based dangerous action blocklist
  - `delete all`, `drop table`, `truncate`
  - `bypass policy/auth/gate/security`
  - `rm -rf`, `format disk`, `exfiltrate`, `steal`
- HMAC-SHA256 stamp generation
- Redis-backed or in-memory session tracking

**Use Case:** Demo/education for users to experience approval workflows without real execution

**Integration with PR702:** Safe DOM filtering principles (dangerous pattern detection) mirror this gate logic. Could be refactored as a shared deterministic filter.

---

### 1.4 Demo/Interactive Approval Workflow
**File:** `app/demo/page.tsx`  
**Purpose:** React UI showing live approval request simulation  
**Capabilities:**
- Policy triggers (e.g., "payments > $10K")
- Risk score visualization
- Cascading audit trail animations
- Evidence binding with policy version + agent ID

**Use Case:** Marketing/education UI demonstrating approval chain

**Integration with PR702:** Non-critical. This is UI-only; Safe DOM is library-only.

---

### 1.5 Spine Execute Route (Governed Execution)
**File:** `app/api/spine/execute/route.ts`  
**Purpose:** Core runtime spine for AI agent intent execution  
**Capabilities:**
- Agent credential + status validation
- Quota checking
- 2-step approval intent (issue + execute)
- Rate limiting (60 req/min)
- Usage metering
- Webhook triggering

**Recent change (PR702):** Added `runNonBlockingSideEffect()` helper to ensure side effects (webhooks, metering) don't block the critical execution path.

**Use Case:** Production entry point for agent-driven actions

**Integration with PR702:** This is where Safe DOM command verification should be injected. Example flow:
1. Agent issues intent with Safe DOM command
2. `/api/spine/execute` receives request
3. Verify command against manifest
4. Execute only if verified
5. Return decision + audit trail

---

### 1.6 Executor Dispatch Route
**File:** `app/api/executors/dispatch/route.ts`  
**Purpose:** Route execution requests to registered executors (Browserbase, social, etc.)  
**Capabilities:**
- Dispatcher pattern
- Effect callbacks
- Executor registration

**Use Case:** Pluggable executor registry for different action types

**Integration with PR702:** Safe DOM could be a validator layer before dispatch.

---

### 1.7 Browserbase Executor
**File:** `lib/executors/browserbase.ts`  
**Purpose:** Create browser sessions and interact with Browserbase API  
**Capabilities:**
- Browser session creation
- Webhook-based callbacks
- Session metadata (effect ID, org, agent, action type)

**Use Case:** Remote browser automation; production integration with Browserbase service

**Integration with PR702:** **Critical integration point**. Browserbase creates live DOM. Safe DOM should:
1. Receive raw DOM from Browserbase
2. Filter dangerous elements
3. Redact secrets
4. Build manifest
5. Return safe view to agent
6. Verify agent commands before sending back to Browserbase

---

## Part 2: PR702 — Safe DOM Mirror Phase 1

### 2.1 What PR702 Adds

**Scope:** Pure TypeScript deterministic library (no browser automation, no executor)

**Files Added:**
- `lib/dsg/safe-dom/types.ts` — Type definitions
- `lib/dsg/safe-dom/filter.ts` — Dangerous element detection
- `lib/dsg/safe-dom/redact.ts` — Secret value redaction
- `lib/dsg/safe-dom/manifest.ts` — Safe view + manifest building
- `lib/dsg/safe-dom/verify-command.ts` — Command verification
- `lib/dsg/safe-dom/index.ts` — Public exports
- `tests/unit/dsg-safe-dom.test.ts` — Comprehensive unit tests

**Core Invariant:**
```
If DSG does not expose an element in the current safe manifest,
the agent cannot invoke it.
```

### 2.2 Key Data Structures

**RawDomElement**
```typescript
{
  selector: string;           // Server-side only
  role: SafeDomRole;
  text?: string;
  label?: string;
  value?: string;
  allowedOps?: SafeDomOperation[];
}
```

**SafeDomElement** (Agent-facing, no selector)
```typescript
{
  id: string;                 // e001, e002, ...
  role: SafeDomRole;
  text?: string;
  label?: string;
  value?: string;
  allowedOps: SafeDomOperation[];
}
```

**SafeElementManifest** (Server-side, for verification)
```typescript
{
  ...SafeDomElement,
  frameId: string;
  selectorHash: string;
  internalSelector: string;   // Raw selector, never sent to agent
  risk: SafeDomRisk;
  expiresAt: string;
}
```

### 2.3 Safe DOM Command Verification

**Supported Commands:**
- `click` — Toggle / activate
- `type` — Text input
- `scroll` — Navigate
- `press` — Key actions (Enter, Escape, Tab, Backspace)

**Verification Logic:**
1. Check frame ID exists
2. Find element by ID in manifest
3. Verify not expired
4. Verify operation is in `allowedOps`
5. Return ALLOW or BLOCK with reason

**Block Reasons:**
- `ELEMENT_NOT_EXPOSED_TO_AGENT` — Unknown element ID
- `OP_NOT_ALLOWED_FOR_ELEMENT` — Operation not whitelisted
- `SAFE_VIEW_EXPIRED` — TTL exceeded
- `INVALID_COMMAND_FRAME` — Unknown frame

### 2.4 Dangerous Elements Filtered

Detected by text/label/selector search:
- `delete`, `remove`, `destroy`
- `confirm`, `pay`, `purchase`
- `billing`, `deploy production`
- `merge`, `publish`, `post`
- `send`, `invite`
- `rotate secret`, `change permission`
- `export`

### 2.5 Secrets Redacted

Patterns detected and redacted:
- Stripe keys: `sk_live_*`, `sk_test_*`
- GitHub tokens: `ghp_*`, `github_pat_*`
- Slack tokens: `xox[baprs]-*`
- AWS keys: `AKIA[0-9A-Z]{16}`
- Private key headers
- Generic `api_key`, `secret`, `token`, `password` patterns
- Values > 128 chars

---

## Part 3: Integration Design

### 3.1 Integration Layers

```
┌─────────────────────────────────────────────────────┐
│              AGI Control Plane                      │
│  (Agent decision + governance logic)                │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│         Spine Execute + Safe DOM Verify              │
│  (/api/spine/execute + verifySafeDomCommand)        │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴──────────────┬──────────────────┐
│                                  │                  │
┌────────────────────┐  ┌──────────┴────┐  ┌────────┴──────┐
│  Virtual PC         │  │ Browserbase   │  │ Terminal      │
│  Simulator          │  │ Executor      │  │ Sandbox       │
│                     │  │               │  │               │
│ - DOM extraction    │  │ - Live browser│  │ - Command     │
│ - Safe DOM build    │  │ - Safe view   │  │   execution   │
│ - Verification      │  │ - Verification│  │ - Audit trail │
└────────────────────┘  └───────────────┘  └───────────────┘
        ↓                       ↓                     ↓
  GUI simulation         Live web app         Shell environment
```

### 3.2 Integration Point #1: Virtual PC ↔ Safe DOM

**Current State:** Virtual PC generates a React GUI with mouse tracking.

**Integration Path:**
1. Virtual PC extracts DOM from rendered page
2. Call `buildSafeManifest()` with raw elements
3. Store manifest in session state
4. Send only `view` to agent (no raw selectors)
5. Agent issues `SafeDomCommand`
6. Verify with `verifySafeDomCommand()`
7. Execute only if verified

**Expected Commit:**
```
lib/dsg/app-builder/virtual-pc-safe-dom-integration.ts
- domExtractor() → RawDomElement[]
- mouseSimulationWithVerification() → checks manifest before execution
```

---

### 3.3 Integration Point #2: Browserbase ↔ Safe DOM

**Current State:** Browserbase manages live browser sessions. No Safe DOM yet.

**Integration Path:**
1. Browserbase creates session, receives live DOM
2. Call `buildSafeManifest()` with raw elements
3. Store manifest in Supabase (keyed by sessionId, frameId)
4. Return agent-facing safe view
5. Agent issues `SafeDomCommand`
6. Fetch manifest from DB
7. Verify with `verifySafeDomCommand()`
8. Send verified command back to Browserbase
9. Return result with audit trail

**Expected Commits:**
```
lib/executors/browserbase-safe-dom-integration.ts
- buildManifestFromLiveDOM() → DB insert + return view
- verifyAndExecuteCommand() → verify + send to Browserbase

app/api/browserbase/safe-dom-manifest/route.ts (internal)
- POST to build and cache manifest

app/api/browserbase/safe-dom-execute/route.ts (internal)
- POST to verify + execute command
```

---

### 3.4 Integration Point #3: Spine Execute ↔ Safe DOM

**Current State:** `/api/spine/execute` handles agent intents but has no Safe DOM awareness.

**Integration Path:**
1. Agent intent payload includes `SafeDomCommand` OR raw action
2. If `SafeDomCommand`:
   - Fetch manifest from Supabase
   - Call `verifySafeDomCommand()`
   - Block if verification fails
   - Execute only if ALLOW
3. If raw action:
   - Apply pattern-based filtering (Try/Demo Gate logic)
   - Execute with standard approval flow

**Expected Commit:**
```
lib/spine/verify-safe-dom-intent.ts
- verifySafeDomIntentOrBlock()
- integrates with spine pipeline

app/api/spine/execute/route.ts (modify)
- Add Safe DOM verification step before execution
```

---

### 3.5 Terminal Sandbox → Pattern Filtering

**Current State:** Already has command filtering. Could share filter logic with Safe DOM.

**Integration Path:**
1. Refactor dangerous pattern detection into shared module
2. Use same pattern list as Safe DOM + terminal commands
3. Example: `"rm -rf"` blocks in both systems

**Expected Commit:**
```
lib/dsg/deterministic/dangerous-pattern-filter.ts (new)
- unifyFiltering() across terminal, Safe DOM, Try/Demo Gate
```

---

## Part 4: AGI Control Plane Integration (Phase 2+)

### 4.1 AGI Entry Points

Once Safe DOM is integrated into Virtual PC and Browserbase, AGI can be:

**Option A: OpenAI + Structured Output**
```typescript
// Agent proposal
{
  "action": "click_button",
  "element_id": "e001",
  "reasoning": "User wants to see logs"
}

// Verify against Safe DOM manifest
// If verified: execute with audit trail
// If blocked: return reasoning + alternative suggestions
```

**Option B: Anthropic Agents (if using SDK)**
```typescript
// Use new Agents API for multi-step planning
// Each step is verified against Safe DOM before execution
// Plan hash + proof chain in audit trail
```

**Option C: Hybrid Control**
```typescript
// Hermes-style controlled executor (already in codebase)
// Safe DOM + DSG Brain + Credential Broker
// High-assurance execution for sensitive operations
```

### 4.2 AGI Safety Constraints

**Hard Constraints:**
1. No command execution outside Safe DOM manifest
2. No raw selector exposure to agent
3. No secret/credential exposure
4. All decisions auditable + tamper-proof
5. Quota limits enforced per org/agent

**Soft Constraints:**
1. Agent gets clear feedback on why actions blocked
2. Agent can discover allowed actions from safe view
3. Plan hash validates execution matches approval
4. Rate limiting prevents brute force

---

## Part 5: Verification Ladder

### 5.1 Unit Tests (Already in PR702)

✅ PR702 includes 165 lines of unit tests covering:
- Dangerous element filtering
- Secret redaction
- Manifest building
- Command verification (allow + all block reasons)

**Run:**
```bash
npm run test -- tests/unit/dsg-safe-dom.test.ts
```

### 5.2 Integration Tests (Phase 1.5)

After PR702 merges:

```bash
# Virtual PC + Safe DOM
npm run test -- tests/integration/dsg-safe-dom-virtual-pc.test.ts

# Browserbase + Safe DOM
npm run test -- tests/integration/dsg-safe-dom-browserbase.test.ts

# Spine Execute + Safe DOM
npm run test -- tests/integration/api/spine-execute-safe-dom.test.ts
```

### 5.3 Production Readiness Checklist

- [ ] PR702 merged and unit tests pass
- [ ] Virtual PC integration tested
- [ ] Browserbase integration tested
- [ ] Spine Execute verified with Safe DOM
- [ ] E2E test (real browser, full flow)
- [ ] Production manifest examples + docs
- [ ] Operator guide for Safe DOM policies
- [ ] AGI integration tested (if using API/SDK)

---

## Part 6: Implementation Roadmap

### Phase 0 (Current)
**Status:** PR702 code-complete, awaiting merge  
**Scope:** Pure library, no integration  
**Deliverable:** Unit-tested Safe DOM library

### Phase 1 (Proposed: PR703–705)
**Scope:** Virtual PC + Browserbase integration  
**Est. effort:** 2–3 commits, 300–400 lines  
**Deliverables:**
- Virtual PC Safe DOM adapter
- Browserbase Safe DOM adapter
- Integration tests + E2E
- Documentation + examples

### Phase 2 (Proposed: PR706–708)
**Scope:** Spine Execute + AGI control  
**Est. effort:** 2–3 commits, 200–300 lines  
**Deliverables:**
- Spine Safe DOM verification
- AGI integration point (OpenAI/Anthropic)
- Audit trail binding
- Operator dashboard

### Phase 3+ (Future)
**Scope:** Hardening, scaling, marketplace  
**Tasks:**
- Pattern-based filtering harmonization
- Production SLA monitoring
- Compliance evidence collection
- Customer success playbooks

---

## Part 7: Known Limitations & Gaps

### PR702 Phase 1 Limitations (By Design)

❌ No browser automation  
❌ No executor endpoint  
❌ No credential access  
❌ No external platform calls  
❌ No production claim yet  

### Integration Phase Gaps (To Address)

1. **Manifest Persistence:** Where to store manifests? (Supabase, Redis, in-memory?)
2. **TTL Strategy:** How long is a manifest valid? (60s default OK for demo, 5–10m for production?)
3. **Frame ID Lifecycle:** How are frame IDs assigned? (per session, per URL, per agent request?)
4. **Policy Versioning:** How to track policy changes? (version field in manifest, hash-based)
5. **Audit Trail Format:** What fields in audit log? (command, decision, manifest version, agent id, timestamp, hash)
6. **AGI Integration:** Which AGI system? (OpenAI, Anthropic, custom? Structured output or function calling?)

### Out of Scope (Phase 0–2)

- OAuth token management
- Multi-language/regional policies
- Custom policy DSL
- Real-time manifest updates
- Cross-frame navigation handling

---

## Part 8: Recommended Next Steps

### For User (This Session)

1. **Review PR702 decision:** Approve merge or request changes?
2. **Choose AGI path:** Which AGI system to target? (OpenAI, Anthropic, or skip Phase 2?)
3. **Prioritize integration:** Virtual PC first (simpler) or Browserbase first (more useful)?

### For Implementation (After Approval)

1. **Merge PR702** (library only)
2. **Create PR703:** Virtual PC + Safe DOM
3. **Create PR704:** Browserbase + Safe DOM
4. **Create PR705:** Integration tests + docs
5. **Create PR706+:** AGI control plane (if Phase 2 approved)

### For Verification

- Run: `npm run test -- tests/unit/dsg-safe-dom.test.ts` → ✅ Pass
- Build: `npm run build` → ✅ No typecheck errors
- Type: `npm run typecheck` → ✅ No TS errors
- Review: Files + test coverage match CLAUDE.md standards

---

## Summary Table

| Component | Status | Integration | Effort | Risk |
|-----------|--------|-------------|--------|------|
| **Safe DOM Library** | ✅ Code-complete | Standalone | 0 | Low |
| **Virtual PC** | ✅ Exists | Use safe DOM view | 2–3h | Low |
| **Browserbase** | ✅ Exists | Use safe DOM + manifest DB | 3–4h | Medium |
| **Spine Execute** | ✅ Exists | Add verification step | 2h | Low |
| **Terminal Sandbox** | ✅ Exists | Share filters | 1h | Low |
| **AGI Control** | ❌ To be designed | Use safe DOM as base | TBD | Medium–High |

---

## Appendix: File Map

### New in PR702
```
lib/dsg/safe-dom/
├── types.ts (81 lines)
├── filter.ts (52 lines)
├── redact.ts (67 lines)
├── manifest.ts (86 lines)
├── verify-command.ts (33 lines)
└── index.ts (5 lines)

tests/unit/
└── dsg-safe-dom.test.ts (165 lines)
```

### Modified in PR702
```
.github/workflows/ci.yml (CI env vars)
app/api/spine/execute/route.ts (non-blocking side effects)
tests/integration/api/execute-critical-path.test.ts (mocks)
```

### Proposed in Phase 1
```
lib/dsg/app-builder/virtual-pc-safe-dom-integration.ts
lib/executors/browserbase-safe-dom-integration.ts
app/api/browserbase/safe-dom-manifest/route.ts
app/api/browserbase/safe-dom-execute/route.ts
lib/spine/verify-safe-dom-intent.ts
lib/dsg/deterministic/dangerous-pattern-filter.ts
tests/integration/dsg-safe-dom-virtual-pc.test.ts
tests/integration/dsg-safe-dom-browserbase.test.ts
tests/integration/api/spine-execute-safe-dom.test.ts
docs/safe-dom-integration-guide.md
docs/safe-dom-manifest-format.md
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-10  
**Next Review:** After PR702 merge decision
