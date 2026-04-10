<div align="center">

# DSG ONE

### Enterprise AI Runtime Control Plane for Auditability, Control, and Verified Operations

<p>
  DSG ONE is a runtime control plane for organizations that need AI execution to be
  <strong>governable, reviewable, replay-resistant, and operationally visible</strong>.
</p>

<p>
  <img alt="Enterprise AI Runtime" src="https://img.shields.io/badge/Enterprise-AI%20Runtime-0f172a?style=for-the-badge">
  <img alt="Auditability" src="https://img.shields.io/badge/Auditability-Evidence%20Backed-0f766e?style=for-the-badge">
  <img alt="Verified Runtime" src="https://img.shields.io/badge/Verified-Runtime%20Evidence-1d4ed8?style=for-the-badge">
  <img alt="Governance" src="https://img.shields.io/badge/Governance-In%20the%20Control%20Flow-7c3aed?style=for-the-badge">
</p>

<p>
  <strong>Built for teams that cannot afford opaque AI execution in production.</strong>
</p>

</div>

---

## Latest Update (April 8, 2026)

- Hardened `/auth/continue` rate-limit key generation to avoid runtime/test instability when `request.nextUrl` is unavailable by falling back to `new URL(request.url).pathname`.
- Re-ran validation checks after the update.

### Test Results (latest run)

```bash
npm run test       # PASS (45 files, 100 tests)
npm run typecheck  # PASS
npm run lint       # PASS
```

---

## What DSG ONE Is

DSG ONE is an enterprise runtime control plane for AI operations.

It is designed for environments where AI execution must not be treated as a black box. Instead of relying on informal trust, DSG ONE gives organizations a structured runtime layer for:

- authenticated operator access
- organization-scoped workspaces
- agent creation and API-key-based execution
- execution visibility and decision traces
- audit-oriented runtime evidence
- live mission and readiness surfaces
- usage, quota, and billing awareness
- public product proof and authenticated verified proof

The goal is simple:

> **If AI is going to operate in production, it must be controllable, inspectable, and reviewable in real time.**

---

## Why This Exists

As AI systems move from demos into real workflows, the problem changes.

The hard problem is no longer only model quality. The real problem is whether an organization can answer:

- What happened?
- Why did it happen?
- Was it allowed?
- Was it replayed or duplicated?
- What evidence exists for review?
- Can operators inspect the runtime state safely and quickly?

DSG ONE is built to address that operational problem.

---

## Product Thesis

DSG ONE is based on five practical principles:

### 1. Control must exist at runtime
Governance that only exists in documents is not enough.

### 2. Evidence must be visible
Operational claims should be backed by observable runtime state, not only by narrative.

### 3. Auditability must be practical
It should be possible to inspect actions, state transitions, and proof surfaces without reverse-engineering the system.

### 4. Operators need live visibility
Monitoring, readiness, mission state, and execution history should support intervention while the system is running.

### 5. Public proof and verified proof are different
A product can have a public AI-readable narrative for positioning, while still keeping authenticated, org-scoped, runtime-backed evidence for real verification.

---

## What the Product Includes

### Operator access and provisioning
- magic-link authentication
- protected operator surfaces
- organization-scoped user state
- trial signup and provisioning flow

### Agent and execution layer
- starter-agent creation
- one-time API key generation
- sample execution path
- execution decisions, latency, and audit references

### Monitoring and control-plane surfaces
- dashboard and mission views
- readiness and app-shell entry points
- operator-facing workflow surfaces

### Enterprise proof surfaces
- **Public proof narrative** for external evaluation
- **Verified runtime evidence** for authenticated, org-scoped review

---

## Public Proof vs Verified Runtime Proof

DSG ONE intentionally separates two proof surfaces:

### Public proof narrative
For customers, partners, AI systems, and public evaluation.

Use:
- `/enterprise-proof/start`
- `/enterprise-proof/report`
- `/api/enterprise-proof/report`

This surface is:
- public
- AI-readable
- safe to share externally
- not tied to org-scoped runtime secrets

### Verified runtime evidence
For authenticated users inside a real organization scope.

Use:
- `/enterprise-proof/verified`
- `/enterprise-proof/verified/report?org_id=<ORG_ID>&agent_id=<AGENT_ID>`
- `/api/enterprise-proof/runtime-report?org_id=<ORG_ID>&agent_id=<AGENT_ID>`
- `/api/enterprise-proof/runtime-report/summary?org_id=<ORG_ID>&agent_id=<AGENT_ID>`

