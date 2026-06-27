---
name: dsg-hybrid-agent
description: "DSG Hybrid Agent - Multi-agent workflow executor with ROM DOM simulation + real browser fallback for DSG Control Plane"
version: 1.0.0
author: DSG Team
license: MIT
dependencies:
  - '@browserbasehq/stagehand'
  - 'yaml'
platforms:
  - linux
  - macos
  - vercel
metadata:
  hermes:
    tags: [DSG, HybridAgent, BrowserAutomation, ROM-DOM, Simulation, MultiAgent, Vercel]
    related_skills: [hermes-agent, browser-use, playwright]
---

# DSG Hybrid Agent Skill

## Overview

This skill provides a **multi-agent workflow executor** for DSG Control Plane that combines:
- **ROM DOM Simulation** (fast, free, deterministic) - runs on Vercel
- **Real Browser Execution** (Browserbase/Stagehand) - for auth/gate eval
- **Verification Gates** (T4 deterministic merge) - ensures sim ≡ real

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID AGENT WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│  Task YAML → PARSE → SIM SESSION → REAL BROWSER (if needed)    │
│       │           │           │              │                  │
│       ▼           ▼           ▼              ▼                  │
│   [Goal]    [Steps]    [Engine]         [Stagehand]             │
│                              │              │                  │
│                              └──────┬───────┘                  │
│                                     ▼                          │
│                            [VERIFICATION GATE T4]             │
│                                     │                          │
│                                     ▼                          │
│                              [MERGED RESULT]                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. ROM DOM Registry (`src/rom-dom/`)
Pre-recorded DOM snapshots for all DSG pages:
- **Public**: landing, delivery-proof, readiness-report, health, mcp-manifest, compliance-annex4, ccvs-status
- **Protected**: login, hermes-dashboard, gate-evaluate

Each ROM contains:
- Selectors (semantic → CSS)
- Forms (fields, validation, submit)
- Actions (click, type, extract, wait, api-call)
- Simulation rules (input → predicted output)
- Browser actions (Playwright commands)

### 2. Simulation Engine (`src/lib/simulation/engine.ts`)
Pure TypeScript, runs on Vercel:
- `ROMSimulationEngine` - per-ROM simulation
- `SimulationSession` - multi-step workflow with context
- `SimulationEngineFactory` - create engines

### 3. Hybrid API (`app/api/agent/hybrid/route.ts`)
Three modes:
- `sim-only` - Fast, free, no real browser
- `hybrid` - Simulate first, real for auth steps, verify at T4
- `real-only` - Full real browser (slow, costs)

### 4. Task Definitions (`tasks/`)
YAML workflows:
- `login-and-gate-eval.yaml` - Full login + gate evaluation
- `public-recon.yaml` - Public endpoint reconnaissance
- `delivery-proof-scan.yaml` - Delivery proof scanning
- `readiness-check.yaml` - Production readiness
- `ci-cd-pipeline.yaml` - Full CI/CD verification

## Quick Start

### 1. Run Public Recon (SIM ONLY - Free, Instant)
```bash
curl -X POST https://your-app.vercel.app/api/agent/hybrid \
  -H "Content-Type: application/json" \
  -d '{"goal": "Public recon", "mode": "sim-only", "steps": [
    {"type": "api-call", "rom": "health"},
    {"type": "api-call", "rom": "mcp-manifest"},
    {"type": "api-call", "rom": "compliance-annex4"}
  ]}'
```

### 2. Run Full Login + Gate Eval (HYBRID)
```bash
curl -X POST https://your-app.vercel.app/api/agent/hybrid \
  -H "Content-Type: application/json" \
  -d @tasks/login-and-gate-eval.yaml
```

### 3. Use from Hermes Agent
```typescript
// In Hermes agent context
const result = await fetch('https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/hybrid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    goal: 'Login and evaluate gate',
    mode: 'hybrid',
    steps: [...]
  })
});
```

## Multi-Agent Parallel Execution

This skill supports **parallel agent execution** for independent workflows:

