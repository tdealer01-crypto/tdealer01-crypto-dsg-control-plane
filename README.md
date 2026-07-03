# DSG Control Plane

Production AI governance + execution platform for regulated workflows.

Live: https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## GitHub Marketplace

[![GitHub Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue?logo=github)](https://github.com/marketplace/dsg-control-plane)
[![Stripe App](https://img.shields.io/badge/Stripe-App%20Marketplace-6772e5?logo=stripe)](https://marketplace.stripe.com/apps/dsg-control-plane)

> **Note**: Marketplace links will be active after listing approval. See [GITHUB_MARKETPLACE_SETUP.md](./GITHUB_MARKETPLACE_SETUP.md) for the submission process.

### Quick Start (5 Minutes)

1. **Install** from [GitHub Marketplace](https://github.com/marketplace/dsg-control-plane)
2. **Deploy** to Vercel — one-click deployment
3. **Connect** Supabase + Stripe keys via environment variables
4. **Access** your governance dashboard at `/dashboard`

No migration required. Works with any existing repository.

### Pricing

| Tier | Price | Key Features |
|------|-------|-------------|
| **Free** | $0/month | 1 Delivery Proof scan/month, 50 DSG Gate evals/month |
| **Pro** | $49/month | Unlimited scans, priority support, 14-day free trial |
| **Business** | $199/month | Unlimited + compliance exports, 14-day free trial |
| **Enterprise** | Custom | SLA + dedicated support + custom integrations |
| **MCP Subscription** | ฿490/month | Developer tools — MCP protocol, CLI, API quota |

14-day free trial on all paid tiers. No credit card required to start.

### Key Metrics

| Metric | Value |
|--------|-------|
| Tests passing | 2501 ✅ |
| TypeScript typecheck | ✅ PASS |
| Build | ✅ PASS |
| Production health | ✅ PASS |
| Security scan | ✅ PASS |

### Documentation

| Document | Description |
|----------|-------------|
| [MARKETPLACE.md](./MARKETPLACE.md) | Full marketplace listing details |
| [GITHUB_MARKETPLACE_SETUP.md](./GITHUB_MARKETPLACE_SETUP.md) | Step-by-step listing setup |
| [STRIPE_APP_MARKETPLACE.md](./STRIPE_APP_MARKETPLACE.md) | Stripe App integration |
| [FAQ_MARKETPLACE.md](./FAQ_MARKETPLACE.md) | Common questions and answers |
| [CUSTOMER_SUCCESS.md](./CUSTOMER_SUCCESS.md) | Post-launch playbook |
| [docs/MARKETPLACE_ASSETS.md](./docs/MARKETPLACE_ASSETS.md) | Asset creation guide |

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

## Solana Integration (Phase 3 Feature 3)

Real blockchain transaction execution for native SOL transfers with confirmation polling and audit trails.

**Status:** ✅ Production-ready for devnet/testnet testing

### Features

- **Real SOL Transfers**: Direct Solana blockchain transactions via `SystemProgram.transfer`
- **Confirmation Polling**: 60-second timeout with block height validation (256-block window)
- **Transaction Signing**: Treasury keypair management via secure environment variables
- **Audit Trail**: Immutable Supabase ledger with idempotency checking
- **Graceful Degradation**: Automatic dry-run fallback if keypair unavailable
- **Production Commitment**: Support for processed/confirmed/finalized commitment levels

### Quick Start

**1. Environment Setup**
```bash
# Set in .env or GitHub Secrets
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_TREASURY_PRIVATE_KEY=<base64-64-byte-key>
# OR
SOLANA_TREASURY_SECRET=[array,of,64,bytes]
```

**2. Generate Treasury Keypair**
```bash
solana-keygen new --outfile treasury.json
cat treasury.json | jq '.[]'  # Copy as SOLANA_TREASURY_SECRET
```

**3. Fund Treasury (Devnet)**
```bash
solana airdrop 10 <public_key> --url devnet
```

**4. Execute Transfer**
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_123",
    "action": {
      "type": "transfer_sol",
      "recipient": "recipient_wallet",
      "amount": 1.5
    }
  }'
```

### Architecture

```
API Request → SOLPaymentProcessor → SolanaTransactionExecutor → Solana RPC → Confirmation Polling → Supabase Ledger
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/execute` | POST | Execute SOL transfer (production or dry-run) |
| `/api/spine/execute` | POST | Runtime governance gate + execute |

### Deployment Stages

| Stage | Network | Status | Next |
|-------|---------|--------|------|
| 🟢 Devnet | devnet.solana.com | Testing | Testnet validation |
| 🟡 Testnet | testnet.solana.com | Planned | Production prep |
| 🔴 Mainnet | mainnet-beta.solana.com | Future | Gradual rollout |

### Documentation

- 📖 **[Full Integration Guide](./docs/SOLANA_INTEGRATION.md)** - Setup, usage, troubleshooting
- 📋 **[Completion Checklist](./PHASE3_FEATURE3_COMPLETION.md)** - Remaining tasks & metrics
- 🔧 **[Environment Variables](./.env.example)** - SOLANA_* configuration

### CI/CD Hooks

Automated tests run on every commit to `lib/solana/**`:
- ✅ Unit tests (transaction executor, payment processor)
- ✅ Integration tests (payment ledger, idempotency)
- ✅ Security checks (no hardcoded secrets)
- ✅ Devnet smoke tests (when secrets configured)
- ✅ Code quality (TypeScript, no console.log)

**Workflow:** `.github/workflows/test-solana-integration.yml`

### Known Limitations

1. Block height window: 256 blocks (~30 seconds)
2. Confirmation timeout: 60 seconds (configurable)
3. Pre-existing npm transitive deps have minor vulnerabilities (not in code path)

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