This surface is:
- auth-gated
- org-scoped
- agent-scoped
- runtime-backed
- explicit about gaps when evidence is incomplete

---

## Quickstart Experience

A new workspace can be evaluated through a guided flow:

1. Sign up for a trial workspace
2. Confirm the magic link
3. Enter `/quickstart`
4. Create the first starter agent
5. Copy the one-time API key
6. Run the first sample execution through `/api/execute`
7. Inspect mission, app-shell, and enterprise-proof surfaces

Quickstart currently includes:
- 14-day trial
- 1,000 included executions
- first-agent creation
- first-execution walkthrough
- links into live monitoring surfaces

---

## Current API Route Notes (Repo Truth)

These route notes are intended to keep evaluation and smoke checks aligned with the current repository truth.

### Public baseline probe
- `GET /api/health`

Use this as the baseline availability probe for public and deployment checks.

### Stable execution entry
- `POST /api/execute`

This is the stable compatibility entry used by quickstart and sample execution flows.
Internally, the current implementation forwards to the spine execution handler.

### Underlying execution handler
- `POST /api/spine/execute`
- `POST /api/intent`

The spine path is the current execution implementation layer.
`/api/intent` and `/api/spine/execute` are part of the current runtime execution flow.

### Authenticated operator routes
- `GET /api/usage`
- `GET /api/executions`
- `GET /api/audit`
- `GET, POST /api/policies`
- `GET /api/capacity`
- `POST /api/agent-chat`

These are operator-facing routes and should be evaluated with authenticated, org-scoped access.
They should not be treated as anonymous/public health probes.

### Evaluation guidance
- Use `/api/health` first for baseline availability.
- Use `/api/execute` for the stable sample-execution entry.
- Use authenticated operator flows when validating usage, policy, capacity, audit, and execution surfaces.

---

## Online Integration Smoke Test (with external apps)

Use this checklist when you want to test DSG ONE online with another application (e.g., internal portal, automation tool, webhook worker, or partner integration).

### 1) Prepare deployment target

Set your deployed base URL:

```bash
export DSG_BASE_URL="https://<your-deployment-domain>"
```

### 2) Baseline availability check

```bash
curl -sS "$DSG_BASE_URL/api/health"
```

Expected result: JSON response with healthy status.

### 3) Cross-app execution test (server-to-server)

Call the stable execution endpoint from the external app backend:

```bash
curl -sS -X POST "$DSG_BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cross-app smoke test",
    "input": {
      "source": "external-app",
      "timestamp": "2026-04-10T00:00:00Z"
    }
  }'
```

Expected result: execution response with a request/execution identifier and runtime decision metadata.

### 4) Verify operator surfaces after external trigger

After step 3, verify these authenticated routes in your operator session:
- `/api/executions` (new item appears)
- `/api/audit` (trace/evidence recorded)
- `/api/usage` (usage delta recorded)

### 5) Recommended production checks

For real online integrations, verify:
- retry behavior for 429/5xx responses
- idempotency key strategy in the caller
- request timeout budget alignment between systems
- org-scoped auth policy and minimum privileges

### Quick pass criteria

- `GET /api/health` is reachable.
- `POST /api/execute` from the external app returns success.
- corresponding execution and audit records are visible to operators.

---

## Authentication and Provisioning Model

DSG ONE uses two distinct entry paths:

### `/signup`
For first-time users.

This path:
- collects work email and workspace name
- creates a pending trial-signup record
- sends a magic link
- provisions organization, user, and trial subscription during confirmation
- redirects the user into `/quickstart`

### `/login`
For already provisioned operator accounts only.

Login is not a public self-service signup path.
The email must already map to:
- an active row in `users`
- a valid `org_id`
- an allowed operator account

This distinction is intentional. Login is for existing operator access. Signup is for first-time provisioning.

---

## Who This Is For

DSG ONE is relevant for teams building or operating:

- enterprise AI systems
- internal AI platforms
- agent-based workflows with approval and oversight requirements
- audit-heavy or review-sensitive AI operations
- regulated or compliance-aware runtime environments
- production AI systems where traceability matters

It is especially relevant where **“just trust the model”** is not an acceptable operating standard.

---

## What Buyers Actually Get

Organizations using DSG ONE get:

- a clearer runtime control layer for AI execution
- better operational evidence for review
- separation between public positioning and real runtime proof
- visible quickstart paths from signup to first execution
- operator-facing surfaces for mission, execution, and readiness workflows
- an architecture designed for review, not only for demos

---

## Research References

