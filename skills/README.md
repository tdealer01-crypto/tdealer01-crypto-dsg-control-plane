# DSG Governance Skills

Claude Code skills for DSG ONE / ProofGate Control Plane governance decision-making, deterministic gating, formal verification, and compliance evidence.

---

## 📚 Available Skills

### 1. **dsg-action-layer-ged** — Primary Governance Skill

The studio-style agent control layer. Turns a user goal into an explainable plan, deterministic decision flow, permission verdicts, and browser-first execution after approval.

**When to use**:
- Gate an agent action before execution
- Determine if compliance audit is required
- Execute a plan with credential grants (Hermes controlled executor)
- Replay an agent decision from six months ago
- Generate compliance evidence pack for SOC2 / ISO27001 / NIST audit

**Quick example**:
```typescript
import { runDsgActionLayer } from '@/skills/dsg-action-layer-ged/skill';

const result = await runDsgActionLayer({
  userGoal: 'Add new API endpoint for compliance evidence retrieval',
  riskLevel: 'medium',
  actionType: 'add_route',
  context: {
    requiresAuth: true,
    handlesAuditData: true,
  },
  requiresApproval: true,
});

// Result includes:
// - gateStatus: 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED'
// - plan: { goal, riskAssessment, requiredApprovals, nextSteps }
// - proofHash: cryptographic evidence for replay
// - violations: Z3 constraint violations (if any)
```

**5 Core Capabilities**:
1. **Deterministic Safety Gate** — Get PASS/BLOCK/REVIEW + proof hash before action
2. **Replayable Governance** — Audit: "Why did AI decide X at time T?"
3. **Compliance Evidence Pack** — Preparing for SOC2 / ISO27001 / EU AI Act audit
4. **Runtime Governance** — Lifecycle: Before / During / After agent execution
5. **Hermes Controlled Executor** — Plan → Conformance Check → Credential Grant → Execute → Evidence

**Decision Flow**:
```
PLAN    → Extract goal, risk level, context
  ↓
GATE    → POST /api/dsg/v1/gates/evaluate
  ↓
DECIDE  → PASS → proceed
         REVIEW → show plan, require approval
         BLOCK → halt
  ↓
EXECUTE → Hermes executor (if credential needed) or direct with audit logging
  ↓
COMMIT  → POST /api/spine/execute to store evidence
  ↓
REPLAY  → Future audit can replay from stored proof + policy version
```

---

### 2. **formal-verification** — Z3 SMT Solver Skill

Formal verification using Z3 Spacer for policy constraint verification, Horn clause analysis, invariant checking, and counterexample generation.

**When to use**:
- Verify policy constraints are satisfiable
- Generate formal proof for audit
- Check invariants across decision flows
- Find counterexamples to policy violations
- Produce evidence-ready Z3 proof artifacts

**Quick example**:
```typescript
import { runFormalVerification } from '@/skills/formal-verification/skill';

const result = await runFormalVerification({
  policyName: 'compliance_gate_v1',
  constraints: [
    {
      name: 'gate_requires_evidence',
      expression: 'gate_allow AND evidence_exists → can_proceed',
      description: 'Action can proceed only with evidence',
    },
    {
      name: 'block_on_high_risk',
      expression: 'risk_level == high AND NOT approved → BLOCK',
      description: 'High-risk actions must be approved',
    },
  ],
  mockState: false,
});

// Result includes:
// - verified: true/false
// - theorems: array of proof results
// - counterexamples: violations with concrete inputs
// - z3ProofHash: cryptographic proof artifact
```

**Expected Output**:
```json
{
  "verified": true,
  "summary": {
    "totalConstraints": 2,
    "satisfiedConstraints": 2,
    "violatedConstraints": 0,
    "verificationStatus": "COMPLETE"
  }
}
```

---

### 3. **dsg-github-marketplace-action-controller** — GitHub Actions Wrapper

Package DSG gates and proofs as reusable GitHub Marketplace Actions with deterministic GO/NO-GO validation, audit proof, and secure deploy checks.

**When to use**:
- Publish governance-controlled actions to GitHub Marketplace
- Generate action.yml specification with DSG gate
- Validate secrets isolation before marketplace submission
- Create audit-trail-ready GitHub Actions

**Quick example**:
```typescript
import { runGitHubActionController } from '@/skills/dsg-github-marketplace-action-controller/skill';

const result = await runGitHubActionController({
  actionName: 'dsg-deploy-gate',
  actionVersion: '1.0.0',
  gatePolicy: 'deterministic',
  inputs: {
    deployment_url: { description: 'URL to deploy', required: true },
    gate_policy: { description: 'Governance policy version', default: 'v1' },
  },
  secrets: [], // No secrets in this action
});

// Result includes:
// - gateDecision: 'GO' | 'NO-GO'
// - actionYmlSpec: action.yml metadata
// - goNoGoChecks: deterministic gate, compliance, audit trail, secrets
// - publishReadiness: canPublishToMarketplace, blockers, recommendations
```

---

### 4. **dsg-multi-governance-orchestrator** — Orchestration Skill

Multi-source governance orchestration. Coordinate UI trust upgrades, action-layer gates, deterministic execution, marketplace/enterprise cutover, architecture review, and production GO/NO-GO validation.

**When to use**:
- Coordinate multiple governance sources before production deployment
- Validate architecture before go-live
- Orchestrate enterprise vs. marketplace cutover
- Generate production GO/NO-GO decision
- Multi-policy compliance orchestration