```yaml
# Parallel task group
agentGroup:
  - agent: recon-agent
    task: public-recon.yaml
  - agent: compliance-agent
    task: compliance-check.yaml
  - agent: readiness-agent
    task: readiness-check.yaml
```

Each agent runs in isolation with its own `SimulationSession`, then results are merged at T4 gate.

## Verification Gates (T4 Deterministic Merge)

Every hybrid step supports verification:
```yaml
verification:
  type: exact        # Deep equality: sim === real
  # OR
  type: keys
  keys: [decision, evidenceHash]  # Only check these keys
  # OR
  type: custom
  fn: "(sim, real) => real.decision === 'PASS'"  # Custom logic
```

If verification fails, the workflow stops and reports the divergence.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BROWSERBASE_API_KEY` | For real browser | Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | For real browser | Browserbase project ID |

Without these, only `sim-only` mode works.

## ROM DOM Recording

To add new pages to ROM:
```bash
# 1. Run recorder (local with Playwright)
npx tsx scripts/record-rom.ts <page-key>

# 2. Commit JSON to src/rom-dom/
# 3. Deploy to Vercel (auto-embedded in bundle)
```

## Integration with DSG Control Plane

This skill integrates with:
- **Gate Evaluation** → `/api/dsg/v1/gates/evaluate`
- **MCP Server** → `/api/mcp-server` (6 tools)
- **Compliance** → `/api/compliance-evidence-pack/annex4`
- **CCVS** → `/api/ccvs/compliance-status`
- **Readiness** → `/api/readiness/check`

## Performance

| Mode | Latency | Cost | Use Case |
|------|---------|------|----------|
| sim-only | < 100ms | Free | Recon, CI, testing |
| hybrid | 2-10s | ~$0.05/session | Auth + gate eval |
| real-only | 5-30s | ~$0.10/session | Full e2e, debugging |

## Examples

### Run from Hermes Agent Tool
```typescript
// Agent calls hybrid API
const task = await loadTask('login-and-gate-eval');
const response = await fetch('/api/agent/hybrid', {
  method: 'POST',
  body: JSON.stringify(task)
});
```

### GitHub Actions Integration
```yaml
- name: Run DSG Hybrid Agent
  run: |
    curl -X POST ${{ secrets.DSG_HYBRID_URL }} \
      -H "Content-Type: application/json" \
      -d @tasks/ci-cd-pipeline.yaml
```

### Parallel Agent Orchestration
```typescript
// Spawn multiple agents in parallel
const agents = [
  runTask('public-recon'),
  runTask('compliance-check'),
  runTask('readiness-check')
];
const results = await Promise.all(agents);
// Merge results at T4 gate
```

## Files Created

```
src/rom-dom/
  ├── registry.ts           # Main registry + types
  ├── login.json            # Login page ROM
  ├── hermes-dashboard.json # Dashboard ROM
  ├── landing.json          # Landing page ROM
  ├── delivery-proof.json   # Delivery proof ROM
  ├── readiness-report.json # Readiness ROM
  ├── health.json           # Health endpoint ROM
  ├── mcp-manifest.json     # MCP server ROM
  ├── compliance-annex4.json # Compliance ROM
  ├── ccvs-status.json      # CCVS ROM
  └── gate-evaluate.json    # Gate eval API ROM

src/lib/simulation/
  ├── engine.ts             # Simulation engine
  ├── task-registry.ts      # Task loader
  └── index.ts              # Exports

app/api/agent/hybrid/
  └── route.ts              # Hybrid API endpoint

tasks/
  ├── login-and-gate-eval.yaml
  ├── public-recon.yaml
  ├── delivery-proof-scan.yaml
  ├── readiness-check.yaml
  └── ci-cd-pipeline.yaml
```

## Next Steps

1. **Record real DOM** - Use Playwright to capture actual selectors
2. **Add Browserbase** - Configure real browser for hybrid mode
3. **Custom tasks** - Create team-specific workflows
4. **CI/CD integration** - Add to GitHub Actions
5. **MCP exposure** - Expose hybrid API as MCP tool