This product direction is supported by research and technical artifacts related to control, auditability, and verification-oriented runtime design.

### Supporting DOIs

- DOI: `10.5281/zenodo.18244246`  
  https://doi.org/10.5281/zenodo.18244246

- DOI: `10.5281/zenodo.18225586`  
  https://doi.org/10.5281/zenodo.18225586

- DOI: `10.5281/zenodo.18212854`  
  https://doi.org/10.5281/zenodo.18212854

These references support the research direction behind DSG ONE.

They are **supporting artifacts**, not a substitute for inspecting the product itself.

---

## How To Evaluate DSG ONE

The right way to evaluate DSG ONE is not through slogans.

It is through inspection.

Review:
- signup and login behavior
- provisioning rules
- quickstart flow
- starter-agent creation
- execution path and returned decision data
- public enterprise-proof surfaces
- verified runtime proof surfaces
- monitoring and mission entry points
- runtime evidence and gaps behavior
- research references alongside implementation

The standard is not whether the README sounds impressive.

The standard is whether the runtime is reviewable under actual use.

---

## Suggested Evaluation Path

A practical evaluation path is:

1. Open the public proof narrative
2. Start a trial workspace
3. Complete magic-link confirmation
4. Use quickstart to create the first agent
5. Run the first execution
6. Open mission and dashboard surfaces
7. Inspect the verified runtime proof path
8. Compare runtime behavior against the product claims and research direction

---

## Security Checklist Reality (Updated: 2026-04-03)

จากผลตรวจล่าสุด มีบางจุดที่รายงานเดิม “ไม่ตรงกับความจริงปัจจุบัน” และได้อัปเดตให้ตรงกับสถานะจริงของโค้ดแล้ว:

### Corrected facts
- `app/auth/continue/route.ts` **มี rate limit แล้ว** (ไม่ได้เป็นช่องโหว่ที่ยังค้าง).
- `app/api/execute/route.ts` **มี route-level rate limit แล้ว** (นอกเหนือจาก quota logic).
- ที่ root **มี lock file แล้ว** (`package-lock.json`) จึงไม่ใช่สถานะ “ไม่พบ lock file”.

### Items still needing additional verification / hardening
- ยังไม่ได้ audit รายละเอียดของ shell scripts บางไฟล์แบบเต็ม:
  - `set-vercel-runtime-env.sh`
  - `set-vercel-stripe-env.sh`
- CORS ยังเป็นแนวทาง same-origin เป็นหลัก หากมีแผน external client ควรกำหนด explicit allowlist policy.
- ควรทบทวนการส่ง error detail กลับ client ให้เป็น generic มากขึ้นใน production paths ที่ยังส่งข้อความเชิงเทคนิค.
- ควรกำหนดรอบ dependency security review/update อย่างสม่ำเสมอ.

---

## Package Manager & Lockfile Policy

โครงการนี้ใช้ **npm** เป็น package manager หลัก (อ้างอิงจาก `package-lock.json` และ workflow CI ที่รันด้วย `npm ci`).

นโยบายที่ต้องปฏิบัติ:
- ห้ามแก้ `package.json` โดยไม่อัปเดต `package-lock.json` ใน commit เดียวกัน
- CI จะตรวจ lock file sync โดยรัน `npm install --package-lock-only --ignore-scripts` แล้วตรวจ `git diff --exit-code -- package-lock.json`
- CI/CD และ Vercel ต้องติดตั้ง dependencies ด้วย `npm ci` เพื่อให้ได้ dependency graph ที่ reproducible

## Positioning

DSG ONE should be understood as:

> **A control plane for enterprise AI operations that need auditability, runtime evidence, and operational governance.**

It is not a claim that all AI risk disappears.
It is not a claim that policy text alone is enough.
It is not a claim that one repository solves governance universally.

It is a serious product effort to make AI operations:

- more inspectable
- more auditable
- more controllable
- more operationally truthful
- more governable in real time

---

## Bottom Line

If your organization needs AI systems to operate with:

- explicit runtime control
- visible execution evidence
- authenticated operator workflows
- structured quickstart-to-production paths
- public proof for external evaluation
- verified proof for real runtime review

then DSG ONE is built in that direction.

**Read the flows. Run the product. Inspect the runtime. Make your own judgment.**

---

## Keywords

`#EnterpriseAI` `#AIRuntime` `#Auditability` `#VerifiedRuntime` `#Governance` `#ZeroTrust` `#Operators` `#ControlPlane` `#MissionVisibility` `#ExecutionEvidence`
