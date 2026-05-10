# DSG ONE V1 — Autonomous Governed Runtime

> DSG-owned governed app-builder and autonomous runtime control plane with verified auth boundaries, deterministic gates, provider-proof summary, and production smoke evidence.

<p align="center">
  <img alt="DSG Autonomous Level" src="https://img.shields.io/badge/DSG_AUTONOMOUS_LEVEL-COMPLETE-00c853?style=for-the-badge" />
  <img alt="Production Smoke" src="https://img.shields.io/badge/Production%20Smoke-VERIFIED-00bcd4?style=for-the-badge" />
  <img alt="Provider Proof" src="https://img.shields.io/badge/Provider%20Proof-COMPLETE-7c4dff?style=for-the-badge" />
</p>

---

## ✅ Current Production Status

Last verified: **2026-05-10 ICT**

```text
System claim: DSG_AUTONOMOUS_LEVEL_COMPLETE
Completion: true
Passed required lanes: 9/9
Missing required lanes: []
Production alias: https://dsg-one-v1.vercel.app
Latest verified commit: 4f4a8067e21eaa9bfd945555a5b4b2f85efaf0ae
Vercel status: success
```

### Live production smoke

```text
200 /dsg/autonomous-level
200 /api/dsg/autonomous-level/status
200 /dsg/flow-studio
200 /api/dsg/flow-studio/config
```

---

## 🧠 Capability Gate

| Lane | Status | Evidence boundary |
|---|---:|---|
| Verified auth and workspace RBAC | ✅ PASS | Privileged runtime routes remain behind verified DSG context. |
| Deterministic planner and claim gate | ✅ PASS | Claim downgrade/upgrade is deterministic and fail-closed. |
| DSG Flow Studio hardened action planner | ✅ PASS | Flow Studio route smoke, locked mutate route, allowlisted MCP route. |
| Isolated sandbox runner | ✅ PASS | Provider proof summary marks sandbox lane complete. |
| Plan-act-observe-repair-verify loop | ✅ PASS | Bounded repair proof lane passed. |
| Browser/session evidence | ✅ PASS | Manual browser evidence captured and summarized. |
| User-visible artifact timeline | ✅ PASS | Timeline proof lane passed. |
| Preview deployment proof collector | ✅ PASS | Preview route hashes captured and summarized. |
| Production smoke proof | ✅ PASS | Production routes return HTTP 200. |

---

## 🔐 Proof Summary

Raw proof artifacts are intentionally kept **local-only** and are not committed to the public repository.

```text
Provider proof claim: DSG_PROVIDER_PROOF_COMPLETE
Provider proof hash: 47c093d6088bae75e32877f73048eb8792f77212ff433743b78891219d0f995a
Raw artifact policy: local-only
Evidence mode: safe-summary-only
```

### Provider proof lanes

```text
sandbox  PASS
repair   PASS
browser  PASS
timeline PASS
preview  PASS
```

### Browser proof boundary

```text
Browser lane is currently satisfied by manual-browser-evidence.
It is valid for the current proof gate, but it is not yet a fully automated remote browser provider.
Future upgrade path: CDP/Playwright/remote browser adapter with generated session id, navigation log, screenshots, console/network proof, and takeover checkpoint.
```

---

## 🧩 Runtime Surface

### App Builder

```text
/dsg/app-builder
/api/dsg/app-builder/engines
/api/dsg/app-builder/jobs
/api/dsg/app-builder/jobs/:jobId/plan
```

### Flow Studio

```text
/dsg/flow-studio
/api/dsg/flow-studio/config
/api/dsg/flow-studio/mcp
/api/dsg/flow-studio/mutate
/api/dsg/flow-studio/orchestrator
```

### Autonomous Level Gate

```text
/dsg/autonomous-level
/api/dsg/autonomous-level/status
```

---

## 🛡️ Safety / Correctness Rules

This project uses the DSG execution boundary:

```text
1. Verify real files, errors, branch, and command output before claiming.
2. Treat missing or untrusted proof as PROOF_REQUIRED / PARTIAL / BLOCKED.
3. Empty diagnostic output is not success.
4. Broken lint/test/build tooling blocks repair and release.
5. Repair promotion requires independent verifier evidence.
6. Raw browser screenshots, HTML bodies, logs, and proof bundles stay local unless explicitly reviewed.
```

---

## ✅ Local Verification

Use this before any production merge:

```bash
node scripts/dsg-autonomous-level-gate-smoke.mjs
node scripts/dsg-autonomous-parallel-work-smoke.mjs
node scripts/dsg-runtime-rpc-consolidation-smoke.mjs
npm run lint
npm run dsg:typecheck
npm run build:termux
```

---

## ✅ Production Verification

```bash
BASE="https://dsg-one-v1.vercel.app"

curl -L -s "$BASE/api/dsg/autonomous-level/status" | grep DSG_AUTONOMOUS_LEVEL_COMPLETE

for p in /dsg/autonomous-level /api/dsg/autonomous-level/status /dsg/flow-studio /api/dsg/flow-studio/config; do
  code=$(curl -L -s -o /tmp/dsg-complete-check.html -w "%{http_code}" "$BASE$p")
  echo "$code $p"
done
```

Expected:

```text
DSG_AUTONOMOUS_LEVEL_COMPLETE
200 /dsg/autonomous-level
200 /api/dsg/autonomous-level/status
200 /dsg/flow-studio
200 /api/dsg/flow-studio/config
```

---

## 📌 Claim Ladder

```text
PLANNED_ONLY
IMPLEMENTED_UNVERIFIED
LOCAL_VERIFIED
DEPLOYED_BUILD_SUCCESS
PRODUCTION_SMOKE_VERIFIED
DSG_AUTONOMOUS_LEVEL_PARTIAL
DSG_AUTONOMOUS_LEVEL_COMPLETE ✅ current
```

---

## Next Upgrade

```text
Replace manual-browser-evidence with an automated browser provider adapter.
Keep provider proof repeatable, deterministic, and safe-summary-only for public repo visibility.
```
