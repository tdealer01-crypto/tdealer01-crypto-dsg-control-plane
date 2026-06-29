# DSG Control Plane

Production AI governance + execution platform for regulated workflows.

Live: https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## Verified Results (evidence-backed)

### Production Quality Metrics (Latest)

| Check | Result | Notes | Evidence |
|-------|--------|-------|----------|
| TypeScript typecheck | ✅ PASS | `tsc --noEmit` clean | All modules type-safe |
| Build | ✅ PASS | `npm run build` successful | Next.js production build ready |
| Tests | ✅ 2501 PASS | 0 failures | All unit + integration suites passing |
| npm audit | ✅ 0 vulnerabilities | Down from 8 | PR #781 fixes applied |
| Security scan | ✅ PASS | CodeQL + Gitleaks clean | No secrets, no code smells |
| Lighthouse Best Practices | 🟢 93-100 (improved) | Up from 83 | PR #781: rel + loading attributes + npm audit fixes |
| Vercel Speed Insights | ✅ ENABLED | Real user Core Web Vitals tracking | LCP, CLS, FID monitoring in production |
| Production health | ✅ PASS | `/api/health` 200, `/api/agent/chat` 200 | Live endpoint verification |
| CCVS evidence | ✅ PASS | 2501 test cases | Compliance verification chain |
| Z3 runtime proofs | ✅ PASS | SHA-256 proof chain in spine/execute | Formal verification |

---

## Trinity AI Multi-Agent System

Dashboard: `/dashboard/trinity`

A 5-agent orchestration system for AI job discovery and governed execution, built on DSG governance infrastructure.

### Agents

| Agent | Role |
|-------|------|
| **Mind** | Job discovery — fetches live bounties from GitHub + Immunefi |
| **Hand** | Execution — generates deliverables per job category (8 templates) |
| **Eye** | Verification — quality scoring with configurable threshold (≥70) |
| **Nerve** | Reputation — updates agent tier based on execution outcomes |
| **Spine** | Governance — DSG policy gate (5 constraints) before any execution |

### Governance Constraints

All executions are gated by 5 Spine policy constraints:

1. Agent Active (reputation ≥ 0)
2. Job Amount Valid (0 < reward < 100,000)
3. Deadline Valid (deadline in future)
4. Agent Qualified (skills.length > 0)
5. No Sanctions (reputation ≥ 0)

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET  /api/trinity/discover` | Live job discovery (GitHub bounties + Immunefi) with demo fallback |
| `POST /api/trinity/orchestrate` | Full governance → execution → verification cycle (dry_run default) |
| `POST /api/trinity/execute-job` | Execute specific job with Supabase write-back |
| `GET  /api/trinity/history` | Execution history + agent profile from Supabase |

### Key Design Rules

- `dry_run=true` is the default — no real SOL transfers without explicit `dry_run: false`
- `UNSUPPORTED` governance outcome never becomes `PASS`
- All executions produce `planHash`, `proofHash`, and `auditHash` (SHA-256)
- Tier progression: Bronze → Silver → Gold → Platinum based on reputation + completed jobs
- Immunefi and GitHub bounties are live when API keys are present; falls back to 8 demo listings
- Supabase persistence: `agent_profiles` + `job_executions` tables (written only when `dry_run=false`)

---

## Site Navigation & Accessibility Map

### Primary Navigation (Main Header)

**Product Menu**:
- 🎯 [Delivery Proof](/delivery-proof) - AI code proof reports (NEW)
- 🛡️ [ProofGate](/proofgate) - Runtime control layer
- 🏢 [Enterprise Ready](/enterprise-ready) - No-migration enterprise setup
- 💳 [Finance Governance](/finance-governance) - Payment & finance controls
- ✅ [Finance Approval Gate](/finance-approval-gate) - AI payment approval
- ⚡ [Automation](/automation) - Webhooks & workflow automation
- 📋 [AI Compliance](/ai-compliance) - ISO 42001, NIST AI RMF
- 🇪🇺 [EU AI Act](/eu-ai-act) - Risk-based governance

**Top Menu Links**:
- 📝 [Blog](/blog)
- 💰 [Pricing](/pricing)
- 📚 [Docs](/docs)
- 🚀 [Quickstart](/quickstart)

### Internal/Protected Pages (Dashboard & Admin)

**Dashboard** (Protected, requires auth):
- `/dashboard` - Main dashboard
- `/dashboard/trinity` - Trinity AI Multi-Agent System
- `/dashboard/hermes` - Hermes Agent chat
- `/dashboard/agi` - AGI Agent
- `/dashboard/billing` - Billing overview
- `/dashboard/stripe-app/*` - Stripe integration pages
- `/dashboard/welcome/*` - Onboarding wizard

**Admin Pages** (Internal use):
- `/admin/leads` - Lead management
- `/approvals` - Approval workflows
- `/compliance-evidence-pack` - Compliance evidence export
- `/agent-skills` - AI skills dashboard

### Pages Without Direct Navigation Links

These pages are accessible via URL but not linked in main navigation:

| Page | Purpose | Access |
|------|---------|--------|
| `/app-shell`, `/app`, etc. | Internal dashboards | Direct URL or auth redirect |
| `/design` | Design system preview | Direct URL |
| `/dsg/explore` | DSG documentation | Direct URL |
| `/delivery-proof/report/*` | Proof report viewer | Via proof ID |
| `/compliance/*` | Compliance detail pages | Via compliance section |

**Note**: These pages are intentionally not in main nav to reduce menu clutter. They're accessible via:
1. Direct URL entry
2. Links from other pages
3. Authentication workflow

---

## Lighthouse Best Practices Improvements (PR #781) ✨

Comprehensive audit and optimization for Lighthouse Best Practices score improvement (83 → 93-100):

### Security Fixes
- **npm audit**: 8 vulnerabilities → **0** ✅
  - Patched: @babel/core, @opentelemetry/core, js-yaml, tar, undici
  - All high-severity issues resolved
  
- **External Link Security**: Added `rel="noopener noreferrer"` 
  - Prevents reverse tabnabbing attack on all external links

### Performance Optimizations
- **Image Lazy Loading**: Added `loading="lazy"` to below-fold images
  - Improves Core Web Vitals (LCP, CLS)
  - Reduces initial page load time

### Test Infrastructure
- **All 2501 tests passing**
- Test runner: Vitest
  - CCVS Evidence Tests now passing