**Quick example**:
```typescript
import { runMultiGovernanceOrchestrator } from '@/skills/dsg-multi-governance-orchestrator/skill';

const result = await runMultiGovernanceOrchestrator({
  orchestrationId: 'prod-cutover-2026-q3',
  sources: [
    {
      name: 'ui-trust-upgrade',
      type: 'ui-trust',
      policies: ['dashboard-auth', 'operator-consent'],
    },
    {
      name: 'action-layer-gates',
      type: 'action-layer',
      policies: ['execution-gate', 'credential-broker'],
    },
    {
      name: 'deterministic-execution',
      type: 'deterministic',
      policies: ['z3-proof', 'invariant-check'],
    },
  ],
  targetEnvironment: 'production',
  requiresArchitectureReview: true,
});

// Result includes:
// - orchestrationStatus: 'READY' | 'REVIEW' | 'BLOCKED'
// - sourcesStatus: array with each source's gate status
// - architectureReview: { required, approved, reviewers, findings }
// - productionGoNoGo: { canDeploy, checks, blockers }
```

---

### 5. **dsg-marketplace-fix** — Remediation Skill

Fixes premature README claims, verifies production OAuth authorization-server endpoints, ensures compliance before marketplace launch.

**When to use**:
- Fix incorrect "production-ready" claims in README
- Verify OAuth /authorize and /token endpoints
- Validate compliance evidence before marketplace submission
- Correct premature feature claims
- Prepare for marketplace approval

**Quick example**:
```typescript
import { runMarketplaceFix } from '@/skills/dsg-marketplace-fix/skill';

const result = await runMarketplaceFix({
  issueName: 'premature-production-claim',
  issueType: 'premature-claim',
  targetReadmeSection: 'Product Status',
  verifyProductionEndpoint: 'https://api.dsg.pics/oauth/authorize',
});

// Result includes:
// - claimVerified: true/false
// - oauthEndpointStatus: 'VERIFIED' | 'MISSING' | 'MISCONFIGURED'
// - remediation: { readmeSections, oauthConfig, complianceFixes }
// - marketplaceApprovalStatus: 'APPROVED' | 'REQUIRES_FIXES' | 'BLOCKED'
```

---

## 🔐 Critical Rules

**Gate Status Mapping**:
| Status | Meaning | Action |
|---|---|---|
| `PASS` | All checks passed | Proceed with execution |
| `REVIEW` | Requires human decision | Show plan, collect approval, then proceed |
| `BLOCK` | Violations detected | Halt immediately, never proceed |
| `UNSUPPORTED` | Cannot decide safely | Maps to REVIEW (low) or BLOCK (medium+), **never PASS** |

**Never skip the gate** for actions with `riskLevel: medium` or higher.

**Always store the proofHash** in execution context for future replay.

**Credentials must go through Hermes CredentialBroker** — never raw secrets.

**Mock state must be false** for any production gate evaluation.

---

## 📡 API Endpoints (Used by Skills)

Skills call these DSG control plane endpoints:

```http
POST /api/dsg/v1/gates/evaluate
→ Get gateStatus, proof hash, constraints

GET  /api/dsg/v1/policies/manifest
→ List active policies

POST /api/dsg/v1/proofs/prove
→ Generate formal proof artifact

POST /api/spine/execute
→ Commit runtime evidence to audit trail
```

Base URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`

Set `DSG_CONTROL_PLANE_URL` env var to override for local/staging.

**Authentication**:
```http
Authorization: Bearer <DSG_API_KEY>
```

Obtain API key from DSG dashboard → API Keys.
Free tier: 50 evaluations/month. Upgrade at `/pricing#dsg-gate`.

---

## 🛠️ Using Skills in Claude Code

### Option 1: Invoke by Name

```bash
/dsg-action-layer-ged
Gate a new API endpoint addition. Goal: add compliance evidence retrieval. Risk: medium.
```

### Option 2: Call Programmatically

```typescript
import { runDsgActionLayer } from './skills/dsg-action-layer-ged/skill';

const result = await runDsgActionLayer({
  userGoal: '...',
  riskLevel: 'medium',
  actionType: 'add_route',
  requiresApproval: true,
});
```

### Option 3: Use Skill Tool

```typescript
Skill('dsg-action-layer-ged', 'Gate this action: ... Risk: medium');
```

---

## 📖 Reference Docs

Each skill directory contains detailed reference guides:

- `dsg-action-layer-ged/references/gate-evaluate.md` — Gate decision logic
- `dsg-action-layer-ged/references/replay-governance.md` — Audit replay patterns
- `dsg-action-layer-ged/references/compliance-evidence.md` — Evidence packing
- `dsg-action-layer-ged/references/runtime-governance.md` — Lifecycle management
- `dsg-action-layer-ged/references/hermes-executor.md` — Credential control
- `dsg-github-marketplace-action-controller/references/action-yml-spec.md` — action.yml guide
- `dsg-multi-governance-orchestrator/references/m1-m2-checklist.md` — Orchestration checklist

---

## ✅ Testing Skills

Run skill unit tests:

```bash
npm run test:unit -- skills/
```

Run skill integration tests:

```bash
npm run test:integration -- skills/
```

Run all skill tests:

```bash
npm run test -- skills/
```

---

## 🚀 Governance Decision Checklist

Before invoking any skill:

- [ ] What is the user goal?
- [ ] What is the risk level (low/medium/high/critical)?
- [ ] Do we have recent policy versions?
- [ ] Is evidence available for Z3 gate?
- [ ] Should approvals be required?
- [ ] Is this production or staging?
- [ ] Should this be replayable for audit?

---

## 📝 Summary

DSG governance skills encode the decision-making layer for AI governance control. Each skill:

1. Takes a governance question or action description
2. Calls the deterministic safety gate (Z3 SMT solver)
3. Maps gate status to decision (PASS/REVIEW/BLOCK)
4. Returns cryptographic proof for audit replay
5. Provides actionable next steps

Use skills to make every agent decision **provable, auditable, and replayable**.
